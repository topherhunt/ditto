import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  BOARD_SIZE, CHALLENGE_ACTIONS, ChallengeSchema, FRIEND_ACTIONS, FRIEND_REQUESTS_PER_DAY, FriendRequestSchema, LEADERBOARD_SIZE, LEADERBOARD_WINDOWS,
  PostBoardSchema, PublicIdSchema, RACE_DEADLINE_DAYS, type ActivityWindow, type BoardOut, type ChallengeOut, type CompareRow, type FriendSearchOut, type FriendsOut, type LanguageProfile,
  type LeaderboardOut, type LeaderboardRow, type LeaderboardWindow, type NotificationKind, type NotificationsOut, type Person, type Profile,
  type Relation, UserReportSchema,
} from "../shared/api.ts";
import type { Language, ServedCourse, ServedLesson } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { transaction, type DB } from "./db.ts";

const DAY = 86_400_000;
const ACTIVITY_WINDOWS: [ActivityWindow, number][] = [["day", 1], ["week", 7], ["month", 30], ["year", 365]];
const ACCURACY_LESSONS = 10;
const RECENT_LESSONS = 8;
const NOTIFICATIONS_SHOWN = 20;
/** How long finished, declined and cancelled races stay listed. */
const PAST_RACES_DAYS = 30;

type ChallengeRow = {
  id: number; challenger_id: number; opponent_id: number; kind: "most" | "first_to"; days: number; target: number | null;
  status: ChallengeOut["status"]; created_at: string; started_at: string | null; ends_at: string | null;
  finished_at: string | null; winner_id: number | null;
};
type LatestAttempt = { outcome: string; meaning_correct: number | null; hints_used: number; duration_ms: number };

const Id = z.coerce.number().int();

export function friendIds(db: DB, userId: number): number[] {
  return (db.prepare(
    `SELECT addressee_id AS id FROM friendships WHERE requester_id = ? AND status = 'accepted'
     UNION SELECT requester_id FROM friendships WHERE addressee_id = ? AND status = 'accepted'`,
  ).all(userId, userId) as { id: number }[]).map((r) => r.id);
}

/** Lessons any friend has started -> those friends. */
export function friendLessons(db: DB, userId: number): Map<string, Person[]> {
  const rows = db.prepare(
    `SELECT DISTINCT p.lesson_id, u.public_id AS id, u.username FROM lesson_progress p JOIN users u ON u.id = p.user_id
     WHERE p.user_id IN (SELECT value FROM json_each(?)) ORDER BY u.username IS NULL, u.username COLLATE NOCASE`,
  ).all(JSON.stringify(friendIds(db, userId))) as { lesson_id: string; id: string; username: string | null }[];
  const out = new Map<string, Person[]>();
  for (const { lesson_id, ...person } of rows) out.set(lesson_id, [...(out.get(lesson_id) ?? []), person]);
  return out;
}

/** Friends, profiles, lesson comparisons, races and notifications. */
export function registerSocial(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  // Structure and titles are the same in every locale; nothing here serves localized text.
  const courses = deps.content.locales.en.courses;
  const courseOf = new Map<string, ServedCourse>(courses.flatMap((c) => c.lessons.map((l) => [l.id, c] as const)));
  const lessonById = new Map<string, ServedLesson>(courses.flatMap((c) => c.lessons.map((l) => [l.id, l] as const)));
  const iso = () => deps.now().toISOString();
  const daysAgo = (n: number) => new Date(deps.now().getTime() - n * DAY).toISOString();
  /** Unnamed accounts last. */
  const byName = (a: Person, b: Person) =>
    a.username === null || b.username === null ? Number(a.username === null) - Number(b.username === null) : a.username.localeCompare(b.username);
  const pct = (n: number, of: number) => Math.round((100 * n) / of);

  const person = (id: number): Person => {
    const p = db.prepare("SELECT public_id AS id, username FROM users WHERE id = ?").get(id) as Person | undefined;
    if (!p) throw new Error(`No user ${id}`);
    return p;
  };
  /** The row id behind a public id from a URL or request body. */
  const userId = (publicId: string) => {
    const row = db.prepare("SELECT id FROM users WHERE public_id = ?").get(PublicIdSchema.parse(publicId)) as { id: number } | undefined;
    if (!row) throw new HTTPException(404, { message: "No such account" });
    return row.id;
  };
  const userByEmail = (email: string) =>
    db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email.trim()) as { id: number } | undefined;
  const notify = (userId: number, kind: NotificationKind, actorId: number, challengeId: number | null = null) =>
    db.prepare("INSERT INTO notifications (user_id, kind, actor_id, challenge_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(userId, kind, actorId, challengeId, iso());

  /** When each lesson was first completed, oldest first. Lessons since removed from the content are left out. */
  const completions = (userId: number) =>
    (db.prepare(
      `SELECT lesson_id, min(completed_at) AS at FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL
       GROUP BY lesson_id ORDER BY at`,
    ).all(userId) as { lesson_id: string; at: string }[]).filter((r) => courseOf.has(r.lesson_id));
  const completedBetween = (userId: number, from: string, to: string) =>
    completions(userId).filter((r) => r.at >= from && r.at <= to).map((r) => r.at);

  /** The latest learn attempt at each item of the lessons. */
  const latestAttempts = (userId: number, lessonIds: string[]) =>
    db.prepare(
      `SELECT outcome, meaning_correct, hints_used, duration_ms FROM (
         SELECT *, row_number() OVER (PARTITION BY unit_id ORDER BY id DESC) AS rn FROM attempts
         WHERE user_id = ? AND mode = 'learn' AND lesson_id IN (SELECT value FROM json_each(?))
       ) WHERE rn = 1`,
    ).all(userId, JSON.stringify(lessonIds)) as LatestAttempt[];
  const accuracyOf = (rows: LatestAttempt[]) => {
    const asked = rows.filter((r) => r.meaning_correct !== null);
    return {
      dictation: rows.length ? pct(rows.filter((r) => r.outcome === "clean" || r.outcome === "hinted").length, rows.length) : null,
      meaning: asked.length ? pct(asked.filter((r) => r.meaning_correct === 1).length, asked.length) : null,
    };
  };

  const pair = (from: number, to: number) =>
    db.prepare("SELECT status FROM friendships WHERE requester_id = ? AND addressee_id = ?").get(from, to) as
      { status: "pending" | "accepted" } | undefined;
  const blocks = (blocker: number, blocked: number) => !!db.prepare("SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?").get(blocker, blocked);
  /** Blocking deletes the pair's friendships, so a request from the blocked side is one sent since: pending to them, invisible to the blocker. */
  const relation = (me: number, other: number): Relation => {
    if (me === other) return "self";
    if (blocks(me, other)) return "blocked";
    const mine = pair(me, other);
    if (mine) return mine.status === "accepted" ? "friends" : "outgoing";
    const theirs = pair(other, me);
    if (!theirs) return "none";
    return theirs.status === "accepted" ? "friends" : "incoming";
  };
  const unpair = (a: number, b: number) =>
    db.prepare("DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)").run(a, b, b, a);
  const unfriend = (a: number, b: number) => {
    unpair(a, b);
    db.prepare(
      `UPDATE challenges SET status = 'cancelled' WHERE status IN ('pending', 'active')
       AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))`,
    ).run(a, b, b, a);
  };
  const block = (me: number, other: number) => {
    unfriend(me, other);
    db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").run(me, other, iso());
  };
  const accept = (requester: number, addressee: number) => {
    db.prepare("UPDATE friendships SET status = 'accepted', responded_at = ? WHERE requester_id = ? AND addressee_id = ?")
      .run(iso(), requester, addressee);
    notify(requester, "friend_accepted", addressee);
  };

  app.get("/api/friends", (c) => {
    const me = c.get("user").id;
    const rows = db.prepare("SELECT requester_id AS r, addressee_id AS a, status FROM friendships WHERE requester_id = ? OR addressee_id = ? ORDER BY created_at")
      .all(me, me) as { r: number; a: number; status: string }[];
    const pick = (keep: (x: (typeof rows)[number]) => boolean) => rows.filter(keep).map((x) => person(x.r === me ? x.a : x.r));
    const blocked = (db.prepare("SELECT blocked_id AS id FROM blocks WHERE blocker_id = ? ORDER BY created_at").all(me) as { id: number }[]).map((b) => b.id);
    return c.json<FriendsOut>({
      friends: pick((x) => x.status === "accepted").sort(byName),
      incoming: pick((x) => x.a === me && x.status === "pending" && !blocked.includes(x.r)),
      outgoing: pick((x) => x.r === me && x.status === "pending"),
      blocked: blocked.map(person),
    });
  });

  /** Lessons first completed in the window, per user with a username. */
  const lessonsSince = (since: string) => {
    const rows = db.prepare(
      `SELECT p.user_id, p.lesson_id FROM lesson_progress p JOIN users u ON u.id = p.user_id
       WHERE u.username IS NOT NULL AND p.completed_at IS NOT NULL GROUP BY p.user_id, p.lesson_id HAVING min(p.completed_at) >= ?`,
    ).all(since) as { user_id: number; lesson_id: string }[];
    const counts = new Map<number, number>();
    for (const r of rows) if (courseOf.has(r.lesson_id)) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    return counts;
  };

  app.get("/api/leaderboard", (c) => {
    const window = z.enum(Object.keys(LEADERBOARD_WINDOWS) as [LeaderboardWindow]).parse(c.req.query("window"));
    const me = c.get("user").id;
    const counts = lessonsSince(daysAgo(LEADERBOARD_WINDOWS[window]));
    const ranked = [me, ...friendIds(db, me)].map((id) => ({ id, person: person(id), lessons: counts.get(id) ?? 0 }))
      .sort((a, b) => b.lessons - a.lessons || byName(a.person, b.person));
    const rows: LeaderboardRow[] = ranked.map(({ id, ...r }) => ({
      rank: ranked.findIndex((x) => x.lessons === r.lessons) + 1, ...r, isMe: id === me,
    }));
    const shown = rows.slice(0, LEADERBOARD_SIZE);
    return c.json<LeaderboardOut>({ rows: shown, me: shown.some((r) => r.isMe) ? null : (rows.find((r) => r.isMe) ?? null) });
  });

  app.get("/api/friends/search", (c) => {
    // Usernames can't contain "@", so any "@" means an email, except a lone leading one ("@ana").
    const q = z.string().trim().min(1).parse(c.req.query("q")).replace(/^@(?=[^@]+$)/, "");
    const other = q.includes("@")
      ? userByEmail(z.email().parse(q))
      : db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(q) as { id: number } | undefined;
    return c.json<FriendSearchOut>(other ? { found: true, person: person(other.id), relation: relation(c.get("user").id, other.id) } : { found: false });
  });

  app.post("/api/friends/requests", async (c) => {
    const other = userId(FriendRequestSchema.parse(await c.req.json()).userId);
    const me = c.get("user").id;
    const rel = relation(me, other);
    if (rel === "self") throw new HTTPException(400, { message: "That's you" });
    if (rel === "blocked") throw new HTTPException(409, { message: "You blocked them; unblock them first" });
    // Counted from notifications, which outlive a declined request.
    const sent = db.prepare("SELECT count(*) AS n FROM notifications WHERE actor_id = ? AND kind = 'friend_request' AND created_at > ?")
      .get(me, daysAgo(1)) as { n: number };
    if (rel === "none" && sent.n >= FRIEND_REQUESTS_PER_DAY) throw new HTTPException(403, { message: `You've sent ${FRIEND_REQUESTS_PER_DAY} friend requests today` });
    transaction(db, () => {
      if (rel === "none") {
        db.prepare("INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)").run(me, other, iso());
        if (!blocks(other, me)) notify(other, "friend_request", me);
      }
      if (rel === "incoming") accept(other, me);
    });
    return c.json({ relation: relation(me, other) });
  });

  app.post("/api/friends/:id/:action", (c) => {
    const action = z.enum(FRIEND_ACTIONS).parse(c.req.param("action"));
    const other = userId(c.req.param("id"));
    const me = c.get("user").id;
    const rel = relation(me, other);
    const needs = {
      accept: ["incoming"], decline: ["incoming"], block: ["none", "outgoing", "incoming", "friends"], unblock: ["blocked"], unfriend: ["friends"],
    } as const satisfies Record<(typeof FRIEND_ACTIONS)[number], Relation[]>;
    if (!(needs[action] as readonly Relation[]).includes(rel)) throw new HTTPException(404, { message: `Can't ${action} an account whose relation is ${rel}` });
    transaction(db, () => {
      if (action === "accept") accept(other, me);
      else if (action === "block") block(me, other);
      else if (action === "unblock") {
        db.prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?").run(me, other);
        // Drops a request they sent while blocked, which the blocker never saw.
        unpair(me, other);
      } else if (action === "unfriend") unfriend(me, other);
      else db.prepare("DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ?").run(other, me);
    });
    return c.json({ ok: true });
  });

  app.post("/api/people/:id/report", async (c) => {
    const { reason, note } = UserReportSchema.parse(await c.req.json());
    const other = userId(c.req.param("id"));
    const me = c.get("user").id;
    if (me === other) throw new HTTPException(400, { message: "That's you" });
    if (db.prepare("SELECT 1 FROM user_reports WHERE reporter_id = ? AND reported_id = ? AND resolved_at IS NULL").get(me, other))
      throw new HTTPException(409, { message: "You already reported them" });
    const { username } = db.prepare("SELECT username FROM users WHERE id = ?").get(other) as { username: string | null };
    const posted = db.prepare("SELECT blurb FROM friend_board WHERE user_id = ?").get(other) as { blurb: string | null } | undefined;
    transaction(db, () => {
      db.prepare("INSERT INTO user_reports (reporter_id, reported_id, reason, note, username, blurb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(me, other, reason, note || null, username, posted ? posted.blurb : null, iso());
      block(me, other);
    });
    return c.json({ relation: relation(me, other) });
  });

  const mainTrack = (language: Language) =>
    courses.filter((c) => c.language === language && c.track === "main").sort((a, b) => a.level.localeCompare(b.level) || a.order - b.order);
  const languageProfile = (language: Language, worked: { lesson_id: string; last: string }[], doneAt: Map<string, string>): LanguageProfile => {
    const inLanguage = courses.filter((c) => c.language === language);
    const complete = (c: ServedCourse) => c.lessons.every((l) => doneAt.has(l.id));
    const main = mainTrack(language);
    const next = main.findIndex((c) => !complete(c));
    return {
      language,
      module: next < 0 ? null : { number: next + 1, of: main.length, title: main[next].title },
      optionalDone: inLanguage.filter((c) => c.track === "optional" && complete(c)).length,
      completions: [...doneAt].filter(([id]) => courseOf.get(id)!.language === language).map(([, at]) => at).sort(),
      levelsDone: [...new Set(main.map((c) => c.level))].flatMap((level) => {
        const inLevel = main.filter((c) => c.level === level);
        if (!inLevel.every(complete)) return [];
        return [{ level, at: inLevel.flatMap((c) => c.lessons.map((l) => doneAt.get(l.id)!)).sort().at(-1)! }];
      }),
      recent: worked.filter((r) => courseOf.get(r.lesson_id)!.language === language).slice(0, RECENT_LESSONS).map((r) => ({
        lessonId: r.lesson_id, lessonTitle: lessonById.get(r.lesson_id)!.title, courseTitle: courseOf.get(r.lesson_id)!.title,
        completed: doneAt.has(r.lesson_id), lastAt: r.last,
      })),
    };
  };

  /** Lessons done and worked on, plus the language and activity a public profile or board entry shows. */
  const summarize = (id: number) => {
    const done = completions(id);
    const worked = (db.prepare("SELECT lesson_id, max(created_at) AS last FROM attempts WHERE user_id = ? AND mode = 'learn' GROUP BY lesson_id ORDER BY last DESC")
      .all(id) as { lesson_id: string; last: string }[]).filter((r) => courseOf.has(r.lesson_id));
    const studying = (db.prepare("SELECT language FROM learning_languages WHERE user_id = ? ORDER BY rowid").all(id) as { language: Language }[]).map((r) => r.language);
    const workedLanguages = worked.map((r) => courseOf.get(r.lesson_id)!.language);
    const windowed = ACTIVITY_WINDOWS.map(([window, days]) => ({ window, lessons: done.filter((r) => r.at >= daysAgo(days)).length }))
      .find((w) => w.lessons >= 2);
    return {
      done, worked,
      // A lesson in a language they don't study (trying one out) doesn't count.
      language: workedLanguages.find((l) => studying.includes(l)) ?? studying[0] ?? workedLanguages[0] ?? null,
      activity: windowed ?? (done.length ? { lastCompletedAt: done.at(-1)!.at } : null),
    };
  };

  app.get("/api/profile/:id", (c) => {
    const me = c.get("user").id;
    const id = c.req.param("id") === "me" ? me : userId(c.req.param("id"));
    const rel = relation(me, id);
    const insider = rel === "self" || rel === "friends";
    const { profile_public } = db.prepare("SELECT profile_public FROM users WHERE id = ?").get(id) as { profile_public: number };
    if (!insider && profile_public === 0) return c.json<Profile>({ person: person(id), relation: rel, summary: null, details: null });

    const { done, worked, language, activity } = summarize(id);
    const since = (window: LeaderboardWindow) => done.filter((r) => r.at >= daysAgo(LEADERBOARD_WINDOWS[window])).length;
    const base = { person: person(id), relation: rel, summary: {
      language, activity, lessons: { day: since("day"), week: since("week"), month: since("month") },
    } };
    if (!insider) return c.json<Profile>({ ...base, details: null });
    const accuracyLessons = worked.slice(0, ACCURACY_LESSONS).map((r) => r.lesson_id);
    const doneAt = new Map(done.map((r) => [r.lesson_id, r.at]));
    return c.json<Profile>({ ...base, details: {
      accuracy: { lessons: accuracyLessons.length, ...accuracyOf(latestAttempts(id, accuracyLessons)) },
      languages: [...new Set(worked.map((r) => courseOf.get(r.lesson_id)!.language))].map((l) => languageProfile(l, worked, doneAt)),
    } });
  });

  const board = (me: number): BoardOut => {
    if (!db.prepare("SELECT 1 FROM friend_board WHERE user_id = ?").get(me)) return { posted: false };
    // A block in either direction hides each from the other, silently.
    const rows = db.prepare(
      `SELECT user_id, blurb FROM friend_board b WHERE user_id = ?1 OR NOT EXISTS (
         SELECT 1 FROM blocks k WHERE (k.blocker_id = ?1 AND k.blocked_id = b.user_id) OR (k.blocker_id = b.user_id AND k.blocked_id = ?1)
       ) ORDER BY user_id = ?1 DESC, random() LIMIT ?2`,
    ).all(me, BOARD_SIZE) as { user_id: number; blurb: string | null }[];
    // SQL keeps the viewer within the limit; this puts them somewhere random.
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return { posted: true, entries: rows.map((r) => {
      const { done, language, activity } = summarize(r.user_id);
      const doneIds = new Set(done.map((d) => d.lesson_id));
      const main = language ? mainTrack(language) : [];
      const level = (main.find((c) => !c.lessons.every((l) => doneIds.has(l.id))) ?? main.at(-1))?.level ?? null;
      return { person: person(r.user_id), relation: relation(me, r.user_id), isMe: r.user_id === me, language, level, activity, blurb: r.blurb };
    }) };
  };

  app.get("/api/friend-board", (c) => c.json<BoardOut>(board(c.get("user").id)));

  app.put("/api/friend-board", async (c) => {
    const { blurb } = PostBoardSchema.parse(await c.req.json());
    const me = c.get("user");
    if (me.username === null) throw new HTTPException(400, { message: "Pick a username first" });
    db.prepare("INSERT INTO friend_board (user_id, blurb, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET blurb = excluded.blurb")
      .run(me.id, blurb || null, iso());
    return c.json<BoardOut>(board(me.id));
  });

  app.delete("/api/friend-board", (c) => {
    db.prepare("DELETE FROM friend_board WHERE user_id = ?").run(c.get("user").id);
    return c.json<BoardOut>({ posted: false });
  });

  app.get("/api/lessons/:lessonId/compare", (c) => {
    const lessonId = c.req.param("lessonId");
    if (!lessonById.has(lessonId)) throw new HTTPException(404, { message: `Unknown lesson ${lessonId}` });
    const me = c.get("user").id;
    return c.json<CompareRow[]>([me, ...friendIds(db, me)].flatMap((id) => {
      const rows = latestAttempts(id, [lessonId]);
      if (!rows.length) return [];
      const acc = accuracyOf(rows);
      return [{
        person: person(id), isMe: id === me, items: rows.length, dictation: acc.dictation!, meaning: acc.meaning,
        hints: rows.reduce((n, r) => n + r.hints_used, 0), durationMs: rows.reduce((n, r) => n + r.duration_ms, 0),
      }];
    }));
  });

  const challengeRow = (id: number) => db.prepare("SELECT * FROM challenges WHERE id = ?").get(id) as ChallengeRow;
  const challengeOut = (viewer: number) => (r: ChallengeRow): ChallengeOut => {
    const score = (userId: number) => (r.started_at ? completedBetween(userId, r.started_at, r.finished_at ?? iso()).length : 0);
    return {
      id: r.id, kind: r.kind, days: r.days, target: r.target, status: r.status,
      challenger: person(r.challenger_id), opponent: person(r.opponent_id), mine: r.challenger_id === viewer,
      startedAt: r.started_at, endsAt: r.ends_at, finishedAt: r.finished_at, winnerId: r.winner_id === null ? null : person(r.winner_id).id,
      scores: { challenger: score(r.challenger_id), opponent: score(r.opponent_id) },
    };
  };

  /** Finishes the races that have been won or have run out of time, and tells both sides. */
  const settle = () => {
    const now = iso();
    for (const r of db.prepare("SELECT * FROM challenges WHERE status = 'active'").all() as ChallengeRow[]) {
      const sides = [r.challenger_id, r.opponent_id];
      const [a, b] = sides.map((id) => completedBetween(id, r.started_at!, r.ends_at!));
      let result: { at: string; winner: number | null } | null = null;
      if (r.kind === "first_to") {
        const [ra, rb] = [a[r.target! - 1], b[r.target! - 1]];
        if (ra !== undefined || rb !== undefined) {
          const winner = ra === rb ? null : rb === undefined || (ra !== undefined && ra < rb) ? sides[0] : sides[1];
          result = { at: [ra, rb].filter((x) => x !== undefined).sort()[0], winner };
        }
      }
      if (!result && r.ends_at! <= now) result = { at: r.ends_at!, winner: a.length === b.length ? null : a.length > b.length ? sides[0] : sides[1] };
      if (!result) continue;
      const { at, winner } = result;
      transaction(db, () => {
        db.prepare("UPDATE challenges SET status = 'finished', finished_at = ?, winner_id = ? WHERE id = ?").run(at, winner, r.id);
        notify(r.challenger_id, "challenge_finished", r.opponent_id, r.id);
        notify(r.opponent_id, "challenge_finished", r.challenger_id, r.id);
      });
    }
  };

  app.get("/api/challenges", (c) => {
    settle();
    const me = c.get("user").id;
    const rows = db.prepare(
      `SELECT * FROM challenges WHERE (challenger_id = ? OR opponent_id = ?)
       AND (status IN ('pending', 'active') OR coalesce(finished_at, created_at) >= ?) ORDER BY created_at DESC, id DESC`,
    ).all(me, me, daysAgo(PAST_RACES_DAYS)) as ChallengeRow[];
    return c.json<ChallengeOut[]>(rows.map(challengeOut(me)));
  });

  app.post("/api/challenges", async (c) => {
    const body = ChallengeSchema.parse(await c.req.json());
    const me = c.get("user").id;
    const them = userId(body.opponentId);
    if (relation(me, them) !== "friends") throw new HTTPException(404, { message: "You can only race your friends" });
    const open = db.prepare(
      `SELECT 1 FROM challenges WHERE status IN ('pending', 'active')
       AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))`,
    ).get(me, them, them, me);
    if (open) throw new HTTPException(409, { message: "You already have a race with them" });
    const id = transaction(db, () => {
      const row = db.prepare(
        "INSERT INTO challenges (challenger_id, opponent_id, kind, days, target, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?) RETURNING id",
      ).get(me, them, body.kind, body.kind === "most" ? body.days : RACE_DEADLINE_DAYS, body.kind === "first_to" ? body.target : null, iso()) as { id: number };
      notify(them, "challenge_invite", me, row.id);
      return row.id;
    });
    return c.json(challengeOut(me)(challengeRow(id)));
  });

  app.post("/api/challenges/:id/:action", (c) => {
    const action = z.enum(CHALLENGE_ACTIONS).parse(c.req.param("action"));
    const id = Id.parse(c.req.param("id"));
    const me = c.get("user").id;
    // Only the challenger cancels; only the opponent accepts or declines.
    const r = db.prepare(`SELECT * FROM challenges WHERE id = ? AND status = 'pending' AND ${action === "cancel" ? "challenger_id" : "opponent_id"} = ?`)
      .get(id, me) as ChallengeRow | undefined;
    if (!r) throw new HTTPException(404, { message: `No pending race to ${action}` });
    transaction(db, () => {
      if (action === "accept") {
        const start = deps.now();
        db.prepare("UPDATE challenges SET status = 'active', started_at = ?, ends_at = ? WHERE id = ?")
          .run(start.toISOString(), new Date(start.getTime() + r.days * DAY).toISOString(), id);
        notify(r.challenger_id, "challenge_accepted", me, id);
      } else if (action === "decline") {
        db.prepare("UPDATE challenges SET status = 'declined' WHERE id = ?").run(id);
        notify(r.challenger_id, "challenge_declined", me, id);
      } else db.prepare("UPDATE challenges SET status = 'cancelled' WHERE id = ?").run(id);
    });
    return c.json(challengeOut(me)(challengeRow(id)));
  });

  app.get("/api/notifications", (c) => {
    settle();
    const me = c.get("user").id;
    const rows = db.prepare("SELECT id, kind, actor_id, challenge_id, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?")
      .all(me, NOTIFICATIONS_SHOWN) as { id: number; kind: NotificationKind; actor_id: number; challenge_id: number | null; created_at: string; read_at: string | null }[];
    const unread = (db.prepare("SELECT count(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(me) as { n: number }).n;
    return c.json<NotificationsOut>({
      unread,
      items: rows.map((r) => ({
        id: r.id, kind: r.kind, actor: person(r.actor_id), challenge: r.challenge_id === null ? null : challengeOut(me)(challengeRow(r.challenge_id)),
        createdAt: r.created_at, read: r.read_at !== null,
      })),
    });
  });

  app.post("/api/notifications/read", (c) => {
    db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(iso(), c.get("user").id);
    return c.json({ ok: true });
  });
}
