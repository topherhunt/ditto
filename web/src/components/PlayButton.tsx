import { t } from "../i18n/index.ts";
import { play, playing, stop } from "../pages/player.ts";

/** Plays `url` on the shared player; while it plays, the button is an orange stop button. `color` is its idle button class; without one it is a link-style icon. */
export function PlayButton(props: { url: string; class: string; color?: string }) {
  const on = () => playing() === props.url;
  const icon = () => props.color === undefined;
  return (
    <button type="button" class={`btn btn-sm ${props.class} ${on() ? (icon() ? "text-orange" : "btn-outline-orange") : (props.color ?? "")}`}
      aria-label={t(on() ? "speak.stop" : "speak.play")} onClick={() => (on() ? stop() : void play(props.url))}>
      {icon() ? <i class={on() ? "bi bi-stop-circle" : "bi bi-play-circle"} aria-hidden="true" /> : on() ? "■" : "▶"}
    </button>
  );
}
