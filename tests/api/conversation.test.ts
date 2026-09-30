import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AppDeps } from "../../server/app.ts";
import { voiceId } from "../../server/content.ts";
import type { Setting } from "../../server/conversation-ai.ts";
import { FAKE_COST, fakeAI, fakeSpeech } from "../../server/conversation-fake.ts";
import { setup } from "./helpers.ts";

const audio = Buffer.from("fake recording").toString("base64");

async function speak(overrides: Partial<AppDeps> = {}) {
  const speech = fakeSpeech();
  /** voiceId of each line spoken. */
  const voices: string[] = [];
  /** Each line's text and pace. */
  const paces: [string, number][] = [];
  const say = speech.say;
  speech.say = (text, language, voice, pace, out) => { voices.push(voiceId(voice)); paces.push([text, pace]); return say(text, language, voice, pace, out); };
  const conversation = { ai: fakeAI(), speech, audioDir: mkdtempSync(join(tmpdir(), "lp-speak-")) };
  const t = setup({ conversation, ...overrides });
  await t.login();
  const start = async (level = "A2") => (await t.req("POST", "/api/conversations", { language: "it", level, scenario: { starter: "cafe" }, hardMode: false })).json;
  // The route streams step events then a result or error; `status` is an in-stream error's, else the HTTP status.
  const reply = async (id: number, over: Record<string, unknown> = {}) => {
    const res = await t.req("POST", `/api/conversations/${id}/attempts`, { audio, mime: "audio/webm", target: null, usedHow: false, taps: 0, ...over });
    if (res.status !== 200) return { ...res, steps: [] };
    const events = (res.json as string).trim().split("\n").map((l) => JSON.parse(l));
    const end = events.at(-1);
    return { status: end.status ?? 200, json: end.result ?? end, steps: events.slice(0, -1).map((e) => e.step) };
  };
  return { ...t, ai: conversation.ai, voices, paces, start, reply };
}

const passFirstTry = (meant: string, fromSuggestion = false) => async () => ({
  result: { meant, level: "B1" as const, grammarOk: true, fromSuggestion, fixes: [], feedback: "Good." },
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
    // The partner's line and its gloss.
    expect(conv.spend).toEqual({ today: 2 * FAKE_COST, cap: 5, conversation: 2 * FAKE_COST });

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
    expect(retry.reliance).toEqual({ leaned: 1, of: 1 });
    // Opening, two transcriptions and coach calls, and the partner's answer, each partner line with its gloss.
    expect(retry.spend.conversation).toBeCloseTo(8 * FAKE_COST, 6);

    const again = (await t.req("GET", `/api/conversations/${conv.id}`)).json;
    expect(again.turns.map((x: { role: string }) => x.role)).toEqual(["partner", "learner", "partner"]);
    expect((await t.req("GET", "/api/conversations?lang=it")).json.conversations[0].levels).toEqual(["A2"]);
  });

  it("counts a reply as a suggestion when the coach, shown the suggestions, judges it one, and tells it from an own reply and \"How do I say...?\"", async () => {
    const t = await speak();
    const conv = await t.start();
    let shown: string[] = [];
    t.ai.coach = async (c) => { shown = c.suggestions; return passFirstTry("Un caffè, per favore.", true)(); };
    expect((await t.reply(conv.id)).json.turns[0].source).toBe("suggestion");
    expect(shown).toEqual(["Vorrei un caffè, per favore.", "Un tè, grazie.", "Niente, grazie."]);

    t.ai.coach = passFirstTry("Vorrei una spremuta.");
    expect((await t.reply(conv.id)).json.turns[0].source).toBe("own");

    const how = (await t.req("POST", `/api/conversations/${conv.id}/how`, { text: "an iced tea" })).json;
    expect(how).toMatchObject({ sentence: "Vorrei un tè freddo.", chunks: [{ text: "Vorrei un tè", gloss: "I'd like a tea" }, { text: "freddo.", gloss: "iced." }] });
    t.ai.coach = passFirstTry("Vorrei un tè freddo.");
    const res = (await t.reply(conv.id, { usedHow: true })).json;
    expect(res.turns[0].source).toBe("how");
    expect(res.reliance).toEqual({ leaned: 2, of: 3 });
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
    t.ai.transcribe = async (audio, name, language) => ({ ...(await transcribe(audio, name, language)), result: "  " });
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

  it("glosses the learner's line and the partner's answer in one call", async () => {
    const t = await speak();
    const conv = await t.start();
    const gloss = t.ai.gloss;
    const glossed: string[][] = [];
    t.ai.coach = passFirstTry("Vorrei un caffè.");
    t.ai.gloss = (s, lines) => { glossed.push(lines); return gloss(s, lines); };
    const res = await t.reply(conv.id);
    expect(glossed).toEqual([["Vorrei un caffè.", "Certo! Altro?"]]);
    expect(res.json.turns.map((x: { chunks: { text: string }[] }) => x.chunks.map((c) => c.text))).toEqual([["Vorrei", "un", "caffè."], ["Certo!", "Altro?"]]);
  });

  it("retries a gloss that fails or returns the wrong number of lines, metering each try", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const t = await speak();
      const gloss = t.ai.gloss;
      let calls = 0;
      t.ai.gloss = async (s, lines) => {
        calls++;
        const g = await gloss(s, lines);
        return calls === 1 ? { ...g, result: [...g.result, ...g.result] } : g;
      };
      const conv = await t.start();
      expect(calls).toBe(2);
      expect(conv.turns[0].chunks.map((c: { text: string }) => c.text)).toEqual(["Buongiorno!", "Cosa prende?"]);
      // The partner's line and two glosses.
      expect(conv.spend.conversation).toBeCloseTo(3 * FAKE_COST, 6);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^Gloss failed in conversation \d+, try 1 of 2: 1 lines came back as /));
    } finally {
      warn.mockRestore();
    }
  });

  it("keeps the partner's answer, spoken but without chunks, when both glossing tries fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const t = await speak();
      const conv = await t.start();
      t.ai.coach = passFirstTry("Vorrei un caffè.");
      t.ai.gloss = async () => { throw new Error("model down"); };
      const res = await t.reply(conv.id);
      expect(res.status).toBe(200);
      expect(res.json.turns).toMatchObject([{ role: "learner", chunks: null }, { role: "partner", text: "Certo! Altro?", chunks: null }]);
      expect((await t.req("GET", res.json.turns[1].audioUrl)).status).toBe(200);
      expect(warn.mock.calls.map((c) => c[0])).toEqual([1, 2].map((n) => `Gloss failed in conversation ${conv.id}, try ${n} of 2: model down`));
    } finally {
      warn.mockRestore();
    }
  });

  it("warns when a line's chunks don't join back into the line, and stores them anyway", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const t = await speak();
      await t.start();
      expect(warn).not.toHaveBeenCalled();
      t.ai.gloss = async (_s, lines) => ({ result: lines.map(() => [{ text: "Buongiorno!", gloss: "Good morning!" }]), usage: { model: "fake", inputTokens: 1, outputTokens: 1, audioSeconds: 0, costUsd: FAKE_COST } });
      const conv = await t.start();
      expect(warn).toHaveBeenCalledWith(`Gloss mismatch in conversation ${conv.id}: "Buongiorno! Cosa prende?" was chunked as "Buongiorno!"`);
      expect(conv.turns[0].chunks).toEqual([{ text: "Buongiorno!", gloss: "Good morning!" }]);
    } finally {
      warn.mockRestore();
    }
  });

  it("speaks every line of every conversation in the language's one partner voice", async () => {
    const t = await speak();
    const conv = await t.start();
    await t.reply(conv.id); // fails, so the target is spoken
    await t.reply(conv.id, { target: "Vorrei un caffè, per favore." }); // passes, so the partner answers
    await t.start();
    expect(t.voices).toEqual(Array(4).fill("openai:marin"));
  });

  it("speaks a tapped chunk in the partner's voice without storing it, only to the conversation's owner", async () => {
    const t = await speak();
    const conv = await t.start();
    const say = (text: string) => t.req("GET", `/api/conversations/${conv.id}/say?text=${encodeURIComponent(text)}`);
    const res = await say("Le porto");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/wav");
    expect(t.voices.at(-1)).toBe("openai:marin");
    expect(readdirSync(t.deps.conversation!.audioDir).filter((f) => f.startsWith("say-"))).toEqual([]);
    expect((await say("x".repeat(81))).status).toBe(400);
    await t.login("someone@example.com");
    expect((await say("Le porto")).status).toBe(404);
  });

  it("meters a paid voice's lines and tapped chunks as speech spend, and refuses a tapped chunk once the day's cap is reached", async () => {
    const t = await speak({ dailySpendCap: 0.02 });
    const speech = t.deps.conversation!.speech;
    const say = speech.say;
    speech.say = async (...args) => ({ ...(await say(...args)), usage: { model: "fake-voice", inputTokens: 0, outputTokens: 0, audioSeconds: 0.1, costUsd: 0.01 } });
    const conv = await t.start();
    expect(conv.spend.conversation).toBeCloseTo(FAKE_COST + 0.01);
    const tap = () => t.req("GET", `/api/conversations/${conv.id}/say?text=Le%20porto`);
    expect((await tap()).status).toBe(200);
    expect((await t.req("GET", `/api/conversations/${conv.id}`)).json.spend.conversation).toBeCloseTo(FAKE_COST + 0.02);
    expect((await tap()).status).toBe(429);
    const purposes = t.deps.db.prepare("SELECT purpose FROM api_usage WHERE model = 'fake-voice'").all().map((r) => r.purpose);
    expect(purposes).toEqual(["speech", "speech"]);
  });

  it("slows the partner for lower levels and every tapped chunk", async () => {
    const t = await speak();
    const a1 = await t.start("A1");
    await t.reply(a1.id); // fails, so the target is spoken
    await t.req("GET", `/api/conversations/${a1.id}/say?text=Buongiorno!`);
    await t.start("B2");
    expect(t.paces).toEqual([["Buongiorno! Cosa prende?", 1.3], ["Vorrei un caffè, per favore.", 1.3], ["Buongiorno!", 1.3], ["Buongiorno! Cosa prende?", 1]]);
  });

  it("glosses in the learner's own language, and coaches in the course's language only with help immersion", async () => {
    const t = await speak();
    await t.req("PUT", "/api/locale", { locale: "es-419" });
    const settings: Setting[] = [];
    t.ai.coach = async (c) => { settings.push(c); return passFirstTry("Un caffè, per favore.")(); };
    await t.reply((await t.start()).id);

    const prefs = (await t.req("GET", "/api/me")).json.prefs.it;
    await t.req("PUT", "/api/prefs", { language: "it", prefs: { ...prefs, immerseHelp: true } });
    await t.reply((await t.start()).id);
    expect(settings.map((s) => [s.locale, s.helpLocale])).toEqual([["es-419", "es-419"], ["es-419", "it"]]);
  });

  it("titles in the course's language only with interface immersion, while glosses stay in the learner's own", async () => {
    const t = await speak();
    await t.req("PUT", "/api/locale", { locale: "es-419" });
    const settings: Setting[] = [];
    const partner = t.ai.partner;
    t.ai.partner = (s, h) => { settings.push(s); return partner(s, h); };
    await t.start();

    const prefs = (await t.req("GET", "/api/me")).json.prefs.it;
    await t.req("PUT", "/api/prefs", { language: "it", prefs: { ...prefs, immerseUi: true } });
    await t.start();
    expect(settings.map((s) => [s.locale, s.uiLocale])).toEqual([["es-419", "es-419"], ["es-419", "it"]]);
  });

  it("glosses, coaches and titles in the support language when the learner's own language is the one practiced", async () => {
    const t = await speak();
    await t.req("PUT", "/api/locale", { locale: "it" });
    const { id } = await t.start();
    expect(t.deps.db.prepare("SELECT locale, help_locale, ui_locale FROM conversations WHERE id = ?").get(id))
      .toEqual({ locale: "en", help_locale: "en", ui_locale: "en" });
  });

  it("keeps hard mode per conversation", async () => {
    const t = await speak();
    const conv = await t.start();
    expect(conv.hardMode).toBe(false);
    await t.req("PUT", `/api/conversations/${conv.id}`, { hardMode: true });
    expect((await t.req("GET", `/api/conversations/${conv.id}`)).json.hardMode).toBe(true);

    let shown: string[] | null = null;
    t.ai.coach = async (c) => { shown = c.suggestions; return passFirstTry("Un caffè, per favore.")(); };
    await t.reply(conv.id);
    expect(shown).toEqual([]);
  });

  it("sends a learner's recording to transcription without storing it, but keeps an admin's own", async () => {
    const t = await speak();
    const heard: [string, string][] = [];
    const transcribe = t.ai.transcribe;
    t.ai.transcribe = async (audio, name, language) => { heard.push([audio.toString("base64"), name]); return transcribe(audio, name, language); };
    const recordings = () => readdirSync(t.deps.conversation!.audioDir).filter((f) => !f.endsWith(".wav"));

    const conv = await t.start();
    const first = (await t.reply(conv.id)).json;
    const retry = (await t.reply(conv.id, { target: first.attempt.target })).json;
    expect(heard).toEqual([[audio, "reply.webm"], [audio, "reply.webm"]]);
    expect(first.attempt.audioUrl).toBeNull();
    expect(retry.turns[0]).toMatchObject({ role: "learner", audioUrl: null });
    expect(recordings()).toEqual([]);

    await t.login("admin@example.com");
    const own = await t.start();
    const kept = (await t.reply(own.id)).json.attempt;
    expect(recordings()).toHaveLength(1);
    expect((await t.req("GET", kept.audioUrl)).headers.get("content-type")).toBe("audio/webm");
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
