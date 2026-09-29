import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AppDeps } from "../../server/app.ts";
import { voiceId } from "../../server/content.ts";
import { FAKE_COST, fakeAI, fakeSpeech } from "../../server/conversation-fake.ts";
import { partnerVoices } from "../../server/speech.ts";
import { setup } from "./helpers.ts";

const audio = Buffer.from("fake recording").toString("base64");

async function speak(overrides: Partial<AppDeps> = {}) {
  const speech = fakeSpeech();
  /** voiceId of each line spoken. */
  const voices: string[] = [];
  const say = speech.say;
  speech.say = (text, voice, out) => { voices.push(voiceId(voice)); return say(text, voice, out); };
  const conversation = { ai: fakeAI(), speech, audioDir: mkdtempSync(join(tmpdir(), "lp-speak-")) };
  const t = setup({ conversation, ...overrides });
  await t.login();
  const start = async () => (await t.req("POST", "/api/conversations", { language: "it", level: "A2", scenario: { starter: "cafe" }, hardMode: false })).json;
  // The route streams step events then a result or error; `status` is an in-stream error's, else the HTTP status.
  const reply = async (id: number, over: Record<string, unknown> = {}) => {
    const res = await t.req("POST", `/api/conversations/${id}/attempts`, { audio, mime: "audio/webm", target: null, usedHow: false, taps: 0, ...over });
    if (res.status !== 200) return { ...res, steps: [] };
    const events = (res.json as string).trim().split("\n").map((l) => JSON.parse(l));
    const end = events.at(-1);
    return { status: end.status ?? 200, json: end.result ?? end, steps: events.slice(0, -1).map((e) => e.step) };
  };
  return { ...t, ai: conversation.ai, voices, start, reply };
}

const passFirstTry = (meant: string) => async () => ({
  result: { meant, level: "B1" as const, grammarOk: true, fixes: [], feedback: "Good." },
  usage: { model: "fake", inputTokens: 1, outputTokens: 1, audioSeconds: 0, costUsd: FAKE_COST },
});

describe("conversation mode", () => {
  it("is off without its deps: config says so and paid calls get 503", async () => {
    const t = setup();
    await t.login();
    expect((await t.req("GET", "/api/config")).json.speak).toBe(false);
    expect((await t.req("POST", "/api/conversations", { language: "it", level: "A1", scenario: { surprise: true }, hardMode: false })).status).toBe(503);
    expect((await t.req("GET", "/api/conversations?lang=it")).json.conversations).toEqual([]);
  });

  it("opens with the partner's spoken line, glossed chunks, three suggestions and a title, and meters the call", async () => {
    const t = await speak();
    expect((await t.req("GET", "/api/config")).json.speak).toBe(true);
    const conv = await t.start();
    expect(conv.title).toBe("Al bar");
    expect(conv.turns).toHaveLength(1);
    const [opening] = conv.turns;
    expect(opening).toMatchObject({ role: "partner", text: "Buongiorno! Cosa prende?", chunks: [{ text: "Buongiorno!", gloss: "Good morning!" }, { text: "Cosa prende?", gloss: "What will you have?" }] });
    expect(opening.suggestions).toHaveLength(3);
    const clip = await t.req("GET", opening.audioUrl);
    expect(clip.status).toBe(200);
    expect(clip.headers.get("content-type")).toBe("audio/wav");
    expect(conv.spend).toEqual({ today: FAKE_COST, cap: 5, conversation: FAKE_COST });

    const list = (await t.req("GET", "/api/conversations?lang=it")).json;
    expect(list.conversations.map((c: { id: number; title: string }) => [c.id, c.title])).toEqual([[conv.id, "Al bar"]]);
    expect((await t.req("GET", "/api/conversations?lang=nl")).json.conversations).toEqual([]);
  });

  it("fails a first try with the coach's meant sentence as the retry target, then passes the retry and the partner answers, streaming each checking step", async () => {
    const t = await speak();
    const conv = await t.start();
    const firstRes = await t.reply(conv.id);
    expect(firstRes.steps).toEqual(["listening", "judging"]);
    const first = firstRes.json;
    expect(first.attempt).toMatchObject({ passed: false, transcript: "Vorrei un caffè", target: "Vorrei un caffè, per favore.", failures: 1 });
    expect(first.attempt.verdict.fixes).toEqual([{ wrong: "Vorrei un caffè", right: "Vorrei un caffè, per favore", why: "Add \"per favore\" to be polite." }]);
    expect(first.turns).toEqual([]);
    const said = await t.req("GET", first.attempt.targetAudioUrl);
    expect(said.status).toBe(200);
    expect(said.headers.get("content-type")).toBe("audio/wav");

    const retryRes = await t.reply(conv.id, { target: first.attempt.target, taps: 2 });
    expect(retryRes.steps).toEqual(["listening", "judging", "answering"]);
    const retry = retryRes.json;
    expect(retry.attempt.passed).toBe(true);
    expect(retry.turns.map((x: { role: string; text: string }) => [x.role, x.text])).toEqual([["learner", "Vorrei un caffè, per favore."], ["partner", "Certo! Altro?"]]);
    expect(retry.turns[0]).toMatchObject({ source: "suggestion", level: "A2" });
    // The partner's call glosses the learner line it answers.
    expect(retry.turns[0].chunks.map((x: { text: string }) => x.text)).toEqual(["Vorrei", "un", "caffè,", "per", "favore."]);
    expect((await t.req("GET", retry.turns[0].audioUrl)).headers.get("content-type")).toBe("audio/webm");
    expect(retry.reliance).toEqual({ leaned: 1, of: 1 });
    // Opening, two transcriptions and coach calls, and the partner's answer.
    expect(retry.spend.conversation).toBeCloseTo(6 * FAKE_COST);

    const again = (await t.req("GET", `/api/conversations/${conv.id}`)).json;
    expect(again.turns.map((x: { role: string }) => x.role)).toEqual(["partner", "learner", "partner"]);
    expect((await t.req("GET", "/api/conversations?lang=it")).json.conversations[0].levels).toEqual(["A2"]);
  });

  it("tells an own reply from a suggestion and from \"How do I say...?\"", async () => {
    const t = await speak();
    const conv = await t.start();
    t.ai.coach = passFirstTry("Vorrei una spremuta.");
    expect((await t.reply(conv.id)).json.turns[0].source).toBe("own");

    const how = (await t.req("POST", `/api/conversations/${conv.id}/how`, { text: "an iced tea" })).json;
    expect(how).toMatchObject({ sentence: "Vorrei un tè freddo.", chunks: [{ text: "Vorrei un tè", gloss: "I'd like a tea" }, { text: "freddo.", gloss: "iced." }] });
    t.ai.coach = passFirstTry("Vorrei un tè freddo.");
    const res = (await t.reply(conv.id, { usedHow: true })).json;
    expect(res.turns[0].source).toBe("how");
    expect(res.reliance).toEqual({ leaned: 1, of: 2 });
  });

  it("offers moving on only after 5 failed tries at the target, reusing the target's audio, then logs it as a weak phrase", async () => {
    const t = await speak();
    const conv = await t.start();
    // The fake fails every first try; a retry is judged against its own target whatever the coach calls meant.
    const failing = t.ai.coach;
    t.ai.coach = (c) => failing({ ...c, target: null });
    const first = (await t.reply(conv.id)).json.attempt;
    const target = first.target;
    for (let i = 0; i < 3; i++) await t.reply(conv.id, { target });
    // The target is rendered once and reused by every retry at it.
    expect((await t.reply(conv.id, { target })).json.attempt.targetAudioUrl).toBe(first.targetAudioUrl);
    expect((await t.reply(conv.id, { target })).json.attempt.failures).toBe(6);
    expect((await t.req("POST", `/api/conversations/${conv.id}/move-on`, { target: "Un tè, grazie.", taps: 0 })).status).toBe(409);

    const moved = (await t.req("POST", `/api/conversations/${conv.id}/move-on`, { target, taps: 1 })).json;
    expect(moved.turns.map((x: { role: string; source: string | null }) => [x.role, x.source])).toEqual([["learner", "moved_on"], ["partner", null]]);
    expect((await t.req("GET", "/api/conversations?lang=it")).json.weakPhrases.map((w: { text: string }) => w.text)).toEqual([target]);
  });

  it("refuses paid calls with 429 once the day's spend reaches the cap, until midnight UTC", async () => {
    const t = await speak({ dailySpendCap: 0.0025 });
    const conv = await t.start();
    await t.reply(conv.id);
    const blocked = await t.reply(conv.id);
    expect(blocked.status).toBe(429);
    expect((await t.req("POST", `/api/conversations/${conv.id}/how`, { text: "tea" })).status).toBe(429);
    expect((await t.req("POST", "/api/conversations", { language: "it", level: "A1", scenario: { surprise: true }, hardMode: false })).status).toBe(429);
    t.clock.now = new Date("2026-09-02T00:00:01Z");
    expect((await t.reply(conv.id)).status).toBe(200);
  });

  it("refuses an empty transcript without calling the coach", async () => {
    const t = await speak();
    const conv = await t.start();
    let coached = 0;
    const transcribe = t.ai.transcribe;
    t.ai.transcribe = async (file, language) => ({ ...(await transcribe(file, language)), result: "  " });
    t.ai.coach = async (c) => { coached++; return fakeAI().coach(c); };
    expect((await t.reply(conv.id)).status).toBe(422);
    expect(coached).toBe(0);
  });

  it("retries the partner's answer when it failed after a passed reply", async () => {
    const t = await speak();
    const conv = await t.start();
    const partner = t.ai.partner;
    t.ai.coach = passFirstTry("Vorrei un caffè.");
    t.ai.partner = async () => { throw new Error("model down"); };
    expect((await t.reply(conv.id)).status).toBe(500);
    expect((await t.reply(conv.id)).status).toBe(409);
    t.ai.partner = partner;
    const res = (await t.req("POST", `/api/conversations/${conv.id}/partner`, {})).json;
    expect(res.turns.map((x: { role: string; chunks: unknown[] }) => [x.role, x.chunks.length])).toEqual([["learner", 3], ["partner", 2]]);
    expect(res.turns[1].text).toBe("Certo! Altro?");
    expect((await t.req("POST", `/api/conversations/${conv.id}/partner`, {})).status).toBe(409);
  });

  it("fails the partner's answer when its call leaves the learner's line unglossed", async () => {
    const t = await speak();
    const conv = await t.start();
    const partner = t.ai.partner;
    t.ai.coach = passFirstTry("Vorrei un caffè.");
    t.ai.partner = async (s, h) => { const p = await partner(s, h); return { ...p, result: { ...p.result, learnerLine: null } }; };
    expect((await t.reply(conv.id)).status).toBe(500);
    expect((await t.req("GET", `/api/conversations/${conv.id}`)).json.turns.at(-1)).toMatchObject({ role: "learner", chunks: null });
  });

  it("speaks a whole conversation in one voice, picked at random from the language's Piper voices", async () => {
    const t = await speak();
    const voices = partnerVoices("it").map(voiceId);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const conv = await t.start();
    await t.reply(conv.id); // fails, so the target is spoken
    await t.reply(conv.id, { target: "Vorrei un caffè, per favore." }); // passes, so the partner answers
    expect(t.voices).toEqual([voices.at(-1), voices.at(-1), voices.at(-1)]);
    random.mockReturnValue(0);
    await t.start();
    expect(t.voices.at(-1)).toBe(voices[0]);
    random.mockRestore();
  });

  it("keeps hard mode per conversation", async () => {
    const t = await speak();
    const conv = await t.start();
    expect(conv.hardMode).toBe(false);
    await t.req("PUT", `/api/conversations/${conv.id}`, { hardMode: true });
    expect((await t.req("GET", `/api/conversations/${conv.id}`)).json.hardMode).toBe(true);
  });

  it("hides a conversation and its audio from other learners, but lets admins hear it", async () => {
    const t = await speak();
    const conv = await t.start();
    const url = conv.turns[0].audioUrl;
    expect((await t.req("GET", url.replace(/[^/]+$/, "other.wav"))).status).toBe(404);
    await t.login("someone@example.com");
    expect((await t.req("GET", `/api/conversations/${conv.id}`)).status).toBe(404);
    expect((await t.req("GET", url)).status).toBe(404);
    await t.login("admin@example.com");
    expect((await t.req("GET", url)).status).toBe(200);
  });

  it("stores a report on an attempt for admins, and shows admins each user's spend per day", async () => {
    const t = await speak();
    const conv = await t.start();
    const attempt = (await t.reply(conv.id)).json.attempt;
    expect((await t.req("POST", `/api/conversations/${conv.id}/attempts/${attempt.id}/report`, { note: " I said it right " })).status).toBe(200);
    expect((await t.req("POST", `/api/conversations/${conv.id}/attempts/999/report`, { note: "" })).status).toBe(404);
    expect((await t.req("GET", "/api/admin/speak-reports")).status).toBe(403);

    await t.login("admin@example.com");
    const reports = (await t.req("GET", "/api/admin/speak-reports")).json;
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ id: attempt.id, note: "I said it right", partnerLine: "Buongiorno! Cosa prende?", reporter: { email: "learner@example.com" }, transcript: "Vorrei un caffè" });

    const spend = (await t.req("GET", "/api/admin/spend?days=7")).json;
    expect(spend.days).toHaveLength(7);
    expect(spend.days[0]).toBe("2026-09-01");
    expect(spend.users).toHaveLength(1);
    expect(spend.users[0].email).toBe("learner@example.com");
    expect(spend.users[0].total).toBeCloseTo(3 * FAKE_COST);
    expect(Object.keys(spend.users[0].byDay)).toEqual(["2026-09-01"]);
  });
});
