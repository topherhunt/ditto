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
  line: z.string().min(1),
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
const GlossSchema = z.strictObject({ lines: z.array(z.strictObject({ chunks: z.array(ChunkSchema).min(1) })) });

export type Line = { role: "partner" | "learner"; text: string };
/** Glosses are written in `locale`, the learner's own language; coaching in `helpLocale` and titles in `uiLocale`, each the course's language when immersed. */
export type Setting = { language: Language; locale: Locale; helpLocale: Locale; uiLocale: Locale; level: string; scenario: string };
export type PartnerOut = { title: string; line: string; suggestions: Chunk[][] };
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
  /** `name`'s extension tells the API the format. Billed by audio length, which the response reports. */
  transcribe(audio: Buffer, name: string, language: Language): Promise<Paid<string>>;
  partner(setting: Setting, history: Line[]): Promise<Paid<PartnerOut>>;
  coach(input: CoachIn): Promise<Paid<CoachVerdict>>;
  howDoISay(setting: Setting, history: Line[], text: string): Promise<Paid<Chunk[]>>;
  /** Each of `lines`, consecutive lines of the conversation, in chunks; the model can return a different number of lines. */
  gloss(setting: Setting, lines: string[]): Promise<Paid<Chunk[][]>>;
}

/** Chunks carry their own punctuation, so joining with spaces leaves only a space before closing marks to remove. */
export const joinChunks = (chunks: Chunk[]) => chunks.map((c) => c.text).join(" ").replace(/\s+([,.!?;:])/g, "$1");

const ABOVE: Record<string, string> = { A1: "A2", A2: "B1", B1: "B2", B2: "C1", C1: "C2", C2: "C2" };

/** Chunking examples and a suggestion sample in the language being spoken, so a prompt never shows another language. */
const EXAMPLES: Partial<Record<Language, { idioms: string; pronoun: string; compound: string; sentence: string; extra: string; suggestion: string; register: string; homophones: string }>> = {
  it: {
    idioms: `("ci vediamo" = "see you", "per favore" = "please")`, pronoun: `("Le porto" = "I'll bring you", "il conto" = "the bill")`, compound: `("ho preso" = "I took")`,
    sentence: `"Le porto tutto subito." is "Le porto" / "tutto" / "subito."`, extra: "", suggestion: "Sì, grazie. Vorrei anche un bicchiere d'acqua, per favore.", register: "tu/Lei", homophones: "words that sound the same (e/è, a/ha, anno/hanno)",
  },
  el: {
    idioms: `("τα λέμε" = "see you", "παρακαλώ" = "please", "με συγχωρείτε" = "excuse me")`, pronoun: `("σας φέρνω" = "I'll bring you", "το λογαριασμό" = "the bill")`, compound: `("έχω φάει" = "I have eaten", "θα πάω" = "I will go")`,
    sentence: `"Σας φέρνω όλα αμέσως." is "Σας φέρνω" / "όλα" / "αμέσως."`, extra: ` A Greek question ends in ";" (the Greek question mark), which stays attached to its last chunk. Never use the English "?" in Greek text.`,
    suggestion: "Ναι, ευχαριστώ. Θα ήθελα και ένα ποτήρι νερό, παρακαλώ.", register: "εσύ/εσείς", homophones: "words that sound the same (η/ι/υ/ει/οι, ο/ω, ε/αι)",
  },
  es: {
    idioms: `("hasta luego" = "see you later", "por favor" = "please")`, pronoun: `("Le traigo" = "I'll bring you", "la cuenta" = "the bill")`, compound: `("he tomado" = "I have taken")`,
    sentence: `"Le traigo todo enseguida." is "Le traigo" / "todo" / "enseguida."`, extra: "", suggestion: "Sí, gracias. Quisiera también un vaso de agua, por favor.", register: "tú/usted", homophones: "words that sound the same (b/v, haber/a ver, silent h)",
  },
  fr: {
    idioms: `("à bientôt" = "see you soon", "s'il vous plaît" = "please", "tout de suite" = "right away")`, pronoun: `("je vous apporte" = "I'll bring you", "l'addition" = "the bill")`, compound: `("j'ai pris" = "I took")`,
    sentence: `"Je vous apporte tout de suite." is "Je vous apporte" / "tout de suite."`,
    extra: ` An elided or hyphenated word is one chunk, written exactly as in the sentence: "j'ai", "l'addition", "qu'est-ce que", "as-tu" are never split at the apostrophe or hyphen.`,
    suggestion: "Oui, merci. Je voudrais aussi un verre d'eau, s'il vous plaît.", register: "tu/vous", homophones: "words that sound the same or silent endings (a/à, ses/ces, parle/parles/parlent, marié/mariée, -é/-er/-ez)",
  },
  nl: {
    idioms: `("tot straks" = "see you later", "alsjeblieft" = "please")`, pronoun: `("breng u" = "bring you", "de rekening" = "the bill")`, compound: `("heb genomen" = "took", "have taken")`,
    sentence: `"Ik breng u alles meteen." is "Ik" / "breng u" / "alles" / "meteen."`, extra: "", suggestion: "Ja, graag. Ik wil ook een glas water, alsjeblieft.", register: "je/u", homophones: "words that sound the same or endings that differ only in writing (d/t, ei/ij, au/ou)",
  },
  en: {
    idioms: `("see you later" = the leave-taking, "right away" = immediately)`, pronoun: `("the bill", "a glass of water")`, compound: `("I've taken", "pick up")`,
    sentence: `"I'll bring everything right away." is "I'll" / "bring" / "everything" / "right away."`, extra: "", suggestion: "Yes, please. I'd also like a glass of water, please.", register: "you (English has no formal address)", homophones: "words that sound the same (their/there, to/too)",
  },
};
export const examples = (l: Language) => EXAMPLES[l] ?? (() => { throw new Error(`No Talk prompt examples for ${l}`); })();

export const CHUNKING = (l: Language) => {
  const e = examples(l);
  return `Chunks are for word-by-word glossing: by default each chunk is one word. Group words only where glossing them one at a time would mislead: idioms and fixed expressions ${e.idioms}, an object pronoun or article with the word it belongs to ${e.pronoun}, and compound verb forms ${e.compound}. ${e.sentence}, never one chunk.${e.extra} The chunks, in order and joined with spaces, must be exactly the sentence, each chunk carrying its own punctuation. gloss is the chunk's meaning in {locale}, as it reads in this context.`;
};

const partnerInstructions = (s: Setting) => `You are a friendly native ${LANGUAGE_NAMES[s.language]} speaker in a spoken role-play with a learner at CEFR ${s.level}. Speak at ${ABOVE[s.level]}: slightly above the learner, natural, and short (one or two sentences, as in real conversation). Stay in the scenario and keep the conversation going, usually with a question.
The conversation is open-ended: never steer toward ending it (no goodbyes, no wrapping up). When the scenario's task is done (the order is taken, the room is booked), you can ask if they need anything else, but always leave an opening too: ask something personal or contextual that invites more talk, such as how their day is going, how long they're visiting, or whether they've seen something nearby.
Scenario: ${s.scenario}
- title: a short title for this conversation in ${LOCALE_NAMES[s.uiLocale]}.
- line: your next line.
- suggestions: exactly three replies the learner could say next, at the learner's level, each steering the conversation a different way, none of them ending it. Make each a polite, forthcoming full sentence (or two short ones) of about 6 to 12 words, never a bare two- or three-word answer: at A1, "${examples(s.language).suggestion}" rather than a bare "${examples(s.language).suggestion.split(/[.,]/)[0]}." Split each suggestion into chunks.
${CHUNKING(s.language)}`.replaceAll("{locale}", LOCALE_NAMES[s.locale]);

const COACH_INSTRUCTIONS = `You are a grammar coach for a {language} learner (CEFR {level}) speaking in a role-play. You get the transcript of the learner's spoken reply (speech-to-text; ignore its punctuation and capitalization). Pronunciation is not judged. Speech-to-text picks one spelling for {homophones}, so never count a choice between them as an error when the spoken form would be identical.

meant is the {language} sentence the learner meant, corrected so it is grammatical and natural (keep their words and meaning where you can). grammarOk is true only if the transcript already is that sentence, ignoring case and punctuation. fixes lists each change from the transcript to meant, with a short plain why in {help}. On a retry the learner is reading a given target: meant is the target, and grammarOk is whether the transcript says the target.
Register (informal vs formal address: {register}, and the verb forms that go with them) is always the learner's choice. Keep the learner's register in meant, never list it in fixes, never let it fail grammarOk, and never mention it in feedback. The partner addressing the learner formally while the learner answers informally (or the reverse) is normal and is not inconsistency, whoever the partner is (waiter, stranger, receptionist).

The learner can't read linguistics jargon. Fixes and feedback are in {help}, short and plain.
level: the CEFR level of meant as a reply in this conversation (vocabulary, grammar and length).
feedback: one short sentence telling the learner what to fix first (don't restate what was fine), or brief praise if it passed.
fromSuggestion: true if the learner's reply is substantially one of the suggested replies shown to them: the same words and meaning, even reordered, slightly changed, or with words added or dropped. False for a reply of their own, even on the same topic, and when no suggestions were shown.`;

const howInstructions = (l: Language) => `A {language} learner (CEFR {level}) in a spoken role-play wants to say something they wrote in {locale} (or mixed languages). Give the natural {language} sentence for it, at their level, fitting the conversation, split into chunks.
${CHUNKING(l)}`;

const glossInstructions = (l: Language) => `You gloss {language} for a learner (CEFR {level}) who reads {locale}. You get consecutive numbered lines of a role-play conversation. Return exactly one entry per numbered line, in the same order, even when a line has several sentences, splitting each line, exactly as written, into chunks.
${CHUNKING(l)}`;

const fill = (t: string, s: Setting) =>
  t.replaceAll("{language}", LANGUAGE_NAMES[s.language]).replaceAll("{locale}", LOCALE_NAMES[s.locale]).replaceAll("{help}", LOCALE_NAMES[s.helpLocale])
    .replaceAll("{level}", s.level).replaceAll("{register}", examples(s.language).register).replaceAll("{homophones}", examples(s.language).homophones);
const transcript = (history: Line[]) => history.map((l) => `${l.role === "partner" ? "Partner" : "Learner"}: ${l.text}`).join("\n");

export function openAIConversation(apiKey: string, model: string, effort: "none" | "low" | "medium" = "low", transcribeModel = "gpt-transcribe"): ConversationAI {
  // Node 26's built-in fetch can reuse destroyed HTTP/2 sessions (ERR_HTTP2_INVALID_SESSION); HTTP/1.1 avoids it.
  // The npm undici Agent must share a major version with the undici bundled in Node: Node 24's (undici 7) rejects it with
  // "invalid onRequestStart method". Using undici's own fetch instead breaks uploads, which build the global FormData.
  const client = new OpenAI({ apiKey, fetchOptions: { dispatcher: new Agent({ allowH2: false }) } });
  // Priced before the first call, so a model missing from the price table fails at startup.
  tokenUsage(model, 0, 0);
  minuteUsage(transcribeModel, 0);

  const parse = async <T extends z.ZodType>(schema: T, name: string, instructions: string, input: string): Promise<Paid<z.infer<T>>> => {
    const res = await client.responses.parse({
      // store: false, or OpenAI keeps each response for 30 days (docs/privacy.md).
      model, instructions, input, reasoning: { effort }, text: { format: zodTextFormat(schema, name) }, store: false,
    });
    if (!res.output_parsed) throw new Error(`${model} returned no parsed ${name} (status ${res.status})`);
    if (!res.usage) throw new Error(`${model} returned no usage for ${name}`);
    return { result: res.output_parsed as z.infer<T>, usage: tokenUsage(model, res.usage.input_tokens, res.usage.output_tokens) };
  };

  return {
    async transcribe(audio, name, language) {
      const res = await client.audio.transcriptions.create({ model: transcribeModel, language, file: await toFile(audio, name) });
      if (res.usage?.type !== "duration") throw new Error(`${transcribeModel} returned no duration usage (got ${JSON.stringify(res.usage)})`);
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
      const { result, usage } = await parse(HowSchema, "how", fill(howInstructions(setting.language), setting), input);
      return { result: result.chunks, usage };
    },
    async gloss(setting, lines) {
      const { result, usage } = await parse(GlossSchema, "gloss", fill(glossInstructions(setting.language), setting),
        `${lines.length} lines:\n${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}`);
      return { result: result.lines.map((l) => l.chunks), usage };
    },
  };
}
