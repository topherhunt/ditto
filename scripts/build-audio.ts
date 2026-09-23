// Renders every missing audio file referenced by content: Piper -> wav -> afconvert (macOS) -> m4a.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadContent } from "../server/content.ts";

const root = join(import.meta.dirname, "..");
const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const python = join(root, ".venv/bin/python");
if (!existsSync(python)) throw new Error(`Piper venv not found at ${python}; see docs/plan.md (Audio)`);

const { audioJobs } = loadContent(process.env.CONTENT_DIR ?? join(root, "content"), audioDir, { requireAudio: false });
const missing = audioJobs.filter((j) => !existsSync(join(audioDir, j.file)));
console.log(`${missing.length} of ${audioJobs.length} audio files to render`);
if (missing.length === 0) process.exit(0);

const tmp = mkdtempSync(join(tmpdir(), "lp-audio-"));
try {
  const withWav = missing.map((j, i) => ({ ...j, wav: join(tmp, `${i}.wav`) }));
  const input = withWav.map((j) => JSON.stringify({ voice: j.voice, text: j.text, wav: j.wav })).join("\n") + "\n";
  execFileSync(python, [join(root, "scripts/piper-render.py"), join(root, "tools/piper-voices")], { input, stdio: ["pipe", "ignore", "inherit"] });
  for (const j of withWav) {
    const out = join(audioDir, j.file);
    mkdirSync(dirname(out), { recursive: true });
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", j.wav, out]);
  }
  console.log(`Rendered ${withWav.length} files into ${audioDir}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
