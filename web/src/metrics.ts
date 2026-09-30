import { ENGAGED_MAX_SECONDS, type Activity } from "../../shared/api.ts";
import { LANGUAGES, type Language } from "../../shared/content.ts";

// Engaged time (docs/metrics.md): a visible page, used within the last minute, is counted in 5-second ticks and reported
// every 30 seconds, on leaving the page and on hiding the tab. Nothing else about the visit is sent.

const TICK_SECONDS = 5;
const REPORT_SECONDS = 30;
const IDLE_MS = 60_000;

type Page = { activity: Activity; language: Language | null };

/** The route's activity, or null for pages that aren't counted (admin). */
export function pageOf(pathname: string): Page | null {
  const [first, ...rest] = pathname.split("/").filter(Boolean);
  if (!first) return { activity: "home", language: null };
  if (!(LANGUAGES as readonly string[]).includes(first)) {
    if (first === "admin") return null;
    const activity: Activity = first === "friends" || first === "leaderboard" || first === "people" ? "social" : first === "settings" ? "settings" : "other";
    return { activity, language: null };
  }
  const language = first as Language;
  const [section, sub, third] = rest;
  const activity: Activity =
    section === undefined ? "home"
    : section === "type" ? (
      sub === "review" ? "review"
      : sub === "notebook" ? (third === "practice" ? "mistakes" : "notebook")
      : sub === "lesson" ? "lesson"
      : sub === "test" ? "level-test"
      : "home")
    : section === "talk" ? "talk"
    : section === "settings" ? "settings"
    : section === "quiz" ? (sub === "test" ? "quiz-test" : third === "study" ? "quiz-study" : "quiz-decks")
    : "other";
  return { activity, language };
}

let page: Page | null = null;
let pending = 0;
let lastInput = 0;
let started = false;

function report() {
  if (!page || pending === 0) return;
  const body = JSON.stringify({ ...page, seconds: Math.min(pending, ENGAGED_MAX_SECONDS) });
  pending = 0;
  // keepalive lets the report outlive a closing tab. A lost report only undercounts, so a failure is logged, not shown.
  fetch("/api/metrics/engaged", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true })
    .then((res) => { if (!res.ok) console.warn(`Engaged-time report failed with ${res.status}`); })
    .catch((e) => console.warn("Engaged-time report failed", e));
}

/** Called on every route change while signed in; starts the tick on first call. */
export function trackPage(pathname: string) {
  report();
  page = pageOf(pathname);
  if (started) return;
  started = true;
  const input = () => { lastInput = Date.now(); };
  for (const type of ["keydown", "pointerdown", "wheel", "touchstart"]) document.addEventListener(type, input, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") report(); });
  setInterval(() => {
    if (!page || document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
    pending += TICK_SECONDS;
    if (pending >= REPORT_SECONDS) report();
  }, TICK_SECONDS * 1000);
}

/** On sign-out, so the next account's time isn't mixed with this one's. */
export function stopTracking() {
  report();
  page = null;
}
