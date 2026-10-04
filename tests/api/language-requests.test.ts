import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

const rows = (t: ReturnType<typeof setup>) => t.deps.db.prepare("SELECT * FROM language_requests ORDER BY spoken").all();

describe("language requests", () => {
  it("counts an anonymous request per day and pair, without signing in and without storing who sent it", async () => {
    const t = setup();
    expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" })).status).toBe(200);
    await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" });
    await t.req("POST", "/api/language-requests", { spoken: "other", wanted: "ja" });
    expect(rows(t)).toEqual([
      { day: "2026-09-01", spoken: "other", wanted: "ja", count: 1 },
      { day: "2026-09-01", spoken: "pt", wanted: "it", count: 2 },
    ]);
  });

  it("counts a signed-in learner's repeat of the same pair once, remembering them only as a hash", async () => {
    const t = setup();
    await t.login("learner@example.com");
    for (let i = 0; i < 3; i++) expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" })).status).toBe(200);
    await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "ja" });
    expect(rows(t)).toEqual([
      { day: "2026-09-01", spoken: "pt", wanted: "it", count: 1 },
      { day: "2026-09-01", spoken: "pt", wanted: "ja", count: 1 },
    ]);
    const senders = t.deps.db.prepare("SELECT * FROM language_request_senders").all() as { sender: string }[];
    expect(senders).toHaveLength(2);
    const { public_id } = t.deps.db.prepare("SELECT public_id FROM users WHERE email = ?").get("learner@example.com") as { public_id: string };
    expect(senders[0].sender).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(senders)).not.toContain(public_id);
  });

  it("counts the same pair from two different learners twice", async () => {
    const t = setup();
    await t.login("a@example.com");
    await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" });
    await t.login("b@example.com");
    await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" });
    expect(rows(t)).toEqual([{ day: "2026-09-01", spoken: "pt", wanted: "it", count: 2 }]);
  });

  it("rejects anything outside the fixed language list, so no free text can be stored", async () => {
    const t = setup();
    expect((await t.req("POST", "/api/language-requests", { spoken: "Portuguese", wanted: "it" })).status).toBe(400);
    expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it", note: "hello" })).status).toBe(400);
    expect(rows(t)).toEqual([]);
  });

  it("refuses requests past the hourly cap and accepts them again an hour later", async () => {
    const t = setup();
    for (let i = 0; i < 60; i++) expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" })).status).toBe(200);
    expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" })).status).toBe(503);
    t.clock.now = new Date(t.clock.now.getTime() + 3_600_001);
    expect((await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" })).status).toBe(200);
  });

  it("lists the pairs most asked first for admins only", async () => {
    const t = setup();
    await t.req("POST", "/api/language-requests", { spoken: "pt", wanted: "it" });
    await t.req("POST", "/api/language-requests", { spoken: "ar", wanted: "en" });
    await t.req("POST", "/api/language-requests", { spoken: "ar", wanted: "en" });
    expect((await t.req("GET", "/api/admin/language-requests")).status).toBe(401);
    await t.login("learner@example.com");
    expect((await t.req("GET", "/api/admin/language-requests")).status).toBe(403);
    await t.login("admin@example.com");
    expect((await t.req("GET", "/api/admin/language-requests")).json).toEqual([
      { spoken: "ar", wanted: "en", count: 2, lastDay: "2026-09-01" },
      { spoken: "pt", wanted: "it", count: 1, lastDay: "2026-09-01" },
    ]);
  });
});
