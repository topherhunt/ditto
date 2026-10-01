import type { DB } from "./db.ts";
import { log } from "./log.ts";

const DAY_MS = 86_400_000;
const FAIL_COOLDOWN_MS = 3_600_000;
const PING_TIMEOUT_MS = 10_000;

export type Healthcheck = {
  /** Daily: confirms the database answers, then pings success; pings failure if it doesn't. */
  heartbeat: () => Promise<void>;
  /** Pings failure at most once per cooldown. Only the error's class name goes out; the details stay in the logs. */
  reportError: (err: unknown) => Promise<void>;
};

/**
 * One Healthchecks.io check is both the dead-man's switch (no success ping within its period alerts) and the error channel (a failure ping alerts at once),
 * so a broken error path still trips the switch.
 */
export function healthcheck(url: string, db: DB, now: () => Date, post: (url: string, body: string) => Promise<void> = httpPost): Healthcheck {
  let lastFailAt = -Infinity;
  let suppressed = 0;

  // A failed ping is only logged: reporting it as an error would loop.
  const send = (path: string, body: string) => post(`${url}${path}`, body).catch((e) => log.error("Healthcheck ping failed:", e));

  return {
    heartbeat: async () => {
      try {
        db.prepare("SELECT 1").get();
      } catch (e) {
        log.error(e);
        return send("/fail", `Daily check: database query failed (${errorName(e)})`);
      }
      return send("", "Daily check: ok");
    },
    reportError: async (err) => {
      const at = now().getTime();
      if (at - lastFailAt < FAIL_COOLDOWN_MS) {
        suppressed++;
        return;
      }
      lastFailAt = at;
      const more = suppressed ? ` (plus ${suppressed} more since the last alert)` : "";
      suppressed = 0;
      return send("/fail", `Server error: ${errorName(err)}${more}. See the server logs.`);
    },
  };
}

const errorName = (e: unknown) => (e instanceof Error ? e.name : typeof e);

async function httpPost(url: string, body: string) {
  const res = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).origin}`);
}

let active: Healthcheck | null = null;

/**
 * Starts error reports now and the daily heartbeat on `listening`, so the first ping isn't timed out by blocking startup work.
 * Unset in development and tests, where `reportError` does nothing.
 */
export function startHealthcheck(url: string, db: DB): { listening: () => void } {
  const check = healthcheck(url, db, () => new Date());
  active = check;
  return {
    listening: () => {
      void check.heartbeat();
      setInterval(() => void check.heartbeat(), DAY_MS);
    },
  };
}

/** Call wherever a server error is logged. */
export const reportError = (err: unknown) => active?.reportError(err);
