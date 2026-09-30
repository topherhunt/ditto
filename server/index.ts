import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { z } from "zod";
import { createApp } from "./app.ts";
import { googleVerifier } from "./auth.ts";
import { HELD_BACK_COURSES, loadContent } from "./content.ts";
import { openDb } from "./db.ts";
import { openAIConversation } from "./conversation-ai.ts";
import { fakeAI, fakeSpeech } from "./conversation-fake.ts";
import { openAIExplainer } from "./explain.ts";
import { reportError, startHealthcheck } from "./healthcheck.ts";
import { rollUpMetrics } from "./metrics.ts";
import { openAISpeech } from "./speech.ts";

const root = join(import.meta.dirname, "..");
const env = process.env;
const production = env.NODE_ENV === "production";
const required = (name: string) => {
  const v = env[name];
  if (!v) throw new Error(`${name} must be set in production`);
  return v;
};

const googleClientId = production ? required("GOOGLE_CLIENT_ID") : env.GOOGLE_CLIENT_ID || null;
if (production && env.DEV_LOGIN === "1") throw new Error("DEV_LOGIN must not be enabled in production");
const audioDir = env.AUDIO_DIR || join(root, "content/audio");
const webDir = join(root, "dist/web");

// Conversation mode and quiz audio need the OpenAI key (docs/conversation.md). FAKE_CONVERSATION scripts both for E2E.
if (production && env.FAKE_CONVERSATION === "1") throw new Error("FAKE_CONVERSATION must not be enabled in production");
const speakAudioDir = env.SPEAK_AUDIO_DIR || join(root, "data/speak-audio");
const conversation = env.FAKE_CONVERSATION === "1"
  ? { ai: fakeAI(), speech: fakeSpeech(), audioDir: speakAudioDir }
  : env.OPENAI_API_KEY
    ? {
      ai: openAIConversation(env.OPENAI_API_KEY, env.CONVERSATION_MODEL || "gpt-6-luna", z.enum(["none", "low", "medium"]).parse(env.CONVERSATION_EFFORT || "low")),
      speech: openAISpeech(env.OPENAI_API_KEY),
      audioDir: speakAudioDir,
    }
    : null;
if (!conversation) console.warn("Conversation mode is off: it needs OPENAI_API_KEY");

const db = openDb(env.DATABASE_PATH || join(root, "data/app.db"));
// Per-learner engaged time past METRICS_KEEP_DAYS becomes anonymous totals (docs/metrics.md).
rollUpMetrics(db, new Date());
setInterval(() => rollUpMetrics(db, new Date()), 3_600_000);

const healthcheckUrl = production ? required("HEALTHCHECK_URL") : env.HEALTHCHECK_URL;
if (healthcheckUrl) startHealthcheck(healthcheckUrl, db);
// Node's default is to print and exit; a handler replaces that, so it must exit too. The report is awaited so it leaves before the process does.
for (const event of ["uncaughtException", "unhandledRejection"] as const) {
  process.on(event, async (err) => {
    console.error(event, err);
    await reportError(err);
    process.exit(1);
  });
}

const content = loadContent(env.CONTENT_DIR || join(root, "content"), audioDir, { audio: production ? "require" : "warn", holdBack: HELD_BACK_COURSES });
const app = createApp({
  db,
  content,
  now: () => new Date(),
  googleClientId,
  verifyGoogle: googleClientId ? googleVerifier(googleClientId) : null,
  allowedEmails: env.ALLOWED_EMAILS ? new Set(env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase())) : null,
  adminEmails: new Set((env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  devLogin: env.DEV_LOGIN === "1",
  explainer: env.OPENAI_API_KEY ? openAIExplainer(env.OPENAI_API_KEY) : null,
  secureCookies: production,
  pocDir: production ? null : env.POC_DIR || join(root, "data/poc"),
  conversation,
  dailySpendCap: Number(env.DAILY_SPEND_CAP || 1),
});
if (production && !env.ALLOWED_EMAILS) console.warn("WARNING: ALLOWED_EMAILS is unset; any Google account can sign in");

app.use("/audio/*", serveStatic({
  root: audioDir,
  rewriteRequestPath: (p) => p.replace(/^\/audio/, ""),
  onFound: (_path, c) => {
    // Hono's mime table lacks .m4a; Safari needs a real audio type.
    c.header("Content-Type", "audio/mp4");
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  },
}));
const audioText = new Map(content.audioJobs.map((j) => [j.file, j.text]));
app.all("/audio/*", (c) => {
  if (!production) {
    const file = c.req.path.replace(/^\/audio\//, "");
    console.warn(`\x1b[31mMissing audio: ${file}${audioText.has(file) ? ` "${audioText.get(file)}"` : " (not referenced by content)"} -- run npm run content:audio\x1b[0m`);
  }
  return c.text("Not found", 404);
});
app.use("/assets/*", serveStatic({
  root: webDir,
  onFound: (_path, c) => c.header("Cache-Control", "public, max-age=31536000, immutable"),
}));
app.use("/*", serveStatic({ root: webDir }));

// SPA fallback: client-side routes get index.html. Read lazily so the API runs in dev without a build.
app.get("/*", (c) => {
  c.header("Cache-Control", "no-cache");
  return c.html(readFileSync(join(webDir, "index.html"), "utf8"));
});

const port = Number(env.PORT || 3000);
serve({ fetch: app.fetch, port, hostname: env.HOST || "127.0.0.1" }, () => console.log(`Listening on http://127.0.0.1:${port}`));
