import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SPEAK_LANGUAGES } from "../../shared/api.ts";
import { CHUNKING, examples } from "../../server/conversation-ai.ts";
import { VOICES } from "../../server/content.ts";
import { elevenLabsSpeech, speechInput } from "../../server/speech.ts";

/** A stand-in for OpenRouter's /audio/speech: `respond` gets each request's JSON body and its 1-based number. */
async function fakeOpenRouter(respond: (body: Record<string, unknown>, n: number, res: ServerResponse) => void) {
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
  return { baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`, bodies };
}
const closers: (() => void)[] = [];
afterEach(() => closers.splice(0).forEach((c) => c()));

const oneSecond = Buffer.alloc(48000); // 24 kHz 16-bit mono
const pcm = (res: ServerResponse) => res.writeHead(200, { "Content-Type": "audio/pcm;rate=24000;channels=1" });
const out = () => join(mkdtempSync(join(tmpdir(), "ditto-speech-")), "line.wav");

describe("ElevenLabs speech", () => {
  it("writes the PCM as a 24 kHz WAV, tags the language, asks for zero retention and prices the characters sent", async () => {
    const api = await fakeOpenRouter((_b, _n, res) => pcm(res).end(oneSecond));
    const file = out();
    const { seconds, usage } = await elevenLabsSpeech("key", { baseURL: api.baseURL }).say("Ciao", "it", VOICES.it[1], file);

    const input = "[in Italian] Ciao";
    expect(api.bodies).toEqual([{ model: "elevenlabs/eleven-v4-turbo", input, voice: "george", response_format: "pcm", provider: { zdr: true } }]);
    expect(seconds).toBe(1);
    expect(usage).toEqual({ model: "elevenlabs/eleven-v4-turbo", inputTokens: 0, outputTokens: 0, audioSeconds: 1, costUsd: (input.length * 40) / 1e6 });
    const wav = readFileSync(file);
    expect(wav.length).toBe(44 + 48000);
    expect([wav.toString("ascii", 0, 4), wav.readUInt32LE(24), wav.readUInt16LE(34), wav.readUInt32LE(40)]).toEqual(["RIFF", 24000, 16, 48000]);
  });

  it("retries once when OpenRouter stalls partway through the audio", async () => {
    const api = await fakeOpenRouter((_b, n, res) => (n === 1 ? pcm(res).write(oneSecond.subarray(0, 1000)) : pcm(res).end(oneSecond)));
    const { seconds } = await elevenLabsSpeech("key", { baseURL: api.baseURL, timeoutMs: 200 }).say("Ciao", "it", VOICES.it[0], out());
    expect([seconds, api.bodies.length]).toEqual([1, 2]);
  });

  it("fails after a second stall, before any response", async () => {
    const api = await fakeOpenRouter(() => {});
    await expect(elevenLabsSpeech("key", { baseURL: api.baseURL, timeoutMs: 200 }).say("Ciao", "it", VOICES.it[0], out()))
      .rejects.toThrow("OpenRouter TTS timed out twice after 0.2 s (17 chars)");
    expect(api.bodies.length).toBe(2);
  });

  it("fails an HTTP error at once, without retrying", async () => {
    const api = await fakeOpenRouter((_b, _n, res) => res.writeHead(500, { "Content-Type": "application/json" }).end('{"error":{"message":"boom"}}'));
    await expect(elevenLabsSpeech("key", { baseURL: api.baseURL }).say("Ciao", "it", VOICES.it[0], out())).rejects.toThrow(/500.*boom/);
    expect(api.bodies.length).toBe(1);
  });

  it("fails when the audio is not 24 kHz mono PCM, rather than writing a WAV at the wrong rate", async () => {
    const api = await fakeOpenRouter((_b, _n, res) => res.writeHead(200, { "Content-Type": "audio/pcm;rate=44100;channels=1" }).end(oneSecond));
    await expect(elevenLabsSpeech("key", { baseURL: api.baseURL }).say("Ciao", "it", VOICES.it[0], out())).rejects.toThrow("returned audio/pcm;rate=44100;channels=1");
  });
});

describe("speechInput", () => {
  it("tags one or two plain-ASCII words in it, es, fr and nl, where the model would guess English", () => {
    expect(speechInput("come", "it")).toBe("[in Italian] come");
    expect(speechInput("Buenas noches", "es")).toBe("[in Latin American Spanish] Buenas noches");
    expect(speechInput("de rekening", "nl")).toBe("[in Dutch] de rekening");
  });

  it("leaves longer text, accented words, Greek and English untagged", () => {
    expect(speechInput("Come stai oggi?", "it")).toBe("Come stai oggi?");
    expect(speechInput("café", "fr")).toBe("café");
    expect(speechInput("ναι", "el")).toBe("ναι");
    expect(speechInput("come", "en")).toBe("come");
  });
});

describe("Talk languages", () => {
  it.each(SPEAK_LANGUAGES)("%s has a female and a male voice and its own prompt examples", (language) => {
    expect(VOICES[language].map((v) => v.gender).sort()).toEqual(["F", "M"]);
    expect(examples(language).suggestion.length).toBeGreaterThan(0);
  });

  it("gives French chunking rules that contain no Italian example and keep elisions whole", () => {
    const rules = CHUNKING("fr");
    expect(rules).toContain("j'ai");
    expect(rules).not.toMatch(/ci vediamo|Le porto|ho preso/);
  });
});
