// Rendering and phoneme scoring shared by the audio scripts (build-audio, check-audio, audio-candidates).
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { voiceId, type AudioJob } from "../server/content.ts";

export const root = join(import.meta.dirname, "..");
export const python = join(root, ".venv/bin/python");
if (!existsSync(python)) throw new Error(`TTS venv not found at ${python}; see docs/plan.md (Audio)`);

/** The renderer config: the slot's own voice, or the paid OpenRouter voice a fix names instead. */
const engineOf = (j: AudioJob) =>
  j.fix?.openrouter ? { engine: "openrouter", ...j.fix.openrouter } : { engine: j.voice.engine, model: j.voice.model, speaker: j.voice.speaker };

/** Renders jobs into audioDir, one Python process per voice in parallel; ABAIR and OpenRouter one group at a time. */
export async function renderJobs(jobs: AudioJob[], audioDir: string) {
  const byVoice = new Map<string, AudioJob[]>();
  for (const j of jobs) {
    const key = `${j.language}|${JSON.stringify(engineOf(j))}`;
    byVoice.set(key, [...(byVoice.get(key) ?? []), j]);
  }
  let done = 0;
  const render = (group: AudioJob[]) =>
    new Promise<void>((resolve, reject) => {
      const proc = spawn(python, [join(root, "scripts/tts-render.py"), join(root, "tools"), JSON.stringify(engineOf(group[0])), group[0].language], {
        stdio: ["pipe", "pipe", "inherit"],
      });
      createInterface({ input: proc.stdout }).on("line", () => {
        if (++done % 100 === 0 || done === jobs.length) console.log(`${done} / ${jobs.length}`);
      });
      proc.on("error", reject);
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${voiceId(group[0].voice)} renderer exited with ${code}`))));
      proc.stdin.end(group.map((j) => JSON.stringify({ text: j.fix?.say ?? j.text, phonemes: j.fix?.phonemes, cut: j.fix?.cut, out: join(audioDir, j.file) })).join("\n") + "\n");
    });
  // OpenAI's rate limit allows several requests at once, so each OpenAI voice splits across workers.
  const groups = [...byVoice.values()].flatMap((g) =>
    engineOf(g[0]).engine === "openai" ? Array.from({ length: 4 }, (_, i) => g.filter((_, k) => k % 4 === i)).filter((c) => c.length) : [g]);
  const remote = groups.filter((g) => ["abair", "openrouter"].includes(engineOf(g[0]).engine));
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
  const proc = spawn(python, [join(root, "scripts/audio-phonemes.py"), join(root, "tools"), audioDir], { stdio: ["pipe", "pipe", "inherit"] });
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
