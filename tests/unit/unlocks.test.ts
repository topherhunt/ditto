import { describe, expect, it } from "vitest";
import { unlockedIds } from "../../server/unlocks.ts";
import type { ServedCourse } from "../../shared/content.ts";

const course = (id: string, requires: string[] = [], lessons = 2) =>
  ({ id, requires, lessons: Array.from({ length: lessons }, (_, i) => ({ id: `${id}-${i + 1}` })) }) as unknown as ServedCourse;

const courses = [course("a"), course("b", ["a"]), course("c", ["a", "b"], 1)];

describe("unlockedIds", () => {
  it("opens only the first lesson of courses without requirements", () => {
    expect([...unlockedIds(courses, new Set())].sort()).toEqual(["a", "a-1"]);
  });

  it("opens the next lesson once the previous one is complete", () => {
    expect(unlockedIds(courses, new Set(["a-1"])).has("a-2")).toBe(true);
    expect(unlockedIds(courses, new Set(["a-2"])).has("a-2")).toBe(false);
  });

  it("opens a course once every lesson of every required course is complete", () => {
    expect(unlockedIds(courses, new Set(["a-1"])).has("b")).toBe(false);
    const done = unlockedIds(courses, new Set(["a-1", "a-2"]));
    expect(done.has("b") && done.has("b-1")).toBe(true);
    expect(done.has("c")).toBe(false);
    expect(unlockedIds(courses, new Set(["a-1", "a-2", "b-1", "b-2"])).has("c-1")).toBe(true);
  });
});
