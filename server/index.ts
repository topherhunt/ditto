import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { googleVerifier } from "./auth.ts";
import { loadContent } from "./content.ts";
import { openDb } from "./db.ts";
import { openAIExplainer } from "./explain.ts";

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
const explainModel = env.EXPLAIN_MODEL || "gpt-6-luna";
const audioDir = env.AUDIO_DIR || join(root, "content/audio");
const webDir = join(root, "dist/web");

const content = loadContent(env.CONTENT_DIR || join(root, "content"), audioDir, { requireAudio: production });
const app = createApp({
  db: openDb(env.DATABASE_PATH || join(root, "data/app.db")),
  content,
  now: () => new Date(),
  googleClientId,
  verifyGoogle: googleClientId ? googleVerifier(googleClientId) : null,
  allowedEmails: env.ALLOWED_EMAILS ? new Set(env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase())) : null,
  devLogin: env.DEV_LOGIN === "1",
  explainer: env.OPENAI_API_KEY ? openAIExplainer(env.OPENAI_API_KEY, explainModel) : null,
  explainModel,
  explainDailyLimit: Number(env.EXPLAIN_DAILY_LIMIT || 50),
  secureCookies: production,
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
