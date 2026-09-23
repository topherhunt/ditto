import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AttemptBody } from "../../shared/api.ts";
import { createApp, type AppDeps } from "../../server/app.ts";
import { loadContent } from "../../server/content.ts";
import { openDb } from "../../server/db.ts";
import type { Explainer, ExplainInput } from "../../server/explain.ts";

const root = join(import.meta.dirname, "../..");
const content = loadContent(join(root, "content"), join(root, "content/audio"), { requireAudio: false });
const ORIGIN = "http://app.test";

export function fakeExplainer(): Explainer & { calls: ExplainInput[] } {
  const calls: ExplainInput[] = [];
  return {
    model: "fake-model",
    calls,
    async explain(input) {
      calls.push(input);
      return { categories: ["spelling"], summary: `fake summary for ${input.answer}`, details: "fake details" };
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
    verifyGoogle: async (credential) => ({ sub: `g-${credential}`, email: `${credential}@example.com`, name: credential, picture: null }),
    allowedEmails: null,
    devLogin: true,
    explainer: fakeExplainer(),
    explainModel: "fake-model",
    explainDailyLimit: 3,
    secureCookies: false,
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
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const json = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
    return { status: res.status, json: json as any, headers: res.headers };
  }

  return {
    app, deps, clock, req,
    login: (email = "learner@example.com") => req("POST", "/api/auth/dev", { email }),
    attempt: (unitId: string, over: Partial<AttemptBody> = {}) => {
      const unit = content.units.get(unitId)!;
      const body: AttemptBody = {
        unitId, rev: unit.rev, mode: "learn", path: "full", hintsLevel: "letters", outcome: "clean",
        wrongSubmissions: 0, hintsUsed: 0, replays: 0, accentSlips: 0, submissions: [unit.text], categories: [], durationMs: 1000, ...over,
      };
      return req("POST", "/api/attempts", body);
    },
  };
}
