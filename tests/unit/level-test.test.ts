import { describe, expect, it } from "vitest";
import { LEVEL_TEST_SIZE, levelTestUnits } from "../../server/level-test.ts";
import type { ServedCourse, ServedUnit } from "../../shared/content.ts";

const unit = (courseId: string, i: number, wordCount: number, extra: Partial<ServedUnit> = {}) =>
  ({ id: `${courseId}-u${i}`, courseId, stage: "sentence", text: Array(wordCount).fill("parola").join(" "), distractors: ["x", "y"], ...extra }) as ServedUnit;
const course = (id: string, level: string, track: "main" | "optional", units: ServedUnit[]) =>
  ({ id, level, track, lessons: [{ id: `${id}-1`, units }] }) as unknown as ServedCourse;

/** Two main A1 courses with 12 sentences each (lengths 1..12), plus units that must never be picked. */
const courses = [
  course("a", "A1", "main", Array.from({ length: 12 }, (_, i) => unit("a", i, i + 1))),
  course("b", "A1", "main", [
    ...Array.from({ length: 12 }, (_, i) => unit("b", i, i + 1)),
    unit("b", 90, 40, { stage: "chunk" }),
    unit("b", 91, 40, { distractors: undefined }),
  ]),
  course("opt", "A1", "optional", [unit("opt", 0, 40)]),
  course("c", "A2", "main", [unit("c", 0, 40)]),
];

describe("levelTestUnits", () => {
  it("draws distinct sentences with a meaning check from the longer half of the level's main courses, spread evenly", () => {
    for (let run = 0; run < 20; run++) {
      const picked = levelTestUnits(courses, "A1");
      expect(picked).toHaveLength(LEVEL_TEST_SIZE);
      expect(new Set(picked.map((u) => u.id)).size).toBe(LEVEL_TEST_SIZE);
      expect(picked.every((u) => ["a", "b"].includes(u.courseId) && u.stage === "sentence" && u.distractors)).toBe(true);
      // The longer half of 24 sentences is the 12 with 7 or more words.
      expect(picked.every((u) => u.text.split(" ").length >= 7)).toBe(true);
      expect(picked.filter((u) => u.courseId === "a")).toHaveLength(5);
    }
  });

  it("varies between runs", () => {
    const sets = new Set(Array.from({ length: 10 }, () => levelTestUnits(courses, "A1").map((u) => u.id).sort().join()));
    expect(sets.size).toBeGreaterThan(1);
  });

  it("gives every sentence when the level has fewer than a full test", () => {
    expect(levelTestUnits(courses, "A2").map((u) => u.id)).toEqual(["c-u0"]);
  });
});
