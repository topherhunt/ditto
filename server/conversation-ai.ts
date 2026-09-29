import { readFileSync } from "node:fs";
import { basename } from "node:path";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Agent } from "undici";
import { z } from "zod";
import { CEFR_LEVELS, type Chunk, type CoachVerdict } from "../shared/api.ts";
import { LANGUAGE_NAMES, LOCALE_NAMES, type Language, type Locale } from "../shared/content.ts";
import { minuteUsage, tokenUsage, type Usage } from "./usage.ts";

const ChunkSchema = z.strictObject({ text: z.string().min(1), gloss: z.string().min(1) });
const PartnerSchema = z.strictObject({
  title: z.string().min(1),
  line: z.array(ChunkSchema).min(1),
  learnerLine: z.array(ChunkSchema).min(1).nullable(),
  suggestions: z.array(z.strictObject({ chunks: z.array(ChunkSchema).min(1) })).length(3),
});
const CoachSchema = z.strictObject({
  meant: z.string().min(1),
  level: z.enum(CEFR_LEVELS),
  grammarOk: z.boolean(),
  fromSuggestion: z.boolean(),
  fixes: z.array(z.strictObject({ wrong: z.string(), right: z.string(), why: z.string() })),
  feedback: z.string(),
});
const HowSchema = z.strictObject({ chunks: z.array(ChunkSchema).min(1) });

export type Line = { role: "partner" | "learner"; text: string };
/** `locale` is the learner's support language: glosses, titles and coaching are written in it. */
export type Setting = { language: Language; locale: Locale; level: string; scenario: string };
/** `learnerLine`: the learner's last line in chunks, null when opening. */
export type PartnerOut = { title: string; line: Chunk[]; learnerLine: Chunk[] | null; suggestions: Chunk[][] };
export type CoachIn = Setting & {
  partnerLine: string;
  /** The sentence a retry is judged against; null on a first try. */
  target: string | null;
  transcript: string;
  /** The suggested replies the learner could see; empty in hard mode. */
  suggestions: string[];
};
export type Paid<T> = { result: T; usage: Usage };

export interface ConversationAI {
  /** Billed by audio length, which the response reports. */
  transcribe(file: string, language: Language): Promise<Paid<string>>;
  partner(setting: Setting, history: Line[]): Promise<Paid<PartnerOut>>;
  coach(input: CoachIn): Promise<Paid<CoachVerdict>>;
  howDoISay(setting: Setting, history: Line[], text: string): Promise<Paid<Chunk[]>>;
}

/** Chunks carry their own punctuation, so joining with spaces leaves only a space before closing marks to remove. */
export const joinChunks = (chunks: Chunk[]) => chunks.map((c) => c.text).join(" ").replace(/\s+([,.!?;:])/g, "$1");

const ABOVE: Record<string, string> = { A1: "A2", A2: "B1", B1: "B2", B2: "C1", C1: "C2", C2: "C2" };

const CHUNKING = `Split every sentence into chunks for word-by-word glossing: by default each chunk is one word. Group words only where glossing them one at a time would mislead: idioms and fixed expressions ("ci vediamo" = "see you", "per favore" = "please"), an object pronoun or article with the word it belongs to ("Le porto" = "I'll bring you", "il conto" = "the bill"), and compound verb forms ("ho preso" = "I took"). "Le porto tutto subito." is "Le porto" / "tutto" / "subito.", never one chunk. The chunks, in order and joined with spaces, must be exactly the sentence, each chunk carrying its own punctuation. gloss is the chunk's meaning in {locale}, as it reads in this context.`;

const partnerInstructions = (s: Setting) => `You are a friendly native ${LANGUAGE_NAMES[s.language]} speaker in a spoken role-play with a learner at CEFR ${s.level}. Speak at ${ABOVE[s.level]}: slightly above the learner, natural, and short (one or two sentences, as in real conversation). Stay in the scenario and keep the conversation going, usually with a question.
The conversation is open-ended: never steer toward ending it (no goodbyes, no wrapping up). When the scenario's task is done (the order is taken, the room is booked), you can ask if they need anything else, but always leave an opening too: ask something personal or contextual that invites more talk, such as how their day is going, how long they're visiting, or whether they've seen something nearby.
Scenario: ${s.scenario}
- title: a short title for this conversation in {locale}.
- line: your next line.
- learnerLine: the learner's last line in the conversation so far, exactly as written, split into chunks; null when opening the conversation.
- suggestions: exactly three replies the learner could say next, at the learner's level, each steering the conversation a different way, none of them ending it. Make each a polite, forthcoming full sentence (or two short ones) of about 6 to 12 words, never a bare two- or three-word answer: at A1, "Sì, grazie. Vorrei anche un bicchiere d'acqua, per favore." rather than "Sì, grazie."
${CHUNKING}`.replaceAll("{locale}", LOCALE_NAMES[s.locale]);

const COACH_INSTRUCTIONS = `You are a grammar coach for a {language} learner (CEFR {level}) speaking in a role-play. You get the transcript of the learner's spoken reply (speech-to-text; ignore its punctuation and capitalization). Pronunciation is not judged.

meant is the {language} sentence the learner meant, corrected so it is grammatical and natural (keep their words and meaning where you can). grammarOk is true only if the transcript already is that sentence, ignoring case and punctuation. fixes lists each change from the transcript to meant, with a short plain why in {locale}. On a retry the learner is reading a given target: meant is the target, and grammarOk is whether the transcript says the target.
Register (informal vs formal address: tu/Lei, je/u, and the verb forms that go with them) is always the learner's choice. Keep the learner's register in meant, never list it in fixes, never let it fail grammarOk, and never mention it in feedback. The partner addressing the learner formally while the learner answers informally (or the reverse) is normal and is not inconsistency, whoever the partner is (waiter, stranger, receptionist).

The learner can't read linguistics jargon. Fixes and feedback are in {locale}, short and plain.
level: the CEFR level of meant as a reply in this conversation (vocabulary, grammar and length).
feedback: one short sentence telling the learner what to fix first (don't restate what was fine), or brief praise if it passed.
fromSuggestion: true if the learner's reply is substantially one of the suggested replies shown to them: the same words and meaning, even reordered, slightly changed, or with words added or dropped. False for a reply of their own, even on the same topic, and when no suggestions were shown.`;

const HOW_INSTRUCTIONS = `A {language} learner (CEFR {level}) in a spoken role-play wants to say something they wrote in {locale} (or mixed languages). Give the natural {language} sentence for it, at their level, fitting the conversation.
${CHUNKING}`;

const fill = (t: string, s: Setting) =>
  t.replaceAll("{language}", LANGUAGE_NAMES[s.language]).replaceAll("{locale}", LOCALE_NAMES[s.locale]).replaceAll("{level}", s.level);
const transcript = (history: Line[]) => history.map((l) => `${l.role === "partner" ? "Partner" : "Learner"}: ${l.text}`).join("\n");

export function openAIConversation(apiKey: string, model: string, effort: "none" | "low" | "medium" = "low", transcribeModel = "gpt-transcribe"): ConversationAI {
  // Node 26's built-in fetch reuses destroyed HTTP/2 sessions to api.openai.com (ERR_HTTP2_INVALID_SESSION); HTTP/1.1 avoids it.
  const client = new OpenAI({ apiKey, fetchOptions: { dispatcher: new Agent({ allowH2: false }) } });
  // Priced before the first call, so a model missing from the price table fails at startup.
  tokenUsage(model, 0, 0);
  minuteUsage(transcribeModel, 0);

  const parse = async <T extends z.ZodType>(schema: T, name: string, instructions: string, input: string): Promise<Paid<z.infer<T>>> => {
    const res = await client.responses.parse({
      model, instructions, input, reasoning: { effort }, text: { format: zodTextFormat(schema, name) },
    });
    if (!res.output_parsed) throw new Error(`${model} returned no parsed ${name} (status ${res.status})`);
    if (!res.usage) throw new Error(`${model} returned no usage for ${name}`);
    return { result: res.output_parsed as z.infer<T>, usage: tokenUsage(model, res.usage.input_tokens, res.usage.output_tokens) };
  };

  return {
    async transcribe(file, language) {
      // gpt-transcribe ignores the singular `language`; `languages` steers it toward the conversation's language.
      const res = await client.audio.transcriptions.create({ model: transcribeModel, languages: [language], file: await toFile(readFileSync(file), basename(file)) });
      if (res.usage?.type !== "duration") throw new Error(`${transcribeModel} returned no duration usage`);
      return { result: res.text, usage: minuteUsage(transcribeModel, res.usage.seconds) };
    },
    async partner(setting, history) {
      const input = history.length ? `Conversation so far:\n${transcript(history)}` : "Open the conversation.";
      const { result, usage } = await parse(PartnerSchema, "partner", partnerInstructions(setting), input);
      return { result: { ...result, suggestions: result.suggestions.map((s) => s.chunks) }, usage };
    },
    async coach(c) {
      const input = [
        `Partner said: ${c.partnerLine}`,
        c.target ? `Retry. Target: ${c.target}` : "First try (no target).",
        c.suggestions.length ? `Suggested replies shown:\n${c.suggestions.map((s) => `- ${s}`).join("\n")}` : "No suggested replies were shown.",
        `transcript: ${c.transcript}`,
      ].join("\n");
      const { result, usage } = await parse(CoachSchema, "coach", fill(COACH_INSTRUCTIONS, c), input);
      return { result: { ...result, meant: c.target ?? result.meant }, usage };
    },
    async howDoISay(setting, history, text) {
      const input = `${history.length ? `Conversation so far:\n${transcript(history)}\n\n` : ""}The learner wants to say: ${text}`;
      const { result, usage } = await parse(HowSchema, "how", fill(HOW_INSTRUCTIONS, setting), input);
      return { result: result.chunks, usage };
    },
  };
}
