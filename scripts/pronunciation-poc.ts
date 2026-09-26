// Proof of concept for the conversation coach's pronunciation judge (docs/conversation.md).
// Judges every clip in <dir>/clips.json, several runs per paid judge, and writes <dir>/report.md: per judge, the
// deliberate errors caught, the correct takes failed, run-to-run agreement, and the measured cost.
// Judges: `phonemes` (the local recognizer from check-audio, free), `audio` (gpt-audio-1.5), `realtime` (gpt-realtime-2,
// one WebSocket request per call), `audio+ipa` (gpt-audio-1.5 also given the recognizer's IPA as evidence).
// Usage: node --env-file=.env scripts/pronunciation-poc.ts <dir> [--judges phonemes,audio] [--runs 3] [--limit 1]
// clips.json: [{ "file": "x.m4a" (relative to <dir>; omit for "tts"), "tts": true (use the course's own clip of `text`),
//   "lang": "it", "text": "the intended sentence", "expect": "pass" | "fail", "note": "the deliberate error" }]
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { parseArgs } from "node:util";
import OpenAI, { toFile } from "openai";
import { OpenAIRealtimeWebSocket } from "openai/realtime/websocket";
import { z } from "zod";
import { LANGUAGE_NAMES } from "../shared/content.ts";
import { loadContent } from "../server/content.ts";
import { phonemeErrorRate } from "./phonemes.ts";

const root = join(import.meta.dirname, "..");
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { judges: { type: "string", default: "phonemes,audio,realtime,audio+ipa" }, runs: { type: "string", default: "3" }, limit: { type: "string" } },
});
const dir = positionals[0];
if (!dir) throw new Error("Usage: pronunciation-poc.ts <dir> [--judges ...] [--runs 3] [--limit N]");
const JUDGES = ["phonemes", "audio", "realtime", "audio+ipa"] as const;
type Judge = (typeof JUDGES)[number];
const judges = args.judges.split(",").map((j) => z.enum(JUDGES).parse(j));
const runs = Number(args.runs);

const ClipSchema = z.strictObject({
  file: z.string().optional(),
  tts: z.boolean().optional(),
  lang: z.enum(["it", "nl", "en"]),
  text: z.string().min(1),
  expect: z.enum(["pass", "fail"]),
  note: z.string().optional(),
}).refine((c) => !!c.file !== !!c.tts, "each clip needs exactly one of file or tts");
const clips = z.array(ClipSchema).parse(JSON.parse(readFileSync(join(dir, "clips.json"), "utf8"))).slice(0, args.limit ? Number(args.limit) : undefined);

// Every clip becomes 24 kHz mono 16-bit WAV: Chat Completions takes WAV, Realtime takes its raw PCM.
const work = join(dir, "work");
mkdirSync(work, { recursive: true });
const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const ttsFiles = clips.some((c) => c.tts) ? loadContent(join(root, "content"), audioDir, { audio: "skip" }).audioJobs : [];
const wavs = clips.map((c, i) => {
  const src = c.file ? join(dir, c.file) : join(audioDir, ttsFiles.find((j) => j.language === c.lang && j.text === c.text)?.file ?? fail(`no course clip for ${c.lang} "${c.text}"`));
  const out = join(work, `${i}.wav`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", out]);
  return out;
});

function fail(msg: string): never {
  throw new Error(msg);
}

const client = new OpenAI();
// USD per 1M tokens (as of 2026-09); gpt-transcribe is billed per minute.
const PRICES = {
  "gpt-audio-1.5": { text: 2.5, audio: 32, out: 10 },
  "gpt-realtime-2": { text: 4, audio: 32, out: 24 },
};
const TRANSCRIBE_PER_MIN = 0.0045;
const seconds = (wav: string) => (readFileSync(wav).length - 44) / (24000 * 2);

const VerdictSchema = z.strictObject({
  words: z.array(z.strictObject({ expected: z.string(), heard: z.string(), ok: z.boolean(), issue: z.string() })),
  pass: z.boolean(),
  feedback: z.string(),
});
type Verdict = z.infer<typeof VerdictSchema>;

const instructions = (lang: string) => `You are a strict ${LANGUAGE_NAMES[lang as "it"]} pronunciation examiner. A learner tried to say the intended sentence you are given. Compare the sounds of every word in the audio against the standard pronunciation of that sentence.
- Your job is to catch errors, not to understand the learner. Do not infer what they meant; report what you actually hear.
- Any missing, added or substituted sound is an error: a single consonant where a double is required, an added t, a wrong vowel, a different word. A foreign accent that keeps every sound correct is not an error.
- Passing a mispronounced sentence is the worst possible mistake. When unsure, fail the word.
Reply with JSON only, no code fence: {"words":[{"expected":"<word>","heard":"<what you heard, spelled as pronounced>","ok":<bool>,"issue":"<empty if ok>"}],"pass":<bool>,"feedback":"<one sentence for the learner, in English>"}`;

const ipaHint = (p: Phonemes) => `\nA phoneme recognizer heard /${p.heard}/; the standard pronunciation is /${p.want}/. The recognizer is noisy and misreads some sounds: treat it as evidence, not a verdict.`;

function parseVerdict(text: string): Verdict {
  try {
    return VerdictSchema.parse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
  } catch (err) {
    throw new Error(`${err} in reply: ${text}`);
  }
}

async function judgeAudio(wav: string, clip: z.infer<typeof ClipSchema>, hint: string): Promise<{ verdict: Verdict; cost: number }> {
  const model = "gpt-audio-1.5";
  const res = await client.chat.completions.create({
    model,
    modalities: ["text"],
    messages: [
      { role: "system", content: instructions(clip.lang) },
      { role: "user", content: [{ type: "text", text: `Intended sentence: ${clip.text}${hint}` }, { type: "input_audio", input_audio: { data: readFileSync(wav).toString("base64"), format: "wav" } }] },
    ],
  });
  const u = res.usage ?? fail(`${model} returned no usage`);
  const audio = u.prompt_tokens_details?.audio_tokens ?? fail(`${model} usage has no audio token count`);
  const p = PRICES[model];
  const cost = (audio * p.audio + (u.prompt_tokens - audio) * p.text + u.completion_tokens * p.out) / 1e6;
  return { verdict: parseVerdict(res.choices[0].message.content ?? fail(`${model} returned no text`)), cost };
}

async function judgeRealtime(wav: string, clip: z.infer<typeof ClipSchema>): Promise<{ verdict: Verdict; cost: number }> {
  const model = "gpt-realtime-2";
  const rt = await OpenAIRealtimeWebSocket.create(client, { model });
  try {
    const done = new Promise<{ verdict: Verdict; cost: number }>((resolve, reject) => {
      rt.on("error", reject);
      rt.on("response.done", (e) => {
        const r = e.response;
        if (r.status !== "completed") return reject(new Error(`${model} response ${r.status}: ${JSON.stringify(r.status_details)}`));
        const text = r.output?.flatMap((item) => (item.type === "message" ? item.content.map((c) => c.text ?? "") : [])).join("") ?? "";
        const u = r.usage ?? fail(`${model} returned no usage`);
        const p = PRICES[model];
        const audio = u.input_token_details?.audio_tokens ?? fail(`${model} usage has no audio token count`);
        const cost = (audio * p.audio + (u.input_tokens! - audio) * p.text + u.output_tokens! * p.out) / 1e6;
        try { resolve({ verdict: parseVerdict(text), cost }); } catch (err) { reject(err); }
      });
    });
    await new Promise<void>((resolve, reject) => {
      rt.socket.addEventListener("open", () => resolve());
      rt.socket.addEventListener("error", () => reject(new Error(`${model} WebSocket failed to open`)));
    });
    rt.send({
      type: "session.update",
      session: {
        type: "realtime",
        output_modalities: ["text"],
        instructions: instructions(clip.lang),
        reasoning: { effort: "medium" },
        audio: { input: { format: { type: "audio/pcm", rate: 24000 }, turn_detection: null } },
      },
    });
    rt.send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: `Intended sentence: ${clip.text}\nJudge the audio that follows. Reply with the JSON verdict only.` }, { type: "input_audio", audio: readFileSync(wav).subarray(44).toString("base64") }] },
    });
    rt.send({ type: "response.create" });
    return await done;
  } finally {
    rt.close();
  }
}

type Phonemes = { heard: string; want: string; per: number };
async function recognize(): Promise<Phonemes[]> {
  const python = join(root, ".venv/bin/python");
  const proc = spawn(python, [join(root, "scripts/audio-phonemes.py"), join(root, "tools"), work], { stdio: ["pipe", "pipe", "inherit"] });
  const byFile = new Map<string, Phonemes>();
  createInterface({ input: proc.stdout }).on("line", (line) => {
    const h = JSON.parse(line) as { file: string; heard: string; want: string };
    byFile.set(h.file, { heard: h.heard.replace(/\s/g, ""), want: h.want, per: phonemeErrorRate(h.heard, h.want) });
  });
  proc.stdin.end(clips.map((c, i) => JSON.stringify({ file: `${i}.wav`, text: c.text, lang: c.lang })).join("\n") + "\n");
  await new Promise<void>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`audio-phonemes.py exited with ${code}`))));
  });
  return clips.map((_, i) => byFile.get(`${i}.wav`) ?? fail(`no phonemes for clip ${i}`));
}

// The transcript shows whether speech-to-text writes a slip as a different real word (the fato-for-fatto trap).
let transcribeCost = 0;
const transcripts = await Promise.all(clips.map(async (c, i) => {
  const res = await client.audio.transcriptions.create({ model: "gpt-transcribe", language: c.lang, file: await toFile(readFileSync(wavs[i]), `${i}.wav`) });
  transcribeCost += (seconds(wavs[i]) / 60) * TRANSCRIBE_PER_MIN;
  return res.text;
}));

const phonemes = judges.includes("phonemes") || judges.includes("audio+ipa") ? await recognize() : null;

type Outcome = { verdict: Verdict; cost: number } | { error: string };
const results = new Map<Judge, Outcome[][]>();
for (const judge of judges.filter((j) => j !== "phonemes")) {
  const perClip: Outcome[][] = [];
  for (const [i, clip] of clips.entries()) {
    const outcomes: Outcome[] = [];
    for (let r = 0; r < runs; r++) {
      try {
        outcomes.push(judge === "realtime" ? await judgeRealtime(wavs[i], clip) : await judgeAudio(wavs[i], clip, judge === "audio+ipa" ? ipaHint(phonemes![i]) : ""));
      } catch (err) {
        outcomes.push({ error: String(err) });
      }
    }
    perClip.push(outcomes);
    console.log(`${judge} ${i + 1}/${clips.length}: ${outcomes.map((o) => ("error" in o ? "ERR" : o.verdict.pass ? "pass" : "fail")).join(" ")}  (${clip.expect}) ${clip.text}`);
  }
  results.set(judge, perClip);
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const lines = [`# Pronunciation judge POC`, ``, `${clips.length} clips, ${runs} runs per paid judge. Transcription (gpt-transcribe): $${transcribeCost.toFixed(4)}.`, ``];
lines.push(`| Judge | Errors caught | Correct takes failed | Clips with split runs | Call errors | Cost |`, `|---|---|---|---|---|---|`);
const fails = clips.filter((c) => c.expect === "fail").length, passes = clips.length - fails;
for (const [judge, perClip] of results) {
  const ok = perClip.map((o) => o.flatMap((x) => ("error" in x ? [] : [x])));
  const majorityFail = ok.map((o) => o.filter((x) => !x.verdict.pass).length * 2 > o.length);
  lines.push(`| ${judge} | ${clips.filter((c, i) => c.expect === "fail" && majorityFail[i]).length}/${fails} | ${clips.filter((c, i) => c.expect === "pass" && majorityFail[i]).length}/${passes} | ${ok.filter((o) => new Set(o.map((x) => x.verdict.pass)).size > 1).length} | ${perClip.flat().filter((x) => "error" in x).length} | $${ok.flat().reduce((s, x) => s + x.cost, 0).toFixed(4)} |`);
}
if (phonemes) lines.push(``, `Phoneme recognizer: no verdict of its own; PER (phoneme error rate) per clip is below. It separates the clips if every "fail" clip scores above every "pass" clip.`);
for (const [i, clip] of clips.entries()) {
  lines.push(``, `## ${i + 1}. ${clip.expect.toUpperCase()}: ${clip.text}${clip.tts ? " (course TTS)" : ""}`, ``);
  if (clip.note) lines.push(`Deliberate error: ${clip.note}`, ``);
  lines.push(`- Transcript: ${transcripts[i]}`);
  if (phonemes) lines.push(`- Phonemes: PER ${phonemes[i].per.toFixed(2)}, heard /${phonemes[i].heard}/, want /${phonemes[i].want}/`);
  for (const [judge, perClip] of results)
    for (const o of perClip[i])
      lines.push("error" in o ? `- ${judge}: ERROR ${esc(o.error)}` : `- ${judge}: ${o.verdict.pass ? "pass" : "FAIL"}. ${esc(o.verdict.feedback)} ${o.verdict.words.filter((w) => !w.ok).map((w) => `[${w.expected} -> ${w.heard}: ${w.issue}]`).join(" ")}`);
}
writeFileSync(join(dir, "report.md"), lines.join("\n") + "\n");
console.log(`Report: ${join(dir, "report.md")}`);
