import type { HintLevel, Mode } from "../../shared/api.ts";
import type { DeterministicCategory, GradeResult, WordResult } from "../../shared/grader.ts";

/** A level test is a session mode of its own whose answers are never recorded as attempts. */
export type SessionMode = Mode | "test";

export type Outcome = "clean" | "hinted" | "corrected" | "revealed";

export function outcomeOf(s: { revealed: boolean; wrongSubmissions: number; hintsUsed: number }): Outcome {
  if (s.revealed) return "revealed";
  if (s.wrongSubmissions > 0) return "corrected";
  if (s.hintsUsed > 0) return "hinted";
  return "clean";
}

/** Slot placeholder: `letters` shows the first letter plus a dot per remaining letter; `initial` only the first letter. */
export function placeholder(word: string, hints: HintLevel): string {
  const letters = Array.from(word);
  if (hints === "letters") return letters.map((ch, i) => (i === 0 || !/[\p{L}\p{N}]/u.test(ch) ? ch : "·")).join("");
  if (hints === "initial") return letters[0];
  return "";
}

/** Status of one slot after a graded submission. */
export type SlotState = "open" | "correct" | "accent";

/**
 * After a submission graded against the main text, rebuild the slots: correct and accent-only words are
 * locked in with their target spelling, wrong words keep what was typed, missing words become empty. Typed
 * punctuation stays after its word; a wrong end mark keeps its slot open to fix. `extras[i]`: extra words typed
 * before slot i (`extras[targetCount]`: after the last), shown struck through between the slots.
 */
export function slotsAfter(result: GradeResult, targetCount: number): { values: string[]; states: SlotState[]; extras: WordResult[][] } {
  const values = Array.from({ length: targetCount }, () => "");
  const states: SlotState[] = values.map(() => "open");
  const extras: WordResult[][] = Array.from({ length: targetCount + 1 }, () => []);
  let gap = 0;
  for (const w of result.words) {
    if (w.kind === "extra") extras[gap].push(w);
    else gap = w.wordIndex + 1;
    if (w.kind === "extra" || w.kind === "missing") continue;
    values[w.wordIndex] = (w.kind === "wrong" ? w.typed : w.target) + w.after.map((m) => m.ch).join("");
    if (w.kind !== "wrong" && w.after.every((m) => m.status !== "wrong")) states[w.wordIndex] = w.kind;
  }
  return { values, states, extras };
}

/** Whether a graded word has anything to show under its slot: a spelling or accent fix, or flagged punctuation. */
export const hasFeedback = (w: WordResult) => w.kind !== "correct" || w.after.some((m) => m.status !== "ok");

export function mergeCategories(a: DeterministicCategory[], b: DeterministicCategory[]): DeterministicCategory[] {
  return [...new Set([...a, ...b])];
}
