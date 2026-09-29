// One audio element for conversation mode, so a click that starts a conversation can unlock it for the partner's first line.
const player = new Audio();
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

export const play = (url: string) => {
  player.src = url;
  return player.play();
};

/** Safari lets a page start audio without a click only on an element it already played during one; call from a click handler. */
export const unlockPlayer = () => void play(SILENCE).catch(() => {});

/** Autoplay can still be refused (another browser policy); the line's play button stays. */
export const autoplay = (url: string) => void play(url).catch(() => {});
