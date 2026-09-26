// Dev-only recorder for the pronunciation judge proof of concept (docs/conversation.md). Takes are saved to
// `dir` with the clips.json that scripts/pronunciation-poc.ts reads.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { PocTakeSchema, PocNoteSchema, type PocData, type PocSentence, type PocTake } from "../shared/api.ts";
import type { Content } from "./content.ts";
import type { User } from "./auth.ts";

/** Course sentences, so each has a native TTS take; `suggestion` names errors the judge should catch. */
export const POC_SENTENCES: Omit<PocSentence, "ttsUrl">[] = [
  { id: "it-anno", lang: "it", text: "Faccio l'architetto e lavoro qui da un anno.", suggestion: "\"ano\" for \"anno\" (a different real word), or \"architeto\"" },
  { id: "it-cappuccino", lang: "it", text: "Buongiorno, un cappuccino e un caffè, per favore.", suggestion: "\"capuccino\" or \"cafè\": a single consonant where a double is required" },
  { id: "it-ritardo", lang: "it", text: "Il treno per Napoli ha venti minuti di ritardo.", suggestion: "an English r in \"treno\" or \"ritardo\", or an added t (\"ritardot\")" },
  { id: "it-bello", lang: "it", text: "Dietro la stazione c'è un parco molto bello.", suggestion: "\"belo\" for \"bello\", or an English-style \"stayzione\"" },
  { id: "it-bottiglia", lang: "it", text: "Una birra e una bottiglia d'acqua, per favore.", suggestion: "\"bira\" for \"birra\", or \"gli\" as a hard g plus l" },
  { id: "nl-graag", lang: "nl", text: "Ik wil graag een thee.", suggestion: "an English hard g in \"graag\" instead of the throat sound" },
  { id: "nl-kaas", lang: "nl", text: "Een broodje kaas kost vier euro.", suggestion: "a short a, \"kas\" (greenhouse), for \"kaas\"" },
  { id: "nl-uur", lang: "nl", text: "'s Ochtends ontbijt ik om zeven uur.", suggestion: "\"oor\" for \"uur\", or \"ontbeit\" for \"ontbijt\"" },
  { id: "nl-suiker", lang: "nl", text: "Een verse munt zonder suiker, alstublieft.", suggestion: "\"souker\" or \"sowker\" for \"suiker\"" },
  { id: "nl-wijn", lang: "nl", text: "Wat wil je drinken, bier of wijn?", suggestion: "English \"wine\" or \"ween\" for \"wijn\"" },
];

// Chrome records WebM/Opus, Safari MP4/AAC; ffmpeg in the POC script reads both.
const EXT: Record<PocTake["mime"], string> = { "audio/webm": "webm", "audio/mp4": "m4a" };

export function registerPoc(app: Hono<{ Variables: { user: User } }>, content: Content, dir: string) {
  mkdirSync(dir, { recursive: true });
  const takesPath = join(dir, "takes.json");
  const readTakes = (): PocTake[] => (existsSync(takesPath) ? z.array(PocTakeSchema).parse(JSON.parse(readFileSync(takesPath, "utf8"))) : []);
  const ttsFile = (s: Omit<PocSentence, "ttsUrl">) => content.audioJobs.find((j) => j.language === s.lang && j.text === s.text)?.file ?? null;
  const sentenceOr404 = (id: string) => POC_SENTENCES.find((s) => s.id === id) ?? (() => { throw new HTTPException(404, { message: `Unknown sentence ${id}` }); })();

  // clips.json is derived: every sentence's course TTS as a pass, plus every recorded take.
  const writeTakes = (takes: PocTake[]) => {
    writeFileSync(takesPath, JSON.stringify(takes, null, 2) + "\n");
    const clips = [
      ...POC_SENTENCES.filter(ttsFile).map((s) => ({ tts: true, lang: s.lang, text: s.text, expect: "pass" })),
      ...takes.map((t) => {
        const s = sentenceOr404(t.sentence);
        return { file: t.file, lang: s.lang, text: s.text, expect: t.expect, ...(t.note ? { note: t.note } : {}) };
      }),
    ];
    writeFileSync(join(dir, "clips.json"), JSON.stringify(clips, null, 2) + "\n");
  };

  app.get("/api/admin/poc", (c) =>
    c.json<PocData>({ sentences: POC_SENTENCES.map((s) => ({ ...s, ttsUrl: ttsFile(s) && `/audio/${ttsFile(s)}` })), takes: readTakes() }));

  // Audio arrives base64 in JSON: every mutation must be JSON (the CSRF rule in app.ts), and takes are small.
  app.post("/api/admin/poc/takes", async (c) => {
    const body = PocTakeSchema.omit({ file: true }).extend({ audio: z.string().min(1) }).parse(await c.req.json());
    sentenceOr404(body.sentence);
    const takes = readTakes();
    // One correct take per sentence, replaced on re-record; wrong takes accumulate.
    const file = body.expect === "pass" ? `${body.sentence}-correct.${EXT[body.mime]}` : `${body.sentence}-wrong-${Date.now()}.${EXT[body.mime]}`;
    const replaced = takes.find((t) => t.sentence === body.sentence && t.expect === "pass" && body.expect === "pass");
    if (replaced) rmSync(join(dir, replaced.file));
    writeFileSync(join(dir, file), Buffer.from(body.audio, "base64"));
    const take: PocTake = { file, sentence: body.sentence, expect: body.expect, mime: body.mime, note: body.note };
    writeTakes([...takes.filter((t) => t !== replaced), take]);
    return c.json(take);
  });

  const takeOr404 = (takes: PocTake[], file: string) => takes.find((t) => t.file === file) ?? (() => { throw new HTTPException(404, { message: `No take ${file}` }); })();

  app.put("/api/admin/poc/takes/:file", async (c) => {
    const { note } = PocNoteSchema.parse(await c.req.json());
    const takes = readTakes();
    takeOr404(takes, c.req.param("file")).note = note;
    writeTakes(takes);
    return c.json({ ok: true });
  });

  app.delete("/api/admin/poc/takes/:file", (c) => {
    const takes = readTakes();
    const take = takeOr404(takes, c.req.param("file"));
    rmSync(join(dir, take.file));
    writeTakes(takes.filter((t) => t !== take));
    return c.json({ ok: true });
  });

  app.get("/api/admin/poc/audio/:file", (c) => {
    const take = takeOr404(readTakes(), c.req.param("file"));
    return c.body(readFileSync(join(dir, take.file)), 200, { "Content-Type": take.mime });
  });
}
