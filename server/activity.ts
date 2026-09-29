import type { Hono } from "hono";
import { z } from "zod";
import { ACTIVITY_DAYS, type ActivityOut } from "../shared/api.ts";
import { LANGUAGES } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";

/** The dashboard's activity: dictation items, quiz answers and spoken replies, counted per UTC hour. */
export function registerActivity(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;

  app.get("/api/activity", (c) => {
    const language = z.enum(LANGUAGES).parse(c.req.query("lang"));
    const userId = c.get("user").id;
    const since = new Date(deps.now().getTime() - ACTIVITY_DAYS * 86_400_000).toISOString();
    const rows = db.prepare(
      `SELECT substr(created_at, 1, 13) AS hour, 'type' AS kind, count(*) AS n FROM attempts
         WHERE user_id = ? AND course_id LIKE ? || '-%' AND created_at >= ? GROUP BY hour
       UNION ALL
       SELECT substr(a.created_at, 1, 13), 'quiz', count(*) FROM quiz_answers a
         JOIN quiz_sessions s ON s.id = a.session_id JOIN quiz_decks d ON d.id = s.deck_id
         WHERE s.user_id = ? AND d.language = ? AND a.created_at >= ? GROUP BY 1
       UNION ALL
       SELECT substr(t.created_at, 1, 13), 'talk', count(*) FROM conversation_turns t JOIN conversations v ON v.id = t.conversation_id
         WHERE v.user_id = ? AND v.language = ? AND t.role = 'learner' AND t.created_at >= ? GROUP BY 1`,
    ).all(userId, language, since, userId, language, since, userId, language, since) as { hour: string; kind: "type" | "talk" | "quiz"; n: number }[];
    const byHour = new Map<string, ActivityOut["hours"][number]>();
    for (const r of rows) {
      const h = byHour.get(r.hour) ?? { hour: r.hour, type: 0, talk: 0, quiz: 0 };
      h[r.kind] += r.n;
      byHour.set(r.hour, h);
    }
    return c.json<ActivityOut>({ hours: [...byHour.values()].sort((a, b) => a.hour.localeCompare(b.hour)) });
  });
}
