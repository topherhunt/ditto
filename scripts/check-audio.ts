// Sanity-checks rendered clips: a phoneme recognizer listens to each one, and the clips whose phonemes stray
// furthest from the text's come first in data/audio-check.html, to be played and judged by ear.
// Default scope: texts of 1-2 words, where a slurred or clipped sound has no context to hide in.
// Flags: --all (every length), --lang it, --voice kokoro:if_sara, --text "sì" (repeatable), --top 300.
// Results are cached per clip file in data/audio-check.jsonl, so only new renders get scored.
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { loadContent, voiceId } from "../server/content.ts";

const root = join(import.meta.dirname, "..");
const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const python = join(root, ".venv/bin/python");
if (!existsSync(python)) throw new Error(`TTS venv not found at ${python}; see docs/plan.md (Audio)`);
const cacheFile = join(root, "data/audio-check.jsonl");
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

type Heard = { file: string; heard: string; want: string };
const cache = new Map<string, Heard>();
if (existsSync(cacheFile))
  for (const line of readFileSync(cacheFile, "utf8").split("\n").filter(Boolean)) {
    const h = JSON.parse(line) as Heard;
    cache.set(h.file, h);
  }

const todo = present.filter((j) => !cache.has(j.file));
console.log(`${present.length} clips in scope, ${todo.length} to score`);
if (todo.length) {
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
}

// The recognizer and espeak disagree on notation more than on sound; fold the differences that aren't errors.
const FOLD: [RegExp, string][] = [
  [/[ˈˌːˑ.,!?;:'"\-\s\d͡‿]/g, ""], [/ʧ/g, "tʃ"], [/ʤ/g, "dʒ"], [/[ʊ]/g, "u"], [/[ɪɨj]/g, "i"], [/ɛ/g, "e"], [/ɔ/g, "o"],
  [/[ɾɹʁ]/g, "r"], [/[ɑɐ]/g, "a"], [/ɡ/g, "g"],
];
const fold = (ipa: string) => FOLD.reduce((s, [re, to]) => s.replace(re, to), ipa.normalize("NFD").replace(/\p{M}/gu, ""));

function distance(a: string[], b: string[]): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) [prev, d[j]] = [d[j], Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))];
  }
  return d[b.length];
}

const rows = present.map((j) => {
  const h = cache.get(j.file)!;
  const heard = [...fold(h.heard)], want = [...fold(h.want)];
  return { job: j, heard: h.heard.replace(/\s/g, ""), want: h.want, per: distance(heard, want) / Math.max(1, want.length) };
}).sort((a, b) => b.per - a.per);

const top = rows.slice(0, Number(args.top));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
writeFileSync(reportFile, `<!doctype html><meta charset="utf-8"><title>Audio check</title>
<style>body{font:14px system-ui;margin:16px}td,th{padding:4px 8px;border-bottom:1px solid #ddd;text-align:left}td.ipa{font-family:ui-monospace,monospace}</style>
<p>${rows.length} clips scored; the ${top.length} furthest from their text first. A high score means "listen to this", not "this is wrong".</p>
<table><tr><th></th><th>PER</th><th>Text</th><th>Voice</th><th>Heard</th><th>Expected</th><th>File</th></tr>
${top.map((r) => `<tr><td><button onclick="new Audio('${pathToFileURL(join(audioDir, r.job.file))}').play()">▶</button></td><td>${r.per.toFixed(2)}</td><td>${esc(r.job.text)}${r.job.fix ? " <small>(fixed)</small>" : ""}</td><td>${r.job.language} ${esc(voiceId(r.job.voice))}</td><td class="ipa">${esc(r.heard)}</td><td class="ipa">${esc(r.want)}</td><td><small>${r.job.file}</small></td></tr>`).join("\n")}
</table>`);
for (const r of top.slice(0, 15)) console.log(`${r.per.toFixed(2)}  ${r.job.language} ${voiceId(r.job.voice).padEnd(28)} ${r.job.text.padEnd(24)} heard ${r.heard}  want ${r.want}`);
console.log(`Report: ${reportFile}`);
