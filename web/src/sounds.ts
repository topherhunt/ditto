import clickUrl from "./sounds/click.mp3";
import correctUrl from "./sounds/correct.mp3";
import dropletUrl from "./sounds/droplet.mp3";
import goodTryEn from "./sounds/good-try-en.m4a";
import goodTryEs from "./sounds/good-try-es-419.m4a";
import goodTryIt from "./sounds/good-try-it.m4a";
import goodTryNl from "./sounds/good-try-nl.m4a";
import victoryUrl from "./sounds/victory.mp3";
import wrongUrl from "./sounds/wrong.mp3";
import type { Locale } from "../../shared/content.ts";
import { locale } from "./i18n/index.ts";

const click = new Audio(clickUrl);
const correct = new Audio(correctUrl);
const wrong = new Audio(wrongUrl);
const victory = new Audio(victoryUrl);
for (const a of [click, correct, wrong]) a.volume = 0.5;
victory.volume = 0.25;
const droplet = new Audio(dropletUrl);
droplet.volume = 0.2;
for (const a of [click, correct, wrong, victory, droplet]) a.preservesPitch = false;
/** "Good try! Here are some corrections:" in each support locale's voice, pre-rendered with scripts/tts-render.py. */
const GOOD_TRY: Record<Locale, string> = { en: goodTryEn, "es-419": goodTryEs, it: goodTryIt, nl: goodTryNl };
const goodTry = new Audio();

/** A random rate within `spread` of 1, which with pitch unpreserved varies the pitch, so repeated sounds don't sound mechanical. */
function play(audio: HTMLAudioElement, spread = 0.1) {
  audio.playbackRate = 1 - spread + Math.random() * 2 * spread;
  audio.currentTime = 0;
  // Rejects only when the browser blocks audio before any user gesture; a UI sound isn't worth surfacing.
  audio.play().catch(() => {});
}

/** A graded answer's sound; it cuts off the click of the button that submitted it. */
export function playResult(ok: boolean) {
  click.pause();
  play(ok ? correct : wrong);
}

/** A finished session's sound; it cuts off the click of the Next button that ended it. */
export function playVictory() {
  click.pause();
  play(victory);
}

/** A quiet drop, for opening a gloss. */
export const playDroplet = () => play(droplet, 0.2);

/** Before a failed reply's corrections, spoken in the interface language. */
export function playGoodTry() {
  goodTry.src = GOOD_TRY[locale()];
  play(goodTry, 0);
}

/**
 * Clicks every button and link outside a `data-silent` element. Listens in the capture phase so it
 * runs before Solid's delegated onClick handlers, letting a handler's playResult cut the click off.
 */
export function installClickSound() {
  window.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (target.closest("button, a[href]") && !target.closest("[data-silent]")) play(click);
  }, { capture: true });
}
