import { createSignal } from "solid-js";
import { api } from "../api.ts";
import { load, loadedSrc } from "../audioCache.ts";
import { capReached, hitCap } from "../spend.ts";

// One audio element for conversation mode, so a click that starts a conversation can unlock it for the partner's first line.
const player = new Audio();
/** The url playing, so its play button can turn into a stop button. */
export const [playing, setPlaying] = createSignal<string | null>(null);
/** True from `play` until sound starts: a quiz clip can take a second or two to render on first play. */
export const [loading, setLoading] = createSignal(false);
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
// A pause queued by switching to another clip fires once the new one is already playing, so `paused` tells them apart; the
// unlocking silence never ends what's playing, since its clip is still loading.
for (const e of ["pause", "ended"]) player.addEventListener(e, () => { if (player.paused && player.src !== SILENCE) { setPlaying(null); setLoading(false); } });
// A failed clip refreshes the spend with a free call, to tell a refused paid render.
function failed() {
  setPlaying(null);
  setLoading(false);
  void api.get("/api/me").then(() => { if (capReached()) hitCap(); });
}
player.addEventListener("error", failed);
player.addEventListener("playing", () => setLoading(false));

function start(src: string) {
  player.src = src;
  return player.play().catch((e: unknown) => {
    setPlaying(null);
    setLoading(false);
    throw e;
  });
}

/** Plays `url` from memory after its first play, which fetches it whole: streaming it alongside would render a paid clip twice. */
export const play = (url: string) => {
  setPlaying(url);
  const blob = loadedSrc(url);
  setLoading(!blob);
  if (blob) return start(blob);
  // The fetch outlasts the click, so the click unlocks the element for the play that follows it.
  unlockPlayer();
  return load(url).then((src) => (playing() === url ? start(src) : undefined), (e: unknown) => {
    failed();
    throw e;
  });
};

export const stop = () => {
  setPlaying(null);
  setLoading(false);
  player.pause();
};

/** Safari lets a page start audio without a click only on an element it already played during one; call from a click handler. */
export function unlockPlayer() {
  player.src = SILENCE;
  player.play().catch(() => {});
}

/** Autoplay can still be refused (another browser policy); the line's play button stays. */
export const autoplay = (url: string) => void play(url).catch(() => {});
