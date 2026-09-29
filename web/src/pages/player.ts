import { createSignal } from "solid-js";
import { api } from "../api.ts";
import { capReached, hitCap } from "../spend.ts";

// One audio element for conversation mode, so a click that starts a conversation can unlock it for the partner's first line.
const player = new Audio();
/** The url playing, so its play button can turn into a stop button. */
export const [playing, setPlaying] = createSignal<string | null>(null);
/** True from `play` until sound starts: a quiz clip can take a second or two to render on first play. */
export const [loading, setLoading] = createSignal(false);
// A pause queued by switching to another url fires once the new one is already playing; `paused` tells them apart.
for (const e of ["pause", "ended"]) player.addEventListener(e, () => { if (player.paused) { setPlaying(null); setLoading(false); } });
// An audio element can't read the status of a failed clip, so a free call refreshes the spend to tell a refused paid render.
player.addEventListener("error", () => {
  setPlaying(null);
  setLoading(false);
  void api.get("/api/me").then(() => { if (capReached()) hitCap(); });
});
player.addEventListener("playing", () => setLoading(false));
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

export const play = (url: string) => {
  player.src = url;
  setPlaying(url);
  setLoading(true);
  return player.play().catch((e: unknown) => {
    setPlaying(null);
    setLoading(false);
    throw e;
  });
};

export const stop = () => player.pause();

/** Safari lets a page start audio without a click only on an element it already played during one; call from a click handler. */
export const unlockPlayer = () => void play(SILENCE).catch(() => {});

/** Autoplay can still be refused (another browser policy); the line's play button stays. */
export const autoplay = (url: string) => void play(url).catch(() => {});
