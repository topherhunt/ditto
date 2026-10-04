import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearHits, readHits, registeredRoutes } from "./route-coverage.ts";
import { setup } from "./helpers.ts";

/**
 * Every `/api` route the server registers must be reached by at least one API test, or the run fails after the tests with the
 * list. Checked only when every `tests/api/*.test.ts` file ran, so a filtered run isn't blamed for routes it skipped.
 * A route that genuinely can't be reached from `app.request` belongs in `UNTESTED`, with the reason.
 */
const UNTESTED: Record<string, string> = {};

export default function globalRouteCoverage() {
  clearHits();
  return () => {
    const dir = join(import.meta.dirname);
    const allFiles = readdirSync(dir).filter((f) => f.endsWith(".test.ts"));
    const hits = readHits();
    const ranFiles = new Set([...hits.files].map((f) => f.split("/").pop()));
    if (!allFiles.every((f) => ranFiles.has(f))) return;
    const registered = registeredRoutes(setup({ pocDir: mkdtempSync(join(tmpdir(), "lp-poc-")) }).app);
    const missing = registered.filter((r) => !hits.routes.has(r) && !(r in UNTESTED));
    const stale = Object.keys(UNTESTED).filter((r) => !registered.includes(r) || hits.routes.has(r));
    if (missing.length || stale.length) {
      throw new Error([
        missing.length ? `API routes no tests/api test reaches (add a test, or list it in UNTESTED with a reason):\n  ${missing.join("\n  ")}` : "",
        stale.length ? `UNTESTED entries that are tested or no longer registered (remove them):\n  ${stale.join("\n  ")}` : "",
      ].filter(Boolean).join("\n\n"));
    }
  };
}
