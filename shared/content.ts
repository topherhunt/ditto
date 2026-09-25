import { z } from "zod";

export const LANGUAGES = ["en", "it", "nl", "ga"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", it: "Italian", nl: "Dutch", ga: "Irish" };

/** UI languages, which are also the support languages content can be translated into. `es-419` is Latin American Spanish. */
export const LOCALES = ["en", "es-419", "nl", "it"] as const;
export type Locale = (typeof LOCALES)[number];
/** In English, for LLM prompts. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", "es-419": "Latin American Spanish", nl: "Dutch", it: "Italian" };

/** Support languages each target language's content carries, in fallback order: every localized field has exactly these. */
export const SUPPORT_LOCALES: Record<Language, readonly Locale[]> = { en: ["en"], it: ["en", "es-419", "nl"], nl: ["en"], ga: ["en"] };

/** The support language a learner with UI `locale` gets for `language`: their own when the content has it, else the first. */
export const supportLocale = (language: Language, locale: Locale): Locale =>
  SUPPORT_LOCALES[language].includes(locale) ? locale : SUPPORT_LOCALES[language][0];

export const STAGES = ["word", "phrase", "chunk", "sentence"] as const;
export type Stage = (typeof STAGES)[number];

export const PATHS = { full: STAGES, chunks: ["chunk", "sentence"], sentences: ["sentence"] } as const satisfies Record<string, readonly Stage[]>;
export type PracticePath = keyof typeof PATHS;

/** Support-language text. The loader requires exactly the course language's SUPPORT_LOCALES as keys. */
const localized = <T extends z.ZodType>(inner: T) => z.partialRecord(z.enum(LOCALES), inner);
export type Localized<T> = Partial<Record<Locale, T>>;

export const LexEntrySchema = z.strictObject({
  lemma: z.string().min(1),
  pos: z.enum(["NOUN", "VERB", "AUX", "ADJ", "ADV", "PRON", "DET", "ADP", "CCONJ", "SCONJ", "NUM", "INTJ", "PROPN", "PART"]),
  gloss: localized(z.string().min(1)),
});

export const UnitSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  rev: z.int().positive(),
  stage: z.enum(STAGES),
  text: z.string().min(1),
  translation: localized(z.string().min(1)).optional(),
  /** Two wrong translations, offered with the real one in the meaning check. Required with a translation. */
  distractors: localized(z.tuple([z.string().min(1), z.string().min(1)])).optional(),
  variants: z.array(z.string().min(1)).optional(),
  /** Word indices after which a comma (or semicolon) is accepted though the text has none. */
  commas: z.array(z.int().min(0)).optional(),
  /** Word index -> lexicon sense suffix, for surfaces with several senses (key `lo#pron`). */
  senses: z.record(z.string().regex(/^\d+$/), z.string()).optional(),
});

export const LessonSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  grammarFocus: localized(z.array(z.string())),
  units: z.array(UnitSchema).min(1),
});

export const CourseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  language: z.enum(LANGUAGES),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  order: z.int(),
  title: z.string().min(1),
  description: localized(z.string().min(1)),
  /** `optional` modules are specialized vocabulary: unlockable, never required by a main module. */
  track: z.enum(["main", "optional"]),
  /** Course ids that must be complete before this one unlocks. Their lexicons and lemmas are inherited. */
  requires: z.array(z.string()),
  /** Lemmas (non-PROPN) this course teaches; every other lemma it uses must come from a required course. */
  introduces: z.array(z.string().min(1)),
  /** Lowercase surface form (or `surface#sense`) -> annotation. Surfaces from required courses need no entry. */
  lexicon: z.record(z.string(), LexEntrySchema),
  lessons: z.array(LessonSchema).min(1),
});

export type LexEntry = z.infer<typeof LexEntrySchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Unit = z.infer<typeof UnitSchema>;

/**
 * A unit as the API serves it: audio URLs resolved, per-word annotations attached, localized text in one support
 * language. `audio` lists one URL per voice of the language, in the same voice order for the unit and each of its words.
 */
export type ServedWord = Omit<LexEntry, "gloss"> & { gloss: string; text: string; audio: string[] };
export type ServedUnit = {
  id: string;
  rev: number;
  stage: Stage;
  text: string;
  translation?: string;
  distractors?: [string, string];
  variants: string[];
  commas: number[];
  language: Language;
  courseId: string;
  lessonId: string;
  audio: string[];
  words: ServedWord[];
};
export type ServedLesson = { id: string; title: string; grammarFocus: string[]; units: ServedUnit[] };
export type ServedCourse = {
  id: string; language: Language; level: string; order: number; title: string; description: string;
  track: "main" | "optional"; requires: string[]; lessons: ServedLesson[];
};
