import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SPEAK_LANGUAGES } from "../../shared/api.ts";
import { CHUNKING, examples } from "../../server/conversation-ai.ts";
import { VOICES } from "../../server/content.ts";
import { openAISpeech } from "../../server/speech.ts";

/** A stand-in for OpenAI's /audio/speech: `respond` gets each request's JSON body and its 1-based number. */
async function fakeOpenAI(respond: (body: Record<string, unknown>, n: number, res: ServerResponse) => void) {
  const bodies: Record<string, unknown>[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c)).on("end", () => {
      bodies.push(JSON.parse(raw));
      respond(bodies.at(-1)!, bodies.length, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  closers.push(() => { server.closeAllConnections(); server.close(); });
  return { baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, bodies };
}
const closers: (() => void)[] = [];
afterEach(() => closers.splice(0).forEach((c) => c()));

const oneSecond = Buffer.alloc(48000); // 24 kHz 16-bit mono
const out = () => join(mkdtempSync(join(tmpdir(), "ditto-speech-")), "line.wav");

describe("OpenAI speech", () => {
  it("writes the PCM as a 24 kHz WAV, prices its length, and asks for the language, voice and pace", async () => {
    const api = await fakeOpenAI((_b, _n, res) => res.end(oneSecond));
    const file = out();
    const { seconds, usage } = await openAISpeech("key", { baseURL: api.baseURL }).say("Ciao", "it", VOICES.it[1], 1.3, file);

    expect(seconds).toBe(1);
    expect(usage).toMatchObject({ model: "gpt-4o-mini-tts", audioSeconds: 1, costUsd: 0.015 / 60 });
    const wav = readFileSync(file);
    expect(wav.length).toBe(44 + 48000);
    expect([wav.toString("ascii", 0, 4), wav.readUInt32LE(24), wav.readUInt16LE(34), wav.readUInt32LE(40)]).toEqual(["RIFF", 24000, 16, 48000]);
    expect(api.bodies).toEqual([expect.objectContaining({ model: "gpt-4o-mini-tts", input: "Ciao", voice: "cedar", response_format: "pcm" })]);
    expect(api.bodies[0].instructions).toBe("Read this Italian text aloud in Italian with a native Italian accent, slowly and very clearly, for a beginner.");
  });

  it("retries once when OpenAI stalls partway through the audio", async () => {
    const api = await fakeOpenAI((_b, n, res) => (n === 1 ? res.write(oneSecond.subarray(0, 1000)) : res.end(oneSecond)));
    const { seconds } = await openAISpeech("key", { baseURL: api.baseURL, timeoutMs: 200 }).say("Ciao", "it", VOICES.it[0], 1, out());
    expect([seconds, api.bodies.length]).toEqual([1, 2]);
  });

  it("fails after a second stall, before any response", async () => {
    const api = await fakeOpenAI(() => {});
    await expect(openAISpeech("key", { baseURL: api.baseURL, timeoutMs: 200 }).say("Ciao", "it", VOICES.it[0], 1, out()))
      .rejects.toThrow("OpenAI TTS timed out twice after 0.2 s (4 chars)");
    expect(api.bodies.length).toBe(2);
  });

  it("fails an HTTP error at once, without retrying", async () => {
    const api = await fakeOpenAI((_b, _n, res) => res.writeHead(500, { "Content-Type": "application/json" }).end('{"error":{"message":"boom"}}'));
    await expect(openAISpeech("key", { baseURL: api.baseURL }).say("Ciao", "it", VOICES.it[0], 1, out())).rejects.toThrow(/500/);
    expect(api.bodies.length).toBe(1);
  });
});

describe("Talk languages", () => {
  const render = readFileSync(join(import.meta.dirname, "../../scripts/tts-render.py"), "utf8");

  it.each(SPEAK_LANGUAGES)("%s has a female and a male voice, a name in the TTS render script and its own prompt examples", (language) => {
    expect(VOICES[language].map((v) => v.gender).sort()).toEqual(["F", "M"]);
    expect(render).toContain(`"${language}": "`);
    expect(examples(language).suggestion.length).toBeGreaterThan(0);
  });

  it("gives French chunking rules that contain no Italian example and keep elisions whole", () => {
    const rules = CHUNKING("fr");
    expect(rules).toContain("j'ai");
    expect(rules).not.toMatch(/ci vediamo|Le porto|ho preso/);
  });
});
