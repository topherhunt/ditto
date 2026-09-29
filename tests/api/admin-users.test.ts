import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

type T = ReturnType<typeof setup>;
const MIN = 60_000;
const DAY = 86_400_000;

const later = (t: T, ms: number) => { t.clock.now = new Date(t.clock.now.getTime() + ms); };
const publicId = (t: T, email: string) => (t.deps.db.prepare("SELECT public_id FROM users WHERE email = ?").get(email) as { public_id: string }).public_id;
const lastSeen = (t: T, email: string) => (t.deps.db.prepare("SELECT last_seen_at FROM users WHERE email = ?").get(email) as { last_seen_at: string | null }).last_seen_at;

describe("admin user list", () => {
  it("refuses non-admins", async () => {
    const t = setup();
    await t.login("learner@example.com");
    expect((await t.req("GET", "/api/admin/users")).status).toBe(403);
    expect((await t.req("GET", `/api/admin/users/${publicId(t, "learner@example.com")}`)).status).toBe(403);
  });

  it("stamps last seen on signed-in requests, at most every five minutes", async () => {
    const t = setup();
    await t.login("learner@example.com");
    expect(lastSeen(t, "learner@example.com")).toBeNull();
    await t.req("GET", "/api/me");
    expect(lastSeen(t, "learner@example.com")).toBe("2026-09-01T10:00:00.000Z");
    later(t, 4 * MIN);
    await t.req("GET", "/api/me");
    expect(lastSeen(t, "learner@example.com")).toBe("2026-09-01T10:00:00.000Z");
    later(t, 2 * MIN);
    await t.req("GET", "/api/me");
    expect(lastSeen(t, "learner@example.com")).toBe("2026-09-01T10:06:00.000Z");
  });

  it("lists each account with its registration, last seen, practice, social and report counts", async () => {
    const t = setup();
    await t.login("ana@example.com");
    await t.req("PUT", "/api/username", { username: "ana" });
    await t.req("PUT", "/api/learning", { languages: ["it"] });
    await t.attempt("it-a1-bar-1-u01");
    later(t, DAY);
    await t.login("bob@example.com");
    await t.login("ana@example.com");
    await t.attempt("it-a1-bar-1-u02");
    await t.req("POST", "/api/reports", { unitId: "it-a1-bar-1-u01", rev: 1, voice: 0, kind: "audio", note: "mumbled" });
    await t.req("POST", "/api/friends/requests", { email: "bob@example.com" });
    await t.login("bob@example.com");
    await t.req("POST", `/api/friends/${publicId(t, "ana@example.com")}/block`, {});
    later(t, DAY);
    await t.login("admin@example.com");

    const users = (await t.req("GET", "/api/admin/users")).json;
    expect(users.map((u: { email: string }) => u.email)).toEqual(["admin@example.com", "bob@example.com", "ana@example.com"]);
    expect(users[2]).toEqual({
      id: publicId(t, "ana@example.com"), email: "ana@example.com", username: "ana", createdAt: "2026-09-01T10:00:00.000Z",
      lastSeenAt: "2026-09-02T10:00:00.000Z", lastPracticedAt: "2026-09-02T10:00:00.000Z", locale: "en", learning: ["it"], profilePublic: true,
      items: 2, activeDays: 2, lessonsCompleted: 0, friends: 0, pendingSent: 0, blockedBy: 1, reports: 1, spendRecent: 0, spendTotal: 0,
    });
  });
});

describe("admin user detail", () => {
  it("shows per-language practice, daily activity, friends and reports, and 404s an unknown id", async () => {
    const t = setup();
    await t.login("bob@example.com");
    await t.req("PUT", "/api/username", { username: "bob" });
    await t.login("ana@example.com");
    await t.req("PUT", "/api/username", { username: "ana" });
    await t.attempt("it-a1-bar-1-u01");
    await t.attempt("it-a1-bar-1-u02");
    await t.req("POST", "/api/reports", { unitId: "it-a1-bar-1-u01", rev: 1, voice: 0, kind: "text", note: "typo" });
    await t.req("POST", "/api/friends/requests", { email: "bob@example.com" });
    await t.login("bob@example.com");
    await t.req("POST", "/api/friends/requests", { email: "ana@example.com" });
    await t.login("admin@example.com");

    const res = await t.req("GET", `/api/admin/users/${publicId(t, "ana@example.com")}`);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({
      user: { email: "ana@example.com", friends: 1, items: 2 },
      activeSessions: 1,
      languages: [{ language: "it", type: 2, quiz: 0, talk: 0, lessonsCompleted: 0, levelsPassed: [], quizLevelsPassed: [], conversations: 0 }],
      days: [{ day: "2026-09-01", type: 2, quiz: 0, talk: 0 }],
      friends: [{ id: publicId(t, "bob@example.com"), username: "bob" }],
      blockedBy: [], blocked: [],
      reports: [{ kind: "text", note: "typo", createdAt: "2026-09-01T10:00:00.000Z" }],
    });
    expect((await t.req("GET", "/api/admin/users/0000000000")).status).toBe(404);
  });
});
