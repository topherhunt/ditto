import { afterEach, describe, expect, it, vi } from "vitest";
import { openDb } from "../../server/db.ts";
import { healthcheck, reportError, startHealthcheck } from "../../server/healthcheck.ts";

const URL = "https://hc.test/abc";

function setup() {
  const clock = { now: new Date("2026-09-01T10:00:00Z") };
  const calls: { url: string; body: string }[] = [];
  const db = openDb(":memory:");
  const hc = healthcheck(URL, db, () => clock.now, async (url, body) => void calls.push({ url, body }));
  return { clock, calls, db, hc };
}

describe("healthcheck", () => {
  it("pings success on the daily check when the database answers", async () => {
    const { calls, hc } = setup();
    await hc.heartbeat();
    expect(calls).toEqual([{ url: URL, body: "Daily check: ok" }]);
  });

  it("pings failure on the daily check when the database query throws", async () => {
    const { calls, db, hc } = setup();
    db.close();
    await hc.heartbeat();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${URL}/fail`);
  });

  it("pings failure with only the error class, never its message", async () => {
    const { calls, hc } = setup();
    await hc.reportError(new TypeError("secret learner text"));
    expect(calls).toEqual([{ url: `${URL}/fail`, body: "Server error: TypeError. See the server logs." }]);
  });

  it("sends at most one failure per hour and counts the ones it held back", async () => {
    const { clock, calls, hc } = setup();
    await hc.reportError(new Error("a"));
    clock.now = new Date(clock.now.getTime() + 59 * 60_000);
    await hc.reportError(new Error("b"));
    await hc.reportError(new Error("c"));
    expect(calls).toHaveLength(1);
    clock.now = new Date(clock.now.getTime() + 2 * 60_000);
    await hc.reportError(new Error("d"));
    expect(calls).toHaveLength(2);
    expect(calls[1].body).toBe("Server error: Error (plus 2 more since the last alert). See the server logs.");
  });

  it("logs a failed ping instead of throwing, so an unreachable Healthchecks never crashes the app", async () => {
    const hc = healthcheck(URL, openDb(":memory:"), () => new Date(), async () => { throw new Error("offline"); });
    await expect(hc.reportError(new Error("x"))).resolves.toBeUndefined();
    await expect(hc.heartbeat()).resolves.toBeUndefined();
  });
});

describe("startHealthcheck", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("reports errors at once but sends the first heartbeat only once the server is listening, then daily", async () => {
    vi.useFakeTimers({ toFake: ["setInterval"] });
    const sent: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => { sent.push({ url, body: String(init.body) }); return new Response(); });

    const { listening } = startHealthcheck(URL, openDb(":memory:"));
    await reportError(new TypeError("boot"));
    expect(sent).toEqual([{ url: `${URL}/fail`, body: "Server error: TypeError. See the server logs." }]);

    listening();
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toEqual({ url: URL, body: "Daily check: ok" });
    await vi.advanceTimersByTimeAsync(86_400_000);
    await vi.waitFor(() => expect(sent).toHaveLength(3));
  });
});
