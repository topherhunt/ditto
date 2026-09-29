import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ADMIN_RECENT_DAYS, PublicIdSchema, type AdminUserDetail, type AdminUserRow, type Person } from "../shared/api.ts";
import type { Language, Locale } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";

type Row = {
  id: number; public_id: string; email: string; username: string | null; created_at: string; last_seen_at: string | null;
  locale: Locale; profile_public: number; learning: string | null; items: number; last_practiced_at: string | null; active_days: number;
  lessons_completed: number; friends: number; pending_sent: number; blocked_by: number; reports: number; spend_recent: number; spend_total: number;
};

/** Every practiced item as (user_id, language, kind, created_at): the same three kinds the dashboard's activity counts. */
const ITEMS = `
  SELECT user_id, substr(course_id, 1, instr(course_id, '-') - 1) AS language, 'type' AS kind, created_at FROM attempts
  UNION ALL SELECT s.user_id, d.language, 'quiz', a.created_at FROM quiz_answers a
    JOIN quiz_sessions s ON s.id = a.session_id JOIN quiz_decks d ON d.id = s.deck_id
  UNION ALL SELECT v.user_id, v.language, 'talk', t.created_at FROM conversation_turns t
    JOIN conversations v ON v.id = t.conversation_id WHERE t.role = 'learner'`;

/** /admin/users: every account with usage and abuse signals. `/api/admin/*` is admin-only (server/admin.ts). */
export function registerAdminUsers(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const recentSince = () => new Date(deps.now().getTime() - ADMIN_RECENT_DAYS * 86_400_000).toISOString();

  const rows = (where: string, ...params: (string | number)[]) => db.prepare(
    `WITH items AS (${ITEMS}),
     practice AS (
       SELECT user_id, count(*) AS items, max(created_at) AS last_at,
         count(DISTINCT CASE WHEN created_at >= ?1 THEN substr(created_at, 1, 10) END) AS active_days
       FROM items GROUP BY user_id
     ),
     spend AS (
       SELECT user_id, sum(cost_usd) AS total, sum(CASE WHEN created_at >= ?1 THEN cost_usd ELSE 0 END) AS recent FROM api_usage GROUP BY user_id
     )
     SELECT u.id, u.public_id, u.email, u.username, u.created_at, u.last_seen_at, u.locale, u.profile_public,
       (SELECT group_concat(language) FROM (SELECT language FROM learning_languages WHERE user_id = u.id ORDER BY rowid)) AS learning,
       coalesce(p.items, 0) AS items, p.last_at AS last_practiced_at, coalesce(p.active_days, 0) AS active_days,
       (SELECT count(DISTINCT lesson_id) FROM lesson_progress WHERE user_id = u.id AND completed_at IS NOT NULL) AS lessons_completed,
       (SELECT count(*) FROM friendships WHERE status = 'accepted' AND u.id IN (requester_id, addressee_id)) AS friends,
       (SELECT count(*) FROM friendships WHERE status = 'pending' AND requester_id = u.id) AS pending_sent,
       (SELECT count(*) FROM friendships WHERE status = 'blocked' AND requester_id = u.id) AS blocked_by,
       (SELECT count(*) FROM reports WHERE user_id = u.id)
         + (SELECT count(*) FROM conversation_attempts a JOIN conversations c ON c.id = a.conversation_id
            WHERE c.user_id = u.id AND a.reported_at IS NOT NULL) AS reports,
       coalesce(s.recent, 0) AS spend_recent, coalesce(s.total, 0) AS spend_total
     FROM users u LEFT JOIN practice p ON p.user_id = u.id LEFT JOIN spend s ON s.user_id = u.id
     ${where} ORDER BY u.created_at DESC, u.id DESC`,
  ).all(recentSince(), ...params) as Row[];

  const toRow = (r: Row): AdminUserRow => ({
    id: r.public_id, email: r.email, username: r.username, createdAt: r.created_at, lastSeenAt: r.last_seen_at, lastPracticedAt: r.last_practiced_at,
    locale: r.locale, learning: r.learning ? (r.learning.split(",") as Language[]) : [], profilePublic: r.profile_public === 1,
    items: r.items, activeDays: r.active_days, lessonsCompleted: r.lessons_completed, friends: r.friends, pendingSent: r.pending_sent,
    blockedBy: r.blocked_by, reports: r.reports, spendRecent: r.spend_recent, spendTotal: r.spend_total,
  });

  app.get("/api/admin/users", (c) => c.json<AdminUserRow[]>(rows("").map(toRow)));

  app.get("/api/admin/users/:id", (c) => {
    const [row] = rows("WHERE u.public_id = ?2", PublicIdSchema.parse(c.req.param("id")));
    if (!row) throw new HTTPException(404, { message: "No such account" });
    const id = row.id;
    const people = (sql: string) => db.prepare(sql).all(id) as Person[];

    const counts = db.prepare(
      `WITH items AS (${ITEMS}) SELECT language, kind, count(*) AS n FROM items WHERE user_id = ? GROUP BY language, kind`,
    ).all(id) as { language: Language; kind: "type" | "quiz" | "talk"; n: number }[];
    const passes = (table: string) => db.prepare(`SELECT language, level FROM ${table} WHERE user_id = ? ORDER BY level`).all(id) as { language: Language; level: string }[];
    const levelPasses = passes("level_passes");
    const quizPasses = passes("quiz_level_passes");
    const lessonsByLanguage = db.prepare(
      `SELECT substr(lesson_id, 1, instr(lesson_id, '-') - 1) AS language, count(DISTINCT lesson_id) AS n FROM lesson_progress
       WHERE user_id = ? AND completed_at IS NOT NULL GROUP BY language`,
    ).all(id) as { language: Language; n: number }[];
    const conversations = db.prepare("SELECT language, count(*) AS n FROM conversations WHERE user_id = ? GROUP BY language").all(id) as { language: Language; n: number }[];
    const languages = [...new Set([...counts, ...levelPasses, ...quizPasses, ...lessonsByLanguage, ...conversations].map((x) => x.language))].sort()
      .map((language) => {
        const n = (kind: string) => counts.find((x) => x.language === language && x.kind === kind)?.n ?? 0;
        return {
          language, type: n("type"), quiz: n("quiz"), talk: n("talk"),
          lessonsCompleted: lessonsByLanguage.find((x) => x.language === language)?.n ?? 0,
          levelsPassed: levelPasses.filter((x) => x.language === language).map((x) => x.level),
          quizLevelsPassed: quizPasses.filter((x) => x.language === language).map((x) => x.level),
          conversations: conversations.find((x) => x.language === language)?.n ?? 0,
        };
      });

    const days = new Map<string, AdminUserDetail["days"][number]>();
    for (const d of db.prepare(
      `WITH items AS (${ITEMS}) SELECT substr(created_at, 1, 10) AS day, kind, count(*) AS n FROM items
       WHERE user_id = ? AND created_at >= ? GROUP BY day, kind`,
    ).all(id, recentSince()) as { day: string; kind: "type" | "quiz" | "talk"; n: number }[]) {
      const x = days.get(d.day) ?? days.set(d.day, { day: d.day, type: 0, quiz: 0, talk: 0 }).get(d.day)!;
      x[d.kind] = d.n;
    }

    return c.json<AdminUserDetail>({
      user: toRow(row),
      activeSessions: (db.prepare("SELECT count(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?").get(id, deps.now().toISOString()) as { n: number }).n,
      languages,
      days: [...days.values()].sort((a, b) => b.day.localeCompare(a.day)),
      spendByPurpose: db.prepare("SELECT purpose, sum(cost_usd) AS total FROM api_usage WHERE user_id = ? GROUP BY purpose ORDER BY total DESC")
        .all(id) as AdminUserDetail["spendByPurpose"],
      friends: people(
        `SELECT u.public_id AS id, u.username FROM friendships f JOIN users u ON u.id = CASE f.requester_id WHEN ?1 THEN f.addressee_id ELSE f.requester_id END
         WHERE f.status = 'accepted' AND ?1 IN (f.requester_id, f.addressee_id) ORDER BY u.username COLLATE NOCASE`,
      ),
      // A block is stored on the blocked account's request: requester = blocked, addressee = blocker.
      blockedBy: people("SELECT u.public_id AS id, u.username FROM friendships f JOIN users u ON u.id = f.addressee_id WHERE f.status = 'blocked' AND f.requester_id = ?"),
      blocked: people("SELECT u.public_id AS id, u.username FROM friendships f JOIN users u ON u.id = f.requester_id WHERE f.status = 'blocked' AND f.addressee_id = ?"),
      reports: db.prepare(
        `SELECT kind, note, text, created_at AS createdAt FROM reports WHERE user_id = ?1
         UNION ALL SELECT 'speaking', a.report_note, a.target, a.reported_at FROM conversation_attempts a JOIN conversations c ON c.id = a.conversation_id
           WHERE c.user_id = ?1 AND a.reported_at IS NOT NULL
         ORDER BY createdAt DESC`,
      ).all(id) as AdminUserDetail["reports"],
    });
  });
}
