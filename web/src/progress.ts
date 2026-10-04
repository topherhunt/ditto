/** One level of the journey: `pct` is the way to it, meaningful only for the first level not yet achieved. */
export type Rung = { level: string; achieved: boolean; pct: number };

/** How much of the way to a level the learner's strongest activity counts for; the weakest fills the rest, so a level finished in one activity reads as 90%. */
const LEAD_WEIGHT = 0.9;

/** One course-wide percentage from each activity's own: whichever is furthest along dominates, so the activities someone skips don't drag it down. */
export function blendPct(pcts: number[]): number {
  if (pcts.length === 0) return 0;
  if (pcts.length === 1) return pcts[0];
  return Math.floor(LEAD_WEIGHT * Math.max(...pcts) + (1 - LEAD_WEIGHT) * Math.min(...pcts));
}

/** The course's levels (as the typing ladder lists them): reached once either activity reached it, with the activities' progress blended. `quiz` is null where the course has no quiz. */
export function journey(type: Rung[], quiz: Rung[] | null): Rung[] {
  return type.map((t) => {
    const q = quiz?.find((r) => r.level === t.level);
    return { level: t.level, achieved: t.achieved || !!q?.achieved, pct: blendPct(q ? [t.pct, q.pct] : [t.pct]) };
  });
}

/**
 * The blended percentage at the end of each day, never falling: Type from when its lessons were actually finished, Quiz
 * (whose graduation dates aren't recorded) spread over the days in proportion to the answers given, ending at `quizPct`.
 */
export function progressSeries(o: { dayEnds: number[]; typeDoneAt: number[]; typeTotal: number; quizPct: number | null; quizAnswers: number[] }): number[] {
  const answered = o.quizAnswers.reduce((n, a) => n + a, 0);
  let best = 0;
  let cumulative = 0;
  return o.dayEnds.map((end, i) => {
    cumulative += o.quizAnswers[i];
    const type = o.typeTotal ? Math.floor((100 * o.typeDoneAt.filter((at) => at <= end).length) / o.typeTotal) : 0;
    const pcts = [type];
    if (o.quizPct !== null) pcts.push(answered ? Math.floor((o.quizPct * cumulative) / answered) : o.quizPct);
    best = Math.max(best, blendPct(pcts));
    return best;
  });
}
