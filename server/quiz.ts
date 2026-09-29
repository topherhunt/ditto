// Quiz mode (docs/quizzes.md): multiple-choice decks on an FSRS schedule. Preset decks live once in the DB, shared by everyone.
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Rating, State, type Card, type Grade } from "ts-fsrs";
import { z } from "zod";
import {
  MASTERY_STATES, QUIZ_GRADUATE_SHARE, QUIZ_LEVELS, QUIZ_RATINGS, QUIZ_SAY_FIELDS, QUIZ_TEST_SIZE, QuizAnswerSchema, QuizTestPassSchema, StartQuizSchema,
  type Mastery, type MasteryState, type QuizAnswerOut, type QuizCardOut, type QuizDeckDetailOut, type QuizDeckOut, type QuizHomeOut, type QuizKind,
  type QuizLevel, type QuizLevelOut, type QuizMode, type QuizQuestionOut, type QuizRating, type QuizSessionOut, type QuizSessionStartOut,
  type QuizSessionSummary, type QuizTestOut,
} from "../shared/api.ts";
import { LANGUAGES, type Language } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { voiceId } from "./content.ts";
import { transaction, type DB } from "./db.ts";
import type { QuizDeck } from "./quiz-content.ts";
import { quizVoice } from "./speech.ts";
import { scheduleGrade } from "./srs.ts";
import { recordUsage } from "./usage.ts";

const QUEUE_SIZE = 20;
const GRADE: Record<QuizRating, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };
/** Lower levels hear the voice slower, as in conversation mode. */
const PACE: Record<QuizLevel, number> = { "A1": 1.3, "A1+": 1.3, "A2": 1.2, "A2+": 1.2, "B1": 1.1, "B1+": 1.1, "B2": 1, "B2+": 1 };

type DeckRow = { id: string; language: Language; level: QuizLevel; kind: QuizKind; num: number };
type QuestionRow = { id: string; title: string; question: string; correct: string; wrong: string; explanation: string };
type CardRow = { question_id: string; card: string; due: string; state: State; stability: number };

export function masteryOf(card: { state: State; stability: number } | undefined): MasteryState {
  if (!card || card.state === State.New) return "new";
  if (card.state === State.Learning || card.state === State.Relearning) return "learning";
  return card.stability >= 21 ? "mastered" : "review";
}
const emptyMastery = (): Mastery => Object.fromEntries(MASTERY_STATES.map((m) => [m, 0])) as Mastery;
const shuffle = <T>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Makes the preset rows match content/quizzes, rewriting only decks whose CSV changed. Rewording a question drops its cards. */
export function syncPresets(db: DB, decks: QuizDeck[], now: Date) {
  transaction(db, () => {
    const stored = new Map((db.prepare("SELECT id, source_hash FROM quiz_decks WHERE owner_id IS NULL").all() as { id: string; source_hash: string }[])
      .map((r) => [r.id, r.source_hash]));
    const gone = [...stored.keys()].filter((id) => !decks.some((d) => d.id === id));
    if (gone.length) {
      console.warn(`Quiz: deleting ${gone.length} preset decks no longer in content, with their progress: ${gone.join(", ")}`);
      for (const id of gone) db.prepare("DELETE FROM quiz_decks WHERE id = ?").run(id);
    }
    for (const d of decks) {
      if (stored.get(d.id) === d.hash) continue;
      db.prepare(
        `INSERT INTO quiz_decks (id, owner_id, language, level, kind, num, source_hash, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO UPDATE SET level = excluded.level, kind = excluded.kind, num = excluded.num, source_hash = excluded.source_hash`,
      ).run(d.id, d.language, d.level, d.kind, d.num, d.hash, now.toISOString());
      const keep = new Set(d.questions.map((q) => q.id));
      for (const { id } of db.prepare("SELECT id FROM quiz_questions WHERE deck_id = ?").all(d.id) as { id: string }[])
        if (!keep.has(id)) db.prepare("DELETE FROM quiz_questions WHERE deck_id = ? AND id = ?").run(d.id, id);
      const upsert = db.prepare(
        `INSERT INTO quiz_questions (deck_id, id, position, title, question, correct, wrong, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO UPDATE SET position = excluded.position, title = excluded.title, question = excluded.question,
           correct = excluded.correct, wrong = excluded.wrong, explanation = excluded.explanation`,
      );
      d.questions.forEach((q, i) => upsert.run(d.id, q.id, i, q.title, q.question, q.correct, JSON.stringify(q.wrong), q.explanation));
    }
  });
}

export function registerQuiz(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  syncPresets(db, deps.content.quizzes, deps.now());
  const Id = z.coerce.number().int();

  /** Presets are everyone's; a learner's own decks will be theirs alone. */
  const deckOr404 = (id: string, userId: number) => {
    const row = db.prepare("SELECT id, language, level, kind, num FROM quiz_decks WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)")
      .get(id, userId) as DeckRow | undefined;
    if (!row) throw new HTTPException(404, { message: `No quiz deck ${id}` });
    return row;
  };
  const sessionOr404 = (id: number, userId: number) => {
    const row = db.prepare("SELECT id, deck_id FROM quiz_sessions WHERE id = ? AND user_id = ?").get(id, userId) as { id: number; deck_id: string } | undefined;
    if (!row) throw new HTTPException(404, { message: `No quiz session ${id}` });
    return row;
  };
  const cardsOf = (userId: number, deckId: string) =>
    new Map((db.prepare("SELECT question_id, card, due, state, stability FROM quiz_cards WHERE user_id = ? AND deck_id = ?")
      .all(userId, deckId) as CardRow[]).map((r) => [r.question_id, r]));
  const questionIds = (deckId: string) =>
    (db.prepare("SELECT id FROM quiz_questions WHERE deck_id = ? ORDER BY position").all(deckId) as { id: string }[]).map((r) => r.id);

  const deckOut = (d: DeckRow, ids: string[], cards: Map<string, CardRow>): QuizDeckOut => {
    const now = deps.now().toISOString();
    const mastery = emptyMastery();
    let due = 0;
    for (const id of ids) {
      const card = cards.get(id);
      mastery[masteryOf(card)]++;
      if (card && card.state !== State.New && card.due <= now) due++;
    }
    return { id: d.id, level: d.level, kind: d.kind, num: d.num, total: ids.length, due, fresh: mastery.new, mastery };
  };
  /** The language's levels that have decks, in order, with the learner's progress and passes. */
  const levelsOf = (userId: number, language: Language): QuizLevelOut[] => {
    const counts = new Map((db.prepare(
      `SELECT d.level, count(*) AS total, count(c.question_id) FILTER (WHERE c.state = ?) AS graduated
       FROM quiz_decks d JOIN quiz_questions q ON q.deck_id = d.id
       LEFT JOIN quiz_cards c ON c.user_id = ? AND c.deck_id = q.deck_id AND c.question_id = q.id
       WHERE d.language = ? AND (d.owner_id IS NULL OR d.owner_id = ?) GROUP BY d.level`,
    ).all(State.Review, userId, language, userId) as { level: QuizLevel; total: number; graduated: number }[]).map((r) => [r.level, r]));
    const passes = new Map((db.prepare("SELECT level, how FROM quiz_level_passes WHERE user_id = ? AND language = ?")
      .all(userId, language) as { level: QuizLevel; how: "progress" | "test" }[]).map((r) => [r.level, r.how]));
    const out: QuizLevelOut[] = [];
    for (const level of QUIZ_LEVELS) {
      const r = counts.get(level);
      if (!r) continue;
      const passed = passes.get(level) ?? null;
      out.push({ level, total: r.total, graduated: r.graduated, passed, unlocked: !out.length || passed !== null || out.at(-1)!.passed !== null });
    }
    return out;
  };
  const levelOr404 = (userId: number, language: Language, level: QuizLevel) => {
    const levels = levelsOf(userId, language);
    const i = levels.findIndex((l) => l.level === level);
    if (i < 0) throw new HTTPException(404, { message: `No ${language} quizzes at ${level}` });
    return { ...levels[i], next: levels[i + 1]?.level ?? null };
  };
  const pass = (userId: number, language: Language, level: QuizLevel, how: "progress" | "test") =>
    db.prepare("INSERT INTO quiz_level_passes (user_id, language, level, how, passed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING")
      .run(userId, language, level, how, deps.now().toISOString()).changes > 0;

  const byLevel = (a: DeckRow, b: DeckRow) =>
    QUIZ_LEVELS.indexOf(a.level) - QUIZ_LEVELS.indexOf(b.level) || a.kind.localeCompare(b.kind) || a.num - b.num;

  /** Sessions with at least one answer, newest first. */
  const summaries = (userId: number, where: string, arg: string | number): QuizSessionSummary[] => {
    const rows = db.prepare(
      `SELECT s.id, s.mode, s.started_at, s.updated_at, s.mastery, count(*) AS answered,
         sum(a.rating = 'again') AS again, sum(a.rating = 'hard') AS hard, sum(a.rating = 'good') AS good, sum(a.rating = 'easy') AS easy,
         sum(a.prev_mastery = 'new') AS new_started,
         sum(a.new_mastery = 'review' AND a.prev_mastery IN ('new', 'learning')) AS improved,
         sum(a.new_mastery = 'mastered' AND a.prev_mastery != 'mastered') AS mastered
       FROM quiz_sessions s JOIN quiz_answers a ON a.session_id = s.id
       WHERE s.user_id = ? AND ${where} GROUP BY s.id ORDER BY s.started_at DESC, s.id DESC`,
    ).all(userId, arg) as {
      id: number; mode: QuizMode; started_at: string; updated_at: string; mastery: string; answered: number;
      again: number; hard: number; good: number; easy: number; new_started: number; improved: number; mastered: number;
    }[];
    return rows.map((r) => ({
      id: r.id, mode: r.mode, startedAt: r.started_at, answered: r.answered,
      durationS: Math.round((Date.parse(r.updated_at) - Date.parse(r.started_at)) / 1000),
      ratings: { again: r.again, hard: r.hard, good: r.good, easy: r.easy },
      newStarted: r.new_started, improved: r.improved, mastered: r.mastered, mastery: JSON.parse(r.mastery),
    }));
  };

  app.get("/api/quiz", (c) => {
    const language = z.enum(LANGUAGES).parse(c.req.query("lang"));
    const userId = c.get("user").id;
    const decks = (db.prepare("SELECT id, language, level, kind, num FROM quiz_decks WHERE language = ? AND (owner_id IS NULL OR owner_id = ?)")
      .all(language, userId) as DeckRow[]).sort(byLevel);
    const activity = db.prepare(
      `SELECT s.deck_id AS deckId, s.started_at AS at, count(*) AS answered
       FROM quiz_sessions s JOIN quiz_answers a ON a.session_id = s.id JOIN quiz_decks d ON d.id = s.deck_id
       WHERE s.user_id = ? AND d.language = ? GROUP BY s.id ORDER BY s.started_at`,
    ).all(userId, language) as QuizHomeOut["activity"];
    return c.json<QuizHomeOut>({ decks: decks.map((d) => deckOut(d, questionIds(d.id), cardsOf(userId, d.id))), levels: levelsOf(userId, language), activity });
  });

  app.get("/api/quiz/decks/:id", (c) => {
    const userId = c.get("user").id;
    const deck = deckOr404(c.req.param("id"), userId);
    const rows = db.prepare("SELECT id, title, question, correct, wrong, explanation FROM quiz_questions WHERE deck_id = ? ORDER BY position")
      .all(deck.id) as QuestionRow[];
    const cards = cardsOf(userId, deck.id);
    const questions = rows.map((q): QuizQuestionOut => {
      const card = cards.get(q.id);
      const out: QuizCardOut | null = card ? { mastery: masteryOf(card), stability: card.stability, due: card.due } : null;
      return { ...q, wrong: JSON.parse(q.wrong), card: out };
    });
    return c.json<QuizDeckDetailOut>({
      deck: deckOut(deck, rows.map((q) => q.id), cards), questions, sessions: summaries(userId, "s.deck_id = ?", deck.id),
    });
  });

  app.post("/api/quiz/decks/:id/sessions", async (c) => {
    const { mode } = StartQuizSchema.parse(await c.req.json());
    const userId = c.get("user").id;
    const deck = deckOr404(c.req.param("id"), userId);
    if (!levelOr404(userId, deck.language, deck.level).unlocked)
      throw new HTTPException(403, { message: `${deck.level} is locked: finish the level before it or test out` });
    const cards = cardsOf(userId, deck.id);
    const all = questionIds(deck.id).map((id) => ({ id, card: cards.get(id) }));
    const isNew = (x: (typeof all)[number]) => !x.card || x.card.state === State.New;
    let queue: typeof all;
    if (mode === "random") queue = shuffle(all);
    else if (mode === "least")
      queue = [...all].sort((a, b) => Number(!isNew(a)) - Number(!isNew(b)) || (a.card?.stability ?? 0) - (b.card?.stability ?? 0));
    else {
      // Most overdue first, then new cards; when neither is left, the soonest due.
      const now = deps.now().toISOString();
      const seen = all.filter((x) => !isNew(x)).sort((a, b) => a.card!.due.localeCompare(b.card!.due));
      queue = [...seen.filter((x) => x.card!.due <= now), ...shuffle(all.filter(isNew))];
      if (!queue.length) queue = seen;
    }
    const iso = deps.now().toISOString();
    const { lastInsertRowid } = db.prepare("INSERT INTO quiz_sessions (user_id, deck_id, mode, started_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(userId, deck.id, mode, iso, iso);
    return c.json<QuizSessionStartOut>({ sessionId: Number(lastInsertRowid), queue: queue.slice(0, QUEUE_SIZE).map((x) => x.id) });
  });

  // A wrong answer is rated again; the learner rates a right one. The client re-asks missed questions within the session.
  // The answer that graduates QUIZ_GRADUATE_SHARE of its level passes the level.
  app.post("/api/quiz/sessions/:id/answers", async (c) => {
    const a = QuizAnswerSchema.parse(await c.req.json());
    const userId = c.get("user").id;
    const session = sessionOr404(Id.parse(c.req.param("id")), userId);
    const q = db.prepare("SELECT title FROM quiz_questions WHERE deck_id = ? AND id = ?").get(session.deck_id, a.questionId) as { title: string } | undefined;
    if (!q) throw new HTTPException(400, { message: `Question ${a.questionId} is not in deck ${session.deck_id}` });
    const now = deps.now();
    const iso = now.toISOString();
    transaction(db, () => {
      const prev = db.prepare("SELECT card, state, stability FROM quiz_cards WHERE user_id = ? AND deck_id = ? AND question_id = ?")
        .get(userId, session.deck_id, a.questionId) as { card: string; state: State; stability: number } | undefined;
      const next: Card = scheduleGrade(prev?.card ?? null, GRADE[a.rating], now);
      db.prepare(
        `INSERT INTO quiz_cards (user_id, deck_id, question_id, card, due, state, stability) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO UPDATE SET card = excluded.card, due = excluded.due, state = excluded.state, stability = excluded.stability`,
      ).run(userId, session.deck_id, a.questionId, JSON.stringify(next), next.due.toISOString(), next.state, next.stability);
      db.prepare(
        `INSERT INTO quiz_answers (session_id, question_id, title, rating, response_ms, prev_mastery, new_mastery, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(session.id, a.questionId, q.title, a.rating, a.responseMs, masteryOf(prev), masteryOf(next), iso);
      const cards = cardsOf(userId, session.deck_id);
      const mastery = emptyMastery();
      for (const id of questionIds(session.deck_id)) mastery[masteryOf(cards.get(id))]++;
      db.prepare("UPDATE quiz_sessions SET mastery = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(mastery), iso, session.id);
    });
    const deck = deckOr404(session.deck_id, userId);
    const level = levelOr404(userId, deck.language, deck.level);
    const passed = level.passed === null && level.graduated >= QUIZ_GRADUATE_SHARE * level.total && pass(userId, deck.language, deck.level, "progress");
    return c.json<QuizAnswerOut>({ passed: passed ? { level: deck.level, next: level.next } : null });
  });

  // Any level can be tested, locked or not. Test answers touch no cards: only a pass is recorded.
  app.get("/api/quiz/test", (c) => {
    const language = z.enum(LANGUAGES).parse(c.req.query("lang"));
    const level = z.enum(QUIZ_LEVELS).parse(c.req.query("level"));
    const userId = c.get("user").id;
    const { next } = levelOr404(userId, language, level);
    const rows = db.prepare(
      `SELECT q.deck_id AS deckId, q.id, q.title, q.question, q.correct, q.wrong, q.explanation
       FROM quiz_questions q JOIN quiz_decks d ON d.id = q.deck_id
       WHERE d.language = ? AND d.level = ? AND (d.owner_id IS NULL OR d.owner_id = ?)`,
    ).all(language, level, userId) as (QuestionRow & { deckId: string })[];
    const questions = shuffle(rows).slice(0, QUIZ_TEST_SIZE).map((q) => ({ ...q, wrong: JSON.parse(q.wrong) as string[], card: null }));
    return c.json<QuizTestOut>({ questions, next });
  });

  app.post("/api/quiz/test/pass", async (c) => {
    const { language, level } = QuizTestPassSchema.parse(await c.req.json());
    const userId = c.get("user").id;
    levelOr404(userId, language, level);
    pass(userId, language, level, "test");
    return c.json({ ok: true });
  });

  app.get("/api/quiz/sessions/:id", (c) => {
    const userId = c.get("user").id;
    const session = sessionOr404(Id.parse(c.req.param("id")), userId);
    const [summary] = summaries(userId, "s.id = ?", session.id);
    if (!summary) throw new HTTPException(404, { message: `Quiz session ${session.id} has no answers` });
    const answers = db.prepare("SELECT question_id AS questionId, title, rating, response_ms AS responseMs FROM quiz_answers WHERE session_id = ? ORDER BY id")
      .all(session.id) as QuizSessionOut["answers"];
    return c.json<QuizSessionOut>({ ...summary, deckId: session.deck_id, answers });
  });

  // Only a question's own text can be voiced, so this is no free TTS proxy. Renders are shared across learners on disk, since
  // they cost money; the learner who misses the cache pays.
  app.get("/api/quiz/decks/:id/say", async (c) => {
    if (!deps.conversation) throw new HTTPException(503, { message: "Speech is not configured (the speech worker)" });
    const { speech, audioDir } = deps.conversation;
    const userId = c.get("user").id;
    const deck = deckOr404(c.req.param("id"), userId);
    const field = z.enum(QUIZ_SAY_FIELDS).parse(c.req.query("field"));
    const q = db.prepare("SELECT question, correct, wrong, explanation FROM quiz_questions WHERE deck_id = ? AND id = ?")
      .get(deck.id, z.string().parse(c.req.query("question"))) as Omit<QuestionRow, "id" | "title"> | undefined;
    if (!q) throw new HTTPException(404, { message: "No such question" });
    const raw = field.startsWith("wrong") ? (JSON.parse(q.wrong) as string[])[Number(field.slice(5))] : q[field as "question" | "correct" | "explanation"];
    // A read-aloud blank: "Io ___ italiano" would otherwise be read as underscores or skipped without a pause.
    const text = raw.replace(/_{2,}/g, "…");
    const voice = quizVoice(deck.language);
    const pace = PACE[deck.level];
    const dir = join(audioDir, "quiz");
    const path = join(dir, `${createHash("sha1").update(`${voiceId(voice)}|${pace}|${text.normalize("NFC")}`).digest("hex").slice(0, 20)}.wav`);
    if (!existsSync(path)) {
      mkdirSync(dir, { recursive: true });
      const tmp = `${path}.${randomUUID()}.tmp.wav`;
      try {
        const { usage } = await speech.say(text, deck.language, voice, pace, tmp);
        if (usage) recordUsage(db, userId, null, "quiz-speech", usage, deps.now());
        renameSync(tmp, path);
      } finally {
        rmSync(tmp, { force: true });
      }
    }
    return c.body(readFileSync(path), 200, { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" });
  });
}
