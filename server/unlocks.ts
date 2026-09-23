import type { ServedCourse } from "../shared/content.ts";

/**
 * Ids of the courses and lessons a learner can start. A course unlocks once every course it requires is complete
 * (all lessons, on any path); within an unlocked course, a lesson unlocks once the lesson before it is complete.
 */
export function unlockedIds(courses: ServedCourse[], completedLessons: Set<string>): Set<string> {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const complete = (id: string) => byId.get(id)!.lessons.every((l) => completedLessons.has(l.id));
  const out = new Set<string>();
  for (const c of courses) {
    if (!c.requires.every(complete)) continue;
    out.add(c.id);
    c.lessons.forEach((l, i) => {
      if (i === 0 || completedLessons.has(c.lessons[i - 1].id)) out.add(l.id);
    });
  }
  return out;
}
