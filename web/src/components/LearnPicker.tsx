import { For } from "solid-js";
import type { Language, Locale } from "../../../shared/content.ts";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS, learnable } from "../learning.ts";
import { RequestLanguageLink } from "./RequestLanguage.tsx";

/** One button per course a speaker of `locale` can take, plus a way to ask for a missing language. */
export function LearnPicker(props: { locale: Locale; chosen: Language | null; onChoose: (l: Language) => void }) {
  return (
    <div class="d-flex flex-column gap-2">
      <div class="d-flex flex-wrap gap-2">
        <For each={learnable(props.locale)}>
          {(l) => (
            <button type="button" class={`qa-learn-${l} btn btn-outline-primary`} classList={{ active: props.chosen === l }}
              aria-pressed={props.chosen === l} onClick={() => props.onChoose(l)}>
              {LANGUAGE_FLAGS[l]} {languageName(l)}
            </button>
          )}
        </For>
      </div>
      <div class="small text-body-secondary">
        {t("welcome.learnMore")}{" "}
        <RequestLanguageLink />
      </div>
    </div>
  );
}
