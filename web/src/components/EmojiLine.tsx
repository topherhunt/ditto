import { Show } from "solid-js";

/** A list item whose leading emoji hangs like a bullet, so wrapped lines align with the text rather than under the emoji. */
export function EmojiLine(props: { text: string; class?: string }) {
  const parts = () => props.text.match(/^(\p{Extended_Pictographic}\S*)\s+(.*)$/su);
  return (
    <Show when={parts()} fallback={<li class={props.class}>{props.text}</li>}>
      {(p) => (
        <li class={`d-flex gap-2 ${props.class ?? ""}`}>
          <span aria-hidden="true">{p()[1]}</span>
          <span>{p()[2]}</span>
        </li>
      )}
    </Show>
  );
}
