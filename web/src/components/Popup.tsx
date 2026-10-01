import { createEffect, type JSX } from "solid-js";

/** A modal over the page (native `<dialog>`: Escape, focus trap and a backdrop for free). Clicking the backdrop or pressing Escape closes it. */
export function Popup(props: { open: boolean; onClose: () => void; title: string; children: JSX.Element; footer: JSX.Element; class?: string }) {
  let dialog!: HTMLDialogElement;
  createEffect(() => {
    if (props.open && !dialog.open) dialog.showModal();
    else if (!props.open && dialog.open) dialog.close();
  });
  return (
    <dialog ref={dialog} class={`qa-popup border rounded-3 p-0 text-body ${props.class ?? ""}`} aria-label={props.title}
      onClose={() => props.onClose()} onClick={(e) => e.target === dialog && props.onClose()}>
      <div class="p-3 d-flex flex-column gap-3">
        <h2 class="h5 mb-0">{props.title}</h2>
        <div>{props.children}</div>
        <div class="d-flex flex-wrap justify-content-end gap-2">{props.footer}</div>
      </div>
    </dialog>
  );
}
