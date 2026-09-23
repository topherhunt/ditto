import { z } from "zod";
import { LANGUAGES, PATHS, type Language, type ServedCourse, type ServedUnit } from "./content.ts";

export const HINT_LEVELS = ["letters", "initial", "none"] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];
export const MODES = ["learn", "mistakes", "review"] as const;
export type Mode = (typeof MODES)[number];

export const PrefsSchema = z.strictObject({
  path: z.enum(Object.keys(PATHS) as [keyof typeof PATHS]),
  hints: z.enum(HINT_LEVELS),
  autoplay: z.int().min(0).max(3),
  rate: z.number().min(0.5).max(1),
  showTranslation: z.boolean(),
});
export type Prefs = z.infer<typeof PrefsSchema>;
export const DEFAULT_PREFS: Prefs = { path: "full", hints: "letters", autoplay: 1, rate: 1, showTranslation: true };

export const PutPrefsSchema = z.strictObject({ language: z.enum(LANGUAGES), prefs: PrefsSchema });

export const AttemptSchema = z.strictObject({
  unitId: z.string(),
  rev: z.int().positive(),
  mode: z.enum(MODES),
  path: PrefsSchema.shape.path,
  hintsLevel: z.enum(HINT_LEVELS),
  outcome: z.enum(["clean", "hinted", "corrected", "revealed"]),
  wrongSubmissions: z.int().min(0),
  hintsUsed: z.int().min(0),
  replays: z.int().min(0),
  accentSlips: z.int().min(0),
  /** Every submitted answer, joined as free text, in order. */
  submissions: z.array(z.string()).max(50),
  categories: z.array(z.enum(["spelling", "missing_word", "extra_word", "word_order"])),
  durationMs: z.int().min(0),
});
export type AttemptBody = z.infer<typeof AttemptSchema>;

export const ExplainSchema = z.strictObject({ unitId: z.string(), answer: z.string().min(1).max(500) });

export type Me = { email: string; name: string; picture: string | null; prefs: Record<Language, Prefs> };
export type Config = { googleClientId: string | null; devLogin: boolean };
export type LessonProgress = { nextIndex: number; completedAt: string | null };
export type Catalog = {
  courses: ServedCourse[];
  /** lessonId -> path -> progress */
  progress: Record<string, Partial<Record<keyof typeof PATHS, LessonProgress>>>;
  dueCount: number;
  mistakesCount: number;
};
export type ExplanationOut = { categories: string[]; summary: string; details: string };
export type MistakeEntry = {
  unit: ServedUnit;
  wrongCount: number;
  lastWrongAt: string;
  lastAnswer: string | null;
  categories: string[];
  cleanStreak: number;
  explanation: ExplanationOut | null;
};
export type ReviewOut = { units: ServedUnit[]; dueCount: number };
