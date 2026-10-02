import { A } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import type { CatalogLesson } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

/** The Review button and the pop-up that explains the queue before starting it. `count` is the queue size (an empty queue swaps the Let's go button for a button to `next`, the next lesson, and hides the notebook link); `onNotebook` drops the notebook link when already on that page. */
export function ReviewButton(props: { lang: Language; count: number; next: CatalogLesson | null; onNotebook?: boolean }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <button type="button" class="qa-review-link btn btn-primary" onClick={() => setOpen(true)}>
        <span aria-hidden="true">🏋️‍♀️</span> {t("home.review")} <span class="qa-review-count badge text-bg-light">{props.count}</span>
      </button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t("home.reviewIntroTitle")} class="qa-review-popup"
        centerFooter
        footer={props.count > 0
          ? <A href={`/${props.lang}/type/review`} class="qa-review-go btn btn-primary"><span aria-hidden="true">▶</span> {t("popup.letsGo")}</A>
          : <Show when={props.next}>
              {(lesson) => <A href={`/${props.lang}/type/lesson/${lesson().id}`} class="qa-review-next-lesson btn btn-success"><span aria-hidden="true">▶</span> {t("home.next", { title: lesson().title })}</A>}
            </Show>}>
        <ul class="mb-0 d-flex flex-column gap-2">
          <li>{t("home.reviewIntro1")}</li>
          <li>{t("home.reviewIntro2")}</li>
          <li>{t("home.reviewIntro3")}</li>
        </ul>
        <Show when={props.count === 0}>
          <p class="qa-review-nothing text-success fw-medium mt-3 mb-0">{t("home.reviewNothing")}</p>
        </Show>
        <Show when={!props.onNotebook && props.count > 0}>
          <p class="mt-3 mb-0"><A href={`/${props.lang}/type/notebook`} class="qa-review-notebook">{t("home.reviewNotebook")}</A></p>
        </Show>
      </Popup>
    </>
  );
}
