import { describe, expect, it } from "vitest";
import { FRIEND_REQUESTS_PER_DAY, LEADERBOARD_SIZE, type BoardEntry } from "../../shared/api.ts";
import { setup } from "./helpers.ts";

type T = ReturnType<typeof setup>;
const A = "ana@example.com";
const B = "bob@example.com";
const C = "cyd@example.com";
const DAY = 86_400_000;

/** Signs in each email once so the accounts exist, named after the email's local part; returns their public ids. */
async function accounts(t: T, ...emails: string[]) {
  const ids: string[] = [];
  for (const e of emails) {
    await t.login(e);
    expect((await t.req("PUT", "/api/username", { username: e.split("@")[0] })).status).toBe(200);
    ids.push((t.deps.db.prepare("SELECT public_id FROM users WHERE email = ?").get(e) as { public_id: string }).public_id);
  }
  return ids;
}

const idOf = (t: T, email: string) => (t.deps.db.prepare("SELECT public_id FROM users WHERE email = ?").get(email) as { public_id: string }).public_id;
/** Sends a friend request, or accepts theirs. */
const request = (t: T, email: string) => t.req("POST", "/api/friends/requests", { userId: idOf(t, email) });
const rowId = (t: T, publicId: string) => (t.deps.db.prepare("SELECT id FROM users WHERE public_id = ?").get(publicId) as { id: number }).id;
/** Well-formed, but no account has it. */
const NOBODY = "0000000000";

async function befriend(t: T, from: string, to: string) {
  await t.login(from);
  await request(t, to);
  await t.login(to);
  await request(t, from);
}

const later = (t: T, ms: number) => { t.clock.now = new Date(t.clock.now.getTime() + ms); };

/** Completes lesson 1 of Al bar on the sentences path. */
async function completeBar1(t: T) {
  for (const u of ["u06", "u08", "u10"]) expect((await t.attempt(`it-a1-bar-1-${u}`, { path: "sentences" })).status).toBe(200);
}
async function completeBar2(t: T) {
  for (const u of ["u02", "u04", "u06", "u08", "u09"]) expect((await t.attempt(`it-a1-bar-2-${u}`, { path: "sentences" })).status).toBe(200);
}

describe("friend requests", () => {
  it("search finds an exact email or username and reveals only the username and how you stand; a request notifies, and accepting makes you friends", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    const search = async (q: string) => (await t.req("GET", `/api/friends/search?q=${encodeURIComponent(q)}`)).json;
    const bob = { found: true, person: { id: bo, username: "bob" }, relation: "none" };
    expect(await search("nobody@example.com")).toEqual({ found: false });
    expect(await search("BOB@example.com")).toEqual(bob);
    expect(await search("Bob")).toEqual(bob);
    expect(await search(" @bob ")).toEqual(bob);
    expect(await search("bo")).toEqual({ found: false });
    expect((await search(A)).relation).toBe("self");
    expect((await t.req("GET", "/api/friends/search?q=")).status).toBe(400);
    expect((await t.req("POST", "/api/friends/requests", { userId: bo })).json).toEqual({ relation: "outgoing" });
    expect((await t.req("GET", "/api/friends")).json.outgoing.map((p: { id: string }) => p.id)).toEqual([bo]);

    await t.login(B);
    const notes = (await t.req("GET", "/api/notifications")).json;
    expect(notes.unread).toBe(1);
    expect(notes.items[0]).toMatchObject({ kind: "friend_request", actor: { id: ana, username: "ana" }, read: false });
    expect((await t.req("GET", "/api/friends")).json.incoming.map((p: { id: string }) => p.id)).toEqual([ana]);
    expect((await t.req("POST", `/api/friends/${ana}/accept`, {})).status).toBe(200);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ friends: [{ id: ana }], incoming: [] });

    await t.login(A);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ friends: [{ id: bo }], outgoing: [] });
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "friend_accepted", actor: { id: bo } });
  });

  it("can be sent by account id, as from a profile", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    expect((await t.req("POST", "/api/friends/requests", { userId: bo })).json).toEqual({ relation: "outgoing" });
    expect((await t.req("POST", "/api/friends/requests", { userId: NOBODY })).status).toBe(404);
    expect((await t.req("POST", "/api/friends/requests", { userId: bo, email: B })).status).toBe(400);
  });

  it("asking someone who already asked you accepts their request", async () => {
    const t = setup();
    await accounts(t, A, B);
    await befriend(t, A, B);
    expect((await t.req("GET", `/api/friends/search?q=${A}`)).json.relation).toBe("friends");
  });

  it("blocking is silent: a request the blocked account sends looks pending to them but never reaches the blocker, and unblocking drops it", async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B);
    await t.login(A);
    await request(t, B);
    await t.login(B);
    expect((await t.req("POST", `/api/friends/${ana}/block`, {})).status).toBe(200);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ incoming: [], blocked: [{ id: ana }] });
    expect((await request(t, A)).status).toBe(409);
    expect((await t.req("POST", `/api/friends/${ana}/block`, {})).status).toBe(404);

    await t.login(A);
    expect((await t.req("GET", `/api/friends/search?q=${B}`)).json.relation).toBe("none");
    expect((await request(t, B)).json.relation).toBe("outgoing");
    expect((await t.req("GET", `/api/profile/${idOf(t, B)}`)).json.relation).toBe("outgoing");
    await t.login(B);
    expect((await t.req("GET", "/api/notifications")).json.items).toHaveLength(1);
    expect((await t.req("GET", "/api/friends")).json.incoming).toEqual([]);

    expect((await t.req("POST", `/api/friends/${ana}/unblock`, {})).status).toBe(200);
    expect((await t.req("GET", `/api/friends/search?q=${A}`)).json.relation).toBe("none");
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ incoming: [], blocked: [] });
  });

  it("anyone can block anyone else; blocking a friend ends the friendship and any open race", async () => {
    const t = setup();
    const [ana, bo, cyd] = await accounts(t, A, B, C);
    await t.login(C);
    expect((await t.req("POST", `/api/friends/${ana}/block`, {})).status).toBe(200);
    expect((await t.req("GET", `/api/profile/${ana}`)).json.relation).toBe("blocked");
    expect((await t.req("POST", `/api/friends/${cyd}/block`, {})).status).toBe(404);

    await befriend(t, A, B);
    await t.req("POST", "/api/challenges", { opponentId: ana, kind: "most", days: 7 });
    expect((await t.req("POST", `/api/friends/${ana}/block`, {})).status).toBe(200);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ friends: [], blocked: [{ id: ana }] });
    await t.login(A);
    expect((await t.req("GET", "/api/friends")).json.friends).toEqual([]);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "cancelled", challenger: { id: bo } });
  });

  it(`allows ${FRIEND_REQUESTS_PER_DAY} new requests in any 24 hours, counting declined ones but not accepting someone else's`, async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B, C, "dee@example.com", "eve@example.com");
    await t.login(A);
    expect((await request(t, B)).status).toBe(200);
    await t.login(B);
    await t.req("POST", `/api/friends/${ana}/decline`, {});
    await t.login(A);
    expect((await request(t, C)).status).toBe(200);
    expect((await request(t, "dee@example.com")).status).toBe(200);
    const over = await request(t, B);
    expect(over.status).toBe(403);
    expect(over.json.error).toContain("today");
    expect((await request(t, C)).json.relation).toBe("outgoing");

    await t.login("eve@example.com");
    await request(t, A);
    await t.login(A);
    expect((await request(t, "eve@example.com")).json.relation).toBe("friends");
    later(t, DAY);
    expect((await request(t, B)).json.relation).toBe("outgoing");
  });

  it("declining deletes the request; unfriending ends the friendship and any open race", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    await request(t, B);
    await t.login(B);
    expect((await t.req("POST", `/api/friends/${ana}/decline`, {})).status).toBe(200);
    expect((await t.req("POST", `/api/friends/${ana}/accept`, {})).status).toBe(404);
    expect((await t.req("GET", `/api/friends/search?q=${A}`)).json.relation).toBe("none");

    await befriend(t, A, B);
    await t.req("POST", "/api/challenges", { opponentId: ana, kind: "most", days: 7 });
    expect((await t.req("POST", `/api/friends/${ana}/unfriend`, {})).status).toBe(200);
    await t.login(A);
    expect((await t.req("GET", "/api/friends")).json.friends).toEqual([]);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "cancelled", challenger: { id: bo } });
  });
});

describe("friend board", () => {
  const get = async (t: T) => (await t.req("GET", "/api/friend-board")).json;
  const post = (t: T, blurb: string) => t.req("PUT", "/api/friend-board", { blurb });
  const names = (entries: BoardEntry[]) => entries.map((e) => e.person.username).sort();

  it("is seen only by learners on it, shows language, level, activity and blurb but no email, and retracting takes you off", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    await completeBar1(t);
    expect(await get(t)).toEqual({ posted: false });
    expect((await post(t, "x".repeat(141))).status).toBe(400);
    expect((await post(t, "two\nlines")).status).toBe(400);
    const mine = { person: { id: ana, username: "ana" }, isMe: true, language: "it", level: "A1", activity: { lastCompletedAt: t.clock.now.toISOString() }, blurb: "Ciao! Study buddies?" };
    expect((await post(t, " Ciao! Study buddies? ")).json).toEqual({ posted: true, entries: [{ ...mine, relation: "self" }] });

    await t.login(B);
    expect(await get(t)).toEqual({ posted: false });
    expect((await post(t, "")).status).toBe(200);
    const entries: BoardEntry[] = (await get(t)).entries;
    expect(names(entries)).toEqual(["ana", "bob"]);
    expect(entries.find((e) => e.isMe)).toEqual({ person: { id: bo, username: "bob" }, relation: "self", isMe: true, language: null, level: null, activity: null, blurb: null });
    expect(entries.find((e) => !e.isMe)).toEqual({ ...mine, relation: "none", isMe: false });
    expect(JSON.stringify(entries)).not.toContain("@example.com");

    await t.login(A);
    expect((await t.req("DELETE", "/api/friend-board")).json).toEqual({ posted: false });
    await t.login(B);
    expect(names((await get(t)).entries)).toEqual(["bob"]);
  });

  it("comes back in a new random order", async () => {
    const t = setup();
    await accounts(t, A, B, C);
    for (const e of [A, B, C]) {
      await t.login(e);
      await post(t, "");
    }
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) orders.add((await get(t)).entries.map((e: BoardEntry) => e.person.username).join());
    expect(orders.size).toBeGreaterThan(1);
  });

  it("needs a username to post", async () => {
    const t = setup();
    await t.login(A);
    expect((await post(t, "hi")).status).toBe(400);
    expect(await get(t)).toEqual({ posted: false });
  });

  it("hides two learners from each other when either blocked the other", async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B, C);
    await t.login(A);
    await request(t, B);
    await t.login(B);
    await t.req("POST", `/api/friends/${ana}/block`, {});
    for (const e of [A, B, C]) {
      await t.login(e);
      await post(t, "");
    }
    expect(names((await get(t)).entries)).toEqual(["ana", "bob", "cyd"]);
    await t.login(A);
    expect(names((await get(t)).entries)).toEqual(["ana", "cyd"]);
    await t.login(B);
    expect(names((await get(t)).entries)).toEqual(["bob", "cyd"]);
  });
});

describe("reporting people", () => {
  const report = (t: T, id: string, body: object) => t.req("POST", `/api/people/${id}/report`, body);

  it("blocks them too, keeps their username and board post as they were, and allows one open report per person", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    await t.req("PUT", "/api/friend-board", { blurb: "rude words" });
    await t.login(B);
    expect((await report(t, bo, { reason: "other", note: "" })).status).toBe(400);
    expect((await report(t, ana, { reason: "spam", note: "" })).status).toBe(400);
    expect((await report(t, ana, { reason: "board_post", note: " so rude " })).json).toEqual({ relation: "blocked" });
    expect((await report(t, ana, { reason: "username", note: "" })).status).toBe(409);
    await t.login(A);
    await t.req("PUT", "/api/username", { username: "angel" });
    await t.req("PUT", "/api/friend-board", { blurb: "nice words" });

    expect(t.deps.db.prepare("SELECT reason, note, username, blurb FROM user_reports").all())
      .toEqual([{ reason: "board_post", note: "so rude", username: "ana", blurb: "rude words" }]);
    await t.login(B);
    expect((await t.req("GET", "/api/friends")).json.blocked).toEqual([{ id: ana, username: "angel" }]);
  });

  it("is admin-only to review; taking down a post or clearing a username resolves every open report about it", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B, C);
    await t.login(A);
    await t.req("PUT", "/api/friend-board", { blurb: "rude words" });
    for (const [email, reason] of [[B, "board_post"], [C, "board_post"]]) {
      await t.login(email);
      await report(t, ana, { reason, note: "" });
    }
    await t.login(C);
    await report(t, bo, { reason: "username", note: "" });
    expect((await t.req("GET", "/api/admin/user-reports")).status).toBe(403);

    await t.login("admin@example.com");
    const reports = (await t.req("GET", "/api/admin/user-reports")).json;
    expect(reports).toHaveLength(3);
    expect(reports.find((r: { reporter: { id: string } }) => r.reporter.id === bo))
      .toMatchObject({ reported: { id: ana, username: "ana" }, reason: "board_post", blurb: "rude words", onBoard: true, blurbNow: "rude words", resolution: null });
    const about = (id: string) => reports.find((r: { reported: { id: string } }) => r.reported.id === id).id;
    expect((await t.req("POST", `/api/admin/user-reports/${about(ana)}/take-down`, {})).json).toMatchObject({ onBoard: false, resolution: "took_down_post" });
    expect((await t.req("POST", `/api/admin/user-reports/${about(ana)}/dismiss`, {})).status).toBe(409);
    expect((await t.req("POST", `/api/admin/user-reports/${about(bo)}/clear-username`, {})).json).toMatchObject({ resolution: "cleared_username" });
    expect((await t.req("POST", "/api/admin/user-reports/999/dismiss", {})).status).toBe(404);

    expect((await t.req("GET", "/api/admin/user-reports")).json.map((r: { resolution: string }) => r.resolution).sort())
      .toEqual(["cleared_username", "took_down_post", "took_down_post"]);
    expect(t.deps.db.prepare("SELECT count(*) AS n FROM friend_board").get()).toEqual({ n: 0 });
    await t.login(B);
    expect((await t.req("GET", "/api/me")).json.username).toBeNull();
  });
});

describe("usernames", () => {
  it("start unset, must be well-formed, and are unique regardless of capitals", async () => {
    const t = setup();
    await accounts(t, A);
    await t.login(B);
    expect((await t.req("GET", "/api/me")).json.username).toBeNull();
    for (const bad of ["bo", "bo bo", "bö", "b".repeat(21)]) expect((await t.req("PUT", "/api/username", { username: bad })).status).toBe(400);
    expect((await t.req("PUT", "/api/username", { username: "ANA" })).status).toBe(409);
    expect((await t.req("PUT", "/api/username", { username: " bob.b-1_ " })).status).toBe(200);
    expect((await t.req("GET", "/api/me")).json.username).toBe("bob.b-1_");

    await t.login(A);
    expect((await t.req("PUT", "/api/username", { username: "Ana" })).status).toBe(200);
    expect((await t.req("GET", "/api/me")).json.username).toBe("Ana");
  });
});

describe("leaderboard", () => {
  const board = async (t: T) => (await t.req("GET", "/api/leaderboard")).json;
  const summary = (rows: { rank: number | null; person: { username: string }; lessonsWeek: number; lessonsAll: number }[]) =>
    rows.map((r) => [r.rank, r.person.username, r.lessonsWeek, r.lessonsAll]);
  const userRow = (t: T, email: string) => (t.deps.db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;
  const engage = (t: T, email: string, seconds: number) =>
    t.deps.db.prepare("INSERT INTO engaged_time (user_id, day, language, activity, seconds) VALUES (?, ?, 'it', 'type', ?)")
      .run(userRow(t, email), t.clock.now.toISOString().slice(0, 10), seconds);
  /** A conversation with `replies` learner replies, the last at `at`. */
  const conversation = (t: T, email: string, replies: number, at: string) => {
    const db = t.deps.db;
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO conversations (user_id, language, locale, level, scenario, title, created_at, updated_at) VALUES (?, 'it', 'en', 'A1', '{}', 'Bar', ?, ?)`,
    ).run(userRow(t, email), at, at);
    for (let i = 0; i < replies; i++) db.prepare("INSERT INTO conversation_turns (conversation_id, role, text, created_at) VALUES (?, 'learner', 'Ciao', ?)").run(lastInsertRowid, at);
  };
  /** A quiz session on the 3-question fixture deck that answers `answers` of its queue. */
  async function quizSession(t: T, answers: number) {
    const { sessionId, queue } = (await t.req("POST", "/api/quiz/decks/it-a1-grammar-1/sessions", { mode: "random" })).json as { sessionId: number; queue: string[] };
    for (const questionId of queue.slice(0, answers)) await t.req("POST", `/api/quiz/sessions/${sessionId}/answers`, { questionId, rating: "good", responseMs: 1500 });
  }

  it("counts a lesson, a conversation of 10 replies and a fully answered quiz queue as one lesson each, and counts everything toward all time", async () => {
    const t = setup();
    await accounts(t, A);
    await completeBar1(t);
    conversation(t, A, 10, "2026-09-01T10:00:00.000Z");
    conversation(t, A, 9, "2026-09-01T10:00:00.000Z");
    conversation(t, A, 10, "2026-08-20T10:00:00.000Z");
    await quizSession(t, 3);
    await quizSession(t, 2);
    expect(summary((await board(t)).rows)).toEqual([[1, "ana", 3, 4]]);
  });

  it("starts the week on Monday at 00:00 UTC, and shows you without a rank until you practice", async () => {
    const t = setup();
    await accounts(t, A);
    await completeBar1(t);
    t.clock.now = new Date("2026-09-06T23:59:00Z");
    expect(summary((await board(t)).rows)).toEqual([[1, "ana", 1, 1]]);
    t.clock.now = new Date("2026-09-07T00:00:00Z");
    const b = await board(t);
    expect(summary(b.rows)).toEqual([[null, "ana", 0, 1]]);
    expect(b.stats).toEqual({ activeLearners: 0, lessons: 0, seconds: 0 });
  });

  it("ranks everyone this week by lessons then time, shows your friends and public learners but not private strangers, and totals everyone", async () => {
    const t = setup();
    await accounts(t, A, B, C, "dee@example.com", "eve@example.com");
    await befriend(t, A, B);
    t.deps.db.prepare("UPDATE users SET profile_public = 0 WHERE email IN (?, ?)").run(B, "dee@example.com");
    for (const [email, bars] of [[B, 1], [C, 2], ["dee@example.com", 2], ["eve@example.com", 1]] as const) {
      await t.login(email);
      await completeBar1(t);
      if (bars === 2) await completeBar2(t);
    }
    engage(t, "dee@example.com", 600);
    engage(t, C, 60);
    engage(t, "eve@example.com", 300);
    await t.login(A);
    const b = await board(t);
    expect(summary(b.rows)).toEqual([[2, "cyd", 2, 2], [3, "eve", 1, 1], [4, "bob", 1, 1], [null, "ana", 0, 0]]);
    expect(b.rows.map((r: { language: string | null }) => r.language)).toEqual(["it", "it", "it", null]);
    expect(b.stats).toEqual({ activeLearners: 4, lessons: 6, seconds: 960 });
    expect(JSON.stringify(b)).not.toContain("example.com");
  });

  it("ranks you among your friends who practiced this week, and has no rank without friends or without practice", async () => {
    const t = setup();
    await accounts(t, A, B, C);
    await befriend(t, A, B);
    const summaryOf = async () => (await t.req("GET", "/api/social-summary")).json;
    await t.login(A);
    expect(await summaryOf()).toEqual({ friends: 1, weekRank: null });
    await completeBar1(t);
    expect(await summaryOf()).toEqual({ friends: 1, weekRank: 1 });
    await t.login(C);
    await completeBar1(t);
    await completeBar2(t);
    expect(await summaryOf()).toEqual({ friends: 0, weekRank: null });
    await t.login(B);
    await completeBar1(t);
    await completeBar2(t);
    expect(await summaryOf()).toEqual({ friends: 1, weekRank: 1 });
    await t.login(A);
    expect(await summaryOf()).toEqual({ friends: 1, weekRank: 2 });
    t.clock.now = new Date("2026-09-07T00:00:00Z");
    expect(await summaryOf()).toEqual({ friends: 1, weekRank: null });
  });

  it("fills 25 slots with you, all your friends who practiced, then the best public learners", async () => {
    const t = setup();
    await accounts(t, A);
    const strangers = Array.from({ length: 24 }, (_, i) => `s${String(i).padStart(2, "0")}@example.com`);
    const friends = ["fr0@example.com", "fr1@example.com", "fr2@example.com"];
    await accounts(t, ...strangers, ...friends);
    for (const f of friends) await befriend(t, A, f);
    for (const [i, email] of [...strangers, ...friends].entries()) {
      await t.login(email);
      await completeBar1(t);
      engage(t, email, i < strangers.length ? 1000 - i * 10 : 1);
    }
    await t.login(A);
    const b = await board(t);
    const names = b.rows.map((r: { person: { username: string } }) => r.person.username);
    expect(names).toHaveLength(LEADERBOARD_SIZE);
    expect(names.slice(-4)).toEqual(["fr0", "fr1", "fr2", "ana"]);
    expect(names).not.toContain("s23");
    expect(names).not.toContain("s22");
    expect(names).not.toContain("s21");
    expect(b.rows.at(-2)).toMatchObject({ rank: 27, person: { username: "fr2" } });
  });

  it("leaves out learners who blocked you or whom you blocked", async () => {
    const t = setup();
    const [, , cy] = await accounts(t, A, B, C);
    for (const e of [B, C]) {
      await t.login(e);
      await completeBar1(t);
    }
    await t.login(A);
    expect(summary((await board(t)).rows).map((r) => r[1])).toEqual(["bob", "cyd", "ana"]);
    expect((await t.req("POST", `/api/friends/${cy}/block`, {})).status).toBe(200);
    expect(summary((await board(t)).rows).map((r) => r[1])).toEqual(["bob", "ana"]);
    await t.login(C);
    expect(summary((await board(t)).rows).map((r) => r[1])).toEqual(["bob", "cyd"]);
  });
});

describe("profiles", () => {
  it("show strangers the language and lesson counts, details only to yourself and friends, and never an email", async () => {
    const t = setup();
    const [ana, bo, cy] = await accounts(t, A, B, C);
    await befriend(t, A, B);
    await t.login(A);
    await completeBar1(t);
    later(t, 3 * DAY);
    await completeBar2(t);

    await t.login(C);
    await request(t, A);
    const own = (await t.req("GET", "/api/profile/me")).json;
    expect(own).toMatchObject({ relation: "self", person: { id: cy, username: "cyd" } });
    expect(JSON.stringify(own)).not.toContain(C);
    const stranger = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(stranger).toEqual({
      person: { id: ana, username: "ana" }, relation: "outgoing",
      summary: { language: "it", activity: { window: "week", lessons: 2 }, lessons: { day: 1, week: 2, month: 2 } }, details: null,
    });

    await t.login(B);
    const friend = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(friend).toMatchObject({ relation: "friends", summary: { language: "it" }, details: { accuracy: { lessons: 2 } } });
    expect(JSON.stringify(friend)).not.toContain(A);
    expect((await t.req("GET", `/api/profile/${NOBODY}`)).status).toBe(404);
    expect((await t.req("GET", "/api/profile/1")).status).toBe(400);
  });

  it("a private account shows strangers only its username; friends still see it all", async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B, C);
    await befriend(t, A, B);
    await t.login(A);
    await completeBar1(t);
    expect((await t.req("GET", "/api/me")).json.profilePublic).toBe(true);
    expect((await t.req("PUT", "/api/profile-visibility", { public: false })).status).toBe(200);
    expect((await t.req("GET", "/api/me")).json.profilePublic).toBe(false);

    await t.login(C);
    expect((await t.req("GET", `/api/profile/${ana}`)).json).toEqual({ person: { id: ana, username: "ana" }, relation: "none", summary: null, details: null });

    await t.login(B);
    expect((await t.req("GET", `/api/profile/${ana}`)).json).toMatchObject({ summary: { language: "it" }, details: { languages: [{ language: "it" }] } });
  });

  it("show the current module, completions, recent lessons, accuracy, and the smallest window with two lessons", async () => {
    const t = setup();
    const [ana] = await accounts(t, A);
    await t.login(A);
    let p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p).toMatchObject({ summary: { language: null, activity: null }, details: { accuracy: { lessons: 0, dictation: null, meaning: null }, languages: [] } });

    const first = t.clock.now.toISOString();
    await completeBar1(t);
    later(t, 3 * DAY);
    p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.summary.activity).toEqual({ lastCompletedAt: first });

    // Lesson 2: one item revealed, one meaning missed, one retried clean after a correction (the latest counts).
    await t.attempt("it-a1-bar-2-u02", { path: "sentences", outcome: "revealed" });
    await t.attempt("it-a1-bar-2-u04", { path: "sentences", meaningCorrect: false });
    await t.attempt("it-a1-bar-2-u06", { path: "sentences", outcome: "corrected" });
    await t.attempt("it-a1-bar-2-u06", { path: "sentences" });
    for (const u of ["u08", "u09"]) await t.attempt(`it-a1-bar-2-${u}`, { path: "sentences" });
    p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.summary.activity).toEqual({ window: "week", lessons: 2 });
    // 8 items: 7 without a reveal; 7 of 8 meaning checks right.
    expect(p.details.accuracy).toEqual({ lessons: 2, dictation: 88, meaning: 88 });
    expect(p.details.languages).toHaveLength(1);
    expect(p.details.languages[0]).toMatchObject({
      language: "it", module: null, optionalDone: 0, completions: [first, t.clock.now.toISOString()],
      levelsDone: [{ level: "A1", at: t.clock.now.toISOString() }],
    });
    expect(p.details.languages[0].recent.map((r: { lessonId: string }) => r.lessonId)).toEqual(["it-a1-bar-2", "it-a1-bar-1"]);
    expect(p.details.languages[0].recent[0]).toMatchObject({ lessonTitle: expect.any(String), courseTitle: "Al bar", completed: true });
  });

  it("show the studied language practiced most recently, not one just tried out", async () => {
    const t = setup();
    const [ana] = await accounts(t, A);
    await t.login(A);
    await t.req("PUT", "/api/learning", { languages: ["nl"] });
    await completeBar1(t);
    expect((await t.req("GET", `/api/profile/${ana}`)).json.summary.language).toBe("nl");
    await t.req("PUT", "/api/learning", { languages: ["nl", "it"] });
    expect((await t.req("GET", `/api/profile/${ana}`)).json.summary.language).toBe("it");
  });

  it("names the first unfinished main-track module", async () => {
    const t = setup();
    const [ana] = await accounts(t, A);
    await t.login(A);
    await completeBar1(t);
    const p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.details.languages[0].module).toEqual({ number: 1, of: 1, title: "Al bar" });
    expect(p.details.languages[0].levelsDone).toEqual([]);
  });
});

describe("playing a friend's lessons", () => {
  it("unlocks lessons a friend has started, for friends only", async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B, C);
    await t.login(A);
    await completeBar1(t);
    await t.attempt("it-a1-bar-2-u02", { path: "sentences" });
    await befriend(t, A, B);

    await t.login(B);
    const cat = (await t.req("GET", "/api/catalog?lang=it")).json;
    expect(cat.unlocked).not.toContain("it-a1-bar-2");
    expect(cat.viaFriends).toEqual({ "it-a1-bar-2": [{ id: ana, username: "ana" }] });
    expect((await t.req("GET", "/api/lessons/it-a1-bar-2?lang=it")).json.playable).toBe(true);
    expect((await t.attempt("it-a1-bar-2-u02")).status).toBe(200);

    await t.login(C);
    expect((await t.req("GET", "/api/catalog?lang=it")).json.viaFriends).toEqual({});
    expect((await t.req("GET", "/api/lessons/it-a1-bar-2?lang=it")).json.playable).toBe(false);
    expect((await t.attempt("it-a1-bar-2-u02")).status).toBe(403);
  });

  it("compares the latest run of a lesson with friends who have played it", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B, C);
    await befriend(t, A, B);
    await t.login(A);
    await t.attempt("it-a1-bar-1-u06", { path: "sentences", outcome: "revealed", durationMs: 5000 });
    await t.attempt("it-a1-bar-1-u08", { path: "sentences", outcome: "hinted", hintsUsed: 2, durationMs: 3000 });
    await t.login(B);
    await completeBar1(t);
    await t.login(C);
    await completeBar1(t);

    await t.login(B);
    const rows = (await t.req("GET", "/api/lessons/it-a1-bar-1/compare")).json;
    expect(rows).toEqual([
      { person: expect.objectContaining({ id: bo }), isMe: true, items: 3, dictation: 100, meaning: 100, hints: 0, durationMs: 3000 },
      { person: expect.objectContaining({ id: ana }), isMe: false, items: 2, dictation: 50, meaning: 100, hints: 2, durationMs: 8000 },
    ]);
    expect((await t.req("GET", "/api/lessons/nope/compare")).status).toBe(404);
  });
});

describe("races", () => {
  it("are between friends, need accepting, and allow one open race per pair", async () => {
    const t = setup();
    const [ana, bo, cy] = await accounts(t, A, B, C);
    await befriend(t, A, B);
    await t.login(A);
    expect((await t.req("POST", "/api/challenges", { opponentId: cy, kind: "most", days: 7 })).status).toBe(404);
    expect((await t.req("POST", "/api/challenges", { opponentId: bo, kind: "first_to", target: 5 })).status).toBe(400);
    expect((await t.req("POST", "/api/challenges", { opponentId: bo, kind: "most", days: 2 })).status).toBe(400);
    const race = (await t.req("POST", "/api/challenges", { opponentId: bo, kind: "first_to", target: 20 })).json;
    expect(race).toMatchObject({ kind: "first_to", target: 20, days: 30, status: "pending", startedAt: null, mine: true });
    expect((await t.req("POST", "/api/challenges", { opponentId: bo, kind: "most", days: 7 })).status).toBe(409);
    expect((await t.req("POST", `/api/challenges/${race.id}/accept`, {})).status).toBe(404);

    await t.login(B);
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "challenge_invite", actor: { id: ana }, challenge: { id: race.id, mine: false } });
    expect((await t.req("POST", `/api/challenges/${race.id}/decline`, {})).json.status).toBe("declined");
    await t.login(A);
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "challenge_declined", actor: { id: bo } });
    const again = (await t.req("POST", "/api/challenges", { opponentId: bo, kind: "most", days: 7 })).json;
    expect((await t.req("POST", `/api/challenges/${again.id}/cancel`, {})).json.status).toBe("cancelled");
  });

  it("most-lessons: counts lessons first completed after the start, and the leader wins at the end", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await befriend(t, A, B);
    await t.login(A);
    await completeBar1(t); // before the race: doesn't count
    later(t, 1000);
    const race = (await t.req("POST", "/api/challenges", { opponentId: bo, kind: "most", days: 3 })).json;
    await t.login(B);
    const started = (await t.req("POST", `/api/challenges/${race.id}/accept`, {})).json;
    expect(started).toMatchObject({ status: "active", startedAt: t.clock.now.toISOString(), endsAt: new Date(t.clock.now.getTime() + 3 * DAY).toISOString() });
    later(t, DAY);
    await completeBar1(t);
    await t.login(A);
    await completeBar2(t);
    await completeBar1(t); // a repeat: doesn't count again
    later(t, DAY);
    await t.login(B);
    await completeBar2(t);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "active", scores: { challenger: 1, opponent: 2 } });

    later(t, 2 * DAY);
    const done = (await t.req("GET", "/api/challenges")).json[0];
    expect(done).toMatchObject({ status: "finished", winnerId: bo, finishedAt: started.endsAt, scores: { challenger: 1, opponent: 2 } });
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "challenge_finished", actor: { id: ana } });
    await t.login(A);
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "challenge_finished", actor: { id: bo } });
  });

  it("first-to: finishes as soon as someone reaches the target, and a tie at the deadline is a draw", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await befriend(t, A, B);
    const start = t.clock.now.toISOString();
    const end = new Date(t.clock.now.getTime() + 30 * DAY).toISOString();
    // The fixtures have 3 lessons, so the race is inserted with a target below the API minimum.
    const insert = t.deps.db.prepare(
      `INSERT INTO challenges (challenger_id, opponent_id, kind, days, target, status, created_at, started_at, ends_at)
       VALUES (?, ?, 'first_to', 30, ?, 'active', ?, ?, ?) RETURNING id`,
    );
    insert.get(rowId(t, ana), rowId(t, bo), 2, start, start, end);
    later(t, DAY);
    await t.login(B);
    await completeBar1(t);
    later(t, DAY);
    const reached = t.clock.now.toISOString();
    await completeBar2(t);
    later(t, DAY);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "finished", winnerId: bo, finishedAt: reached });

    await t.login(A);
    const { id: tie } = insert.get(rowId(t, ana), rowId(t, bo), 3, t.clock.now.toISOString(), t.clock.now.toISOString(), new Date(t.clock.now.getTime() + DAY).toISOString()) as { id: number };
    later(t, 2 * DAY);
    const races = (await t.req("GET", "/api/challenges")).json;
    expect(races.find((r: { id: number }) => r.id === tie)).toMatchObject({ status: "finished", winnerId: null, scores: { challenger: 0, opponent: 0 } });
  });
});

describe("notifications", () => {
  it("marks everything read", async () => {
    const t = setup();
    await accounts(t, A, B);
    await t.login(A);
    await request(t, B);
    await t.login(B);
    expect((await t.req("POST", "/api/notifications/read", {})).status).toBe(200);
    const notes = (await t.req("GET", "/api/notifications")).json;
    expect(notes).toMatchObject({ unread: 0, items: [{ read: true }] });
  });
});
