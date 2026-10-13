import { writeFileSync } from "node:fs";
import type { Language } from "../shared/content.ts";
import type { Voice } from "./content.ts";
import { log } from "./log.ts";
import { charUsage, type Usage } from "./usage.ts";

/** Speech for conversation mode and quiz audio. */
export interface Speech {
  /** Renders `text` to a 16-bit WAV at `out`. `usage` is null for a free voice. */
  say(text: string, language: Language, voice: Voice, out: string): Promise<{ seconds: number; usage: Usage | null }>;
}

export const TTS_MODEL = "elevenlabs/eleven-v4-turbo";
const PCM_TYPE = "audio/pcm;rate=24000;channels=1";
const RATE = 24000;

/** Plain names: Latin American Spanish comes from the course's vocabulary and grammar, not a longer, costlier tag. */
const TAGS: Partial<Record<Language, string>> = { it: "Italian", es: "Spanish", fr: "French", nl: "Dutch" };

/**
 * What Eleven v4 Turbo is sent for `text`. It infers the language from the text, but reads a lone word or two in
 * plain ASCII as English ("nome" as "gnome"), so those get an inline language tag in Latin-script languages.
 * Greek script is unambiguous, and English needs no tag. Anything else it misreads gets an audio-fixes.json `say`.
 */
export function speechInput(text: string, language: Language): string {
  const short = text.trim().split(/\s+/).length <= 2;
  const tag = TAGS[language];
  return tag && short && /^[\x00-\x7f]*$/.test(text) ? `[in ${tag}] ${text}` : text;
}

/** A 44-byte WAV header for 16-bit mono PCM. */
export function wavHeader(dataBytes: number, rate: number): Buffer {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0); b.writeUInt32LE(36 + dataBytes, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(dataBytes, 40);
  return b;
}

/**
 * Eleven v4 Turbo on OpenRouter; it takes no speed or language. `zdr` makes OpenRouter refuse any route that retains the text.
 * A healthy render takes under 1 s, so `timeoutMs` (whole call, body included) means it stalled; one retry covers a stuck request.
 */
export function elevenLabsSpeech(apiKey: string, opts: { baseURL?: string; timeoutMs?: number } = {}): Speech {
  const url = `${opts.baseURL ?? "https://openrouter.ai/api/v1"}/audio/speech`;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  // Priced before the first call, so a missing price fails at startup.
  charUsage(TTS_MODEL, 0, 0);

  const render = async (input: string, voice: Voice): Promise<Buffer> => {
    const body = JSON.stringify({ model: TTS_MODEL, input, voice: voice.model, response_format: "pcm", provider: { zdr: true } });
    for (let attempt = 1; ; attempt++) {
      const signal = AbortSignal.timeout(timeoutMs);
      try {
        const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body, signal });
        if (!res.ok) throw new Error(`OpenRouter TTS ${res.status}: ${await res.text()}`);
        if (res.headers.get("content-type") !== PCM_TYPE) throw new Error(`OpenRouter TTS returned ${res.headers.get("content-type")}, not ${PCM_TYPE}`);
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        if (!signal.aborted) throw e;
        if (attempt === 2) throw new Error(`OpenRouter TTS timed out twice after ${timeoutMs / 1000} s (${input.length} chars)`);
        // The length, not the text: partner lines can echo the learner.
        log.warn(`OpenRouter TTS timed out after ${timeoutMs / 1000} s, retrying (${input.length} chars)`);
      }
    }
  };

  return {
    say: async (text, language, voice, out) => {
      if (voice.engine !== "elevenlabs") throw new Error(`Speech has no engine ${voice.engine}`);
      const input = speechInput(text, language);
      const pcm = await render(input, voice);
      if (pcm.length % 2) throw new Error(`OpenRouter TTS returned ${pcm.length} bytes, not whole 16-bit samples`);
      writeFileSync(out, Buffer.concat([wavHeader(pcm.length, RATE), pcm]));
      const seconds = pcm.length / 2 / RATE;
      return { seconds, usage: charUsage(TTS_MODEL, input.length, seconds) };
    },
  };
}
