import { createSignal, For } from "solid-js";
import type { Language, Locale } from "../../../shared/content.ts";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS, learnable } from "../learning.ts";
import { RequestLanguagePopup } from "./RequestLanguage.tsx";

/** One button per course a speaker of `locale` can take, plus an Other button that opens the language request. */
export function LearnPicker(props: { locale: Locale; chosen: Language | null; onChoose: (l: Language) => void }) {
  const [requesting, setRequesting] = createSignal(false);
  return (
    <div class="d-flex flex-column gap-2">
      <div class="option-grid">
        <For each={learnable(props.locale)}>
          {(l) => (
            <button type="button" class={`qa-learn-${l} btn btn-outline-primary px-2 text-start text-nowrap`} classList={{ active: props.chosen === l }}
              aria-pressed={props.chosen === l} onClick={() => props.onChoose(l)}>
              {LANGUAGE_FLAGS[l]} {languageName(l)}
            </button>
          )}
        </For>
        <button type="button" class="qa-learn-other btn btn-outline-secondary px-2 text-start" onClick={() => setRequesting(true)}>{t("request.menu")}</button>
      </div>
      <div class="small text-body-secondary">{t("welcome.learnMore")}</div>
      <RequestLanguagePopup open={requesting()} onClose={() => setRequesting(false)} />
    </div>
  );
}
