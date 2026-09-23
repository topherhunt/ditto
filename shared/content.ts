import { z } from "zod";

export const LANGUAGES = ["en", "it", "nl"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", it: "Italian", nl: "Dutch" };

export const STAGES = ["word", "phrase", "chunk", "sentence"] as const;
export type Stage = (typeof STAGES)[number];

export const PATHS = { full: STAGES, chunks: ["chunk", "sentence"], sentences: ["sentence"] } as const satisfies Record<string, readonly Stage[]>;
export type PracticePath = keyof typeof PATHS;

export const LexEntrySchema = z.strictObject({
  lemma: z.string().min(1),
  pos: z.enum(["NOUN", "VERB", "AUX", "ADJ", "ADV", "PRON", "DET", "ADP", "CCONJ", "SCONJ", "NUM", "INTJ", "PROPN", "PART"]),
  gloss: z.string().min(1),
});

export const UnitSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  rev: z.int().positive(),
  stage: z.enum(STAGES),
  text: z.string().min(1),
  translation: z.string().min(1).optional(),
  variants: z.array(z.string().min(1)).optional(),
  /** Word index -> lexicon sense suffix, for surfaces with several senses (key `lo#pron`). */
  senses: z.record(z.string().regex(/^\d+$/), z.string()).optional(),
});

export const LessonSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  grammarFocus: z.array(z.string()),
  units: z.array(UnitSchema).min(1),
});

export const CourseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  language: z.enum(LANGUAGES),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  order: z.int(),
  title: z.string().min(1),
  description: z.string().min(1),
  /** Lowercase surface form (or `surface#sense`) -> annotation. */
  lexicon: z.record(z.string(), LexEntrySchema),
  lessons: z.array(LessonSchema).min(1),
});

export type LexEntry = z.infer<typeof LexEntrySchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Unit = z.infer<typeof UnitSchema>;

/** A unit as the API serves it: audio URLs resolved, per-word annotations attached. */
export type ServedWord = LexEntry & { text: string; audio: string };
export type ServedUnit = {
  id: string;
  rev: number;
  stage: Stage;
  text: string;
  translation?: string;
  variants: string[];
  language: Language;
  courseId: string;
  lessonId: string;
  audio: string;
  words: ServedWord[];
};
export type ServedLesson = { id: string; title: string; grammarFocus: string[]; units: ServedUnit[] };
export type ServedCourse = { id: string; language: Language; level: string; order: number; title: string; description: string; lessons: ServedLesson[] };
