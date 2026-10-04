import { describe, expect, it } from "vitest";
import { FEEDBACK_PER_DAY } from "../../shared/api.ts";
import { setup } from "./helpers.ts";

const body = (over: Record<string, unknown> = {}) => ({ mood: 4, tags: ["bugs", "reminders"], message: "Love it", mayContact: false, page: "/it", ...over });

describe("feedback", () => {
  it("stores a submission with its tags, page and the learner's locale, and returns it", async () => {
    const t = setup();
    await t.login("learner@example.com", "es-419");
    const res = await t.req("POST", "/api/feedback", body());
    expect(res.json).toEqual({ id: 1, mood: 4, tags: ["bugs", "reminders"], message: "Love it", mayContact: false });
    expect(t.deps.db.prepare("SELECT page, locale FROM feedback").get()).toEqual({ page: "/it", locale: "es-419" });
  });

  it("saves a mood on its own and lets the learner fill in the rest later", async () => {
    const t = setup();
    await t.login();
    const { id } = (await t.req("POST", "/api/feedback", body({ mood: 2, tags: [], message: "" }))).json;
    expect((await t.req("GET", `/api/feedback/${id}`)).json).toMatchObject({ mood: 2, tags: [], message: "" });
    await t.req("PUT", `/api/feedback/${id}`, { mood: 3, tags: ["too_hard"], message: "Hard", mayContact: true });
    expect((await t.req("GET", `/api/feedback/${id}`)).json).toEqual({ id, mood: 3, tags: ["too_hard"], message: "Hard", mayContact: true });
    expect(t.deps.db.prepare("SELECT count(*) AS n FROM feedback").get()).toEqual({ n: 1 });
  });

  it("rejects an empty submission, an unknown tag, an oversized message and a bad page", async () => {
    const t = setup();
    await t.login();
    for (const bad of [{ mood: null, tags: [], message: "  " }, { tags: ["nope"] }, { message: "x".repeat(2001) }, { page: "http://evil.example" }, { mood: 6 }]) {
      expect((await t.req("POST", "/api/feedback", body(bad))).status).toBe(400);
    }
    expect(t.deps.db.prepare("SELECT count(*) AS n FROM feedback").get()).toEqual({ n: 0 });
  });

  it("keeps one learner's feedback from another, and needs sign-in", async () => {
    const t = setup();
    expect((await t.req("POST", "/api/feedback", body())).status).toBe(401);
    await t.login("a@example.com");
    const { id } = (await t.req("POST", "/api/feedback", body())).json;
    await t.login("b@example.com");
    expect((await t.req("GET", `/api/feedback/${id}`)).status).toBe(404);
    expect((await t.req("PUT", `/api/feedback/${id}`, { mood: 1, tags: [], message: "", mayContact: false })).status).toBe(404);
  });

  it("allows 20 new submissions a day, refusing the next with 503, and resets the next day", async () => {
    const t = setup();
    await t.login();
    for (let i = 0; i < FEEDBACK_PER_DAY; i++) expect((await t.req("POST", "/api/feedback", body())).status).toBe(200);
    expect((await t.req("POST", "/api/feedback", body())).status).toBe(503);
    t.clock.now = new Date("2026-09-02T10:00:01Z");
    expect((await t.req("POST", "/api/feedback", body())).status).toBe(200);
  });

  it("deletes a learner's feedback and tags with their account", async () => {
    const t = setup();
    await t.login("gone@example.com");
    await t.req("POST", "/api/feedback", body());
    t.deps.db.prepare("DELETE FROM users WHERE email = ?").run("gone@example.com");
    expect(t.deps.db.prepare("SELECT (SELECT count(*) FROM feedback) AS f, (SELECT count(*) FROM feedback_tags) AS t").get()).toEqual({ f: 0, t: 0 });
  });
});

describe("admin feedback", () => {
  it("ranks tags and moods, shows the email only when the learner allowed contact, and refuses non-admins", async () => {
    const t = setup();
    await t.login("a@example.com");
    await t.req("POST", "/api/feedback", body({ mood: 5, tags: ["bugs"], mayContact: true }));
    await t.login("b@example.com");
    await t.req("POST", "/api/feedback", body({ mood: 5, tags: ["bugs", "reminders"], message: "Hi" }));
    expect((await t.req("GET", "/api/admin/feedback")).status).toBe(403);
    await t.login("admin@example.com");
    const { moods, tags, items } = (await t.req("GET", "/api/admin/feedback")).json;
    expect(moods).toEqual([0, 0, 0, 0, 2]);
    expect(tags).toEqual([{ tag: "bugs", count: 2 }, { tag: "reminders", count: 1 }]);
    expect(items.map((i: any) => [i.email, i.message])).toEqual([[null, "Hi"], ["a@example.com", "Love it"]]);
    expect(items[0].user.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
  });

  it("marks a row handled with a note, sorts it last, counts it out of the summary, and can reopen it", async () => {
    const t = setup();
    await t.login("a@example.com");
    const { id } = (await t.req("POST", "/api/feedback", body())).json;
    await t.req("POST", "/api/feedback", body({ message: "second" }));
    await t.login("admin@example.com");
    expect((await t.req("GET", "/api/admin/summary")).json.feedbackOpen).toBe(2);
    const done = await t.req("POST", `/api/admin/feedback/${id}`, { handled: true, note: "fixed" });
    expect(done.json).toMatchObject({ id, adminNote: "fixed" });
    expect(done.json.handledAt).not.toBeNull();
    expect((await t.req("GET", "/api/admin/feedback")).json.items.map((i: any) => i.id)).toEqual([2, id]);
    expect((await t.req("GET", "/api/admin/summary")).json.feedbackOpen).toBe(1);
    expect((await t.req("POST", `/api/admin/feedback/${id}`, { handled: false, note: "" })).json.handledAt).toBeNull();
    expect((await t.req("POST", "/api/admin/feedback/999", { handled: true, note: "" })).status).toBe(404);
  });
});
