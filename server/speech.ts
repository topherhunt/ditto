import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline";
import type { Language } from "../shared/content.ts";

/** Local speech for conversation mode; server/speech-worker.py documents each call. */
export interface Speech {
  duration(file: string): Promise<{ seconds: number }>;
  say(text: string, language: Language, out: string): Promise<{ seconds: number }>;
}

/** The partner's voice. */
const PIPER_VOICES: Partial<Record<Language, string>> = { it: "it_IT-paola-medium", nl: "nl_NL-pim-medium", en: "en_US-amy-medium" };

type Worker = ChildProcessByStdio<Writable, Readable, null>;

const voiceOf = (language: Language) => {
  const model = PIPER_VOICES[language];
  if (!model) throw new Error(`No conversation voice for ${language}`);
  return { model };
};

/**
 * Starts the worker on first use (it loads a Piper voice on first use, holding ~100 MB per voice) and again after it dies;
 * requests in flight when it dies fail. It exits when this process closes its stdin.
 */
export function speechWorker(python: string, script: string, toolsDir: string): Speech {
  const pending = new Map<number, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }>();
  let nextId = 1;
  let child: Worker | null = null;

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

  const call = <T>(req: Record<string, unknown>): Promise<T> => {
    child ??= start();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: Record<string, unknown>) => void, reject });
      child!.stdin.write(JSON.stringify({ id, ...req }) + "\n");
    });
  };

  return {
    duration: (file) => call({ op: "duration", file }),
    say: (text, language, out) => call({ op: "say", text, voice: voiceOf(language), out }),
  };
}
