import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  AttemptSchema, ExplainSchema, LevelPassSchema, PutLearningSchema, PutLocaleSchema, PutPrefsSchema, PutProfileVisibilitySchema, PutUsernameSchema, ReportSchema,
  MASTER_WAIT_MS, SPEND_CAP_HEADER, SPEND_TODAY_HEADER,
  type AttemptOut, type Catalog, type CatalogCourse, type Config, type ExplanationOut, type LessonOut, type LessonStars, type LevelTestOut, type Me, type MistakeEntry, type ReviewOut,
} from "../shared/api.ts";
import { LANGUAGES, NATIVE_LOCALES, PATHS, STAGES, supportLocale, type Language, type Locale, type ServedLesson, type ServedUnit, type Stage } from "../shared/content.ts";
import { grade } from "../shared/grader.ts";
import { exactKey } from "../shared/tokenize.ts";
import { registerActivity } from "./activity.ts";
import { isAdmin, registerAdmin } from "./admin.ts";
import { registerAdminUserReports } from "./admin-user-reports.ts";
import { registerAdminUsers } from "./admin-users.ts";
import {
  createSession, deleteSession, helpLocale, prefsOf, SESSION_COOKIE, SESSION_DAYS, sessionUser, upsertUser, type User, type VerifyGoogle,
} from "./auth.ts";
import { VOICES, voiceId, type Content } from "./content.ts";
import { registerConversation, type ConversationDeps } from "./conversation.ts";
import { transaction, type DB } from "./db.ts";
import type { Explainer } from "./explain.ts";
import { reportError } from "./healthcheck.ts";
import { levelTestUnits } from "./level-test.ts";
import { registerAdminLanguageRequests, registerLanguageRequests } from "./language-requests.ts";
import { registerMetrics, trafficCounter } from "./metrics.ts";
import { registerPoc } from "./poc.ts";
import { registerQuiz } from "./quiz.ts";
import { friendLessons, registerSocial } from "./social.ts";
import { schedule } from "./srs.ts";
import { starsFor } from "./stars.ts";
import { unlockedIds } from "./unlocks.ts";
import { recordUsage, spentToday, underCapOr429 } from "./usage.ts";

export type AppDeps = {
  db: DB;
  content: Content;
  now: () => Date;
  googleClientId: string | null;
  verifyGoogle: VerifyGoogle | null;
  /** Lowercased; may use /api/admin/* and play any conversation's partner audio. */
  adminEmails: Set<string>;
  devLogin: boolean;
  explainer: Explainer | null;
  secureCookies: boolean;
  /** Where the pronunciation proof-of-concept recorder saves takes; null (always in production) disables it. */
  pocDir: string | null;
  /** Conversation mode's AI, speech and audio dir; null refuses its paid calls. */
  conversation: ConversationDeps | null;
  /** USD per user per UTC day, across every paid call; reaching it refuses paid calls until midnight UTC. */
  dailySpendCap: number;
};

const GRADUATE_AFTER = 2;
const REVIEW_BATCH = 50;
const SLOW_REQUEST_MS = 2000;
const LAST_SEEN_EVERY_MS = 5 * 60_000;

const LangQuery = z.enum(LANGUAGES);
/** Punctuation can make an answer wrong, so it is part of the key; case and spacing are not. */
const answerKey = (answer: string) => exactKey(answer).replace(/\s+/g, " ").trim();
/** mistakes.explanation: the unit rev, help language and answer it explains, so it is shown only while they still match. */
type SavedExplanation = ExplanationOut & { rev: number; locale: Locale; answerKey: string };

export function createApp(deps: AppDeps) {
  const { db, content } = deps;
  /** Ids, stages and unlocks, which every locale shares. Text shown to a learner comes from `content.locales[supportLocale(language, user.locale)]`. */
  const structure = content.locales.en;
  const lessons = new Map<string, ServedLesson>(structure.courses.flatMap((c) => c.lessons.map((l) => [l.id, l] as const)));
  const app = new Hono<{ Variables: { user: User } }>();

  const unitOr404 = (locale: Locale, id: string): ServedUnit => {
    const u = content.locales[locale].units.get(id);
    if (!u) throw new HTTPException(404, { message: `Unknown unit ${id}` });
    return u;
  };
  const lang = (c: Context) => LangQuery.parse(c.req.query("lang"));

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    if (err instanceof z.ZodError) return c.json({ error: "Invalid request", issues: err.issues }, 400);
    console.error(`${c.req.method} ${c.req.path}`, err);
    void reportError(err);
    return c.json({ error: "Internal error" }, 500);
  });

  const traffic = trafficCounter(deps);
  app.use("*", traffic.middleware);

  app.use("/api/*", async (c, next) => {
    const started = performance.now();
    await next();
    const ms = Math.round(performance.now() - started);
    if (ms > SLOW_REQUEST_MS) console.warn(`Slow request: ${c.req.method} ${c.req.path} -> ${c.res.status} in ${ms} ms`);
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

  const learningOf = (userId: number) =>
    (db.prepare("SELECT language FROM learning_languages WHERE user_id = ? ORDER BY rowid").all(userId) as { language: Language }[]).map((r) => r.language);
  const insertLearning = (userId: number, language: Language) =>
    db.prepare("INSERT INTO learning_languages (user_id, language) VALUES (?, ?)").run(userId, language);

  /** `learning`: the language picked on the homepage before sign-in; it only fills an empty list, so a saved choice wins. */
  const startSession = (c: Context, profile: Parameters<typeof upsertUser>[1], locale: Locale, learning: Language | undefined) => {
    const now = deps.now();
    const userId = upsertUser(db, profile, locale, now);
    if (learning && learningOf(userId).length === 0) insertLearning(userId, learning);
    const token = createSession(db, userId, now);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true, secure: deps.secureCookies, sameSite: "Lax", path: "/", maxAge: SESSION_DAYS * 86_400,
    });
    return c.json({ ok: true });
  };

  app.get("/health", (c) => {
    db.prepare("SELECT 1").get();
    return c.json({ ok: true, time: deps.now().toISOString() });
  });

  const quizLanguages = LANGUAGES.filter((l) => content.quizzes.some((d) => d.language === l));
  app.get("/api/config", (c) => c.json<Config>({
    googleClientId: deps.googleClientId, devLogin: deps.devLogin, poc: deps.pocDir !== null, speak: deps.conversation !== null, quiz: quizLanguages,
    dailySpendCap: deps.dailySpendCap,
  }));

  app.post("/api/auth/google", async (c) => {
    if (!deps.verifyGoogle) throw new HTTPException(503, { message: "Google login is not configured (GOOGLE_CLIENT_ID)" });
    const { credential, locale, learning } = z.strictObject({ credential: z.string(), locale: z.enum(NATIVE_LOCALES), learning: z.enum(LANGUAGES).optional() })
      .parse(await c.req.json());
    let profile;
    try {
      profile = await deps.verifyGoogle(credential);
    } catch (e) {
      throw new HTTPException(401, { message: `Google sign-in failed: ${(e as Error).message}` });
    }
    return startSession(c, profile, locale, learning);
  });

  if (deps.devLogin) {
    app.post("/api/auth/dev", async (c) => {
      const { email, locale, learning } = z.strictObject({ email: z.email(), locale: z.enum(NATIVE_LOCALES), learning: z.enum(LANGUAGES).optional() })
        .parse(await c.req.json());
      return startSession(c, { sub: `dev:${email}`, email }, locale, learning);
    });
  }

  app.post("/api/auth/logout", (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) deleteSession(db, token);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  registerLanguageRequests(app, deps);

  // Every signed-in response, errors included, carries the learner's spend so the client can show it and the cap screen.
  // A streamed response's headers go out before its paid calls finish, so they show the spend as it stood at the start.
  app.use("/api/*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? sessionUser(db, token, deps.now()) : null;
    if (!user) throw new HTTPException(401, { message: "Not signed in" });
    c.set("user", user);
    const now = deps.now();
    db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)")
      .run(now.toISOString(), user.id, new Date(now.getTime() - LAST_SEEN_EVERY_MS).toISOString());
    await next();
    c.header(SPEND_TODAY_HEADER, spentToday(db, user.id, deps.now()).toFixed(6));
    c.header(SPEND_CAP_HEADER, deps.dailySpendCap.toFixed(2));
  });

  // Routes that always pay are capped here; the explainer and quiz audio pay only on a cache miss, so they check there.
  const gated = (c: Context, next: () => Promise<void>) => {
    underCapOr429(db, c.get("user").id, deps.dailySpendCap, deps.now());
    return next();
  };
  app.on("POST", [
    "/api/conversations", "/api/conversations/:id/attempts", "/api/conversations/:id/move-on", "/api/conversations/:id/partner", "/api/conversations/:id/how",
  ], gated);
  app.get("/api/conversations/:id/say", gated);

  app.get("/api/me", (c) => {
    const u = c.get("user");
    return c.json<Me>({
      email: u.email, username: u.username, profilePublic: u.profilePublic, locale: u.locale, learning: learningOf(u.id), prefs: prefsOf(u), admin: isAdmin(deps, u),
    });
  });

  app.put("/api/learning", async (c) => {
    const { languages } = PutLearningSchema.parse(await c.req.json());
    const me = c.get("user").id;
    transaction(db, () => {
      db.prepare("DELETE FROM learning_languages WHERE user_id = ?").run(me);
      for (const l of languages) insertLearning(me, l);
    });
    return c.json({ ok: true });
  });

  app.put("/api/locale", async (c) => {
    const { locale } = PutLocaleSchema.parse(await c.req.json());
    db.prepare("UPDATE users SET locale = ? WHERE id = ?").run(locale, c.get("user").id);
    return c.json({ ok: true });
  });

  app.put("/api/username", async (c) => {
    const { username } = PutUsernameSchema.parse(await c.req.json());
    const me = c.get("user").id;
    transaction(db, () => {
      if (db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ?").get(username, me))
        throw new HTTPException(409, { message: `The username ${username} is taken` });
      db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, me);
    });
    return c.json({ ok: true });
  });

  app.put("/api/profile-visibility", async (c) => {
    const { public: open } = PutProfileVisibilitySchema.parse(await c.req.json());
    db.prepare("UPDATE users SET profile_public = ? WHERE id = ?").run(Number(open), c.get("user").id);
    return c.json({ ok: true });
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
  const starRows = (userId: number) =>
    db.prepare("SELECT lesson_id, stars, practiced_at FROM lesson_stars WHERE user_id = ?").all(userId) as
      { lesson_id: string; stars: LessonStars["stars"]; practiced_at: string }[];
  const passedLevels = (userId: number, language: Language) =>
    new Set((db.prepare("SELECT level FROM level_passes WHERE user_id = ? AND language = ?")
      .all(userId, language) as { level: string }[]).map((r) => r.level));
  /** Unlocked, or started by a friend, which makes a lesson playable out of sequence. */
  const playable = (userId: number, language: Language, lessonId: string) =>
    unlockedIds(structure.courses.filter((x) => x.language === language), completedLessons(userId), passedLevels(userId, language)).has(lessonId)
    || friendLessons(db, userId).has(lessonId);

  app.get("/api/catalog", (c) => {
    const language = lang(c);
    const user = c.get("user");
    const userId = user.id;
    const courses = content.locales[supportLocale(language, user.locale)].courses.filter((x) => x.language === language);
    const rows = db.prepare("SELECT lesson_id, path, next_index, completed_at FROM lesson_progress WHERE user_id = ?").all(userId) as {
      lesson_id: string; path: keyof typeof PATHS; next_index: number; completed_at: string | null;
    }[];
    const progress: Catalog["progress"] = {};
    for (const r of rows) (progress[r.lesson_id] ??= {})[r.path] = { nextIndex: r.next_index, completedAt: r.completed_at };
    const passed = passedLevels(userId, language);
    const unlocked = unlockedIds(courses, completedLessons(userId), passed);
    const lessonIds = new Set(courses.flatMap((x) => x.lessons.map((l) => l.id)));
    const viaFriends = Object.fromEntries([...friendLessons(db, userId)].filter(([id]) => lessonIds.has(id) && !unlocked.has(id)));
    const listed = courses.map((x): CatalogCourse => ({
      ...x,
      lessons: x.lessons.map(({ units, ...l }) => ({
        ...l, stages: Object.fromEntries(STAGES.map((s) => [s, units.filter((u) => u.stage === s).length])) as Record<Stage, number>,
      })),
    }));
    const stars: Catalog["stars"] = Object.fromEntries(starRows(userId).filter((r) => lessonIds.has(r.lesson_id))
      .map((r) => [r.lesson_id, { stars: r.stars, practicedAt: r.practiced_at }]));
    return c.json<Catalog>({ courses: listed, progress, stars, unlocked: [...unlocked], passedLevels: [...passed], viaFriends, ...counts(userId, language) });
  });

  app.get("/api/lessons/:lessonId", (c) => {
    const language = lang(c);
    const lessonId = c.req.param("lessonId");
    const user = c.get("user");
    const userId = user.id;
    const lesson = content.locales[supportLocale(language, user.locale)].courses.filter((x) => x.language === language).flatMap((x) => x.lessons).find((l) => l.id === lessonId);
    if (!lesson) throw new HTTPException(404, { message: `Unknown ${language} lesson ${lessonId}` });
    const rows = db.prepare("SELECT path, next_index, completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?").all(userId, lessonId) as {
      path: keyof typeof PATHS; next_index: number; completed_at: string | null;
    }[];
    const progress = Object.fromEntries(rows.map((r) => [r.path, { nextIndex: r.next_index, completedAt: r.completed_at }]));
    const star = starRows(userId).find((r) => r.lesson_id === lessonId);
    const seen = (db.prepare("SELECT DISTINCT unit_id FROM attempts WHERE user_id = ? AND lesson_id = ?").all(userId, lessonId) as { unit_id: string }[]).map((r) => r.unit_id);
    return c.json<LessonOut>({
      ...lesson, playable: playable(userId, language, lessonId), progress, seen,
      stars: star ? { stars: star.stars, practicedAt: star.practiced_at } : null,
    });
  });

  const levelOr404 = (language: Language, level: string) => {
    if (!structure.courses.some((x) => x.language === language && x.level === level))
      throw new HTTPException(404, { message: `No ${level} courses for ${language}` });
  };

  // Test answers are not recorded as attempts: only a pass is, so retakes never touch progress, mistakes or reviews.
  app.get("/api/level-test", (c) => {
    const language = lang(c);
    const level = z.string().parse(c.req.query("level"));
    levelOr404(language, level);
    const courses = content.locales[supportLocale(language, c.get("user").locale)].courses.filter((x) => x.language === language);
    return c.json<LevelTestOut>({ units: levelTestUnits(courses, level) });
  });

  app.post("/api/level-test/pass", async (c) => {
    const { language, level } = LevelPassSchema.parse(await c.req.json());
    levelOr404(language, level);
    db.prepare("INSERT INTO level_passes (user_id, language, level, passed_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING")
      .run(c.get("user").id, language, level, deps.now().toISOString());
    return c.json({ ok: true });
  });

  /**
   * Grades the run that just ended on `unitIds` (the latest attempt at each, of this kind of run) and raises the lesson's best stars.
   * A unit with no attempt of that kind, such as one skipped through the API, is left out.
   */
  const finishRun = (userId: number, lessonId: string, unitIds: string[], master: boolean, fullPath: boolean, iso: string): NonNullable<AttemptOut["stars"]> => {
    const rows = db.prepare(
      `SELECT unit_id, outcome, meaning_correct, hints_level, hints_used, studied FROM attempts
       WHERE user_id = ? AND lesson_id = ? AND mode = 'learn' AND master = ? ORDER BY id`,
    ).all(userId, lessonId, Number(master)) as { unit_id: string; outcome: string; meaning_correct: number | null; hints_level: string; hints_used: number; studied: number }[];
    const latest = new Map(rows.map((r) => [r.unit_id, r]));
    const run = unitIds.flatMap((id) => latest.get(id) ?? []).map((r) => ({
      outcome: r.outcome, meaningCorrect: r.meaning_correct === null ? null : r.meaning_correct === 1, hintsLevel: r.hints_level, hintsUsed: r.hints_used, studied: r.studied === 1,
    }));
    const earned = starsFor(run, { master, fullPath });
    const best = db.prepare(
      `INSERT INTO lesson_stars (user_id, lesson_id, stars, practiced_at) VALUES (?, ?, ?, ?)
       ON CONFLICT DO UPDATE SET stars = max(stars, excluded.stars), practiced_at = excluded.practiced_at RETURNING stars`,
    ).get(userId, lessonId, earned, iso) as { stars: 1 | 2 | 3 };
    return { earned, best: best.stars };
  };

  app.post("/api/attempts", async (c) => {
    const a = AttemptSchema.parse(await c.req.json());
    const unit = unitOr404("en", a.unitId);
    if (a.rev !== unit.rev) throw new HTTPException(409, { message: `Unit ${unit.id} is now rev ${unit.rev}; reload` });
    if ((a.meaningCorrect === null) !== !unit.distractors)
      throw new HTTPException(400, { message: `Unit ${unit.id} ${unit.distractors ? "needs" : "has no"} a meaning check` });
    const userId = c.get("user").id;
    if (a.mode === "learn" && !playable(userId, unit.language, unit.lessonId))
      throw new HTTPException(403, { message: `Lesson ${unit.lessonId} is locked` });
    if ((a.master || a.studied) && a.mode !== "learn") throw new HTTPException(400, { message: "Only a learn-mode attempt can be studied or a Master run" });
    const now = deps.now();
    const star = a.master
      ? db.prepare("SELECT practiced_at FROM lesson_stars WHERE user_id = ? AND lesson_id = ?").get(userId, unit.lessonId) as { practiced_at: string } | undefined
      : undefined;
    if (a.master) {
      if (unit.stage !== "sentence") throw new HTTPException(400, { message: `Unit ${unit.id} is not a sentence, so it is not part of a Master run` });
      if (!star) throw new HTTPException(403, { message: `Lesson ${unit.lessonId} must be completed before Master` });
      if (now.getTime() < Date.parse(star.practiced_at) + MASTER_WAIT_MS) throw new HTTPException(403, { message: `Master for ${unit.lessonId} is not open yet` });
    }
    const iso = now.toISOString();
    const meaningMissed = a.meaningCorrect === false;
    const missed = a.outcome === "corrected" || a.outcome === "revealed" || meaningMissed;
    const categories = meaningMissed ? [...a.categories, "meaning"] : a.categories;
    let stars: AttemptOut["stars"] = null;

    transaction(db, () => {
      db.prepare(
        `INSERT INTO attempts (user_id, unit_id, unit_rev, course_id, lesson_id, mode, path, hints_level, outcome,
           wrong_submissions, hints_used, replays, accent_slips, submissions, meaning_correct, duration_ms, created_at, studied, master)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(userId, unit.id, unit.rev, unit.courseId, unit.lessonId, a.mode, a.path, a.hintsLevel, a.outcome,
        a.wrongSubmissions, a.hintsUsed, a.replays, a.accentSlips, JSON.stringify(a.submissions),
        a.meaningCorrect === null ? null : Number(a.meaningCorrect), a.durationMs, iso, Number(a.studied), Number(a.master));

      if (a.mode === "learn") {
        // A Master run is always the lesson's sentences from the top, so it has no saved position.
        const pathUnits = lessons.get(unit.lessonId)!.units.filter((u) => (PATHS[a.master ? "sentences" : a.path] as readonly string[]).includes(u.stage));
        const idx = pathUnits.findIndex((u) => u.id === unit.id);
        if (idx < 0) throw new HTTPException(400, { message: `Unit ${unit.id} is not on path ${a.path}` });
        const done = idx === pathUnits.length - 1;
        if (!a.master) {
          // Any practice restarts the Master wait, not just a finished run.
          db.prepare("UPDATE lesson_stars SET practiced_at = ? WHERE user_id = ? AND lesson_id = ?").run(iso, userId, unit.lessonId);
          db.prepare(
            `INSERT INTO lesson_progress (user_id, lesson_id, path, next_index, completed_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT DO UPDATE SET next_index = excluded.next_index, completed_at = coalesce(completed_at, excluded.completed_at)`,
          ).run(userId, unit.lessonId, a.path, idx + 1, done ? iso : null);
        }
        if (done) stars = finishRun(userId, unit.lessonId, pathUnits.map((u) => u.id), a.master, a.path === "full", iso);
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
    return c.json<AttemptOut>({ ok: true, stars });
  });

  app.post("/api/reports", async (c) => {
    const r = ReportSchema.parse(await c.req.json());
    const unit = unitOr404("en", r.unitId);
    const url = unit.audio[r.voice];
    if (!url) throw new HTTPException(400, { message: `Unit ${unit.id} has no voice ${r.voice}` });
    // unit.audio is in VOICES order (see loadContent).
    db.prepare(
      `INSERT INTO reports (user_id, unit_id, unit_rev, language, text, voice, audio_file, kind, answer, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(c.get("user").id, unit.id, r.rev, unit.language, unit.text, voiceId(VOICES[unit.language][r.voice]),
      url.replace(/^\/audio\//, ""), r.kind, r.answer ?? null, r.note.trim(), deps.now().toISOString());
    return c.json({ ok: true });
  });

  app.get("/api/review", (c) => {
    const language = lang(c);
    const user = c.get("user");
    const userId = user.id;
    const support = supportLocale(language, user.locale);
    const rows = db.prepare("SELECT unit_id FROM review_cards WHERE user_id = ? AND language = ? AND due <= ? ORDER BY due LIMIT ?")
      .all(userId, language, deps.now().toISOString(), REVIEW_BATCH) as { unit_id: string }[];
    return c.json<ReviewOut>({ units: rows.map((r) => unitOr404(support, r.unit_id)), dueCount: counts(userId, language).dueCount });
  });

  /** A notebook entry's saved explanation, if it explains `answer` to the unit's current text in `locale`. */
  const savedExplanation = (json: string | null, unit: ServedUnit, answer: string, locale: Locale): ExplanationOut | null => {
    if (!json) return null;
    const { rev, locale: savedLocale, answerKey: key, ...ex } = JSON.parse(json) as SavedExplanation;
    return rev === unit.rev && savedLocale === locale && key === answerKey(answer) ? ex : null;
  };

  app.get("/api/mistakes", (c) => {
    const language = lang(c);
    const rows = db.prepare(
      `SELECT unit_id, wrong_count, last_wrong_at, last_answer, categories, clean_streak, explanation FROM mistakes
       WHERE user_id = ? AND language = ? AND removed_at IS NULL ORDER BY last_wrong_at DESC`,
    ).all(c.get("user").id, language) as {
      unit_id: string; wrong_count: number; last_wrong_at: string; last_answer: string | null; categories: string; clean_streak: number;
      explanation: string | null;
    }[];
    const user = c.get("user");
    const support = supportLocale(language, user.locale);
    const help = helpLocale(user, language);
    return c.json<MistakeEntry[]>(rows.map((r) => {
      const unit = unitOr404(support, r.unit_id);
      return {
        unit, wrongCount: r.wrong_count, lastWrongAt: r.last_wrong_at, lastAnswer: r.last_answer,
        categories: JSON.parse(r.categories), cleanStreak: r.clean_streak,
        explanation: r.last_answer ? savedExplanation(r.explanation, unit, r.last_answer, help) : null,
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
    const user = c.get("user");
    const userId = user.id;
    const { language } = unitOr404("en", unitId);
    const support = supportLocale(language, user.locale);
    const locale = helpLocale(user, language);
    const unit = unitOr404(support, unitId);
    const result = grade({ mode: "free", text: answer }, unit);
    if (result.passed) throw new HTTPException(400, { message: "That answer is correct" });

    // Saved on the learner's notebook entry when it explains that entry's last answer, so the notebook shows it.
    const mistake = db.prepare("SELECT last_answer, explanation FROM mistakes WHERE user_id = ? AND unit_id = ?")
      .get(userId, unit.id) as { last_answer: string | null; explanation: string | null } | undefined;
    const saved = mistake ? savedExplanation(mistake.explanation, unit, answer, locale) : null;
    if (saved) return c.json<ExplanationOut>(saved);
    if (!deps.explainer) throw new HTTPException(503, { message: "The explainer is not configured (OPENAI_API_KEY)" });
    underCapOr429(db, userId, deps.dailySpendCap, deps.now());

    // The explainer sees the unit and grammar focus in the learner's support language, and writes in their help language.
    const lesson = content.locales[support].courses.find((x) => x.id === unit.courseId)!.lessons.find((l) => l.id === unit.lessonId)!;
    const { result: ex, usage } = await deps.explainer.explain({ unit, grammarFocus: lesson.grammarFocus, answer, grade: result, locale });
    transaction(db, () => {
      recordUsage(db, userId, null, "explain", usage, deps.now());
      if (mistake?.last_answer && answerKey(mistake.last_answer) === answerKey(answer)) {
        const json: SavedExplanation = { rev: unit.rev, locale, answerKey: answerKey(answer), ...ex };
        db.prepare("UPDATE mistakes SET explanation = ? WHERE user_id = ? AND unit_id = ?").run(JSON.stringify(json), userId, unit.id);
      }
    });
    return c.json<ExplanationOut>(ex);
  });

  registerSocial(app, deps);
  registerAdmin(app, deps);
  registerAdminLanguageRequests(app, deps);
  registerAdminUsers(app, deps);
  registerAdminUserReports(app, deps);
  registerConversation(app, deps);
  registerQuiz(app, deps);
  registerActivity(app, deps);
  registerMetrics(app, deps, traffic);
  if (deps.pocDir) registerPoc(app, content, deps.pocDir);

  app.all("/api/*", () => {
    throw new HTTPException(404, { message: "Not found" });
  });

  return app;
}
