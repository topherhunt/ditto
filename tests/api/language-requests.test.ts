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
