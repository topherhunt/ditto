import { A } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import type { Language } from "../../../shared/content.ts";
import { t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

/** The Review button and the pop-up that explains the queue before starting it. `count` is the queue size; `onNotebook` drops the pop-up's link to the page it is already on. */
export function ReviewButton(props: { lang: Language; count: number; onNotebook?: boolean }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <button type="button" class="qa-review-link btn btn-primary" onClick={() => setOpen(true)}>
        <span aria-hidden="true">🏋️‍♀️</span> {t("home.review")} <span class="qa-review-count badge text-bg-light">{props.count}</span>
      </button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t("home.reviewIntroTitle")} class="qa-review-popup"
        closeLabel={t("quiz.dismiss")} centerFooter
        footer={<A href={`/${props.lang}/type/review`} class="qa-review-go btn btn-primary"><span aria-hidden="true">▶</span> {t("popup.letsGo")}</A>}>
        <ul class="mb-0 d-flex flex-column gap-2">
          <li>{t("home.reviewIntro1")}</li>
          <li>{t("home.reviewIntro2")}</li>
          <li>{t("home.reviewIntro3")}</li>
        </ul>
        <Show when={!props.onNotebook}>
          <p class="mt-3 mb-0"><A href={`/${props.lang}/type/notebook`} class="qa-review-notebook">{t("home.reviewNotebook")}</A></p>
        </Show>
      </Popup>
    </>
  );
}
