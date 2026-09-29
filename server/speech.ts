import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline";
import type { Language } from "../shared/content.ts";
import type { Voice } from "./content.ts";
import { charUsage, type Usage } from "./usage.ts";

/** Speech for conversation mode; server/speech-worker.py documents each call. */
export interface Speech {
  /** `pace` stretches the voice's own speed: 1.3 is 30% slower. `usage` is null for a voice rendered locally, which costs nothing. */
  say(text: string, voice: Voice, pace: number, out: string): Promise<{ seconds: number; usage: Usage | null }>;
}

/** The partner's one voice per language, chosen by ear for whole sentences: Kokoro (paid, via OpenRouter), or Piper for Dutch, which Kokoro lacks. */
const PARTNER_VOICES: Partial<Record<Language, Voice>> = {
  it: { engine: "kokoro", model: "if_sara", gender: "F" },
  nl: { engine: "piper", model: "nl_NL-ronnie-medium", gender: "M" },
  en: { engine: "kokoro", model: "am_michael", gender: "M" },
};
export const partnerVoice = (language: Language) => {
  const voice = PARTNER_VOICES[language];
  if (!voice) throw new Error(`No conversation voice for ${language}`);
  return voice;
};

/** The OpenRouter model the worker renders Kokoro voices with. */
const KOKORO_MODEL = "hexgrad/kokoro-82m";

type Worker = ChildProcessByStdio<Writable, Readable, null>;

/**
 * Starts the worker on first use (~1 s; ~300 MB with a Piper voice loaded) and again after it dies; requests in flight when it dies fail.
 * After `idleMs` with nothing in flight it is stopped to free that memory, by closing its stdin, which also stops it when this process exits.
 */
export function speechWorker(python: string, script: string, toolsDir: string, idleMs: number): Speech {
  // Priced before the first call, so a missing price fails at startup.
  charUsage(KOKORO_MODEL, 0, 0);
  const pending = new Map<number, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }>();
  let nextId = 1;
  let child: Worker | null = null;
  let idle: NodeJS.Timeout | undefined;

  const fail = (c: Worker, e: Error) => {
    if (child !== c) return; // "error" and "exit" can both fire
    child = null;
    for (const p of pending.values()) p.reject(e);
    pending.clear();
  };
  const start = () => {
    const c = spawn(python, [script, toolsDir], { stdio: ["pipe", "pipe", "inherit"] });
    createInterface({ input: c.stdout }).on("line", (line) => {
      const msg = JSON.parse(line) as { id?: number; error?: string };
      if (msg.id === undefined) return; // the ready line
      const p = pending.get(msg.id);
      if (!p) throw new Error(`Speech worker answered unknown request ${msg.id}`);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`Speech worker: ${msg.error}`));
      else p.resolve(msg);
    });
    c.on("exit", (code, signal) => fail(c, new Error(`Speech worker exited (${signal ?? code})`)));
    c.on("error", (e) => fail(c, new Error(`Speech worker failed: ${e.message}`)));
    return c;
  };
  // Detached first, so its exit fails nothing and the next call starts a fresh worker.
  const stop = () => {
    const c = child;
    child = null;
    c?.stdin.end();
  };

  const call = <T>(req: Record<string, unknown>): Promise<T> => {
    clearTimeout(idle);
    child ??= start();
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: Record<string, unknown>) => void, reject });
      child!.stdin.write(JSON.stringify({ id, ...req }) + "\n");
    }).finally(() => {
      clearTimeout(idle);
      if (!pending.size) idle = setTimeout(stop, idleMs).unref();
    });
  };

  return {
    say: async (text, voice, pace, out) => {
      const { seconds } = await call<{ seconds: number }>({ op: "say", text, voice: { engine: voice.engine, model: voice.model, speaker: voice.speaker }, pace, out });
      return { seconds, usage: voice.engine === "kokoro" ? charUsage(KOKORO_MODEL, text.length, seconds) : null };
    },
  };
}
