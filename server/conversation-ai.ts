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
  suggestions: z.array(z.strictObject({ chunks: z.array(ChunkSchema).min(1) })).length(3),
});
const CoachSchema = z.strictObject({
  meant: z.string().min(1),
  level: z.enum(CEFR_LEVELS),
  grammarOk: z.boolean(),
  fixes: z.array(z.strictObject({ wrong: z.string(), right: z.string(), why: z.string() })),
  words: z.array(z.strictObject({ word: z.string(), ok: z.boolean(), heard: z.string(), hint: z.string() })),
  pronunciationOk: z.boolean(),
  feedback: z.string(),
});
const HowSchema = z.strictObject({ chunks: z.array(ChunkSchema).min(1) });

export type Line = { role: "partner" | "learner"; text: string };
/** `locale` is the learner's support language: glosses, titles and coaching are written in it. */
export type Setting = { language: Language; locale: Locale; level: string; scenario: string };
export type PartnerOut = { title: string; line: Chunk[]; suggestions: Chunk[][] };
export type CoachIn = Setting & {
  partnerLine: string;
  /** The sentence a retry is judged against; null on a first try. */
  target: string | null;
  transcript: string;
  heard: string;
  want: string;
  native: string;
};
export type Paid<T> = { result: T; usage: Usage };

export interface ConversationAI {
  transcribe(file: string, language: Language): Promise<string>;
  /** Transcription is billed by audio length, which the speech worker measures alongside it. */
  transcribeUsage(seconds: number): Usage;
  partner(setting: Setting, history: Line[]): Promise<Paid<PartnerOut>>;
  coach(input: CoachIn): Promise<Paid<CoachVerdict>>;
  howDoISay(setting: Setting, history: Line[], text: string): Promise<Paid<Chunk[]>>;
}

/** Chunks carry their own punctuation, so joining with spaces leaves only a space before closing marks to remove. */
export const joinChunks = (chunks: Chunk[]) => chunks.map((c) => c.text).join(" ").replace(/\s+([,.!?;:])/g, "$1");

const ABOVE: Record<string, string> = { A1: "A2", A2: "B1", B1: "B2", B2: "C1", C1: "C2", C2: "C2" };

const CHUNKING = `Split every sentence into chunks: the smallest runs of words that translate as a unit ("ci vediamo" = "see you", not word by word). The chunks, in order and joined with spaces, must be exactly the sentence, each chunk carrying its own punctuation. gloss is the chunk's meaning in {locale}, as it reads in this context.`;

const partnerInstructions = (s: Setting) => `You are a friendly native ${LANGUAGE_NAMES[s.language]} speaker in a spoken role-play with a learner at CEFR ${s.level}. Speak at ${ABOVE[s.level]}: slightly above the learner, natural, and short (one or two sentences, as in real conversation). Stay in the scenario and keep the conversation going, usually with a question.
Scenario: ${s.scenario}
- title: a short title for this conversation in {locale}.
- line: your next line.
- suggestions: exactly three replies the learner could say next, at the learner's level, each steering the conversation a different way.
${CHUNKING}`.replaceAll("{locale}", LOCALE_NAMES[s.locale]);

const COACH_INSTRUCTIONS = `You are a strict pronunciation and grammar coach for a {language} learner (CEFR {level}) speaking in a role-play. The learner recorded a spoken reply. You get:
- transcript: speech-to-text of the recording. It auto-corrects toward real words, so it can hide mispronunciations.
- heard: IPA phones a phoneme recognizer (wav2vec2 espeak) heard in the recording. This is the evidence for pronunciation.
- native: the same recognizer's IPA for a native text-to-speech voice saying the reference sentence. It shares the recognizer's blind spots, so compare heard against native first.
- want: espeak's dictionary IPA for the reference sentence, a second opinion (espeak's Dutch is sometimes wrong).

Grammar: meant is the {language} sentence the learner meant, corrected so it is grammatical and natural (keep their words and meaning where you can). grammarOk is true only if the transcript already is that sentence, ignoring case and punctuation. fixes lists each change from the transcript to meant, with a short plain why in {locale}. On a retry the learner is reading a given target: meant is the target, and grammarOk is whether the transcript says the target.
Register (formal vs informal address, e.g. tu/Lei, je/u) is the learner's choice, and they need not match the partner's: keep it in meant, don't list it as a fix, and don't let it fail grammarOk. The only exceptions are the learner's own reply addressing one person both ways ("come stai? Cosa desidera?") or a choice that would be a faux pas anywhere. If their register differs from what is usual here, you may say so briefly in feedback.

Pronunciation: judge heard against the reference sentence (the target on a retry, else the transcript). Go word by word through the reference; words lists each word with heard (the matching slice of heard IPA), ok, and a hint for every word that is not ok, else "". Fail a word (ok false) for any substituted, missing or added consonant or vowel, including a single consonant where native has a double, a wrong vowel quality, or an English r or vowel. Tolerate what the recognizer cannot tell apart or what native also shows:
- voiced/voiceless pairs of affricates and stops at a word start (tʃ/dʒ, k/g) when the rest of the word matches;
- vowel length marks (ː) and stress marks, except in Dutch where aa/a, ee/e, oo/o differ (kaas/kas);
- e/ɛ and o/ɔ in Italian;
- recognizer noise that appears in native too, and small differences at word boundaries (elision, linking).
pronunciationOk is true only if every word is ok. Never pass a reply because you understood it: a false pass is the worst failure.

The learner can't read IPA or phonetics jargon. Hints, fixes and feedback are in {locale}, short and plain, with no IPA symbols and no terms like "vowel quality" or "phone". A hint says what you heard and what it should sound like, both respelled the way a {locale} speaker would read them, e.g. "I heard 'vorrai' (vor-EYE), but it should sound like 'vor-RAY'." or "I heard 'cafe' with one f; hold the f: 'caf-fè'."

level: the CEFR level of meant as a reply in this conversation (vocabulary, grammar and length).
feedback: one short sentence telling the learner what to fix first (don't restate what was fine), or brief praise if everything passed.`;

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
      return (await client.audio.transcriptions.create({ model: transcribeModel, language, file: await toFile(readFileSync(file), basename(file)) })).text;
    },
    transcribeUsage: (seconds) => minuteUsage(transcribeModel, seconds),
    async partner(setting, history) {
      const input = history.length ? `Conversation so far:\n${transcript(history)}` : "Open the conversation.";
      const { result, usage } = await parse(PartnerSchema, "partner", partnerInstructions(setting), input);
      return { result: { title: result.title, line: result.line, suggestions: result.suggestions.map((s) => s.chunks) }, usage };
    },
    async coach(c) {
      const input = [
        `Partner said: ${c.partnerLine}`,
        c.target ? `Retry. Target: ${c.target}` : "First try (no target).",
        `transcript: ${c.transcript}`,
        `heard: ${c.heard}`,
        `native: ${c.native}`,
        `want: ${c.want}`,
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
