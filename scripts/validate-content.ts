import { join } from "node:path";
import { loadContent } from "../server/content.ts";

const root = join(import.meta.dirname, "..");
const content = loadContent(process.env.CONTENT_DIR ?? join(root, "content"), process.env.AUDIO_DIR ?? join(root, "content/audio"), { requireAudio: false });
for (const c of content.courses)
  console.log(`${c.language} ${c.id}: ${c.lessons.length} lessons, ${c.lessons.reduce((n, l) => n + l.units.length, 0)} units`);
console.log(`OK: ${content.units.size} units, ${content.audioJobs.length} audio files referenced`);
