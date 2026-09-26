// Sanity-checks rendered clips: a phoneme recognizer listens to each one, and the clips whose phonemes stray
// furthest from the text's come first in data/audio-check.html, to be played and judged by ear.
// Default scope: texts of 1-2 words, where a slurred or clipped sound has no context to hide in.
// Flags: --all (every length), --lang it, --voice kokoro:if_sara, --text "sì" (repeatable), --top 300.
// Results are cached per clip file in data/audio-check.jsonl, so only new renders get scored.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadContent, voiceId } from "../server/content.ts";
import { esc, hearClips, root } from "./audio-jobs.ts";
import { phonemeErrorRate } from "./phonemes.ts";

const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const reportFile = join(root, "data/audio-check.html");

const { values: args } = parseArgs({
  options: { all: { type: "boolean" }, lang: { type: "string" }, voice: { type: "string" }, text: { type: "string", multiple: true }, top: { type: "string", default: "300" } },
});

const { audioJobs } = loadContent(process.env.CONTENT_DIR ?? join(root, "content"), audioDir, { audio: "skip" });
const jobs = audioJobs.filter((j) =>
  (args.all || args.text || j.text.split(/\s+/).length <= 2) &&
  (!args.lang || j.language === args.lang) &&
  (!args.voice || voiceId(j.voice) === args.voice) &&
  (!args.text || args.text.includes(j.text)));
const present = jobs.filter((j) => existsSync(join(audioDir, j.file)));
if (present.length < jobs.length) console.log(`${jobs.length - present.length} clips not rendered yet; run npm run content:audio`);

const cache = await hearClips(present, audioDir);

const rows = present.map((j) => {
  const h = cache.get(j.file)!;
  return { job: j, heard: h.heard.replace(/\s/g, ""), want: h.want, per: phonemeErrorRate(h.heard, h.want) };
}).sort((a, b) => b.per - a.per);

const top = rows.slice(0, Number(args.top));
writeFileSync(reportFile, `<!doctype html><meta charset="utf-8"><title>Audio check</title>
<style>body{font:14px system-ui;margin:16px}td,th{padding:4px 8px;border-bottom:1px solid #ddd;text-align:left}td.ipa{font-family:ui-monospace,monospace}</style>
<p>${rows.length} clips scored; the ${top.length} furthest from their text first. A high score means "listen to this", not "this is wrong".</p>
<table><tr><th></th><th>PER</th><th>Text</th><th>Voice</th><th>Heard</th><th>Expected</th><th>File</th></tr>
${top.map((r) => `<tr><td><button onclick="new Audio('${pathToFileURL(join(audioDir, r.job.file))}').play()">▶</button></td><td>${r.per.toFixed(2)}</td><td>${esc(r.job.text)}${r.job.fix ? " <small>(fixed)</small>" : ""}</td><td>${r.job.language} ${esc(voiceId(r.job.voice))}</td><td class="ipa">${esc(r.heard)}</td><td class="ipa">${esc(r.want)}</td><td><small>${r.job.file}</small></td></tr>`).join("\n")}
</table>`);
for (const r of top.slice(0, 15)) console.log(`${r.per.toFixed(2)}  ${r.job.language} ${voiceId(r.job.voice).padEnd(28)} ${r.job.text.padEnd(24)} heard ${r.heard}  want ${r.want}`);
console.log(`Report: ${reportFile}`);
