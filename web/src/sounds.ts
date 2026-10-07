import clickUrl from "./sounds/click.mp3";
import correctUrl from "./sounds/correct.mp3";
import noteUrl from "./sounds/marimba-note.mp3";
import warningUrl from "./sounds/marimba-warning.mp3";
import victoryUrl from "./sounds/victory.mp3";
import wrongUrl from "./sounds/wrong.mp3";

// Web Audio, not audio elements: iOS re-fetches an element's clip and lags on each play, where a decoded buffer starts at once.
const ctx = new AudioContext();
// iOS mutes Web Audio with the ringer switch unless the page asks for playback, as audio elements (the item audio) get by default.
const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
if (session) session.type = "playback";

type Sound = { gain: GainNode; buffer: AudioBuffer | null };
function sound(url: string, volume: number): Sound {
  const s: Sound = { gain: new GainNode(ctx, { gain: volume }), buffer: null };
  s.gain.connect(ctx.destination);
  void fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.arrayBuffer();
  }).then((b) => ctx.decodeAudioData(b)).then((b) => { s.buffer = b; });
  return s;
}
const click = sound(clickUrl, 0.5);
const correct = sound(correctUrl, 0.5);
const wrong = sound(wrongUrl, 0.5);
const victory = sound(victoryUrl, 0.25);
const warning = sound(warningUrl, 0.5);
const note = sound(noteUrl, 0.5);

let clicking: AudioBufferSourceNode | null = null;

/** A random rate within 0.1 of 1, which also varies the pitch, so repeated sounds don't sound mechanical. */
function play(s: Sound, rate = 0.9 + Math.random() * 0.2) {
  // Starts suspended until a user gesture, and iOS interrupts it for calls and backgrounding; plays come from gestures, so they resume it.
  if (ctx.state !== "running") void ctx.resume();
  // Still decoding only in the moment after page load; a UI sound isn't worth playing late.
  if (!s.buffer) return null;
  const source = new AudioBufferSourceNode(ctx, { buffer: s.buffer, playbackRate: rate });
  source.connect(s.gain);
  source.start();
  return source;
}

/** Stops the click of the button that submitted a result, so the result sound plays clean. */
function cutClick() {
  clicking?.stop();
  clicking = null;
}

/** A graded answer's sound; it cuts off the click of the button that submitted it. */
export function playResult(ok: boolean) {
  cutClick();
  play(ok ? correct : wrong);
}

/** A finished session's sound; it cuts off the click of the Next button that ended it. */
export function playVictory() {
  cutClick();
  play(victory);
}

/** A conversation reply that needs corrections. */
export const playWarning = () => void play(warning);

/** The recording-started cue: the marimba note, pitched up. */
export const playRecordStart = () => void play(note, 1.2);

/** The recording-stopped cue: the marimba note, pitched down. */
export const playRecordStop = () => void play(note, 0.8);

/**
 * Clicks every button and link outside a `data-silent` element. Listens in the capture phase so it
 * runs before Solid's delegated onClick handlers, letting a handler's playResult cut the click off.
 */
export function installClickSound() {
  window.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (target.closest("button, a[href]") && !target.closest("[data-silent]")) clicking = play(click);
  }, { capture: true });
}
