import { For } from "solid-js";
import { MOOD_COLORS, MOOD_ICONS, MOODS_HAPPIEST_FIRST } from "../feedback.ts";
import { t } from "../i18n/index.ts";

/** Five faces from unhappy to delighted, one tap each. `value` is the chosen mood (1 to 5) or null. */
export function MoodFaces(props: { value: number | null; disabled?: boolean; onPick: (mood: number) => void }) {
  return (
    <div class="d-flex gap-2">
      <For each={MOODS_HAPPIEST_FIRST}>
        {(mood) => (
          <button type="button" class={`qa-feedback-mood-${mood} btn btn-outline-${MOOD_COLORS[mood - 1]} flex-fill fs-3 py-1`} classList={{ active: props.value === mood }}
            aria-pressed={props.value === mood} aria-label={t(`feedback.mood.${mood}` as "feedback.mood.1")} disabled={props.disabled} onClick={() => props.onPick(mood)}>
            <i class={`bi bi-${MOOD_ICONS[mood - 1]}`} aria-hidden="true" />
          </button>
        )}
      </For>
    </div>
  );
}
