import type { HintLevel } from "../../shared/api.ts";
import type { DeterministicCategory, GradeResult } from "../../shared/grader.ts";

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
 * locked in with their target spelling, wrong words keep what was typed, missing words become empty.
 */
export function slotsAfter(result: GradeResult, targetCount: number, prev: string[]): { values: string[]; states: SlotState[] } {
  const values = Array.from({ length: targetCount }, (_, i) => prev[i] ?? "");
  const states: SlotState[] = values.map(() => "open");
  for (const w of result.words) {
    if (w.kind === "extra") continue;
    if (w.kind === "correct" || w.kind === "accent") {
      values[w.wordIndex] = w.target;
      states[w.wordIndex] = w.kind;
    } else if (w.kind === "wrong") {
      values[w.wordIndex] = w.typed;
    } else {
      values[w.wordIndex] = "";
    }
  }
  return { values, states };
}

export function mergeCategories(a: DeterministicCategory[], b: DeterministicCategory[]): DeterministicCategory[] {
  return [...new Set([...a, ...b])];
}
