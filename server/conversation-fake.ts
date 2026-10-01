// Scripted conversation AI and speech for tests and FAKE_CONVERSATION=1 (E2E, never production): no models, no spend.
// The coach fails every first try and passes every retry; tests replace methods to script other outcomes.
import { writeFileSync } from "node:fs";
import type { Chunk } from "../shared/api.ts";
import type { ConversationAI } from "./conversation-ai.ts";
import { wavHeader, type Speech } from "./speech.ts";
import type { Usage } from "./usage.ts";

export const FAKE_COST = 0.001;
const usage = (): Usage => ({ model: "fake", inputTokens: 100, outputTokens: 50, audioSeconds: 0, costUsd: FAKE_COST });

export function fakeSpeech(): Speech {
  return {
    // A valid, silent 0.1 s WAV, so fake partner lines play.
    say: async (_text, _language, _voice, _pace, out) => {
      writeFileSync(out, Buffer.concat([wavHeader(1600, 8000), Buffer.alloc(1600)]));
      return { seconds: 0.1, usage: null };
    },
  };
}

/** The partner's lines as sentence chunks; any other line is glossed word by word as "(word)". */
const GLOSSES: Record<string, Chunk[]> = {
  "Buongiorno! Cosa prende?": [{ text: "Buongiorno!", gloss: "Good morning!" }, { text: "Cosa prende?", gloss: "What will you have?" }],
  "Certo! Altro?": [{ text: "Certo!", gloss: "Sure!" }, { text: "Altro?", gloss: "Anything else?" }],
};

export function fakeAI(): ConversationAI {
  return {
    transcribe: async () => ({ result: "Vorrei un caffè", usage: { model: "fake-transcribe", inputTokens: 0, outputTokens: 0, audioSeconds: 2, costUsd: FAKE_COST } }),
    partner: async (_setting, history) => ({
      result: {
        title: "Al bar",
        line: history.length ? "Certo! Altro?" : "Buongiorno! Cosa prende?",
        level: "B1",
        suggestions: [
          [{ text: "Vorrei un caffè,", gloss: "I'd like a coffee," }, { text: "per favore.", gloss: "please." }],
          [{ text: "Un tè,", gloss: "A tea," }, { text: "grazie.", gloss: "thanks." }],
          [{ text: "Niente,", gloss: "Nothing," }, { text: "grazie.", gloss: "thanks." }],
        ],
      },
      usage: usage(),
    }),
    coach: async (c) => {
      const passed = c.target !== null;
      const meant = c.target ?? "Vorrei un caffè, per favore.";
      return {
        result: {
          meant, level: "A2", grammarOk: passed, fromSuggestion: c.suggestions.includes(meant),
          fixes: passed ? [] : [{ wrong: "Vorrei un caffè", right: "Vorrei un caffè, per favore", why: "Add \"per favore\" to be polite." }],
          feedback: passed ? "Well said." : "Add \"per favore\" to be polite.",
        },
        usage: usage(),
      };
    },
    howDoISay: async () => ({ result: [{ text: "Vorrei un tè", gloss: "I'd like a tea" }, { text: "freddo.", gloss: "iced." }], usage: usage() }),
    gloss: async (_setting, lines) => ({
      result: lines.map((l) => GLOSSES[l] ?? l.split(" ").map((w) => ({ text: w, gloss: `(${w})` }))),
      usage: usage(),
    }),
  };
}
