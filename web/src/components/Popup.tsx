import { createEffect, Show, type JSX } from "solid-js";

/** A modal over the page (native `<dialog>`: Escape, focus trap and a backdrop for free). Clicking the backdrop or pressing Escape closes it. */
export function Popup(props: { open: boolean; onClose: () => void; title: string; titleIcon?: string; titleIconClass?: string; children: JSX.Element; footer: JSX.Element; class?: string; closeLabel?: string; centerFooter?: boolean }) {
  let dialog!: HTMLDialogElement;
  createEffect(() => {
    if (props.open && !dialog.open) dialog.showModal();
    else if (!props.open && dialog.open) dialog.close();
  });
  return (
    <dialog ref={dialog} class={`qa-popup border rounded-3 p-0 text-body ${props.class ?? ""}`} aria-label={props.title}
      onClose={() => props.onClose()} onClick={(e) => e.target === dialog && props.onClose()}>
      <div class="p-3 d-flex flex-column gap-3">
        <div class="d-flex align-items-start gap-2">
          <h2 class="h5 mb-0 me-auto">{props.titleIcon && <i class={`bi bi-${props.titleIcon} me-2 ${props.titleIconClass ?? ""}`} aria-hidden="true" />}{props.title}</h2>
          {/* Opt-in: pass `closeLabel` (the X's accessible name) to show an X in the corner. */}
          <Show when={props.closeLabel}>
            {(label) => <button type="button" class="qa-popup-close btn-close" aria-label={label()} onClick={() => props.onClose()} />}
          </Show>
        </div>
        <div>{props.children}</div>
        <div class="d-flex flex-wrap gap-2" classList={{ "justify-content-center": props.centerFooter, "justify-content-end": !props.centerFooter }}>{props.footer}</div>
      </div>
    </dialog>
  );
}
