import { describe, expect, it } from "vitest";
import { setup } from "./helpers.ts";

type T = ReturnType<typeof setup>;
const A = "ana@example.com";
const B = "bo@example.com";
const C = "cy@example.com";
const DAY = 86_400_000;

/** Signs in each email once so the accounts exist; returns their ids. */
async function accounts(t: T, ...emails: string[]) {
  const ids: number[] = [];
  for (const e of emails) {
    await t.login(e);
    ids.push((t.deps.db.prepare("SELECT id FROM users WHERE email = ?").get(e) as { id: number }).id);
  }
  return ids;
}

async function befriend(t: T, from: string, to: string) {
  await t.login(from);
  await t.req("POST", "/api/friends/requests", { email: to });
  await t.login(to);
  await t.req("POST", "/api/friends/requests", { email: from });
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
  it("search reveals only how you stand with an account; a request notifies, and accepting makes you friends", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    expect((await t.req("GET", "/api/friends/search?email=nobody@example.com")).json).toEqual({ found: false });
    expect((await t.req("GET", "/api/friends/search?email=BO@example.com")).json).toEqual({ found: true, id: bo, relation: "none" });
    expect((await t.req("GET", `/api/friends/search?email=${A}`)).json.relation).toBe("self");
    expect((await t.req("POST", "/api/friends/requests", { email: B })).json).toEqual({ relation: "outgoing" });
    expect((await t.req("GET", "/api/friends")).json.outgoing.map((p: { id: number }) => p.id)).toEqual([bo]);

    await t.login(B);
    const notes = (await t.req("GET", "/api/notifications")).json;
    expect(notes.unread).toBe(1);
    expect(notes.items[0]).toMatchObject({ kind: "friend_request", actor: { id: ana, email: A }, read: false });
    expect((await t.req("GET", "/api/friends")).json.incoming.map((p: { id: number }) => p.id)).toEqual([ana]);
    expect((await t.req("POST", `/api/friends/${ana}/accept`, {})).status).toBe(200);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ friends: [{ id: ana }], incoming: [] });

    await t.login(A);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ friends: [{ id: bo }], outgoing: [] });
    expect((await t.req("GET", "/api/notifications")).json.items[0]).toMatchObject({ kind: "friend_accepted", actor: { id: bo } });
  });

  it("asking someone who already asked you accepts their request", async () => {
    const t = setup();
    await accounts(t, A, B);
    await befriend(t, A, B);
    expect((await t.req("GET", `/api/friends/search?email=${A}`)).json.relation).toBe("friends");
  });

  it("blocking is silent: the blocked requester still sees a pending request and can't re-notify", async () => {
    const t = setup();
    const [ana] = await accounts(t, A, B);
    await t.login(A);
    await t.req("POST", "/api/friends/requests", { email: B });
    await t.login(B);
    expect((await t.req("POST", `/api/friends/${ana}/block`, {})).status).toBe(200);
    expect((await t.req("GET", "/api/friends")).json).toMatchObject({ incoming: [], blocked: [{ id: ana }] });
    expect((await t.req("POST", "/api/friends/requests", { email: A })).status).toBe(409);

    await t.login(A);
    expect((await t.req("GET", `/api/friends/search?email=${B}`)).json.relation).toBe("outgoing");
    expect((await t.req("POST", "/api/friends/requests", { email: B })).json.relation).toBe("outgoing");
    await t.login(B);
    expect((await t.req("GET", "/api/notifications")).json.items).toHaveLength(1);

    expect((await t.req("POST", `/api/friends/${ana}/unblock`, {})).status).toBe(200);
    expect((await t.req("GET", `/api/friends/search?email=${A}`)).json.relation).toBe("none");
  });

  it("declining deletes the request; unfriending ends the friendship and any open race", async () => {
    const t = setup();
    const [ana, bo] = await accounts(t, A, B);
    await t.login(A);
    await t.req("POST", "/api/friends/requests", { email: B });
    await t.login(B);
    expect((await t.req("POST", `/api/friends/${ana}/decline`, {})).status).toBe(200);
    expect((await t.req("POST", `/api/friends/${ana}/accept`, {})).status).toBe(404);
    expect((await t.req("GET", `/api/friends/search?email=${A}`)).json.relation).toBe("none");

    await befriend(t, A, B);
    await t.req("POST", "/api/challenges", { opponentId: ana, kind: "most", days: 7 });
    expect((await t.req("POST", `/api/friends/${ana}/unfriend`, {})).status).toBe(200);
    await t.login(A);
    expect((await t.req("GET", "/api/friends")).json.friends).toEqual([]);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "cancelled", challenger: { id: bo } });
  });
});

describe("profiles", () => {
  it("are visible to yourself and friends only", async () => {
    const t = setup();
    const [ana, bo, cy] = await accounts(t, A, B, C);
    await befriend(t, A, B);
    await t.login(C);
    await t.req("POST", "/api/friends/requests", { email: A });
    expect((await t.req("GET", `/api/profile/${cy}`)).json.isMe).toBe(true);
    expect((await t.req("GET", "/api/profile/me")).json).toMatchObject({ isMe: true, person: { id: cy } });
    expect((await t.req("GET", `/api/profile/${ana}`)).status).toBe(404);
    await t.login(B);
    expect((await t.req("GET", `/api/profile/${ana}`)).json).toMatchObject({ isMe: false, person: { id: ana } });
    expect((await t.req("GET", `/api/profile/${bo + cy + 100}`)).status).toBe(404);
  });

  it("show the current module, completions, recent lessons, accuracy, and the smallest window with two lessons", async () => {
    const t = setup();
    const [ana] = await accounts(t, A);
    await t.login(A);
    let p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p).toMatchObject({ activity: null, accuracy: { lessons: 0, dictation: null, meaning: null }, languages: [] });

    const first = t.clock.now.toISOString();
    await completeBar1(t);
    later(t, 3 * DAY);
    p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.activity).toEqual({ lastCompletedAt: first });

    // Lesson 2: one item revealed, one meaning missed, one retried clean after a correction (the latest counts).
    await t.attempt("it-a1-bar-2-u02", { path: "sentences", outcome: "revealed" });
    await t.attempt("it-a1-bar-2-u04", { path: "sentences", meaningCorrect: false });
    await t.attempt("it-a1-bar-2-u06", { path: "sentences", outcome: "corrected" });
    await t.attempt("it-a1-bar-2-u06", { path: "sentences" });
    for (const u of ["u08", "u09"]) await t.attempt(`it-a1-bar-2-${u}`, { path: "sentences" });
    p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.activity).toEqual({ window: "week", lessons: 2 });
    // 8 items: 7 without a reveal; 7 of 8 meaning checks right.
    expect(p.accuracy).toEqual({ lessons: 2, dictation: 88, meaning: 88 });
    expect(p.languages).toHaveLength(1);
    expect(p.languages[0]).toMatchObject({
      language: "it", module: null, optionalDone: 0, completions: [first, t.clock.now.toISOString()],
      levelsDone: [{ level: "A1", at: t.clock.now.toISOString() }],
    });
    expect(p.languages[0].recent.map((r: { lessonId: string }) => r.lessonId)).toEqual(["it-a1-bar-2", "it-a1-bar-1"]);
    expect(p.languages[0].recent[0]).toMatchObject({ lessonTitle: expect.any(String), courseTitle: "Al bar", completed: true });
  });

  it("names the first unfinished main-track module", async () => {
    const t = setup();
    const [ana] = await accounts(t, A);
    await t.login(A);
    await completeBar1(t);
    const p = (await t.req("GET", `/api/profile/${ana}`)).json;
    expect(p.languages[0].module).toEqual({ number: 1, of: 1, title: "Al bar" });
    expect(p.languages[0].levelsDone).toEqual([]);
  });
});

describe("playing a friend's lessons", () => {
  it("unlocks lessons a friend has started, for friends only", async () => {
    const t = setup();
    await accounts(t, A, B, C);
    await t.login(A);
    await completeBar1(t);
    await t.attempt("it-a1-bar-2-u02", { path: "sentences" });
    await befriend(t, A, B);

    await t.login(B);
    const cat = (await t.req("GET", "/api/catalog?lang=it")).json;
    expect(cat.unlocked).not.toContain("it-a1-bar-2");
    expect(cat.viaFriends).toEqual({ "it-a1-bar-2": ["ana"] });
    expect((await t.attempt("it-a1-bar-2-u02")).status).toBe(200);

    await t.login(C);
    expect((await t.req("GET", "/api/catalog?lang=it")).json.viaFriends).toEqual({});
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
    insert.get(ana, bo, 2, start, start, end);
    later(t, DAY);
    await t.login(B);
    await completeBar1(t);
    later(t, DAY);
    const reached = t.clock.now.toISOString();
    await completeBar2(t);
    later(t, DAY);
    expect((await t.req("GET", "/api/challenges")).json[0]).toMatchObject({ status: "finished", winnerId: bo, finishedAt: reached });

    await t.login(A);
    const { id: tie } = insert.get(ana, bo, 3, t.clock.now.toISOString(), t.clock.now.toISOString(), new Date(t.clock.now.getTime() + DAY).toISOString()) as { id: number };
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
    await t.req("POST", "/api/friends/requests", { email: B });
    await t.login(B);
    expect((await t.req("POST", "/api/notifications/read", {})).status).toBe(200);
    const notes = (await t.req("GET", "/api/notifications")).json;
    expect(notes).toMatchObject({ unread: 0, items: [{ read: true }] });
  });
});
