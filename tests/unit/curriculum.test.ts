import { describe, expect, it } from "vitest";
import type { Catalog, CatalogCourse, CatalogLesson } from "../../shared/api.ts";
import { levelDone, nextLesson, pathUnits } from "../../web/src/curriculum.ts";

const course = (id: string, level: string, order: number, track: "main" | "optional" = "main") =>
  ({ id, level, order, track, lessons: [1, 2].map((i) => ({ id: `${id}-${i}` })) }) as unknown as CatalogCourse;
const courses = [course("a1x", "A1", 1), course("a1y", "A1", 2), course("a1opt", "A1", 0, "optional"), course("a2x", "A2", 1)];
const catalog = (unlocked: string[], done: string[]): Catalog => ({
  courses, unlocked, passedLevels: [], viaFriends: {}, dueCount: 0, mistakesCount: 0,
  progress: Object.fromEntries(done.map((id) => [id, { sentences: { nextIndex: 9, completedAt: "2026-09-01" } }])),
});

describe("nextLesson", () => {
  it("is the earliest incomplete unlocked lesson, main track before optional", () => {
    expect(nextLesson(catalog(["a1opt-1", "a1x-1", "a1x-2"], ["a1x-1"]))?.id).toBe("a1x-2");
  });

  it("jumps to the highest level with an open lesson, as after a level test", () => {
    const open = ["a1x-1", "a1y-1", "a1y-2", "a2x-1"];
    expect(nextLesson(catalog(open, []))?.id).toBe("a2x-1");
    expect(nextLesson(catalog(open, ["a2x-1"]))?.id).toBe("a1x-1");
  });

  it("falls back to optional lessons, then to nothing", () => {
    expect(nextLesson(catalog(["a1x-1", "a1opt-1"], ["a1x-1"]))?.id).toBe("a1opt-1");
    expect(nextLesson(catalog(["a1x-1"], ["a1x-1"]))).toBeNull();
  });
});

describe("levelDone", () => {
  it("needs every main-track lesson complete on some path, not the optional ones", () => {
    const a1 = courses.filter((c) => c.level === "A1");
    expect(levelDone(catalog([], ["a1x-1", "a1x-2", "a1y-1"]), a1)).toBe(false);
    expect(levelDone(catalog([], ["a1x-1", "a1x-2", "a1y-1", "a1y-2"]), a1)).toBe(true);
  });
});

describe("pathUnits", () => {
  it("counts the units of the stages the path plays", () => {
    const lesson = { stages: { word: 4, phrase: 3, chunk: 2, sentence: 5 } } as unknown as CatalogLesson;
    expect([pathUnits(lesson, "full"), pathUnits(lesson, "chunks"), pathUnits(lesson, "sentences")]).toEqual([14, 7, 5]);
  });
});
