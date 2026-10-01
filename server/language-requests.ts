import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { LanguageRequestSchema, type AdminLanguageRequestsOut, type RequestLanguage } from "../shared/api.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";

const HOUR_MS = 3_600_000;
/** All visitors share this cap, since nothing identifies one: it stops a script from burying real requests, not a person from asking twice. */
const MAX_PER_HOUR = 60;
// Refused with 503, not 429: the client treats every 429 as the daily AI spend cap.

/** Registered before the sign-in check. A visitor says which language they speak and which they want, and only a per-day count of that pair is kept. */
export function registerLanguageRequests(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const sent: number[] = [];

  app.post("/api/language-requests", async (c) => {
    const { spoken, wanted } = LanguageRequestSchema.parse(await c.req.json());
    const now = deps.now().getTime();
    while (sent.length && sent[0] <= now - HOUR_MS) sent.shift();
    if (sent.length >= MAX_PER_HOUR) throw new HTTPException(503, { message: "Too many requests right now, please try again later" });
    sent.push(now);
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
