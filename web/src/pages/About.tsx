import { For } from "solid-js";
import type { Key } from "../i18n/en.ts";
import { t } from "../i18n/index.ts";

const COLUMNS: { heading: Key; tips: Key[] }[] = [
  { heading: "about.exerciseHeading", tips: ["about.tipListen", "about.tipSlow", "about.tipVoices", "about.tipHints", "about.tipWords", "about.tipWhy", "about.tipAloud"] },
  { heading: "about.habitsHeading", tips: ["about.tipDaily", "about.tipReview", "about.tipNotebook", "about.tipPath", "about.tipFriends", "about.tipReport"] },
];

export function About() {
  return (
    <div>
      <h1 class="h4 mb-3">{t("about.title")}</h1>
      <div class="row g-4">
        <For each={COLUMNS}>
          {(col) => (
            <div class="col-md-6">
              <h2 class="h6 text-body-secondary text-uppercase">{t(col.heading)}</h2>
              <ul class="qa-about-tips list-unstyled d-flex flex-column gap-2 mb-0">
                <For each={col.tips}>{(tip) => <li>{t(tip)}</li>}</For>
              </ul>
            </div>
          )}
        </For>
      </div>

      <hr class="my-5" />

      <h2 class="h4 mb-3">{t("about.aboutHeading")}</h2>
      <p class="qa-about-made-by">{t("about.madeBy", { name: "Topher Hunt" })}</p>
      <p>
        <a class="qa-about-github" href="https://github.com/topherhunt/ditto">{t("about.github")}</a>
      </p>
      <p class="qa-about-abair">
        {t("about.abairThanks")}{" "}
        <a href="https://abair.ie">{t("about.abairLink")}</a>
      </p>
    </div>
  );
}
