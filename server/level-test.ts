import type { ServedCourse, ServedUnit } from "../shared/content.ts";
import { words } from "../shared/tokenize.ts";

export const LEVEL_TEST_SIZE = 10;

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A random level test: sentences with a meaning check from the level's main-track courses, drawn from the longer half
 * (by word count) and spread over as many courses as possible. Fewer than LEVEL_TEST_SIZE only when the level has fewer.
 */
export function levelTestUnits(courses: ServedCourse[], level: string, random = Math.random): ServedUnit[] {
  const pool = courses
    .filter((c) => c.level === level && c.track === "main")
    .flatMap((c) => c.lessons.flatMap((l) => l.units))
    .filter((u) => u.stage === "sentence" && u.distractors);
  const hard = [...pool].sort((a, b) => words(b.text).length - words(a.text).length)
    .slice(0, Math.max(LEVEL_TEST_SIZE, Math.ceil(pool.length / 2)));
  const byCourse = new Map<string, ServedUnit[]>();
  for (const u of shuffle(hard, random)) byCourse.set(u.courseId, [...(byCourse.get(u.courseId) ?? []), u]);
  const queues = shuffle([...byCourse.values()], random);
  const out: ServedUnit[] = [];
  while (out.length < LEVEL_TEST_SIZE && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && out.length < LEVEL_TEST_SIZE) out.push(q.shift()!);
  }
  return out;
}
