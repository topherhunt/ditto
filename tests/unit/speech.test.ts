import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SPEAK_LANGUAGES } from "../../shared/api.ts";
import { CHUNKING, examples } from "../../server/conversation-ai.ts";
import { VOICES } from "../../server/content.ts";
import { speechWorker } from "../../server/speech.ts";

const echo = join(import.meta.dirname, "../fixtures/echo-worker.mjs");
// The echo worker answers with its pid, so a changed answer means a new process.
const pid = async (speech: ReturnType<typeof speechWorker>) => (await speech.say("x", "it", VOICES.it[0], 1, "out.wav")).seconds;
const alive = (p: number) => { try { process.kill(p, 0); return true; } catch { return false; } };

describe("speech worker", () => {
  it("reuses one worker while busy, stops it after the idle time, and starts a fresh one on the next call", async () => {
    const speech = speechWorker(process.execPath, echo, 100);
    const first = await pid(speech);
    await sleep(50);
    expect(await pid(speech)).toBe(first);
    await sleep(300);
    expect(alive(first)).toBe(false);
    const second = await pid(speech);
    expect(second).not.toBe(first);
  });
});

describe("Talk languages", () => {
  const worker = readFileSync(join(import.meta.dirname, "../../server/speech-worker.py"), "utf8");
  const render = readFileSync(join(import.meta.dirname, "../../scripts/tts-render.py"), "utf8");

  it.each(SPEAK_LANGUAGES)("%s has a female and a male voice, a name in both TTS scripts and its own prompt examples", (language) => {
    expect(VOICES[language].map((v) => v.gender).sort()).toEqual(["F", "M"]);
    expect(worker).toContain(`"${language}": "`);
    expect(render).toContain(`"${language}": "`);
    expect(examples(language).suggestion.length).toBeGreaterThan(0);
  });

  it("gives French chunking rules that contain no Italian example and keep elisions whole", () => {
    const rules = CHUNKING("fr");
    expect(rules).toContain("j'ai");
    expect(rules).not.toMatch(/ci vediamo|Le porto|ho preso/);
  });
});
