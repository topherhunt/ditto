// Conversation mode (docs/conversation.md): a role-play with an AI partner, gated by a coach that judges each spoken reply
// from the local phoneme recognizer's output.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { z } from "zod";
import {
  HowSchema, MOVE_ON_AFTER, MoveOnSchema, NewConversationSchema, PutConversationSchema, SpeakAttemptSchema, SpeakReportSchema,
  type AdminSpeakReport, type AdminSpendOut, type CheckStep, type Chunk, type CoachVerdict, type ConversationOut, type ConversationsOut, type ConversationSummary,
  type HowOut, type MoveOnResult, type Reliance, type SpeakAttemptEvent, type SpeakAttemptOut, type SpeakAttemptResult, type Spend, type Starter, type TurnOut, type TurnSource,
} from "../shared/api.ts";
import { supportLocale, type Language, type Locale } from "../shared/content.ts";
import { isAdmin } from "./admin.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { joinChunks, type ConversationAI, type Line, type Setting } from "./conversation-ai.ts";
import { transaction } from "./db.ts";
import type { Speech } from "./speech.ts";
import { recordUsage, spentToday, type Usage } from "./usage.ts";

export type ConversationDeps = { ai: ConversationAI; speech: Speech; audioDir: string };

/** Starter scenarios as the partner model reads them; the UI names them in the learner's language. */
const STARTER_PROMPTS: Record<Starter, string> = {
  cafe: "At a café: you are the waiter taking the learner's order.",
  directions: "On the street: the learner is a tourist asking you, a local, for directions.",
  hotel: "At a hotel: you are the receptionist checking the learner in.",
  meeting: "At a party: you and the learner have just met and are getting to know each other.",
  market: "At a market: you run a fruit and vegetable stall and the learner is shopping.",
  weekend: "Two friends catching up: you ask the learner about their weekend and share yours.",
};
const SURPRISE = "Surprise the learner: pick an everyday situation yourself and set it up in your first line.";

const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a" };
const MIME: Record<string, string> = { webm: "audio/webm", m4a: "audio/mp4", wav: "audio/wav" };
const LEANED: readonly TurnSource[] = ["suggestion", "how", "moved_on"];

/** Case, punctuation and spacing don't distinguish a spoken reply from a suggestion. */
const spoken = (s: string) => s.toLowerCase().replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();

type ConversationRow = {
  id: number; user_id: number; language: Language; locale: Locale; level: string; scenario: string; title: string; hard_mode: number; created_at: string; updated_at: string;
};
type TurnRow = {
  id: number; role: "partner" | "learner"; text: string; chunks: string | null; suggestions: string | null; audio_file: string | null;
  source: TurnSource | null; level: string | null;
};
type AttemptRow = {
  id: number; conversation_id: number; target: string; transcript: string; verdict: string;
  passed: number; audio_file: string; target_audio_file: string | null; turn_id: number;
};

export function registerConversation(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  if (deps.conversation) mkdirSync(deps.conversation.audioDir, { recursive: true });
  const speak = () => {
    if (!deps.conversation) throw new HTTPException(503, { message: "Conversation mode is not configured (OPENAI_API_KEY and the speech worker)" });
    return deps.conversation;
  };
  const Id = z.coerce.number().int();

  const conversationOr404 = (id: number, userId: number) => {
    const row = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(id, userId) as ConversationRow | undefined;
    if (!row) throw new HTTPException(404, { message: `No conversation ${id}` });
    return row;
  };
  const setting = (c: ConversationRow): Setting => ({ language: c.language, locale: c.locale, level: c.level, scenario: c.scenario });
  const audioUrl = (conversationId: number, file: string) => `/api/conversations/${conversationId}/audio/${file}`;

  const turnRows = (conversationId: number) =>
    db.prepare("SELECT * FROM conversation_turns WHERE conversation_id = ? ORDER BY id").all(conversationId) as TurnRow[];
  const toTurn = (conversationId: number, r: TurnRow): TurnOut => ({
    id: r.id, role: r.role, text: r.text,
    chunks: r.chunks === null ? null : JSON.parse(r.chunks), suggestions: r.suggestions === null ? null : JSON.parse(r.suggestions),
    audioUrl: r.audio_file === null ? null : audioUrl(conversationId, r.audio_file), source: r.source, level: r.level,
  });
  const history = (conversationId: number): Line[] => turnRows(conversationId).map((t) => ({ role: t.role, text: t.text }));
  const reliance = (conversationId: number): Reliance => {
    const sources = (db.prepare("SELECT source FROM conversation_turns WHERE conversation_id = ? AND role = 'learner'").all(conversationId) as { source: TurnSource }[])
      .map((r) => r.source);
    return { leaned: sources.filter((s) => LEANED.includes(s)).length, of: sources.length };
  };

  const spend = (userId: number, conversationId: number | null): Spend => ({
    today: spentToday(db, userId, deps.now()),
    cap: deps.dailySpendCap,
    conversation: conversationId === null ? 0
      : (db.prepare("SELECT coalesce(sum(cost_usd), 0) AS s FROM api_usage WHERE conversation_id = ?").get(conversationId) as { s: number }).s,
  });
  /** Checked before each paid request starts, so one in progress may overshoot the cap slightly. */
  const underCapOr429 = (userId: number) => {
    if (spentToday(db, userId, deps.now()) >= deps.dailySpendCap)
      throw new HTTPException(429, { message: `Daily AI budget ($${deps.dailySpendCap.toFixed(2)}) reached; it resets at midnight UTC` });
  };
  const paid = (userId: number, conversationId: number | null, purpose: string, u: Usage) => recordUsage(db, userId, conversationId, purpose, u, deps.now());

  const saveAudio = (conversationId: number, ext: string, data?: Buffer) => {
    const file = `${conversationId}-${randomUUID()}.${ext}`;
    if (data) writeFileSync(join(speak().audioDir, file), data);
    return file;
  };

  /** The partner's next line, spoken, stored as a turn; the opening line also names the conversation. */
  const partnerTurn = async (conv: ConversationRow, userId: number): Promise<TurnOut> => {
    const { ai, speech, audioDir } = speak();
    const { result, usage } = await ai.partner(setting(conv), history(conv.id));
    paid(userId, conv.id, "partner", usage);
    const text = joinChunks(result.line);
    const file = saveAudio(conv.id, "wav");
    await speech.say(text, conv.language, join(audioDir, file));
    const now = deps.now().toISOString();
    const id = transaction(db, () => {
      if (conv.title === "") db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(result.title, conv.id);
      db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conv.id);
      return Number(db.prepare(
        "INSERT INTO conversation_turns (conversation_id, role, text, chunks, suggestions, audio_file, created_at) VALUES (?, 'partner', ?, ?, ?, ?, ?)",
      ).run(conv.id, text, JSON.stringify(result.line), JSON.stringify(result.suggestions), file, now).lastInsertRowid);
    });
    return toTurn(conv.id, turnRows(conv.id).find((t) => t.id === id)!);
  };

  const learnerTurn = (conv: ConversationRow, text: string, source: TurnSource, level: string | null, taps: number, file: string | null): TurnOut => {
    const id = Number(db.prepare(
      "INSERT INTO conversation_turns (conversation_id, role, text, audio_file, source, level, taps, created_at) VALUES (?, 'learner', ?, ?, ?, ?, ?, ?)",
    ).run(conv.id, text, file, source, level, taps, deps.now().toISOString()).lastInsertRowid);
    return toTurn(conv.id, turnRows(conv.id).find((t) => t.id === id)!);
  };

  /** The partner line being answered; a conversation whose partner failed to answer must get one first (POST .../partner). */
  const awaitingReply = (conversationId: number) => {
    const last = turnRows(conversationId).at(-1);
    if (!last || last.role !== "partner") throw new HTTPException(409, { message: "The partner hasn't answered yet" });
    return last;
  };
  const failures = (turnId: number, target: string) =>
    (db.prepare("SELECT count(*) AS n FROM conversation_attempts WHERE turn_id = ? AND target = ? AND passed = 0").get(turnId, target) as { n: number }).n;
  const toAttempt = (r: AttemptRow): SpeakAttemptOut => ({
    id: r.id, passed: r.passed === 1, target: r.target, transcript: r.transcript,
    verdict: JSON.parse(r.verdict) as CoachVerdict, failures: failures(r.turn_id, r.target), audioUrl: audioUrl(r.conversation_id, r.audio_file),
    targetAudioUrl: r.target_audio_file === null ? null : audioUrl(r.conversation_id, r.target_audio_file),
  });
  /** The partner voice saying a retry target, rendered once per target per turn. */
  const targetAudio = async (conv: ConversationRow, turnId: number, target: string) => {
    const done = db.prepare("SELECT target_audio_file AS f FROM conversation_attempts WHERE turn_id = ? AND target = ? AND target_audio_file IS NOT NULL")
      .get(turnId, target) as { f: string } | undefined;
    if (done) return done.f;
    const file = saveAudio(conv.id, "wav");
    await speak().speech.say(target, conv.language, join(speak().audioDir, file));
    return file;
  };

  app.get("/api/conversations", (c) => {
    const language = z.enum(["it", "nl", "en"]).parse(c.req.query("lang"));
    const userId = c.get("user").id;
    const rows = db.prepare("SELECT * FROM conversations WHERE user_id = ? AND language = ? ORDER BY updated_at DESC").all(userId, language) as ConversationRow[];
    const conversations = rows.map((r): ConversationSummary => ({
      id: r.id, language: r.language, level: r.level, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at,
      levels: (db.prepare("SELECT level FROM conversation_turns WHERE conversation_id = ? AND role = 'learner' AND level IS NOT NULL ORDER BY id").all(r.id) as { level: string }[])
        .map((t) => t.level),
      reliance: reliance(r.id),
    }));
    const weakPhrases = db.prepare("SELECT text, created_at AS createdAt FROM weak_phrases WHERE user_id = ? AND language = ? ORDER BY id DESC")
      .all(userId, language) as { text: string; createdAt: string }[];
    const { today, cap } = spend(userId, null);
    return c.json<ConversationsOut>({ conversations, weakPhrases, spend: { today, cap } });
  });

  const conversationOut = (conv: ConversationRow, userId: number): ConversationOut => ({
    id: conv.id, language: conv.language, level: conv.level, title: conv.title, hardMode: conv.hard_mode === 1, createdAt: conv.created_at,
    turns: turnRows(conv.id).map((t) => toTurn(conv.id, t)), reliance: reliance(conv.id), spend: spend(userId, conv.id),
  });

  app.post("/api/conversations", async (c) => {
    const body = NewConversationSchema.parse(await c.req.json());
    speak();
    const user = c.get("user");
    underCapOr429(user.id);
    const scenario = "starter" in body.scenario ? STARTER_PROMPTS[body.scenario.starter] : "topic" in body.scenario ? body.scenario.topic : SURPRISE;
    const now = deps.now().toISOString();
    const id = Number(db.prepare(
      "INSERT INTO conversations (user_id, language, locale, level, scenario, title, hard_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?)",
    ).run(user.id, body.language, supportLocale(body.language, user.locale), body.level, scenario, Number(body.hardMode), now, now).lastInsertRowid);
    await partnerTurn(conversationOr404(id, user.id), user.id);
    return c.json(conversationOut(conversationOr404(id, user.id), user.id));
  });

  app.get("/api/conversations/:id", (c) => {
    const userId = c.get("user").id;
    return c.json(conversationOut(conversationOr404(Id.parse(c.req.param("id")), userId), userId));
  });

  app.put("/api/conversations/:id", async (c) => {
    const { hardMode } = PutConversationSchema.parse(await c.req.json());
    const conv = conversationOr404(Id.parse(c.req.param("id")), c.get("user").id);
    db.prepare("UPDATE conversations SET hard_mode = ? WHERE id = ?").run(Number(hardMode), conv.id);
    return c.json({ ok: true });
  });

  // A reply is judged against the retry target when there is one, else against its own transcript; the coach's
  // `meant` becomes the target of the retries that follow a failure. Once checking starts the response streams
  // SpeakAttemptEvent lines, so later failures arrive as an {error, status} line under HTTP 200.
  app.post("/api/conversations/:id/attempts", async (c) => {
    const body = SpeakAttemptSchema.parse(await c.req.json());
    const { ai, audioDir } = speak();
    const userId = c.get("user").id;
    const conv = conversationOr404(Id.parse(c.req.param("id")), userId);
    underCapOr429(userId);
    const turn = awaitingReply(conv.id);
    const file = saveAudio(conv.id, EXT[body.mime], Buffer.from(body.audio, "base64"));
    const path = join(audioDir, file);

    const check = async (step: (s: CheckStep) => Promise<unknown>): Promise<SpeakAttemptResult> => {
      await step("listening");
      const { result: transcript, usage } = await ai.transcribe(path, conv.language);
      paid(userId, conv.id, "transcribe", usage);
      if (!transcript.trim()) throw new HTTPException(422, { message: "No speech was heard; try again" });
      await step("judging");
      const coached = await ai.coach({ ...setting(conv), partnerLine: turn.text, target: body.target, transcript });
      paid(userId, conv.id, "coach", coached.usage);
      const verdict = coached.result;
      const passed = verdict.grammarOk;
      const target = body.target ?? verdict.meant;
      const targetFile = passed ? null : await targetAudio(conv, turn.id, target);

      const attemptId = Number(db.prepare(
        `INSERT INTO conversation_attempts (conversation_id, turn_id, retry, target, transcript, verdict, passed, audio_file, target_audio_file, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(conv.id, turn.id, Number(body.target !== null), target, transcript, JSON.stringify(verdict), Number(passed), file, targetFile, deps.now().toISOString())
        .lastInsertRowid);
      const turns: TurnOut[] = [];
      if (passed) {
        await step("answering");
        const suggested = (JSON.parse(turn.suggestions!) as Chunk[][]).some((s) => spoken(joinChunks(s)) === spoken(target));
        turns.push(learnerTurn(conv, target, body.usedHow ? "how" : suggested ? "suggestion" : "own", verdict.level, body.taps, file));
        turns.push(await partnerTurn(conv, userId));
      }
      const attempt = toAttempt(db.prepare("SELECT * FROM conversation_attempts WHERE id = ?").get(attemptId) as AttemptRow);
      return { attempt, turns, reliance: reliance(conv.id), spend: spend(userId, conv.id) };
    };

    c.header("Content-Type", "application/x-ndjson");
    return stream(c, async (s) => {
      const send = (e: SpeakAttemptEvent) => s.write(JSON.stringify(e) + "\n");
      try {
        await send({ result: await check((step) => send({ step })) });
      } catch (e) {
        if (!(e instanceof HTTPException)) console.error(e);
        await send(e instanceof HTTPException ? { error: e.message, status: e.status } : { error: "Internal error", status: 500 });
      }
    });
  });

  app.post("/api/conversations/:id/move-on", async (c) => {
    const { target, taps } = MoveOnSchema.parse(await c.req.json());
    speak();
    const userId = c.get("user").id;
    const conv = conversationOr404(Id.parse(c.req.param("id")), userId);
    underCapOr429(userId);
    const turn = awaitingReply(conv.id);
    if (failures(turn.id, target) < MOVE_ON_AFTER)
      throw new HTTPException(409, { message: `Moving on needs ${MOVE_ON_AFTER} failed tries at this sentence` });
    const turns = transaction(db, () => {
      db.prepare("INSERT INTO weak_phrases (user_id, language, text, conversation_id, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(userId, conv.language, target, conv.id, deps.now().toISOString());
      return [learnerTurn(conv, target, "moved_on", null, taps, null)];
    });
    turns.push(await partnerTurn(conv, userId));
    return c.json<MoveOnResult>({ turns, reliance: reliance(conv.id), spend: spend(userId, conv.id) });
  });

  // Retries the partner's answer after it failed (a model or TTS error) following a passed reply.
  app.post("/api/conversations/:id/partner", async (c) => {
    speak();
    const userId = c.get("user").id;
    const conv = conversationOr404(Id.parse(c.req.param("id")), userId);
    underCapOr429(userId);
    if (turnRows(conv.id).at(-1)?.role !== "learner") throw new HTTPException(409, { message: "It's the learner's turn" });
    return c.json({ turn: await partnerTurn(conv, userId), spend: spend(userId, conv.id) });
  });

  app.post("/api/conversations/:id/how", async (c) => {
    const { text } = HowSchema.parse(await c.req.json());
    const { ai } = speak();
    const userId = c.get("user").id;
    const conv = conversationOr404(Id.parse(c.req.param("id")), userId);
    underCapOr429(userId);
    const { result, usage } = await ai.howDoISay(setting(conv), history(conv.id), text);
    paid(userId, conv.id, "how", usage);
    return c.json<HowOut>({ sentence: joinChunks(result), chunks: result, spend: spend(userId, conv.id) });
  });

  app.post("/api/conversations/:id/attempts/:attemptId/report", async (c) => {
    const { note } = SpeakReportSchema.parse(await c.req.json());
    const conv = conversationOr404(Id.parse(c.req.param("id")), c.get("user").id);
    const res = db.prepare("UPDATE conversation_attempts SET report_note = ?, reported_at = ? WHERE id = ? AND conversation_id = ?")
      .run(note, deps.now().toISOString(), Id.parse(c.req.param("attemptId")), conv.id);
    if (res.changes === 0) throw new HTTPException(404, { message: "No such attempt" });
    return c.json({ ok: true });
  });

  // Only files this conversation's rows name are served, to its owner or an admin.
  app.get("/api/conversations/:id/audio/:file", (c) => {
    const { audioDir } = speak();
    const user = c.get("user");
    const id = Id.parse(c.req.param("id"));
    const file = c.req.param("file");
    const owner = db.prepare("SELECT user_id FROM conversations WHERE id = ?").get(id) as { user_id: number } | undefined;
    const known = db.prepare(
      `SELECT 1 FROM conversation_turns WHERE conversation_id = ? AND audio_file = ?
       UNION SELECT 1 FROM conversation_attempts WHERE conversation_id = ? AND ? IN (audio_file, target_audio_file)`,
    ).get(id, file, id, file);
    if (!owner || !known || (owner.user_id !== user.id && !isAdmin(deps, user))) throw new HTTPException(404, { message: "Not found" });
    return c.body(readFileSync(join(audioDir, file)), 200, { "Content-Type": MIME[file.split(".").pop()!] });
  });

  // /api/admin/* is admin-only (server/admin.ts).
  app.get("/api/admin/spend", (c) => {
    const days = z.coerce.number().int().min(1).max(365).parse(c.req.query("days") ?? "30");
    const since = new Date(deps.now().getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const rows = db.prepare(
      `SELECT u.email, u.username, substr(a.created_at, 1, 10) AS day, sum(a.cost_usd) AS cost
       FROM api_usage a JOIN users u ON u.id = a.user_id WHERE a.created_at >= ? GROUP BY a.user_id, day`,
    ).all(since) as { email: string; username: string | null; day: string; cost: number }[];
    const users = new Map<string, AdminSpendOut["users"][number]>();
    for (const r of rows) {
      const u = users.get(r.email) ?? users.set(r.email, { email: r.email, username: r.username, total: 0, byDay: {} }).get(r.email)!;
      u.byDay[r.day] = r.cost;
      u.total += r.cost;
    }
    const dayList = Array.from({ length: days }, (_, i) => new Date(deps.now().getTime() - i * 86_400_000).toISOString().slice(0, 10));
    return c.json<AdminSpendOut>({ days: dayList, users: [...users.values()].sort((a, b) => b.total - a.total) });
  });

  app.get("/api/admin/speak-reports", (c) => {
    const rows = db.prepare(
      `SELECT a.*, c.language, u.email, u.username, t.text AS partner_line FROM conversation_attempts a
       JOIN conversations c ON c.id = a.conversation_id JOIN users u ON u.id = c.user_id JOIN conversation_turns t ON t.id = a.turn_id
       WHERE a.reported_at IS NOT NULL ORDER BY a.reported_at DESC`,
    ).all() as (AttemptRow & { language: Language; email: string; username: string | null; partner_line: string; report_note: string; reported_at: string })[];
    return c.json<AdminSpeakReport[]>(rows.map((r) => ({
      ...toAttempt(r), conversationId: r.conversation_id, language: r.language, reporter: { email: r.email, username: r.username },
      note: r.report_note, reportedAt: r.reported_at, partnerLine: r.partner_line,
    })));
  });
}
