import type { Catalog } from "../../shared/api.ts";
import type { ServedCourse, ServedLesson } from "../../shared/content.ts";

/** Courses by level, main track before optional modules, each in course order. */
export function levels(cat: Catalog): [string, ServedCourse[]][] {
  const byLevel = new Map<string, ServedCourse[]>();
  const sorted = [...cat.courses].sort((a, b) => a.level.localeCompare(b.level) || a.track.localeCompare(b.track) || a.order - b.order);
  for (const c of sorted) byLevel.set(c.level, [...(byLevel.get(c.level) ?? []), c]);
  return [...byLevel];
}

/** Complete on any path. */
export const lessonDone = (cat: Catalog, lessonId: string) =>
  Object.values(cat.progress[lessonId] ?? {}).some((p) => p.completedAt !== null);

/** Every main-track lesson of the level is complete. */
export const levelDone = (cat: Catalog, courses: ServedCourse[]) =>
  courses.filter((c) => c.track === "main").every((c) => c.lessons.every((l) => lessonDone(cat, l.id)));

/**
 * The lesson to do next: the earliest unlocked, incomplete lesson of the highest level that has one, main track
 * first. Null when every unlocked lesson is complete.
 */
export function nextLesson(cat: Catalog): ServedLesson | null {
  const open = levels(cat).map(([, courses]) => courses.flatMap((c) =>
    c.lessons.filter((l) => cat.unlocked.includes(l.id) && !lessonDone(cat, l.id)).map((lesson) => ({ lesson, main: c.track === "main" }))));
  for (const main of [true, false]) {
    const level = open.findLast((ls) => ls.some((x) => x.main === main));
    if (level) return level.find((x) => x.main === main)!.lesson;
  }
  return null;
}
