import clickUrl from "./sounds/click.mp3";
import correctUrl from "./sounds/correct.mp3";
import victoryUrl from "./sounds/victory.mp3";
import wrongUrl from "./sounds/wrong.mp3";

const click = new Audio(clickUrl);
const correct = new Audio(correctUrl);
const wrong = new Audio(wrongUrl);
const victory = new Audio(victoryUrl);
for (const a of [click, correct, wrong]) a.volume = 0.5;
victory.volume = 0.25;

function play(audio: HTMLAudioElement) {
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
