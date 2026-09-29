import { describe, expect, it } from "vitest";
import type { AdminMetricsOut } from "../../shared/api.ts";
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
});
