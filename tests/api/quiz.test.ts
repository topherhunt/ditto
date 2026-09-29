import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { QuizDeckDetailOut, QuizHomeOut, QuizSessionOut, QuizTestOut } from "../../shared/api.ts";
import { voiceId } from "../../server/content.ts";
import { fakeAI, fakeSpeech } from "../../server/conversation-fake.ts";
import { syncPresets } from "../../server/quiz.ts";
import { setup } from "./helpers.ts";

const DECK = "it-a1-grammar-1";

async function quiz() {
  const t = setup();
  await t.login();
  const detail = async () => (await t.req("GET", `/api/quiz/decks/${DECK}`)).json as QuizDeckDetailOut;
  const start = async (mode = "spaced") => (await t.req("POST", `/api/quiz/decks/${DECK}/sessions`, { mode })).json as { sessionId: number; queue: string[] };
  const answer = (sessionId: number, questionId: string, rating: string) =>
    t.req("POST", `/api/quiz/sessions/${sessionId}/answers`, { questionId, rating, responseMs: 1500 });
  return { ...t, detail, start, answer };
}

describe("quiz mode", () => {
  it("lists the fixture decks by level with every question new, and names quiz languages in config", async () => {
    const t = await quiz();
    const home = (await t.req("GET", "/api/quiz?lang=it")).json as QuizHomeOut;
    expect(home.decks.map((d) => [d.id, d.level, d.total, d.fresh, d.due])).toEqual([["it-a1-grammar-1", "A1", 3, 3, 0], ["it-a2-vocab-1", "A2", 2, 2, 0]]);
    expect(home.activity).toEqual([]);
    expect((await t.req("GET", "/api/quiz?lang=nl")).json.decks).toEqual([]);
    expect((await t.req("GET", "/api/config")).json.quiz).toEqual(["it"]);
  });

  it("queues new questions, schedules each answer, and summarizes the session with its mastery snapshot", async () => {
    const t = await quiz();
    const { sessionId, queue } = await t.start();
    expect(queue).toHaveLength(3);
    expect((await t.answer(sessionId, queue[0], "again")).status).toBe(200);
    expect((await t.answer(sessionId, queue[1], "easy")).status).toBe(200);

    const d = await t.detail();
    expect(d.deck.fresh).toBe(1);
    expect(d.deck.mastery).toEqual({ new: 1, learning: 1, review: 1, mastered: 0 });
    expect(d.questions.find((q) => q.id === queue[0])!.card!.mastery).toBe("learning");
    expect(d.questions.find((q) => q.id === queue[2])!.card).toBeNull();

    const s = (await t.req("GET", `/api/quiz/sessions/${sessionId}`)).json as QuizSessionOut;
    expect(s).toMatchObject({
      deckId: DECK, mode: "spaced", answered: 2, ratings: { again: 1, hard: 0, good: 0, easy: 1 }, newStarted: 2, improved: 1, mastered: 0,
      mastery: { new: 1, learning: 1, review: 1, mastered: 0 },
    });
    expect(s.answers.map((a) => [a.questionId, a.rating, a.responseMs])).toEqual([[queue[0], "again", 1500], [queue[1], "easy", 1500]]);
    expect(d.sessions.map((x) => x.id)).toEqual([sessionId]);
    const home = (await t.req("GET", "/api/quiz?lang=it")).json as QuizHomeOut;
    expect(home.activity).toEqual([{ deckId: DECK, at: s.startedAt, answered: 2 }]);
  });

  it("puts due questions first in spaced mode and unseen ones first in least-practiced mode", async () => {
    const t = await quiz();
    const first = await t.start();
    await t.answer(first.sessionId, first.queue[0], "again");
    await t.answer(first.sessionId, first.queue[1], "easy");
    t.clock.now = new Date(t.clock.now.getTime() + 60 * 60_000);
    const spaced = await t.start();
    expect(spaced.queue[0]).toBe(first.queue[0]);
    expect(spaced.queue.slice(1).sort()).toEqual([first.queue[2]]);
    expect((await t.start("least")).queue).toEqual([first.queue[2], first.queue[0], first.queue[1]]);
  });

  it("locks A2 until 90% of A1's questions are graduated, and the answer that gets there passes A1 once", async () => {
    const t = await quiz();
    const levels = async () => ((await t.req("GET", "/api/quiz?lang=it")).json as QuizHomeOut).levels;
    expect(await levels()).toEqual([
      { level: "A1", total: 3, graduated: 0, passed: null, unlocked: true },
      { level: "A2", total: 2, graduated: 0, passed: null, unlocked: false },
    ]);
    expect((await t.req("POST", "/api/quiz/decks/it-a2-vocab-1/sessions", { mode: "spaced" })).status).toBe(403);

    const { sessionId, queue } = await t.start();
    expect((await t.answer(sessionId, queue[0], "easy")).json).toEqual({ passed: null });
    expect((await t.answer(sessionId, queue[1], "easy")).json).toEqual({ passed: null });
    expect((await t.answer(sessionId, queue[2], "easy")).json).toEqual({ passed: { level: "A1", next: "A2" } });
    expect((await t.answer(sessionId, queue[0], "good")).json).toEqual({ passed: null });
    expect((await levels()).map((l) => [l.level, l.graduated, l.passed, l.unlocked])).toEqual([["A1", 3, "progress", true], ["A2", 0, null, true]]);
    expect((await t.req("POST", "/api/quiz/decks/it-a2-vocab-1/sessions", { mode: "spaced" })).status).toBe(200);
  });

  it("tests out of any level with up to 20 of its questions, touching no cards, and a recorded pass unlocks the next level", async () => {
    const t = await quiz();
    const test = async (level: string) => (await t.req("GET", `/api/quiz/test?lang=it&level=${encodeURIComponent(level)}`)).json as QuizTestOut;
    const a1 = await test("A1");
    expect(a1.next).toBe("A2");
    expect(a1.questions.map((q) => q.id).sort()).toEqual((await t.detail()).questions.map((q) => q.id).sort());
    expect(a1.questions.every((q) => q.deckId === DECK && q.wrong.length === 3 && q.card === null)).toBe(true);
    const a2 = await test("A2");
    expect([a2.questions.length, a2.next, a2.questions[0].deckId]).toEqual([2, null, "it-a2-vocab-1"]);
    expect((await t.req("GET", "/api/quiz/test?lang=it&level=B1")).status).toBe(404);
    expect((await t.req("GET", "/api/quiz/test?lang=it&level=C1")).status).toBe(400);

    expect((await t.req("POST", "/api/quiz/test/pass", { language: "it", level: "A1" })).status).toBe(200);
    const home = (await t.req("GET", "/api/quiz?lang=it")).json as QuizHomeOut;
    expect(home.levels.map((l) => [l.level, l.passed, l.unlocked])).toEqual([["A1", "test", true], ["A2", null, true]]);
    expect(home.decks.every((d) => d.fresh === d.total)).toBe(true);
    expect((await t.req("POST", "/api/quiz/test/pass", { language: "it", level: "B1" })).status).toBe(404);
  });

  it("keeps a session and its cards private to its learner and rejects questions from another deck", async () => {
    const t = await quiz();
    const { sessionId, queue } = await t.start();
    const other = (await t.req("GET", "/api/quiz/decks/it-a2-vocab-1")).json as QuizDeckDetailOut;
    expect((await t.answer(sessionId, other.questions[0].id, "good")).status).toBe(400);
    await t.answer(sessionId, queue[0], "good");
    await t.login("other@example.com");
    expect((await t.req("GET", `/api/quiz/sessions/${sessionId}`)).status).toBe(404);
    expect((await t.answer(sessionId, queue[0], "good")).status).toBe(404);
    expect((await t.detail()).deck.fresh).toBe(3);
    expect((await t.req("GET", "/api/quiz/decks/it-b2-nope")).status).toBe(404);
  });

  it("resyncs a changed preset: keeps progress on unchanged questions, drops cards of reworded ones and deletes removed decks", async () => {
    const t = await quiz();
    const { sessionId, queue } = await t.start();
    for (const id of queue) await t.answer(sessionId, id, "good");
    const deck = structuredClone(t.deps.content.quizzes.find((d) => d.id === DECK)!);
    const reworded = deck.questions[0].id;
    deck.questions[0] = { ...deck.questions[0], id: "reworded0000", question: "Nuova domanda?" };
    deck.hash = "changed";
    syncPresets(t.deps.db, [deck], t.clock.now);

    const d = await t.detail();
    expect(d.questions.map((q) => q.id)).toEqual(deck.questions.map((q) => q.id));
    expect(d.questions.map((q) => q.card?.mastery ?? null)).toEqual([null, "learning", "learning"]);
    expect(d.questions.some((q) => q.id === reworded)).toBe(false);
    expect((await t.req("GET", `/api/quiz/sessions/${sessionId}`)).json.answered).toBe(3);
    expect((await t.req("GET", "/api/quiz/decks/it-a2-vocab-1")).status).toBe(404);
  });

  it("voices only a question's own fields, caching each render on disk across learners", async () => {
    const speech = fakeSpeech();
    const said: [string, string, number][] = [];
    const say = speech.say;
    speech.say = (text, language, voice, pace, out) => { said.push([voiceId(voice), text, pace]); return say(text, language, voice, pace, out); };
    const audioDir = mkdtempSync(join(tmpdir(), "lp-quiz-say-"));
    const t = setup({ conversation: { ai: fakeAI(), speech, audioDir } });
    await t.login();
    const q = ((await t.req("GET", `/api/quiz/decks/${DECK}`)).json as QuizDeckDetailOut).questions[0];
    const url = (field: string, question = q.id) => `/api/quiz/decks/${DECK}/say?question=${question}&field=${field}`;

    const res = await t.req("GET", url("question"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/wav");
    expect(said).toEqual([["openai:marin", "'Io … italiano.' Qual è la forma corretta?", 1.3]]);
    await t.req("GET", url("wrong1"));
    expect(said[1][1]).toBe(q.wrong[1]);

    await t.login("other@example.com");
    expect((await t.req("GET", url("question"))).status).toBe(200);
    expect(said).toHaveLength(2);
    expect(readdirSync(join(audioDir, "quiz"))).toHaveLength(2);

    expect((await t.req("GET", url("title"))).status).toBe(400);
    expect((await t.req("GET", url("question", "nope"))).status).toBe(404);
    expect((await setup().req("GET", url("question"))).status).toBe(401);
  });
});
