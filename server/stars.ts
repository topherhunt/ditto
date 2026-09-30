/** What a finished run of a lesson is graded on: the latest attempt at each of its items. */
export type RunAttempt = { outcome: string; meaningCorrect: boolean | null; hintsLevel: string; hintsUsed: number; studied: boolean };

/**
 * The stars a finished run earns: one for finishing, one more for no mistakes (nothing corrected or revealed, every meaning
 * check right), one more for no help (hints off, no hint pressed, no study-first screen). A run that skips words or chunks
 * (`fullPath` false) earns at most two, and a Master run (sentences only, no help allowed) earns two, or three with no mistakes.
 */
export function starsFor(run: RunAttempt[], opts: { master: boolean; fullPath: boolean }): 1 | 2 | 3 {
  const mistakeFree = run.every((a) => (a.outcome === "clean" || a.outcome === "hinted") && a.meaningCorrect !== false);
  const unassisted = run.every((a) => a.hintsLevel === "none" && a.hintsUsed === 0 && !a.studied);
  if (opts.master) return mistakeFree && unassisted ? 3 : 2;
  const stars = 1 + Number(mistakeFree) + Number(unassisted);
  return Math.min(stars, opts.fullPath ? 3 : 2) as 1 | 2 | 3;
}
