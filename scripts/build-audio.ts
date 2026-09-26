// Renders every missing audio file referenced by content (see renderJobs in audio-jobs.ts).
// `--prune` also deletes files no content references (e.g. after a RENDER_VERSION bump).
// OpenRouter fixes need OPENROUTER_API_KEY (from .env); rendering is local only, and deploy ships the files.
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../server/content.ts";
import { renderJobs, root } from "./audio-jobs.ts";

const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
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
await renderJobs(missing, audioDir);
