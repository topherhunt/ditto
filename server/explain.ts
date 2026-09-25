import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { LANGUAGE_NAMES, LOCALE_NAMES, type Locale, type ServedUnit } from "../shared/content.ts";
import type { GradeResult } from "../shared/grader.ts";

export const EXPLAIN_CATEGORIES = [
  "spelling", "mishearing", "homophone", "agreement", "conjugation", "article", "preposition",
  "elision_contraction", "word_order", "missing_word", "extra_word", "vocabulary", "punctuation", "other",
] as const;

export const ExplanationSchema = z.strictObject({
  categories: z.array(z.enum(EXPLAIN_CATEGORIES)).min(1),
  summary: z.string().min(1),
  details: z.string().min(1),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

/** `locale` is the language the explanation is written in. */
export type ExplainInput = { unit: ServedUnit; grammarFocus: string[]; answer: string; grade: GradeResult; locale: Locale };

export interface Explainer {
  model: string;
  explain(input: ExplainInput): Promise<Explanation>;
}

const INSTRUCTIONS = `You are a concise language tutor. A learner heard a recorded ${"{language}"} sentence and typed what they heard (a dictation exercise). Explain why their answer is wrong.
- Pick every category that applies. "mishearing" means the typed words sound like the target but are different words; "homophone" means an identical-sounding word with a different spelling or meaning.
- Missing or wrong accents are NOT errors in this app; never mention them. The only punctuation error is a sentence end mark of the wrong kind (a question mark on a statement, or a period/exclamation mark on a question): explain it through the sentence's structure or intonation. Ignore all other punctuation.
- summary: one short sentence naming the key mistake.
- details: 2-4 sentences of plain text (no markdown) explaining the rule or the sound confusion, with the correct form. Write in {locale}.`;

export function buildPrompt({ unit, grammarFocus, answer, grade, locale }: ExplainInput): { instructions: string; input: string } {
  const diff = grade.words
    .map((w) => {
      const wrongMarks = w.after.flatMap((m) => (m.status === "wrong" ? [`; then "${m.ch}" where the sentence needs "${m.expected}"`] : []));
      switch (w.kind) {
        case "correct": return `  ok: ${w.target}${wrongMarks.join("")}`;
        case "accent": return `  ok (accent only): ${w.target}${wrongMarks.join("")}`;
        case "wrong": return `  typed "${w.typed}" for "${w.target}"${wrongMarks.join("")}`;
        case "missing": return `  missing: "${w.target}"`;
        case "extra": return `  extra: "${w.typed}"${wrongMarks.join("")}`;
      }
    })
    .join("\n");
  const lexicon = unit.words.map((w) => `  ${w.text}: ${w.lemma} (${w.pos}) -- ${w.gloss}`).join("\n");
  const input = [
    `Correct sentence: ${unit.text}`,
    unit.translation ? `Meaning: ${unit.translation}` : null,
    unit.variants.length ? `Also accepted: ${unit.variants.join(" | ")}` : null,
    grammarFocus.length ? `Lesson grammar focus: ${grammarFocus.join("; ")}` : null,
    `Learner typed: ${answer}`,
    `Word-by-word comparison (against "${grade.against}"):\n${diff}`,
    `Words in the correct sentence:\n${lexicon}`,
  ].filter(Boolean).join("\n\n");
  return { instructions: INSTRUCTIONS.replace("{language}", LANGUAGE_NAMES[unit.language]).replace("{locale}", LOCALE_NAMES[locale]), input };
}

export function openAIExplainer(apiKey: string, model: string): Explainer {
  const client = new OpenAI({ apiKey });
  return {
    model,
    async explain(input) {
      const { instructions, input: text } = buildPrompt(input);
      const res = await client.responses.parse({
        model,
        instructions,
        input: text,
        reasoning: { effort: "low" },
        text: { format: zodTextFormat(ExplanationSchema, "explanation") },
      });
      if (!res.output_parsed) throw new Error(`Explainer returned no parsed output (status ${res.status})`);
      return res.output_parsed;
    },
  };
}
