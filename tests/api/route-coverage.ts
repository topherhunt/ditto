import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";

/** Where each API test worker logs the routes its requests reached, one file per process. */
const HITS_DIR = join(import.meta.dirname, "../../test-results/api-route-hits");

const toRegex = (pattern: string) => new RegExp(`^${pattern.replace(/\{[^}]*\}/g, "").replace(/:\w+/g, "[^/]+").replace(/\*/g, ".*")}$`);

/** The registered route a request lands on: an exact static path wins over a `:param` one, as in Hono's router. */
function matchedRoute(app: Hono<any>, method: string, path: string): string | null {
  const candidates = app.routes.filter((r) => (r.method === method || r.method === "ALL") && r.path !== "/*" && !r.path.endsWith("/*") && toRegex(r.path).test(path));
  const best = candidates.find((r) => !r.path.includes(":")) ?? candidates[0];
  return best ? `${best.method} ${best.path}` : null;
}

/** Called from the API tests' request helper: logs the route a request that wasn't a 404 reached. */
export function recordHit(app: Hono<any>, method: string, path: string, status: number, testFile: string | undefined) {
  mkdirSync(HITS_DIR, { recursive: true });
  const route = status === 404 ? null : matchedRoute(app, method.toUpperCase(), path.split("?")[0]);
  const lines = [testFile ? `file ${testFile}` : null, route ? `route ${route}` : null].filter((l) => l !== null);
  if (lines.length) appendFileSync(join(HITS_DIR, `${process.pid}.log`), lines.join("\n") + "\n");
}

export const clearHits = () => rmSync(HITS_DIR, { recursive: true, force: true });

export function readHits() {
  const lines = readdirSync(HITS_DIR).flatMap((f) => readFileSync(join(HITS_DIR, f), "utf8").split("\n"));
  const pick = (kind: string) => new Set(lines.filter((l) => l.startsWith(`${kind} `)).map((l) => l.slice(kind.length + 1)));
  return { routes: pick("route"), files: pick("file") };
}

/** Every method + path the app registers, middleware and wildcards aside. */
export function registeredRoutes(app: Hono<any>): string[] {
  return [...new Set(app.routes.filter((r) => r.method !== "ALL" && !r.path.includes("*")).map((r) => `${r.method} ${r.path}`))].sort();
}
