import { For } from "solid-js";
import { t } from "../i18n/index.ts";

/** A lesson's stars out of three: copper, silver or gold, with silhouettes for the ones not earned yet. */
export function Stars(props: { n: number; class?: string }) {
  return (
    <span class={`stars stars-${props.n} qa-stars qa-stars-${props.n} ${props.class ?? ""}`} role="img" aria-label={t("stars.label", { n: props.n })}>
      <For each={[1, 2, 3]}>{(i) => <i class={`bi bi-star-fill ${i <= props.n ? "star-on qa-star-on" : "star-off qa-star-off"}`} aria-hidden="true" />}</For>
    </span>
  );
}
