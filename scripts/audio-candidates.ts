// Renders several candidate fixes for bad clips in one run, scores them, and writes data/audio-candidates.html to
// compare them by ear. Input: data/audio-candidates.json, shaped like audio-fixes.json but with a list of fixes per
// text. Each candidate renders to the file its fix would use, so adopting one means only copying its fix into
// content/audio-fixes.json (until then, `content:audio --prune` deletes it). Already rendered candidates are skipped.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { LANGUAGES, type Language } from "../shared/content.ts";
import { AudioFixSchema, audioFile, loadContent, VOICES, voiceId, type AudioJob } from "../server/content.ts";
import { esc, hearClips, renderJobs, root } from "./audio-jobs.ts";
import { phonemeErrorRate } from "./phonemes.ts";

const audioDir = process.env.AUDIO_DIR ?? join(root, "content/audio");
const planFile = join(root, "data/audio-candidates.json");
const reportFile = join(root, "data/audio-candidates.html");

const plan = z.partialRecord(z.enum(LANGUAGES), z.record(z.string(), z.record(z.string(), z.array(AudioFixSchema).min(1))))
  .parse(JSON.parse(readFileSync(planFile, "utf8")));
const { audioJobs } = loadContent(process.env.CONTENT_DIR ?? join(root, "content"), audioDir, { audio: "skip" });

const clips = Object.entries(plan).flatMap(([language, byVoice]) =>
  Object.entries(byVoice).flatMap(([id, byText]) => {
    const voice = VOICES[language as Language].find((v) => voiceId(v) === id);
    if (!voice) throw new Error(`unknown ${language} voice ${id}`);
    return Object.entries(byText).map(([text, fixes]) => {
      const current = audioJobs.find((j) => j.language === language && voiceId(j.voice) === id && j.text === text);
      if (!current) throw new Error(`no content renders ${language}|${id}|${text}`);
      const candidates = fixes.map((fix): AudioJob => {
        if (fix.phonemes && voice.engine !== "kokoro") throw new Error(`${id} "${text}": phonemes need a kokoro voice`);
        return { language: language as Language, voice, text, fix, file: audioFile(language as Language, voice, text, fix) };
      });
      return { current, candidates };
    });
  }));

const all = clips.flatMap((c) => [c.current, ...c.candidates]);
const missing = [...new Map(all.filter((j) => !existsSync(join(audioDir, j.file))).map((j) => [j.file, j])).values()];
console.log(`${missing.length} of ${all.length} clips to render`);
await renderJobs(missing, audioDir);
const heard = await hearClips(all, audioDir);

const row = (j: AudioJob, label: string) => {
  const h = heard.get(j.file)!;
  return `<tr><td><button onclick="new Audio('${pathToFileURL(join(audioDir, j.file))}').play()">▶</button></td><td>${label}</td>
<td>${phonemeErrorRate(h.heard, h.want).toFixed(2)}</td><td class="ipa">${esc(h.heard.replace(/\s/g, ""))}</td><td class="ipa">${esc(h.want)}</td><td><code>${esc(JSON.stringify(j.fix ?? null))}</code></td></tr>`;
};
writeFileSync(reportFile, `<!doctype html><meta charset="utf-8"><title>Audio candidates</title>
<style>body{font:14px system-ui;margin:16px}td,th{padding:4px 8px;border-bottom:1px solid #ddd;text-align:left}td.ipa{font-family:ui-monospace,monospace}</style>
${clips.map((c) => `<h3>${esc(c.current.text)} <small>${c.current.language} ${esc(voiceId(c.current.voice))}</small></h3>
<table><tr><th></th><th></th><th>PER</th><th>Heard</th><th>Expected</th><th>Fix</th></tr>
${row(c.current, "current")}
${c.candidates.map((j, i) => row(j, `#${i + 1}`)).join("\n")}
</table>`).join("\n")}`);
console.log(`Report: ${reportFile}`);
