import { createHash } from "node:crypto";
import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { LanguageRequestSchema, type AdminLanguageRequestsOut, type RequestLanguage } from "../shared/api.ts";
import type { AppDeps } from "./app.ts";
import { SESSION_COOKIE, sessionUser, type User } from "./auth.ts";

const HOUR_MS = 3_600_000;
/** All visitors share this cap, since nothing identifies one: it stops a script from burying real requests, not a person from asking twice. */
const MAX_PER_HOUR = 60;
// Refused with 503, not 429: the client treats every 429 as the daily AI spend cap.

/** Registered before the sign-in check. A visitor says which language they speak and which they want, and only a per-day count of that pair is kept.
 *  A signed-in sender's repeat of the same pair isn't counted, remembered only as a hash of their public id. A signed-out visitor can't be recognized, so each of theirs counts. */
export function registerLanguageRequests(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const sent: number[] = [];

  app.post("/api/language-requests", async (c) => {
    const { spoken, wanted } = LanguageRequestSchema.parse(await c.req.json());
    const now = deps.now().getTime();
    while (sent.length && sent[0] <= now - HOUR_MS) sent.shift();
    if (sent.length >= MAX_PER_HOUR) throw new HTTPException(503, { message: "Too many requests right now, please try again later" });
    sent.push(now);
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? sessionUser(db, token, deps.now()) : null;
    if (user) {
      const { public_id } = db.prepare("SELECT public_id FROM users WHERE id = ?").get(user.id) as { public_id: string };
      const sender = createHash("sha256").update(`language-request:${public_id}`).digest("hex");
      const { changes } = db.prepare("INSERT OR IGNORE INTO language_request_senders (sender, spoken, wanted) VALUES (?, ?, ?)").run(sender, spoken, wanted);
      if (changes === 0) return c.json({ ok: true });
    }
    db.prepare("INSERT INTO language_requests (day, spoken, wanted, count) VALUES (?, ?, ?, 1) ON CONFLICT (day, spoken, wanted) DO UPDATE SET count = count + 1")
      .run(deps.now().toISOString().slice(0, 10), spoken, wanted);
    return c.json({ ok: true });
  });
}

/** Registered after `registerAdmin`, whose middleware makes `/api/admin/*` admin-only. */
export function registerAdminLanguageRequests(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  app.get("/api/admin/language-requests", (c) => {
    const rows = db.prepare("SELECT spoken, wanted, SUM(count) AS count, MAX(day) AS lastDay FROM language_requests GROUP BY spoken, wanted ORDER BY count DESC, lastDay DESC")
      .all() as { spoken: RequestLanguage; wanted: RequestLanguage; count: number; lastDay: string }[];
    return c.json<AdminLanguageRequestsOut>(rows);
  });
}
