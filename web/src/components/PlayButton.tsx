import { t } from "../i18n/index.ts";
import { loading, play, playing, stop } from "../pages/player.ts";

/** Plays `url` on the shared player; until sound starts it shows an info spinner, then it is an orange stop button until done. `color` is its idle button class; without one it is a link-style icon. */
export function PlayButton(props: { url: string; class: string; color?: string }) {
  const on = () => playing() === props.url;
  const icon = () => props.color === undefined;
  return (
    <button type="button" class={`btn btn-sm ${props.class} ${on() ? (icon() ? "text-orange" : "btn-outline-orange") : (props.color ?? "")}`}
      aria-label={t(on() ? "speak.stop" : "speak.play")} onClick={() => (on() ? stop() : void play(props.url))}>
      {on() && loading() ? <span class="qa-play-loading spinner-border spinner-border-sm text-info align-middle" aria-hidden="true" />
        : icon() ? <i class={on() ? "bi bi-stop-circle" : "bi bi-play-circle"} aria-hidden="true" /> : on() ? "■" : "▶"}
    </button>
  );
}
