import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  AttemptSchema, DEFAULT_PREFS, ExplainSchema, PrefsSchema, PutPrefsSchema,
  type Catalog, type Config, type ExplanationOut, type Me, type MistakeEntry, type Prefs, type ReviewOut,
} from "../shared/api.ts";
import { LANGUAGES, PATHS, type Language, type ServedLesson, type ServedUnit } from "../shared/content.ts";
import { grade } from "../shared/grader.ts";
import { exactKey } from "../shared/tokenize.ts";
import {
  createSession, deleteSession, SESSION_COOKIE, SESSION_DAYS, sessionUser, upsertUser, type User, type VerifyGoogle,
} from "./auth.ts";
import type { Content } from "./content.ts";
import { transaction, type DB } from "./db.ts";
import type { Explainer } from "./explain.ts";
import { schedule } from "./srs.ts";
import { unlockedIds } from "./unlocks.ts";

export type AppDeps = {
  db: DB;
  content: Content;
  now: () => Date;
  googleClientId: string | null;
  verifyGoogle: VerifyGoogle | null;
  /** Lowercased; null allows any verified Google account. */
  allowedEmails: Set<string> | null;
  devLogin: boolean;
  explainer: Explainer | null;
  /** Model whose cached explanations are shown, even when the explainer is disabled. */
  explainModel: string;
  explainDailyLimit: number;
  secureCookies: boolean;
};

const GRADUATE_AFTER = 2;
const REVIEW_BATCH = 50;

const LangQuery = z.enum(LANGUAGES);
/** Punctuation can make an answer wrong, so it is part of the key; case and spacing are not. */
const answerKey = (answer: string) => exactKey(answer).replace(/\s+/g, " ").trim();

export function createApp(deps: AppDeps) {
  const { db, content } = deps;
  const lessons = new Map<string, ServedLesson>(content.courses.flatMap((c) => c.lessons.map((l) => [l.id, l] as const)));
  const app = new Hono<{ Variables: { user: User } }>();

  const unitOr404 = (id: string): ServedUnit => {
    const u = content.units.get(id);
    if (!u) throw new HTTPException(404, { message: `Unknown unit ${id}` });
    return u;
  };
  const lang = (c: Context) => LangQuery.parse(c.req.query("lang"));

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    if (err instanceof z.ZodError) return c.json({ error: "Invalid request", issues: err.issues }, 400);
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  });

  // CSRF: mutations must be same-origin JSON. Cross-site forms can't send application/json without a CORS preflight.
  app.use("/api/*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      const origin = c.req.header("origin");
      if (origin && new URL(origin).host !== c.req.header("host")) throw new HTTPException(403, { message: "Cross-origin request" });
      if (c.req.method !== "DELETE" && !c.req.header("content-type")?.startsWith("application/json"))
        throw new HTTPException(415, { message: "Expected application/json" });
    }
    await next();
  });

  const startSession = (c: Context, profile: Parameters<typeof upsertUser>[1]) => {
    if (deps.allowedEmails && !deps.allowedEmails.has(profile.email.toLowerCase()))
      throw new HTTPException(403, { message: `${profile.email} is not allowed` });
    const now = deps.now();
    const token = createSession(db, upsertUser(db, profile, now), now);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true, secure: deps.secureCookies, sameSite: "Lax", path: "/", maxAge: SESSION_DAYS * 86_400,
    });
    return c.json({ ok: true });
  };

  app.get("/api/config", (c) => c.json<Config>({ googleClientId: deps.googleClientId, devLogin: deps.devLogin }));

  app.post("/api/auth/google", async (c) => {
    if (!deps.verifyGoogle) throw new HTTPException(503, { message: "Google login is not configured (GOOGLE_CLIENT_ID)" });
    const { credential } = z.strictObject({ credential: z.string() }).parse(await c.req.json());
    let profile;
    try {
      profile = await deps.verifyGoogle(credential);
    } catch (e) {
      throw new HTTPException(401, { message: `Google sign-in failed: ${(e as Error).message}` });
    }
    return startSession(c, profile);
  });

  if (deps.devLogin) {
    app.post("/api/auth/dev", async (c) => {
      const { email } = z.strictObject({ email: z.email() }).parse(await c.req.json());
      return startSession(c, { sub: `dev:${email}`, email, name: email.split("@")[0], picture: null });
    });
  }

  app.post("/api/auth/logout", (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) deleteSession(db, token);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.use("/api/*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? sessionUser(db, token, deps.now()) : null;
    if (!user) throw new HTTPException(401, { message: "Not signed in" });
    c.set("user", user);
    await next();
  });

  const prefsOf = (user: User): Record<Language, Prefs> => {
    const stored = JSON.parse(user.prefs) as Partial<Record<Language, Prefs>>;
    return Object.fromEntries(LANGUAGES.map((l) => [l, stored[l] ? PrefsSchema.parse(stored[l]) : DEFAULT_PREFS])) as Record<Language, Prefs>;
  };

  app.get("/api/me", (c) => {
    const u = c.get("user");
    return c.json<Me>({ email: u.email, name: u.name, picture: u.picture, prefs: prefsOf(u) });
  });

  app.put("/api/prefs", async (c) => {
    const { language, prefs } = PutPrefsSchema.parse(await c.req.json());
    const u = c.get("user");
    db.prepare("UPDATE users SET prefs = ? WHERE id = ?").run(JSON.stringify({ ...prefsOf(u), [language]: prefs }), u.id);
    return c.json({ ok: true });
  });

  const counts = (userId: number, language: Language) => ({
    dueCount: (db.prepare("SELECT count(*) AS n FROM review_cards WHERE user_id = ? AND language = ? AND due <= ?")
      .get(userId, language, deps.now().toISOString()) as { n: number }).n,
    mistakesCount: (db.prepare("SELECT count(*) AS n FROM mistakes WHERE user_id = ? AND language = ? AND removed_at IS NULL")
      .get(userId, language) as { n: number }).n,
  });

  const completedLessons = (userId: number) =>
    new Set((db.prepare("SELECT DISTINCT lesson_id FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL")
      .all(userId) as { lesson_id: string }[]).map((r) => r.lesson_id));

  app.get("/api/catalog", (c) => {
    const language = lang(c);
    const userId = c.get("user").id;
    const courses = content.courses.filter((x) => x.language === language);
    const rows = db.prepare("SELECT lesson_id, path, next_index, completed_at FROM lesson_progress WHERE user_id = ?").all(userId) as {
      lesson_id: string; path: keyof typeof PATHS; next_index: number; completed_at: string | null;
    }[];
    const progress: Catalog["progress"] = {};
    for (const r of rows) (progress[r.lesson_id] ??= {})[r.path] = { nextIndex: r.next_index, completedAt: r.completed_at };
    const unlocked = [...unlockedIds(courses, completedLessons(userId))];
    return c.json<Catalog>({ courses, progress, unlocked, ...counts(userId, language) });
  });

  app.post("/api/attempts", async (c) => {
    const a = AttemptSchema.parse(await c.req.json());
    const unit = unitOr404(a.unitId);
    if (a.rev !== unit.rev) throw new HTTPException(409, { message: `Unit ${unit.id} is now rev ${unit.rev}; reload` });
    if ((a.meaningCorrect === null) !== !unit.distractors)
      throw new HTTPException(400, { message: `Unit ${unit.id} ${unit.distractors ? "needs" : "has no"} a meaning check` });
    const userId = c.get("user").id;
    if (a.mode === "learn" && !unlockedIds(content.courses, completedLessons(userId)).has(unit.lessonId))
      throw new HTTPException(403, { message: `Lesson ${unit.lessonId} is locked` });
    const now = deps.now();
    const iso = now.toISOString();
    const meaningMissed = a.meaningCorrect === false;
    const missed = a.outcome === "corrected" || a.outcome === "revealed" || meaningMissed;
    const categories = meaningMissed ? [...a.categories, "meaning"] : a.categories;

    transaction(db, () => {
      db.prepare(
        `INSERT INTO attempts (user_id, unit_id, unit_rev, course_id, lesson_id, mode, path, hints_level, outcome,
           wrong_submissions, hints_used, replays, accent_slips, submissions, meaning_correct, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(userId, unit.id, unit.rev, unit.courseId, unit.lessonId, a.mode, a.path, a.hintsLevel, a.outcome,
        a.wrongSubmissions, a.hintsUsed, a.replays, a.accentSlips, JSON.stringify(a.submissions),
        a.meaningCorrect === null ? null : Number(a.meaningCorrect), a.durationMs, iso);

      if (a.mode === "learn") {
        const pathUnits = lessons.get(unit.lessonId)!.units.filter((u) => (PATHS[a.path] as readonly string[]).includes(u.stage));
        const idx = pathUnits.findIndex((u) => u.id === unit.id);
        if (idx < 0) throw new HTTPException(400, { message: `Unit ${unit.id} is not on path ${a.path}` });
        const done = idx === pathUnits.length - 1;
        db.prepare(
          `INSERT INTO lesson_progress (user_id, lesson_id, path, next_index, completed_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT DO UPDATE SET next_index = excluded.next_index, completed_at = coalesce(completed_at, excluded.completed_at)`,
        ).run(userId, unit.lessonId, a.path, idx + 1, done ? iso : null);
      }

      const mistake = db.prepare("SELECT categories, clean_streak FROM mistakes WHERE user_id = ? AND unit_id = ? AND removed_at IS NULL")
        .get(userId, unit.id) as { categories: string; clean_streak: number } | undefined;
      if (missed) {
        const firstWrong = a.submissions[0] ?? null;
        const cats = [...new Set([...(mistake ? (JSON.parse(mistake.categories) as string[]) : []), ...categories])];
        db.prepare(
          `INSERT INTO mistakes (user_id, unit_id, language, first_wrong_at, last_wrong_at, wrong_count, last_answer, categories, clean_streak, removed_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, NULL)
           ON CONFLICT DO UPDATE SET last_wrong_at = excluded.last_wrong_at, wrong_count = wrong_count + 1,
             last_answer = coalesce(excluded.last_answer, last_answer), categories = excluded.categories, clean_streak = 0, removed_at = NULL`,
        ).run(userId, unit.id, unit.language, iso, iso, firstWrong, JSON.stringify(cats));
      } else if (mistake) {
        const streak = a.outcome === "clean" ? mistake.clean_streak + 1 : 0;
        db.prepare("UPDATE mistakes SET clean_streak = ?, removed_at = ? WHERE user_id = ? AND unit_id = ?")
          .run(streak, streak >= GRADUATE_AFTER ? iso : null, userId, unit.id);
      }

      const card = db.prepare("SELECT card FROM review_cards WHERE user_id = ? AND unit_id = ?").get(userId, unit.id) as { card: string } | undefined;
      if (card || unit.stage === "sentence" || missed) {
        const next = schedule(card?.card ?? null, meaningMissed ? "corrected" : a.outcome, now);
        db.prepare(
          `INSERT INTO review_cards (user_id, unit_id, language, due, card) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT DO UPDATE SET due = excluded.due, card = excluded.card`,
        ).run(userId, unit.id, unit.language, next.due.toISOString(), JSON.stringify(next));
      }
    });
    return c.json({ ok: true });
  });

  app.get("/api/review", (c) => {
    const language = lang(c);
    const userId = c.get("user").id;
    const rows = db.prepare("SELECT unit_id FROM review_cards WHERE user_id = ? AND language = ? AND due <= ? ORDER BY due LIMIT ?")
      .all(userId, language, deps.now().toISOString(), REVIEW_BATCH) as { unit_id: string }[];
    return c.json<ReviewOut>({ units: rows.map((r) => unitOr404(r.unit_id)), dueCount: counts(userId, language).dueCount });
  });

  const cachedExplanation = (unit: ServedUnit, answer: string): ExplanationOut | null => {
    const row = db.prepare("SELECT categories, summary, details FROM explanations WHERE unit_id = ? AND unit_rev = ? AND answer_key = ? AND model = ?")
      .get(unit.id, unit.rev, answerKey(answer), deps.explainModel) as { categories: string; summary: string; details: string } | undefined;
    return row ? { categories: JSON.parse(row.categories), summary: row.summary, details: row.details } : null;
  };

  app.get("/api/mistakes", (c) => {
    const language = lang(c);
    const rows = db.prepare(
      `SELECT unit_id, wrong_count, last_wrong_at, last_answer, categories, clean_streak FROM mistakes
       WHERE user_id = ? AND language = ? AND removed_at IS NULL ORDER BY last_wrong_at DESC`,
    ).all(c.get("user").id, language) as {
      unit_id: string; wrong_count: number; last_wrong_at: string; last_answer: string | null; categories: string; clean_streak: number;
    }[];
    return c.json<MistakeEntry[]>(rows.map((r) => {
      const unit = unitOr404(r.unit_id);
      return {
        unit, wrongCount: r.wrong_count, lastWrongAt: r.last_wrong_at, lastAnswer: r.last_answer,
        categories: JSON.parse(r.categories), cleanStreak: r.clean_streak,
        explanation: r.last_answer ? cachedExplanation(unit, r.last_answer) : null,
      };
    }));
  });

  app.delete("/api/mistakes/:unitId", (c) => {
    const res = db.prepare("UPDATE mistakes SET removed_at = ? WHERE user_id = ? AND unit_id = ? AND removed_at IS NULL")
      .run(deps.now().toISOString(), c.get("user").id, c.req.param("unitId"));
    if (res.changes === 0) throw new HTTPException(404, { message: "No such notebook entry" });
    return c.json({ ok: true });
  });

  app.post("/api/explain", async (c) => {
    const { unitId, answer } = ExplainSchema.parse(await c.req.json());
    const unit = unitOr404(unitId);
    const result = grade({ mode: "free", text: answer }, unit);
    if (result.passed) throw new HTTPException(400, { message: "That answer is correct" });

    const cached = cachedExplanation(unit, answer);
    if (cached) return c.json({ ...cached, cached: true });
    if (!deps.explainer) throw new HTTPException(503, { message: "The explainer is not configured (OPENAI_API_KEY)" });

    const userId = c.get("user").id;
    const day = deps.now().toISOString().slice(0, 10);
    const used = (db.prepare("SELECT count FROM explain_usage WHERE user_id = ? AND day = ?").get(userId, day) as { count: number } | undefined)?.count ?? 0;
    if (used >= deps.explainDailyLimit) throw new HTTPException(429, { message: `Daily explanation limit (${deps.explainDailyLimit}) reached` });

    const lesson = lessons.get(unit.lessonId)!;
    const ex = await deps.explainer.explain({ unit, grammarFocus: lesson.grammarFocus, answer, grade: result });
    transaction(db, () => {
      db.prepare(
        `INSERT INTO explanations (unit_id, unit_rev, answer_key, model, categories, summary, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      ).run(unit.id, unit.rev, answerKey(answer), deps.explainer!.model, JSON.stringify(ex.categories), ex.summary, ex.details, deps.now().toISOString());
      db.prepare("INSERT INTO explain_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT DO UPDATE SET count = count + 1").run(userId, day);
    });
    return c.json({ ...ex, cached: false });
  });

  app.all("/api/*", () => {
    throw new HTTPException(404, { message: "Not found" });
  });

  return app;
}
