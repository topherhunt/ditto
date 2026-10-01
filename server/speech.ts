import { writeFileSync } from "node:fs";
import { LANGUAGE_NAMES, type Language } from "../shared/content.ts";
import { openAIClient } from "./conversation-ai.ts";
import type { Voice } from "./content.ts";
import { log } from "./log.ts";
import { minuteUsage, type Usage } from "./usage.ts";

/** Speech for conversation mode and quiz audio. */
export interface Speech {
  /** Renders `text` to a 16-bit WAV at `out`. `pace` asks for a slower voice: 1 is as is, 1.3 is 30% slower. `usage` is null for a free voice. */
  say(text: string, language: Language, voice: Voice, pace: number, out: string): Promise<{ seconds: number; usage: Usage | null }>;
}

const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
const RATE = 24000; // OpenAI's pcm is 24 kHz 16-bit mono

/** A 44-byte WAV header for 16-bit mono PCM. */
export function wavHeader(dataBytes: number, rate: number): Buffer {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0); b.writeUInt32LE(36 + dataBytes, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(dataBytes, 40);
  return b;
}

/**
 * gpt-4o-mini-tts ignores `speed`, so the pace goes in the instructions, and naming the language keeps a short text from
 * being read with the wrong accent. A healthy render takes ~2 s, so `timeoutMs` (whole call, body included: the SDK's own
 * timeout stops at the headers, and the audio streams after them) means OpenAI stalled; one retry covers a stuck request.
 */
export function openAISpeech(apiKey: string, opts: { baseURL?: string; timeoutMs?: number } = {}): Speech {
  const client = openAIClient(apiKey, opts.baseURL);
  const timeoutMs = opts.timeoutMs ?? 20_000;
  // Priced before the first call, so a missing price fails at startup.
  minuteUsage(OPENAI_TTS_MODEL, 0);

  const render = async (text: string, language: Language, voice: Voice, pace: number): Promise<Buffer> => {
    const name = LANGUAGE_NAMES[language];
    const speed = pace >= 1.2 ? "slowly and very clearly, for a beginner" : pace > 1 ? "a little slowly and clearly, for a learner" : "at a natural pace";
    const body = {
      model: OPENAI_TTS_MODEL, input: text, voice: voice.model, response_format: "pcm" as const,
      instructions: `Read this ${name} text aloud in ${name} with a native ${name} accent, ${speed}.`,
    };
    for (let attempt = 1; ; attempt++) {
      const signal = AbortSignal.timeout(timeoutMs);
      try {
        const res = await client.audio.speech.create(body, { signal, maxRetries: 0 });
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        if (!signal.aborted) throw e;
        if (attempt === 2) throw new Error(`OpenAI TTS timed out twice after ${timeoutMs / 1000} s (${text.length} chars)`);
        // The length, not the text: partner lines can echo the learner.
        log.warn(`OpenAI TTS timed out after ${timeoutMs / 1000} s, retrying (${text.length} chars)`);
      }
    }
  };

  return {
    say: async (text, language, voice, pace, out) => {
      if (voice.engine !== "openai") throw new Error(`Speech has no engine ${voice.engine}`);
      const pcm = await render(text, language, voice, pace);
      if (pcm.length % 2) throw new Error(`OpenAI TTS returned ${pcm.length} bytes, not whole 16-bit samples`);
      writeFileSync(out, Buffer.concat([wavHeader(pcm.length, RATE), pcm]));
      const seconds = pcm.length / 2 / RATE;
      return { seconds, usage: minuteUsage(OPENAI_TTS_MODEL, seconds) };
    },
  };
}
