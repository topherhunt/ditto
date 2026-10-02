import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  ACTIVE_MIN_SECONDS, ACTIVITIES, ACTIVITY_AREAS, AREAS, EXPLORE_GRAINS, EXPLORE_GROUPS, EXPLORE_METRICS,
  type AdminExploreOut, type AdminTodayOut,
} from "../shared/api.ts";
import { LANGUAGES, type Language } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";

// The /admin/metrics snapshot and explorer. Both read engaged_time only: rolled-up totals are older than METRICS_KEEP_DAYS and the
// longest range here is that long, so they never fall in range. Rows for a range are summed in JS, which is fine at this scale.

const DAY_MS = 86_400_000;
/** Series drawn before the rest are folded into "other". */
const MAX_SERIES = 7;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** The UTC Monday on or before `day`. */
function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return dayOf(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS));
}

type Cell = { seconds: number; learners: Set<number> };

export function registerMetricsExplore(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;

  // `/api/admin/*` is admin-only (server/admin.ts).
  app.get("/api/admin/metrics/today", (c) => {
    const range = z.enum(["today", "yesterday", "7"]).parse(c.req.query("range") ?? "today");
    const now = deps.now().getTime();
    const to = dayOf(new Date(range === "yesterday" ? now - DAY_MS : now));
    const from = range === "7" ? dayOf(new Date(now - 6 * DAY_MS)) : to;
    const rows = db.prepare(
      `SELECT e.activity, e.language, u.public_id AS learner, u.username, sum(e.seconds) AS seconds
       FROM engaged_time e JOIN users u ON u.id = e.user_id WHERE e.day BETWEEN ? AND ?
       GROUP BY e.activity, e.language, e.user_id ORDER BY seconds DESC`,
    ).all(from, to) as { activity: AdminTodayOut["rows"][number]["activity"]; language: string; learner: string; username: string | null; seconds: number }[];
    const present = (db.prepare("SELECT count(DISTINCT user_id) AS n FROM engaged_time WHERE day BETWEEN ? AND ?").get(from, to) as { n: number }).n;
    const engaged = (db.prepare(
      `SELECT count(DISTINCT user_id) AS n FROM (
         SELECT user_id FROM engaged_time WHERE day BETWEEN ? AND ? GROUP BY user_id, day HAVING sum(seconds) >= ?)`,
    ).get(from, to, ACTIVE_MIN_SECONDS) as { n: number }).n;
    return c.json<AdminTodayOut>({
      from, to, minSeconds: ACTIVE_MIN_SECONDS, engagedLearners: engaged, otherLearners: present - engaged,
      rows: rows.map((r) => ({ ...r, language: (r.language || null) as Language | null })),
    });
  });

  app.get("/api/admin/metrics/explore", (c) => {
    const q = z.object({
      days: z.enum(["7", "30", "90"]).default("30"), grain: z.enum(EXPLORE_GRAINS).default("day"),
      by: z.enum(EXPLORE_GROUPS).default("activity"), metric: z.enum(EXPLORE_METRICS).default("minutes"),
      area: z.enum(AREAS).optional(), activity: z.enum(ACTIVITIES).optional(), language: z.enum(LANGUAGES).optional(),
      learner: z.string().min(1).optional(),
    }).parse(c.req.query());
    const now = new Date(deps.now().getTime());
    const since = dayOf(new Date(now.getTime() - (Number(q.days) - 1) * DAY_MS));

    const where = ["e.day >= ?"];
    const params: (string | number)[] = [since];
    const activities = ACTIVITIES.filter((a) => (!q.area || ACTIVITY_AREAS[a] === q.area) && (!q.activity || a === q.activity));
    where.push(`e.activity IN (${activities.map(() => "?").join(",")})`);
    params.push(...activities);
    if (q.language) { where.push("e.language = ?"); params.push(q.language); }
    let learner: AdminExploreOut["learner"] = null;
    if (q.learner) {
      const u = db.prepare("SELECT id, public_id AS publicId, username FROM users WHERE public_id = ?").get(q.learner) as
        { id: number; publicId: string; username: string | null } | undefined;
      if (!u) throw new HTTPException(404, { message: `No learner ${q.learner}` });
      where.push("e.user_id = ?");
      params.push(u.id);
      learner = { publicId: u.publicId, username: u.username };
    }
    const rows = db.prepare(
      `SELECT e.day, e.user_id AS userId, e.language, e.activity, e.seconds, u.public_id AS publicId, u.username
       FROM engaged_time e JOIN users u ON u.id = e.user_id WHERE ${where.join(" AND ")}`,
    ).all(...params) as { day: string; userId: number; language: string; activity: (typeof ACTIVITIES)[number]; seconds: number; publicId: string; username: string | null }[];

    const buckets: string[] = [];
    for (let t = new Date(`${q.grain === "week" ? weekStart(since) : since}T00:00:00Z`).getTime(); dayOf(new Date(t)) <= dayOf(now); t += (q.grain === "week" ? 7 : 1) * DAY_MS) {
      buckets.push(dayOf(new Date(t)));
    }
    const bucketIndex = new Map(buckets.map((b, i) => [b, i]));

    const labels = new Map<string, string>();
    const groups = new Map<string, Cell[]>();
    const newCells = () => buckets.map((): Cell => ({ seconds: 0, learners: new Set() }));
    for (const r of rows) {
      const key = q.by === "none" ? "all" : q.by === "area" ? ACTIVITY_AREAS[r.activity] : q.by === "activity" ? r.activity : q.by === "language" ? r.language : r.publicId;
      if (q.by === "learner") labels.set(key, r.username ?? "(no username)");
      const cells = groups.get(key) ?? groups.set(key, newCells()).get(key)!;
      const cell = cells[bucketIndex.get(q.grain === "week" ? weekStart(r.day) : r.day)!];
      cell.seconds += r.seconds;
      cell.learners.add(r.userId);
    }

    const secondsOf = (cells: Cell[]) => cells.reduce((n, cell) => n + cell.seconds, 0);
    const ranked = [...groups].sort((a, b) => secondsOf(b[1]) - secondsOf(a[1]));
    if (ranked.length > MAX_SERIES) {
      const other = newCells();
      for (const [, cells] of ranked.splice(MAX_SERIES - 1)) {
        cells.forEach((cell, i) => { other[i].seconds += cell.seconds; cell.learners.forEach((id) => other[i].learners.add(id)); });
      }
      ranked.push(["other", other]);
      labels.set("other", "Other");
    }

    const value = (seconds: number, learners: number) =>
      q.metric === "learners" ? learners : q.metric === "minutes" ? Math.round(seconds / 6) / 10 : learners === 0 ? 0 : Math.round(seconds / 6 / learners) / 10;
    const series = ranked.map(([key, cells]) => ({
      key, label: labels.get(key) ?? key,
      total: value(secondsOf(cells), new Set(cells.flatMap((cell) => [...cell.learners])).size),
      values: cells.map((cell) => value(cell.seconds, cell.learners.size)),
    }));
    return c.json<AdminExploreOut>({ by: q.by, buckets, series, learner });
  });
}
