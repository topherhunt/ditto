import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

describe("auth", () => {
  it("rejects API calls without a session and accepts them after Google sign-in", async () => {
    const t = setup();
    expect((await t.req("GET", "/api/me")).status).toBe(401);
    expect((await t.req("POST", "/api/auth/google", { credential: "ana", locale: "en" })).status).toBe(200);
    const me = await t.req("GET", "/api/me");
    expect(me.json).toMatchObject({ email: "ana@example.com", prefs: { it: { path: "full", hints: "letters" } } });
  });

  it("sets an httpOnly SameSite=Lax cookie and clears the session on logout", async () => {
    const t = setup();
    const res = await t.login();
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(res.headers.get("set-cookie")).toMatch(/SameSite=Lax/i);
    await t.req("POST", "/api/auth/logout", {});
    expect((await t.req("GET", "/api/me")).status).toBe(401);
  });

  it("enforces ALLOWED_EMAILS", async () => {
    const t = setup({ allowedEmails: new Set(["ok@example.com"]) });
    expect((await t.req("POST", "/api/auth/google", { credential: "intruder", locale: "en" })).status).toBe(403);
    expect((await t.req("POST", "/api/auth/google", { credential: "ok", locale: "en" })).status).toBe(200);
  });

  it("does not expose dev login unless enabled", async () => {
    const t = setup({ devLogin: false });
    expect((await t.login()).status).toBe(401);
    expect((await t.req("GET", "/api/me")).status).toBe(401);
  });

  it("blocks cross-origin and non-JSON mutations", async () => {
    const t = setup();
    await t.login();
    const cross = await t.req("PUT", "/api/prefs", { language: "it", prefs: {} }, { origin: "https://evil.test" });
    expect(cross.status).toBe(403);
    const form = await t.req("POST", "/api/auth/logout", undefined, { "content-type": "application/x-www-form-urlencoded" });
    expect(form.status).toBe(415);
  });
});

describe("prefs and catalog", () => {
  it("stores prefs per language", async () => {
    const t = setup();
    await t.login();
    const prefs = { path: "sentences", hints: "none", autoplay: 2, rate: 0.75 };
    expect((await t.req("PUT", "/api/prefs", { language: "nl", prefs })).status).toBe(200);
    const me = await t.req("GET", "/api/me");
    expect(me.json.prefs.nl).toEqual(prefs);
    expect(me.json.prefs.it.path).toBe("full");
  });

  it("serves the language's courses with audio URLs and lesson progress", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01");
    const cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.courses.map((c: { id: string }) => c.id)).toEqual(["it-a1-bar", "it-a1-tea"]);
    expect(cat.json.courses[0].lessons[0].units[0].audio).toEqual(Array(4).fill(expect.stringMatching(/^\/audio\/it\/[0-9a-f]{20}\.m4a$/)));
    expect(cat.json.progress["it-a1-bar-1"].full).toEqual({ nextIndex: 1, completedAt: null });
    expect((await t.req("GET", "/api/catalog?lang=xx")).status).toBe(400);
  });

  it("indexes progress within the chosen path and marks completion at the last unit", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u06", { path: "sentences" });
    let cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.progress["it-a1-bar-1"].sentences).toEqual({ nextIndex: 1, completedAt: null });
    await t.attempt("it-a1-bar-1-u10", { path: "sentences" });
    cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.progress["it-a1-bar-1"].sentences).toEqual({ nextIndex: 3, completedAt: t.clock.now.toISOString() });
    expect((await t.attempt("it-a1-bar-1-u01", { path: "sentences" })).status).toBe(400);
  });

  it("unlocks the next lesson, then a required-by course, as lessons complete", async () => {
    const t = setup();
    await t.login();
    let cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.unlocked.sort()).toEqual(["it-a1-bar", "it-a1-bar-1"]);
    expect((await t.attempt("it-a1-bar-2-u02")).status).toBe(403);
    expect((await t.attempt("it-a1-bar-2-u02", { mode: "review" })).status).toBe(200);

    for (const u of ["u06", "u08", "u10"]) await t.attempt(`it-a1-bar-1-${u}`, { path: "sentences" });
    cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.unlocked).toContain("it-a1-bar-2");
    expect(cat.json.unlocked).not.toContain("it-a1-tea");

    for (const u of ["u02", "u04", "u06", "u08", "u09"]) expect((await t.attempt(`it-a1-bar-2-${u}`, { path: "sentences" })).status).toBe(200);
    cat = await t.req("GET", "/api/catalog?lang=it");
    expect(cat.json.unlocked).toEqual(expect.arrayContaining(["it-a1-tea", "it-a1-tea-1"]));
  });

  it("requires a meaning answer exactly when the unit has a meaning check", async () => {
    const t = setup();
    await t.login();
    expect((await t.attempt("it-a1-bar-1-u01", { meaningCorrect: null })).status).toBe(400);
  });

  it("rejects an attempt against a stale unit revision", async () => {
    const t = setup();
    await t.login();
    expect((await t.attempt("it-a1-bar-1-u01", { rev: 99 })).status).toBe(409);
  });
});

describe("problem reports", () => {
  it("stores the unit, its text, and the voice and file of the clip that played", async () => {
    const t = setup();
    await t.login();
    const unit = (await t.req("GET", "/api/catalog?lang=it")).json.courses[0].lessons[0].units[0];
    const res = await t.req("POST", "/api/reports", { unitId: unit.id, rev: unit.rev, voice: 2, kind: "audio", note: " sounds like sri-le " });
    expect(res.status).toBe(200);
    const row = t.deps.db.prepare("SELECT unit_id, unit_rev, language, text, voice, audio_file, kind, note, resolved_at FROM reports").get();
    expect(row).toEqual({
      unit_id: unit.id, unit_rev: unit.rev, language: "it", text: unit.text, voice: "kokoro:if_sara",
      audio_file: unit.audio[2].replace("/audio/", ""), kind: "audio", note: "sounds like sri-le", resolved_at: null,
    });
  });

  it("rejects a voice the unit doesn't have", async () => {
    const t = setup();
    await t.login();
    expect((await t.req("POST", "/api/reports", { unitId: "it-a1-bar-1-u01", rev: 1, voice: 9, kind: "audio", note: "" })).status).toBe(400);
  });
});

describe("mistakes notebook", () => {
  it("records a missed unit, then graduates it after two consecutive clean attempts", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u06", { outcome: "corrected", wrongSubmissions: 1, submissions: ["Vorrei un caffe per favor", "Vorrei un caffè per favore"], categories: ["spelling"] });
    let nb = await t.req("GET", "/api/mistakes?lang=it");
    expect(nb.json).toHaveLength(1);
    expect(nb.json[0]).toMatchObject({ wrongCount: 1, lastAnswer: "Vorrei un caffe per favor", categories: ["spelling"], cleanStreak: 0 });

    await t.attempt("it-a1-bar-1-u06", { mode: "mistakes" });
    await t.attempt("it-a1-bar-1-u06", { mode: "mistakes", outcome: "hinted", hintsUsed: 1 });
    nb = await t.req("GET", "/api/mistakes?lang=it");
    expect(nb.json[0].cleanStreak).toBe(0);

    await t.attempt("it-a1-bar-1-u06", { mode: "mistakes" });
    await t.attempt("it-a1-bar-1-u06", { mode: "mistakes" });
    expect((await t.req("GET", "/api/mistakes?lang=it")).json).toHaveLength(0);
    expect((await t.req("GET", "/api/catalog?lang=it")).json.mistakesCount).toBe(0);
  });

  it("records a clean dictation with a wrong meaning pick as a meaning mistake, scheduled like a miss", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01", { meaningCorrect: false });
    const nb = await t.req("GET", "/api/mistakes?lang=it");
    expect(nb.json[0]).toMatchObject({ wrongCount: 1, categories: ["meaning"] });
    const card = t.deps.db.prepare("SELECT due FROM review_cards WHERE unit_id = ?").get("it-a1-bar-1-u01") as { due: string } | undefined;
    expect(card).toBeDefined();
  });

  it("lets the learner remove an entry and re-adds it on the next miss", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01", { outcome: "revealed", submissions: ["cafe"] });
    expect((await t.req("DELETE", "/api/mistakes/it-a1-bar-1-u01")).status).toBe(200);
    expect((await t.req("GET", "/api/mistakes?lang=it")).json).toHaveLength(0);
    expect((await t.req("DELETE", "/api/mistakes/it-a1-bar-1-u01")).status).toBe(404);
    await t.attempt("it-a1-bar-1-u01", { outcome: "revealed", submissions: ["cafe"] });
    expect((await t.req("GET", "/api/mistakes?lang=it")).json[0].wrongCount).toBe(2);
  });

  it("keeps notebooks separate per user", async () => {
    const t = setup();
    await t.login("a@example.com");
    await t.attempt("it-a1-bar-1-u01", { outcome: "revealed", submissions: ["cafe"] });
    await t.login("b@example.com");
    expect((await t.req("GET", "/api/mistakes?lang=it")).json).toHaveLength(0);
  });
});

describe("scheduled review", () => {
  it("schedules sentences and missed units but not clean scaffolding, and serves them when due", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01");
    await t.attempt("it-a1-bar-1-u02", { outcome: "corrected", submissions: ["vorei", "vorrei"] });
    await t.attempt("it-a1-bar-1-u06");
    expect((await t.req("GET", "/api/review?lang=it")).json.units).toEqual([]);

    t.clock.now = new Date("2026-09-30T10:00:00Z");
    const due = await t.req("GET", "/api/review?lang=it");
    expect(due.json.units.map((u: { id: string }) => u.id).sort()).toEqual(["it-a1-bar-1-u02", "it-a1-bar-1-u06"]);
    expect(due.json.dueCount).toBe(2);
  });

  it("schedules a missed unit sooner than a clean one", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u06");
    await t.attempt("it-a1-bar-1-u08", { outcome: "revealed", submissions: [""] });
    const rows = t.deps.db.prepare("SELECT unit_id, due FROM review_cards ORDER BY due").all() as { unit_id: string; due: string }[];
    expect(rows.map((r) => r.unit_id)).toEqual(["it-a1-bar-1-u08", "it-a1-bar-1-u06"]);
    expect(new Date(rows[0].due).getTime()).toBeGreaterThan(t.clock.now.getTime());
  });
});

describe("explainer", () => {
  it("explains a wrong answer using the server's copy of the unit, and caches it across users", async () => {
    const t = setup();
    const explainer = t.deps.explainer as ReturnType<typeof import("./helpers.ts").fakeExplainer>;
    await t.login("a@example.com");
    const first = await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u06", answer: "Vorrei un caffe per favor" });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ summary: "fake summary for Vorrei un caffe per favor", cached: false });
    expect(explainer.calls[0].unit.text).toBe("Vorrei un caffè, per favore.");
    expect(explainer.calls[0].grammarFocus).toContain("vorrei + noun");

    await t.login("b@example.com");
    const again = await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u06", answer: "vorrei  un caffe per favor " });
    expect(again.json.cached).toBe(true);
    expect(explainer.calls).toHaveLength(1);
  });

  it("shows the cached explanation in the notebook", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01", { outcome: "revealed", submissions: ["cafe latte"] });
    expect((await t.req("GET", "/api/mistakes?lang=it")).json[0].explanation).toBeNull();
    await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: "cafe latte" });
    expect((await t.req("GET", "/api/mistakes?lang=it")).json[0].explanation.summary).toBe("fake summary for cafe latte");
  });

  it("refuses correct answers, enforces the daily cap, and returns 503 without a key", async () => {
    const t = setup();
    await t.login();
    expect((await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: "caffe" })).status).toBe(400);
    for (const a of ["x1", "x2", "x3"]) expect((await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: a })).status).toBe(200);
    const capped = await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: "x4" });
    expect(capped.status).toBe(429);
    t.clock.now = new Date("2026-09-02T10:00:00Z");
    expect((await t.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: "x4" })).status).toBe(200);

    const noKey = setup({ explainer: null });
    await noKey.login();
    expect((await noKey.req("POST", "/api/explain", { unitId: "it-a1-bar-1-u01", answer: "x" })).status).toBe(503);
  });
});

describe("locale", () => {
  it("stores the sign-in locale for a new user only, and changes it with PUT /api/locale", async () => {
    const t = setup();
    await t.login("ana@example.com", "es-419");
    expect((await t.req("GET", "/api/me")).json.locale).toBe("es-419");
    await t.login("ana@example.com", "nl");
    expect((await t.req("GET", "/api/me")).json.locale).toBe("es-419");

    expect((await t.req("PUT", "/api/locale", { locale: "it" })).status).toBe(200);
    expect((await t.req("GET", "/api/me")).json.locale).toBe("it");
    expect((await t.req("PUT", "/api/locale", { locale: "es" })).status).toBe(400);
  });

  it("serves translations, distractors, glosses and descriptions in the learner's support language", async () => {
    const t = setup();
    await t.login("ana@example.com", "es-419");
    const course = (await t.req("GET", "/api/catalog?lang=it")).json.courses[0];
    const unit = course.lessons[0].units.find((u: { id: string }) => u.id === "it-a1-bar-1-u06");
    expect(course.description).toBe("Pedir un café y pagar en un bar italiano");
    expect(unit.translation).toBe("Quisiera un café, por favor.");
    expect(unit.distractors).toEqual(["Un café para mí, gracias.", "Quisiera la cuenta, por favor."]);
    expect(unit.words.find((w: { text: string }) => w.text === "caffè").gloss).toBe("café (masculino), invariable en plural");

    await t.req("PUT", "/api/locale", { locale: "nl" });
    await t.attempt("it-a1-bar-1-u06");
    expect((await t.req("GET", "/api/review?lang=it")).json.units).toEqual([]);
    t.clock.now = new Date("2026-09-30T10:00:00Z");
    expect((await t.req("GET", "/api/review?lang=it")).json.units[0].translation).toBe("Ik wil graag een koffie, alsjeblieft.");
  });

  it("falls back to English for an Italian-interface learner of Italian", async () => {
    const t = setup();
    await t.login("ana@example.com", "it");
    const unit = (await t.req("GET", "/api/catalog?lang=it")).json.courses[0].lessons[0].units[0];
    expect(unit.translation).toBe("coffee");
  });

  it("asks for and caches explanations per interface language", async () => {
    const t = setup();
    const explainer = t.deps.explainer as ReturnType<typeof import("./helpers.ts").fakeExplainer>;
    const body = { unitId: "it-a1-bar-1-u06", answer: "Vorrei un caffe per favor" };
    await t.login("a@example.com", "nl");
    expect((await t.req("POST", "/api/explain", body)).json.cached).toBe(false);
    expect(explainer.calls[0]).toMatchObject({ locale: "nl", grammarFocus: ["onbepaalde lidwoorden un / un'", "vorrei + zelfstandig naamwoord"] });
    expect(explainer.calls[0].unit.translation).toBe("Ik wil graag een koffie, alsjeblieft.");

    await t.login("b@example.com", "en");
    expect((await t.req("POST", "/api/explain", body)).json.cached).toBe(false);
    expect(explainer.calls[1].locale).toBe("en");

    await t.login("c@example.com", "nl");
    expect((await t.req("POST", "/api/explain", body)).json.cached).toBe(true);
    expect(explainer.calls).toHaveLength(2);
  });
});
