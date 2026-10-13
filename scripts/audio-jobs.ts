// Rendering and phoneme scoring shared by the audio scripts (build-audio, check-audio, audio-candidates).
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { voiceId, type AudioJob, type Voice } from "../server/content.ts";
import { speechInput, TTS_MODEL } from "../server/speech.ts";

export const root = join(import.meta.dirname, "..");
export const python = join(root, ".venv/bin/python");
if (!existsSync(python)) throw new Error(`TTS venv not found at ${python}; see docs/plan.md (Audio)`);

/** Append-only record of which engine, model and voice rendered each file, and what it was sent. Local only: never deployed or pruned. */
const inventoryFile = join(root, "data/audio-inventory.tsv");
const engineModel = (v: Voice) => (v.engine === "elevenlabs" ? TTS_MODEL : "abair");

/** What the engine is sent: a fix's `say` verbatim, else the text, tagged for ElevenLabs where speechInput says so. */
const input = (j: AudioJob) => j.fix?.say ?? (j.voice.engine === "elevenlabs" ? speechInput(j.text, j.language) : j.text);

/** Renders jobs into audioDir, one Python process per voice in parallel; ABAIR one group at a time. */
export async function renderJobs(jobs: AudioJob[], audioDir: string) {
  if (!existsSync(inventoryFile)) writeFileSync(inventoryFile, "file\tengine\tmodel\tvoice\tinput\trendered_at\n");
  const byOut = new Map(jobs.map((j) => [join(audioDir, j.file), j]));
  const byVoice = new Map<string, AudioJob[]>();
  for (const j of jobs) {
    const key = `${j.language}|${voiceId(j.voice)}`;
    byVoice.set(key, [...(byVoice.get(key) ?? []), j]);
  }
  let done = 0;
  const render = (group: AudioJob[]) =>
    new Promise<void>((resolve, reject) => {
      const { engine, model } = group[0].voice;
      const proc = spawn(python, [join(root, "scripts/tts-render.py"), JSON.stringify({ engine, model: engineModel(group[0].voice), voice: model })], {
        stdio: ["pipe", "pipe", "inherit"],
      });
      createInterface({ input: proc.stdout }).on("line", (out) => {
        const j = byOut.get(out);
        if (!j) throw new Error(`renderer reported a file it wasn't given: ${out}`);
        appendFileSync(inventoryFile, [j.file, engine, engineModel(j.voice), model, input(j).replace(/[\t\n]/g, " "), new Date().toISOString()].join("\t") + "\n");
        if (++done % 100 === 0 || done === jobs.length) console.log(`${done} / ${jobs.length}`);
      });
      proc.on("error", reject);
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${voiceId(group[0].voice)} renderer exited with ${code}`))));
      proc.stdin.end(group.map((j) => JSON.stringify({ text: input(j), cut: j.fix?.cut, out: join(audioDir, j.file) })).join("\n") + "\n");
    });
  // OpenRouter allows several requests at once, so each ElevenLabs voice splits across workers.
  const groups = [...byVoice.values()].flatMap((g) =>
    g[0].voice.engine === "elevenlabs" ? Array.from({ length: 4 }, (_, i) => g.filter((_, k) => k % 4 === i)).filter((c) => c.length) : [g]);
  const remote = groups.filter((g) => g[0].voice.engine === "abair");
  await Promise.all([
    ...groups.filter((g) => !remote.includes(g)).map(render),
    (async () => { for (const g of remote) await render(g); })(),
  ]);
}

export type Heard = { file: string; heard: string; want: string };
const cacheFile = join(root, "data/audio-check.jsonl");

/** What a phoneme recognizer hears in each rendered clip, cached per file in data/audio-check.jsonl so only new renders get scored. */
export async function hearClips(jobs: AudioJob[], audioDir: string): Promise<Map<string, Heard>> {
  const cache = new Map<string, Heard>();
  if (existsSync(cacheFile))
    for (const line of readFileSync(cacheFile, "utf8").split("\n").filter(Boolean)) {
      const h = JSON.parse(line) as Heard;
      cache.set(h.file, h);
    }
  const todo = jobs.filter((j) => !cache.has(j.file));
  console.log(`${jobs.length} clips in scope, ${todo.length} to score`);
  if (!todo.length) return cache;
  const proc = spawn(python, [join(root, "scripts/audio-phonemes.py"), audioDir], { stdio: ["pipe", "pipe", "inherit"] });
  let done = 0;
  createInterface({ input: proc.stdout }).on("line", (line) => {
    const h = JSON.parse(line) as Heard;
    cache.set(h.file, h);
    appendFileSync(cacheFile, line + "\n");
    if (++done % 200 === 0 || done === todo.length) console.log(`${done} / ${todo.length}`);
  });
  proc.stdin.end(todo.map((j) => JSON.stringify({ file: j.file, text: j.text, lang: j.language })).join("\n") + "\n");
  await new Promise<void>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`audio-phonemes.py exited with ${code}`))));
  });
  return cache;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
