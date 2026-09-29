import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { partnerVoice, speechWorker } from "../../server/speech.ts";

const echo = join(import.meta.dirname, "../fixtures/echo-worker.mjs");
// The echo worker answers with its pid, so a changed answer means a new process.
const pid = async (speech: ReturnType<typeof speechWorker>) => (await speech.say("x", partnerVoice("it"), 1, "out.wav")).seconds;
const alive = (p: number) => { try { process.kill(p, 0); return true; } catch { return false; } };

describe("speech worker", () => {
  it("reuses one worker while busy, stops it after the idle time, and starts a fresh one on the next call", async () => {
    const speech = speechWorker(process.execPath, echo, "tools", 100);
    const first = await pid(speech);
    await sleep(50);
    expect(await pid(speech)).toBe(first);
    await sleep(300);
    expect(alive(first)).toBe(false);
    const second = await pid(speech);
    expect(second).not.toBe(first);
  });
});
