import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AttemptBody } from "../../shared/api.ts";
import type { Locale } from "../../shared/content.ts";
import { createApp, type AppDeps } from "../../server/app.ts";
import { loadContent } from "../../server/content.ts";
import { openDb } from "../../server/db.ts";
import { EXPLAIN_MODEL, type Explainer, type ExplainInput } from "../../server/explain.ts";
import { tokenUsage } from "../../server/usage.ts";
import { expect } from "vitest";
import { recordHit } from "./route-coverage.ts";

const root = join(import.meta.dirname, "../..");
const content = loadContent(join(root, "tests/fixtures/content"), join(root, "content/audio"), { audio: "skip" });
const ORIGIN = "http://app.test";

export function fakeExplainer(): Explainer & { calls: ExplainInput[] } {
  const calls: ExplainInput[] = [];
  return {
    calls,
    async explain(input) {
      calls.push(input);
      return {
        result: { categories: ["spelling"], summary: `fake summary for ${input.answer}`, details: "fake details" },
        usage: tokenUsage(EXPLAIN_MODEL, 1000, 200),
      };
    },
  };
}

export function setup(overrides: Partial<AppDeps> = {}) {
  const clock = { now: new Date("2026-09-01T10:00:00Z") };
  const deps: AppDeps = {
    db: openDb(join(mkdtempSync(join(tmpdir(), "lp-db-")), "test.db")),
    content,
    now: () => clock.now,
    googleClientId: "test-client",
    verifyGoogle: async (credential) => ({ sub: `g-${credential}`, email: `${credential}@example.com` }),
    adminEmails: new Set(["admin@example.com"]),
    devLogin: true,
    explainer: fakeExplainer(),
    secureCookies: false,
    pocDir: null,
    conversation: null,
    dailySpendCap: 5,
    ...overrides,
  };
  const app = createApp(deps);
  let cookie = "";

  async function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await app.request(`${ORIGIN}${path}`, {
      method,
      headers: { host: "app.test", origin: ORIGIN, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    recordHit(app, method, path, res.status, expect.getState().testPath);
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    // NDJSON streams come back as text.
    const json = res.headers.get("content-type")?.startsWith("application/json") ? await res.json() : await res.text();
    return { status: res.status, json: json as any, headers: res.headers };
  }

  return {
    app, deps, clock, req,
    login: (email = "learner@example.com", locale: Locale = "en") => req("POST", "/api/auth/dev", { email, locale }),
    attempt: (unitId: string, over: Partial<AttemptBody> = {}) => {
      const unit = content.locales.en.units.get(unitId)!;
      const body: AttemptBody = {
        unitId, rev: unit.rev, mode: "learn", path: "full", hintsLevel: "letters", outcome: "clean",
        wrongSubmissions: 0, hintsUsed: 0, replays: 0, accentSlips: 0, submissions: [unit.text], categories: [], durationMs: 1000, meaningCorrect: unit.distractors ? true : null, studied: false, master: false, ...over,
      };
      return req("POST", "/api/attempts", body);
    },
  };
}
