import type { Context, Hono, MiddlewareHandler } from "hono";
import { matchedRoutes } from "hono/route";
import { z } from "zod";
import { EngagedSchema, LATENCY_BUCKETS, METRICS_KEEP_DAYS, type Activity, type AdminMetricsOut } from "../shared/api.ts";
import type { Language } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { transaction, type DB } from "./db.ts";

// Usage metrics: what is kept and why is in docs/metrics.md.

const DAY_MS = 86_400_000;
const CONCURRENCY_WINDOW_MS = 5 * 60_000;
const FLUSH_EVERY_MS = 60_000;
/** Upper bounds of LATENCY_BUCKETS but the last. */
const LATENCY_BOUNDS = [100, 300, 1000, 3000];

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const hourOf = (d: Date) => d.toISOString().slice(0, 13);

/** API requests count under the route they were meant for, so a 401 from the auth middleware still names its endpoint. */
function routeOf(c: Context): string {
  const routes = matchedRoutes(c);
  if (c.req.path.startsWith("/api/")) {
    const endpoint = routes.findLast((r) => r.method !== "ALL");
    return endpoint ? `${endpoint.method} ${endpoint.path}` : "unmatched";
  }
  const served = routes[c.req.routeIndex];
  return served ? `${c.req.method} ${served.path}` : "unmatched";
}

type Tally = { requests: number; errors4xx: number; errors5xx: number; ms: number[] };

/**
 * Counts every request per UTC hour and route in memory and writes the counts to http_hourly about once a minute, when a request
 * comes in, and whenever /admin/metrics loads. A restart loses at most the last minute's counts.
 */
export function trafficCounter(deps: Pick<AppDeps, "db" | "now">) {
  let tallies = new Map<string, Tally>();
  let flushedAt = deps.now().getTime();

  const flush = () => {
    const pending = tallies;
    tallies = new Map();
    flushedAt = deps.now().getTime();
    if (pending.size === 0) return;
    const upsert = deps.db.prepare(
      `INSERT INTO http_hourly (hour, route, requests, errors_4xx, errors_5xx, ms_100, ms_300, ms_1000, ms_3000, ms_slow)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO UPDATE SET requests = requests + excluded.requests, errors_4xx = errors_4xx + excluded.errors_4xx,
         errors_5xx = errors_5xx + excluded.errors_5xx, ms_100 = ms_100 + excluded.ms_100, ms_300 = ms_300 + excluded.ms_300,
         ms_1000 = ms_1000 + excluded.ms_1000, ms_3000 = ms_3000 + excluded.ms_3000, ms_slow = ms_slow + excluded.ms_slow`,
    );
    transaction(deps.db, () => {
      for (const [key, t] of pending) {
        const [hour, route] = key.split("|");
        upsert.run(hour, route, t.requests, t.errors4xx, t.errors5xx, ...t.ms);
      }
    });
  };

  const middleware: MiddlewareHandler = async (c, next) => {
    const started = performance.now();
    await next();
    const ms = performance.now() - started;
    const key = `${hourOf(deps.now())}|${routeOf(c)}`;
    const t = tallies.get(key) ?? tallies.set(key, { requests: 0, errors4xx: 0, errors5xx: 0, ms: [0, 0, 0, 0, 0] }).get(key)!;
    t.requests++;
    if (c.res.status >= 500) t.errors5xx++;
    else if (c.res.status >= 400) t.errors4xx++;
    const bucket = LATENCY_BOUNDS.findIndex((b) => ms < b);
    t.ms[bucket < 0 ? LATENCY_BOUNDS.length : bucket]++;
    if (deps.now().getTime() - flushedAt >= FLUSH_EVERY_MS) flush();
  };

  return { middleware, flush };
}

/**
 * Folds engaged_time rows older than METRICS_KEEP_DAYS into the anonymous daily totals and deletes them. Whole days move at once,
 * so adding to an existing total never double-counts. server/index.ts runs it at start and hourly.
 */
export function rollUpMetrics(db: DB, now: Date) {
  const cutoff = dayOf(new Date(now.getTime() - METRICS_KEEP_DAYS * DAY_MS));
  transaction(db, () => {
    db.prepare(
      `INSERT INTO engaged_time_totals (day, language, activity, users, seconds)
       SELECT day, language, activity, count(*), sum(seconds) FROM engaged_time WHERE day < ? GROUP BY day, language, activity
       ON CONFLICT DO UPDATE SET users = users + excluded.users, seconds = seconds + excluded.seconds`,
    ).run(cutoff);
    db.prepare(
      `INSERT INTO active_users_daily (day, users)
       SELECT day, count(DISTINCT user_id) FROM engaged_time WHERE day < ? GROUP BY day
       ON CONFLICT DO UPDATE SET users = users + excluded.users`,
    ).run(cutoff);
    db.prepare("DELETE FROM engaged_time WHERE day < ?").run(cutoff);
  });
}

export function registerMetrics(app: Hono<{ Variables: { user: User } }>, deps: AppDeps, traffic: ReturnType<typeof trafficCounter>) {
  const { db } = deps;
  /** Learners who reported engaged time in the current 5-minute window; a restart undercounts that window. */
  let window = { start: 0, users: new Set<number>() };

  app.post("/api/metrics/engaged", async (c) => {
    const { activity, language, seconds } = EngagedSchema.parse(await c.req.json());
    const userId = c.get("user").id;
    const now = deps.now();
    const start = Math.floor(now.getTime() / CONCURRENCY_WINDOW_MS) * CONCURRENCY_WINDOW_MS;
    if (start !== window.start) window = { start, users: new Set() };
    window.users.add(userId);
    transaction(db, () => {
      db.prepare(
        `INSERT INTO engaged_time (user_id, day, language, activity, seconds) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT DO UPDATE SET seconds = seconds + excluded.seconds`,
      ).run(userId, dayOf(now), language ?? "", activity, seconds);
      db.prepare(
        `INSERT INTO concurrency_hourly (hour, peak_users) VALUES (?, ?)
         ON CONFLICT DO UPDATE SET peak_users = max(peak_users, excluded.peak_users)`,
      ).run(hourOf(new Date(start)), window.users.size);
    });
    return c.json({ ok: true });
  });

  // `/api/admin/*` is admin-only (server/admin.ts).
  app.get("/api/admin/metrics", (c) => {
    const days = z.coerce.number().int().min(1).max(365).parse(c.req.query("days") ?? 30);
    traffic.flush();
    const now = deps.now();
    const since = dayOf(new Date(now.getTime() - (days - 1) * DAY_MS));
    const all = <T>(sql: string, ...params: string[]) => db.prepare(sql).all(since, ...params) as T[];

    type Day = AdminMetricsOut["days"][number];
    const byDay = new Map<string, Day>();
    const dayRow = (day: string) =>
      byDay.get(day) ?? byDay.set(day, { day, activeUsers: 0, peakConcurrent: 0, engagedMinutes: 0, spendUsd: 0, requests: 0, errors5xx: 0 }).get(day)!;
    for (const r of all<{ day: string; users: number; seconds: number }>(
      `SELECT day, count(DISTINCT user_id) AS users, sum(seconds) AS seconds FROM engaged_time WHERE day >= ?1 GROUP BY day
       UNION ALL SELECT a.day, a.users, (SELECT sum(seconds) FROM engaged_time_totals t WHERE t.day = a.day) FROM active_users_daily a WHERE a.day >= ?1`,
    )) Object.assign(dayRow(r.day), { activeUsers: r.users, engagedMinutes: Math.round(r.seconds / 60) });
    for (const r of all<{ day: string; peak: number }>(
      "SELECT substr(hour, 1, 10) AS day, max(peak_users) AS peak FROM concurrency_hourly WHERE hour >= ? GROUP BY day",
    )) dayRow(r.day).peakConcurrent = r.peak;
    for (const r of all<{ day: string; total: number }>(
      "SELECT substr(created_at, 1, 10) AS day, sum(cost_usd) AS total FROM api_usage WHERE created_at >= ? GROUP BY day",
    )) dayRow(r.day).spendUsd = r.total;
    for (const r of all<{ day: string; requests: number; errors: number }>(
      "SELECT substr(hour, 1, 10) AS day, sum(requests) AS requests, sum(errors_5xx) AS errors FROM http_hourly WHERE hour >= ? GROUP BY day",
    )) Object.assign(dayRow(r.day), { requests: r.requests, errors5xx: r.errors });

    const activities = all<{ activity: Activity; language: string; learnerDays: number; seconds: number }>(
      `SELECT activity, language, sum(users) AS learnerDays, sum(seconds) AS seconds FROM (
         SELECT language, activity, count(*) AS users, sum(seconds) AS seconds FROM engaged_time WHERE day >= ?1 GROUP BY day, language, activity
         UNION ALL SELECT language, activity, users, seconds FROM engaged_time_totals WHERE day >= ?1
       ) GROUP BY activity, language ORDER BY seconds DESC`,
    ).map((r) => ({ activity: r.activity, language: (r.language || null) as Language | null, learnerDays: r.learnerDays, minutes: Math.round(r.seconds / 60) }));

    const routes = all<{ route: string; requests: number; e4: number; e5: number; b0: number; b1: number; b2: number; b3: number; b4: number }>(
      `SELECT route, sum(requests) AS requests, sum(errors_4xx) AS e4, sum(errors_5xx) AS e5,
         sum(ms_100) AS b0, sum(ms_300) AS b1, sum(ms_1000) AS b2, sum(ms_3000) AS b3, sum(ms_slow) AS b4
       FROM http_hourly WHERE hour >= ? GROUP BY route ORDER BY requests DESC`,
    ).map((r) => {
      const buckets = [r.b0, r.b1, r.b2, r.b3, r.b4];
      let seen = 0;
      const p95 = buckets.findIndex((n) => (seen += n) >= 0.95 * r.requests);
      return { route: r.route, requests: r.requests, errors4xx: r.e4, errors5xx: r.e5, p95: LATENCY_BUCKETS[p95] };
    });

    const hoursSince = hourOf(new Date(now.getTime() - 47 * 3_600_000));
    const hours = (db.prepare(
      `SELECT h.hour, sum(h.requests) AS requests, sum(h.errors_5xx) AS errors5xx, coalesce(c.peak_users, 0) AS peakConcurrent
       FROM http_hourly h LEFT JOIN concurrency_hourly c ON c.hour = h.hour WHERE h.hour >= ? GROUP BY h.hour ORDER BY h.hour DESC`,
    ).all(hoursSince) as AdminMetricsOut["hours"]);

    return c.json<AdminMetricsOut>({ days: [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)), activities, routes, hours });
  });
}
