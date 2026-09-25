// Renders every missing audio file referenced by content, one Python process per voice in parallel.
// `--prune` also deletes files no content references (e.g. after a RENDER_VERSION bump).
// ABAIR voices call a free public service, so they render one at a time instead of in parallel.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { loadContent, voiceId, type AudioJob } from "../server/content.ts";

const root = join(import.meta.dirname, "..");
const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const python = join(root, ".venv/bin/python");
if (!existsSync(python)) throw new Error(`TTS venv not found at ${python}; see docs/plan.md (Audio)`);

const { audioJobs } = loadContent(process.env.CONTENT_DIR ?? join(root, "content"), audioDir, { audio: "skip" });

if (process.argv.includes("--prune")) {
  const wanted = new Set(audioJobs.map((j) => j.file));
  let pruned = 0;
  for (const lang of existsSync(audioDir) ? readdirSync(audioDir) : [])
    for (const name of readdirSync(join(audioDir, lang)))
      if (!wanted.has(`${lang}/${name}`)) {
        rmSync(join(audioDir, lang, name));
        pruned++;
      }
  console.log(`Pruned ${pruned} unreferenced files`);
}

const missing = audioJobs.filter((j) => !existsSync(join(audioDir, j.file)));
console.log(`${missing.length} of ${audioJobs.length} audio files to render`);

const byVoice = new Map<string, AudioJob[]>();
for (const j of missing) byVoice.set(`${j.language}|${voiceId(j.voice)}`, [...(byVoice.get(`${j.language}|${voiceId(j.voice)}`) ?? []), j]);

let done = 0;
const render = (jobs: AudioJob[]) =>
  new Promise<void>((resolve, reject) => {
    const { engine, model, speaker } = jobs[0].voice;
    const proc = spawn(python, [join(root, "scripts/tts-render.py"), join(root, "tools"), JSON.stringify({ engine, model, speaker }), jobs[0].language], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    createInterface({ input: proc.stdout }).on("line", () => {
      if (++done % 100 === 0 || done === missing.length) console.log(`${done} / ${missing.length}`);
    });
    proc.on("error", reject);
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${voiceId(jobs[0].voice)} renderer exited with ${code}`))));
    proc.stdin.end(jobs.map((j) => JSON.stringify({ text: j.text, out: join(audioDir, j.file) })).join("\n") + "\n");
  });

const groups = [...byVoice.values()];
const remote = groups.filter((jobs) => jobs[0].voice.engine === "abair");
await Promise.all([
  ...groups.filter((jobs) => !remote.includes(jobs)).map(render),
  (async () => { for (const jobs of remote) await render(jobs); })(),
]);
