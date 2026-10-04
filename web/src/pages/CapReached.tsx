import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { t } from "../i18n/index.ts";
import { homeLanguage } from "../learning.ts";
import { me } from "../session.ts";
import { resetTime, spend, usd } from "../spend.ts";
import { routes } from "../routes.ts";

/** Where a paid call refused at the daily spend cap sends the learner. */
export function CapReached() {
  return (
    <Show when={spend()}>
      {(s) => (
        <div class="qa-cap-reached mx-auto py-4" style={{ "max-width": "34rem" }}>
          <div class="display-5 mb-3 text-center" aria-hidden="true">🎉</div>
          <h1 class="h3 text-center">{t("cap.title")}</h1>
          <p>{t("cap.body", { cap: usd(s().cap) })}</p>
          <ul class="qa-cap-free">
            <For each={["cap.freeType", "cap.freeNotebook", "cap.freeQuiz", "cap.freeSocial"] as const}>{(k) => <li>{t(k)}</li>}</For>
          </ul>
          <p class="small text-body-secondary">{t("cap.resets", { time: resetTime() })}</p>
          <A class="qa-cap-continue btn btn-primary" href={routes.dashboard({ lang: homeLanguage(me()!.learning) })}>{t("cap.continue")}</A>
        </div>
      )}
    </Show>
  );
}
