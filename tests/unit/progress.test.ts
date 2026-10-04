import { describe, expect, it } from "vitest";
import { blendPct, journey, progressSeries } from "../../web/src/progress.ts";

describe("blendPct", () => {
  it("counts a level finished in one activity as 90% and reaches 100% only when both are", () => {
    expect(blendPct([100, 0])).toBe(90);
    expect(blendPct([100, 100])).toBe(100);
  });

  it("lets the stronger activity dominate instead of averaging the other away", () => {
    expect(blendPct([60, 0])).toBe(54);
    expect(blendPct([0, 60])).toBe(54);
    expect(blendPct([0, 0])).toBe(0);
  });

  it("is just the one activity's percentage where the course has only one", () => {
    expect(blendPct([37])).toBe(37);
  });
});

describe("journey", () => {
  const rung = (level: string, achieved: boolean, pct: number) => ({ level, achieved, pct });

  it("reaches a level when either activity has, and blends the percentages", () => {
    const type = [rung("A1", true, 100), rung("A2", false, 50), rung("B1", false, 0)];
    const quiz = [rung("A1", false, 20), rung("A2", false, 10)];
    expect(journey(type, quiz)).toEqual([rung("A1", true, 92), rung("A2", false, 46), rung("B1", false, 0)]);
    expect(journey(type, null)).toEqual(type);
  });
});

describe("progressSeries", () => {
  const DAY = 86_400_000;
  const dayEnds = [1, 2, 3, 4].map((d) => d * DAY);

  it("steps up on the days Type lessons were finished and never falls", () => {
    const series = progressSeries({ dayEnds, typeDoneAt: [0.5 * DAY, 2.5 * DAY], typeTotal: 4, quizPct: null, quizAnswers: [0, 0, 0, 0] });
    expect(series).toEqual([25, 25, 50, 50]);
  });

  it("spreads Quiz progress over the days by answers given, ending at its current percentage", () => {
    const series = progressSeries({ dayEnds, typeDoneAt: [], typeTotal: 4, quizPct: 40, quizAnswers: [10, 0, 30, 0] });
    expect(series.at(-1)).toBe(36);
    expect(series).toEqual([9, 9, 36, 36]);
  });
});
