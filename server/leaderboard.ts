import { CONVERSATION_LESSON_REPLIES } from "../shared/api.ts";
import type { Language } from "../shared/content.ts";
import type { DB } from "./db.ts";

/** Cards in one quiz practice unit. */
export const QUIZ_QUEUE_SIZE = 20;

export type LearnerWeek = { userId: number; week: number; total: number; seconds: number };
export type WeeklyStats = {
  /** ISO time of the Monday 00:00 UTC that began the current week. */
  weekStart: string;
  /** Everyone with at least one lesson this week, best first: lessons, then engaged time, then all-time lessons, then id. */
  ranked: LearnerWeek[];
  /** All-time lessons for anyone with any, including those with none this week. */
  totals: Map<number, number>;
  /** Engaged seconds this week, for everyone with any. */
  seconds: Map<number, number>;
  activeLearners: number;
  lessons: number;
  secondsTotal: number;
};

export function weekStartOf(now: Date): Date {
  const day = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
}

/** `only` narrows the result to one learner's lessons in one language. */
export type EarnedScope = { userId: number; language: Language };
export type Earned = { userId: number; at: string; kind: "type" | "talk" | "quiz" };

/**
 * When each lesson unit was earned: a lesson's first completion, a conversation's 10th reply, and a quiz session's last
 * first-time answer once its queue was fully answered.
 */
export function earnedLessons(db: DB, lessonIds: ReadonlySet<string>, only?: EarnedScope): Earned[] {
  const out: Earned[] = [];
  for (const r of db.prepare(
    "SELECT user_id, lesson_id, min(completed_at) AS at FROM lesson_progress WHERE completed_at IS NOT NULL AND (?1 IS NULL OR user_id = ?1) GROUP BY user_id, lesson_id",
  ).all(only?.userId ?? null) as { user_id: number; lesson_id: string; at: string }[]) {
    if (lessonIds.has(r.lesson_id)) out.push({ userId: r.user_id, at: r.at, kind: "type" });
  }

  for (const r of db.prepare(
    `SELECT c.user_id, (SELECT created_at FROM conversation_turns t WHERE t.conversation_id = c.id AND t.role = 'learner'
                        ORDER BY t.id LIMIT 1 OFFSET ?1 - 1) AS at FROM conversations c
     WHERE (?2 IS NULL OR c.user_id = ?2) AND (?3 IS NULL OR c.language = ?3)`,
  ).all(CONVERSATION_LESSON_REPLIES, only?.userId ?? null, only?.language ?? null) as { user_id: number; at: string | null }[]) {
    if (r.at) out.push({ userId: r.user_id, at: r.at, kind: "talk" });
  }

  for (const r of db.prepare(
    `SELECT s.user_id, max(f.first_at) AS at FROM quiz_sessions s
       JOIN (SELECT session_id, question_id, min(created_at) AS first_at FROM quiz_answers GROUP BY session_id, question_id) f ON f.session_id = s.id
       JOIN quiz_decks d ON d.id = s.deck_id
     WHERE (?2 IS NULL OR s.user_id = ?2) AND (?3 IS NULL OR d.language = ?3)
     GROUP BY s.id
     HAVING count(*) >= coalesce(s.queue_size, min(?1, (SELECT count(*) FROM quiz_questions q WHERE q.deck_id = d.id)))`,
  ).all(QUIZ_QUEUE_SIZE, only?.userId ?? null, only?.language ?? null) as { user_id: number; at: string }[]) {
    out.push({ userId: r.user_id, at: r.at, kind: "quiz" });
  }
  return out;
}

export function weeklyStats(db: DB, lessonIds: ReadonlySet<string>, now: Date): WeeklyStats {
  const weekStart = weekStartOf(now).toISOString();
  const totals = new Map<number, number>();
  const week = new Map<number, number>();
  for (const { userId, at } of earnedLessons(db, lessonIds)) {
    totals.set(userId, (totals.get(userId) ?? 0) + 1);
    if (at >= weekStart) week.set(userId, (week.get(userId) ?? 0) + 1);
  }
  const seconds = new Map((db.prepare("SELECT user_id, sum(seconds) AS s FROM engaged_time WHERE day >= ? GROUP BY user_id")
    .all(weekStart.slice(0, 10)) as { user_id: number; s: number }[]).map((r) => [r.user_id, r.s]));
  const ranked = [...week].map(([userId, w]): LearnerWeek => ({ userId, week: w, total: totals.get(userId)!, seconds: seconds.get(userId) ?? 0 }))
    .sort((a, b) => b.week - a.week || b.seconds - a.seconds || b.total - a.total || a.userId - b.userId);
  return {
    weekStart, ranked, totals, seconds, activeLearners: ranked.length,
    lessons: ranked.reduce((n, r) => n + r.week, 0), secondsTotal: [...seconds.values()].reduce((n, s) => n + s, 0),
  };
}
