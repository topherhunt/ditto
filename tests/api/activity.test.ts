import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

describe("activity", () => {
  it("counts the language's dictation items, quiz answers and spoken replies per UTC hour", async () => {
    const t = setup();
    await t.login();
    await t.attempt("it-a1-bar-1-u01");
    await t.attempt("it-a1-bar-1-u02");
    const { sessionId, queue } = (await t.req("POST", "/api/quiz/decks/it-a1-grammar-1/sessions", { mode: "spaced" })).json;
    await t.req("POST", `/api/quiz/sessions/${sessionId}/answers`, { questionId: queue[0], rating: "good", responseMs: 1500 });

    t.clock.now = new Date("2026-09-01T12:30:00Z");
    const now = t.clock.now.toISOString();
    const db = t.deps.db;
    const userId = (db.prepare("SELECT id FROM users").get() as { id: number }).id;
    const conv = db.prepare(`INSERT INTO conversations (user_id, language, locale, level, scenario, title, created_at, updated_at)
      VALUES (?, 'it', 'en', 'A1', '{}', 'Bar', ?, ?)`).run(userId, now, now);
    const turn = db.prepare("INSERT INTO conversation_turns (conversation_id, role, text, created_at) VALUES (?, ?, 'Ciao', ?)");
    turn.run(conv.lastInsertRowid, "partner", now);
    turn.run(conv.lastInsertRowid, "learner", now);
    turn.run(conv.lastInsertRowid, "learner", "2026-06-01T09:00:00.000Z");
    const full = db.prepare(`INSERT INTO conversations (user_id, language, locale, level, scenario, title, created_at, updated_at)
      VALUES (?, 'it', 'en', 'A1', '{}', 'Full', ?, ?)`).run(userId, now, now);
    for (let i = 0; i < 10; i++) turn.run(full.lastInsertRowid, "learner", "2026-09-01T11:00:00.000Z");

    expect((await t.req("GET", "/api/activity?lang=it")).json).toEqual({
      hours: [
        { hour: "2026-09-01T10", type: 2, talk: 0, quiz: 1 },
        { hour: "2026-09-01T11", type: 0, talk: 10, quiz: 0 },
        { hour: "2026-09-01T12", type: 0, talk: 1, quiz: 0 },
      ],
      earned: { talk: ["2026-09-01T11:00:00.000Z"], quiz: [] },
    });
    expect((await t.req("GET", "/api/activity?lang=nl")).json).toEqual({ hours: [], earned: { talk: [], quiz: [] } });
  });
});
