import { describe, expect, it } from "vitest";
import type { AdminExploreOut, AdminMetricsOut, AdminTodayOut } from "../../shared/api.ts";
import { rollUpMetrics } from "../../server/metrics.ts";
import { setup } from "./helpers.ts";

const ping = (t: ReturnType<typeof setup>, activity: string, language: string | null, seconds = 30) =>
  t.req("POST", "/api/metrics/engaged", { activity, language, seconds });
const metrics = async (t: ReturnType<typeof setup>) => {
  await t.login("admin@example.com");
  const res = await t.req("GET", "/api/admin/metrics?days=30");
  expect(res.status).toBe(200);
  return res.json as AdminMetricsOut;
};

describe("usage metrics", () => {
  it("adds engaged time per learner, day, language and activity, and refuses bad reports", async () => {
    const t = setup();
    expect((await ping(t, "lesson", "it")).status).toBe(401);
    await t.login();
    for (const [activity, language] of [["lesson", "it"], ["lesson", "it"], ["notebook", "it"], ["social", null]]) {
      expect((await ping(t, activity!, language)).status).toBe(200);
    }
    expect((await ping(t, "lesson", "it", 61)).status).toBe(400);
    expect((await ping(t, "admin", null)).status).toBe(400);
    expect(t.deps.db.prepare("SELECT day, language, activity, seconds FROM engaged_time ORDER BY activity").all()).toEqual([
      { day: "2026-09-01", language: "it", activity: "lesson", seconds: 60 },
      { day: "2026-09-01", language: "it", activity: "notebook", seconds: 30 },
      { day: "2026-09-01", language: "", activity: "social", seconds: 30 },
    ]);
  });

  it("reports daily active and peak concurrent learners, minutes per activity, spend and traffic to admins only", async () => {
    const t = setup();
    await t.login("a@example.com");
    await ping(t, "lesson", "it");
    await t.login("b@example.com");
    await ping(t, "lesson", "it");
    await ping(t, "quiz-study", "it");
    // Six minutes on, a new 5-minute window holds only b.
    t.clock.now = new Date("2026-09-01T10:06:00Z");
    await ping(t, "quiz-study", "it");
    const userId = (t.deps.db.prepare("SELECT id FROM users WHERE email = 'b@example.com'").get() as { id: number }).id;
    t.deps.db.prepare("INSERT INTO api_usage (user_id, purpose, model, input_tokens, output_tokens, audio_seconds, cost_usd, created_at) VALUES (?, 'coach', 'gpt-6-luna', 0, 0, 0, 0.25, ?)")
      .run(userId, t.clock.now.toISOString());
    expect((await t.req("GET", "/api/admin/metrics")).status).toBe(403);

    const m = await metrics(t);
    expect(m.days).toEqual([{ day: "2026-09-01", activeUsers: 2, peakConcurrent: 2, engagedMinutes: 2, spendUsd: 0.25, requests: expect.any(Number), errors5xx: 0 }]);
    expect(m.activities).toEqual([
      { activity: "lesson", language: "it", learnerDays: 2, minutes: 1 },
      { activity: "quiz-study", language: "it", learnerDays: 1, minutes: 1 },
    ]);
    expect(m.hours).toEqual([{ hour: "2026-09-01T10", requests: m.days[0].requests, errors5xx: 0, peakConcurrent: 2 }]);
  });

  it("counts requests per hour under the route pattern, never the real path, with errors and a p95 bucket", async () => {
    const t = setup();
    await t.req("GET", "/api/me");
    await t.login();
    await t.req("GET", "/api/me");
    await t.req("GET", "/api/lessons/nope?lang=it");
    await t.req("GET", "/api/lessons/also-nope?lang=it");
    await t.req("GET", "/api/no-such-route");
    const routes = new Map((await metrics(t)).routes.map((r) => [r.route, r]));
    expect(routes.get("GET /api/me")).toEqual({ route: "GET /api/me", requests: 2, errors4xx: 1, errors5xx: 0, p95: "<100ms" });
    expect(routes.get("GET /api/lessons/:lessonId")).toMatchObject({ requests: 2, errors4xx: 2 });
    expect(routes.get("unmatched")).toMatchObject({ requests: 1, errors4xx: 1 });
    expect([...routes.keys()].some((r) => r.includes("nope"))).toBe(false);
  });

  it("folds engaged time older than 90 days into anonymous totals, keeping the admin report's numbers", async () => {
    const t = setup();
    await t.login("a@example.com");
    await ping(t, "lesson", "it");
    await ping(t, "talk", "it");
    await t.login("b@example.com");
    await ping(t, "lesson", "it");
    const before = await metrics(t);

    rollUpMetrics(t.deps.db, new Date("2026-11-30T23:00:00Z"));
    expect(t.deps.db.prepare("SELECT count(*) AS n FROM engaged_time").get()).toEqual({ n: 3 });
    rollUpMetrics(t.deps.db, new Date("2026-12-01T00:00:00Z"));
    expect(t.deps.db.prepare("SELECT count(*) AS n FROM engaged_time").get()).toEqual({ n: 0 });
    expect(t.deps.db.prepare("SELECT * FROM engaged_time_totals ORDER BY activity").all()).toEqual([
      { day: "2026-09-01", language: "it", activity: "lesson", users: 2, seconds: 60 },
      { day: "2026-09-01", language: "it", activity: "talk", users: 1, seconds: 30 },
    ]);
    expect(t.deps.db.prepare("SELECT * FROM active_users_daily").all()).toEqual([{ day: "2026-09-01", users: 2 }]);

    const after = await metrics(t);
    expect(after.activities).toEqual(before.activities);
    expect(after.days.map((d) => [d.activeUsers, d.engagedMinutes])).toEqual(before.days.map((d) => [d.activeUsers, d.engagedMinutes]));
  });

  it("snapshots a window by activity, language and learner, counting as engaged only learners with 2 minutes on one day", async () => {
    const t = setup();
    await t.login("a@example.com");
    await ping(t, "lesson", "it", 60);
    await ping(t, "lesson", "it", 60);
    await ping(t, "talk", "it", 30);
    await t.login("b@example.com");
    await ping(t, "quiz-study", "it", 60);
    t.clock.now = new Date("2026-09-02T10:00:00Z");
    await ping(t, "talk", "it", 30);
    await t.login("admin@example.com");
    expect((await t.req("GET", "/api/admin/metrics/today?range=bogus")).status).toBe(400);

    const day1 = (await t.req("GET", "/api/admin/metrics/today?range=yesterday")).json as AdminTodayOut;
    expect(day1).toMatchObject({ from: "2026-09-01", to: "2026-09-01", minSeconds: 120, engagedLearners: 1, otherLearners: 1 });
    expect(day1.rows.map((r) => [r.activity, r.language, r.seconds])).toEqual([["lesson", "it", 120], ["quiz-study", "it", 60], ["talk", "it", 30]]);
    expect(Object.keys(day1.rows[0]).sort()).toEqual(["activity", "language", "learner", "seconds", "username"]);

    const week = (await t.req("GET", "/api/admin/metrics/today?range=7")).json as AdminTodayOut;
    expect(week).toMatchObject({ from: "2026-08-27", to: "2026-09-02", engagedLearners: 1, otherLearners: 1 });
    expect(week.rows.reduce((n, r) => n + r.seconds, 0)).toBe(240);
  });

  it("explores minutes by area per day or week, filters, folds extra series into other, and refuses unknown learners", async () => {
    const t = setup();
    await t.login("a@example.com");
    await ping(t, "lesson", "it", 60);
    await ping(t, "notebook", "it", 60);
    await ping(t, "talk", "es", 30);
    const a = (t.deps.db.prepare("SELECT public_id AS id FROM users WHERE email = 'a@example.com'").get() as { id: string }).id;
    await t.login("b@example.com");
    await ping(t, "quiz-test", "it", 60);
    await ping(t, "quiz-test", "it", 30);
    t.clock.now = new Date("2026-09-08T10:00:00Z");
    await ping(t, "talk", "it", 30);
    await t.login("admin@example.com");
    const explore = async (query: string) => (await t.req("GET", `/api/admin/metrics/explore?${query}`)).json as AdminExploreOut;

    const byArea = await explore("days=30&by=area");
    expect(byArea.buckets).toHaveLength(30);
    const at = (r: AdminExploreOut, key: string) => r.series.find((s) => s.key === key)!;
    expect(byArea.series.map((s) => [s.key, s.total])).toEqual([["type", 2], ["quiz", 1.5], ["talk", 1]]);
    expect(at(byArea, "type").values[byArea.buckets.indexOf("2026-09-01")]).toBe(2);

    const weekly = await explore("days=30&by=none&grain=week");
    expect(weekly.buckets).toEqual(["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07"]);
    expect(weekly.series).toEqual([{ key: "all", label: "all", total: 4.5, values: [0, 0, 0, 4, 0.5] }]);

    const learners = await explore("by=none&metric=learners&grain=week");
    expect(learners.series[0].total).toBe(2);
    expect(learners.series[0].values.slice(-2)).toEqual([2, 1]);
    const perLearner = await explore("by=none&metric=perLearner&grain=week");
    expect(perLearner.series[0].values.slice(-2)).toEqual([2, 0.5]);

    const filtered = await explore(`by=learner&area=type&language=it&learner=${a}`);
    expect(filtered.learner).toEqual({ publicId: a, username: null });
    expect(filtered.series.map((s) => [s.key, s.total])).toEqual([[a, 2]]);

    const byLanguage = await explore("by=language");
    expect(byLanguage.series.map((s) => s.key)).toEqual(["it", "es"]);
    expect(byLanguage.series.every((s) => s.label === s.key)).toBe(true);

    t.deps.db.prepare("DELETE FROM engaged_time").run();
    t.deps.db.prepare("INSERT INTO engaged_time (user_id, day, language, activity, seconds) SELECT id, '2026-09-01', 'it', 'lesson', 60 FROM users").run();
    for (const [i, activity] of ["home", "review", "talk", "quiz-study", "social", "mistakes", "settings", "other", "notebook"].entries()) {
      t.deps.db.prepare("INSERT INTO engaged_time (user_id, day, language, activity, seconds) VALUES (1, '2026-09-02', ?, ?, ?)").run("it", activity, 10 + i);
    }
    const folded = await explore("by=activity");
    expect(folded.series).toHaveLength(7);
    expect(folded.series.at(-1)).toMatchObject({ key: "other", label: "Other" });

    expect((await t.req("GET", "/api/admin/metrics/explore?learner=nope")).status).toBe(404);
    expect((await t.req("GET", "/api/admin/metrics/explore?by=email")).status).toBe(400);
    await t.login("a@example.com");
    expect((await t.req("GET", "/api/admin/metrics/explore")).status).toBe(403);
    expect((await t.req("GET", "/api/admin/metrics/today")).status).toBe(403);
  });
});
