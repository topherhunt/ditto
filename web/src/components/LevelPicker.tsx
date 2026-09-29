import { For } from "solid-js";
import { LEARNER_LEVELS, type LearnerLevel } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { languageInSentence, t } from "../i18n/index.ts";

/** "How much do you know?" as one radio per level, so a form can require an answer. */
export function LevelPicker(props: { lang: Language; chosen: LearnerLevel | null; onChoose: (l: LearnerLevel) => void }) {
  const name = `level-${props.lang}`;
  return (
    <fieldset class="qa-level-picker">
      <legend class="h6">{t("level.question", { language: languageInSentence(props.lang) })}</legend>
      <div class="d-flex flex-column gap-2">
        <For each={LEARNER_LEVELS}>
          {(l) => (
            <>
              {/* btn-check hides the radio itself, so the label carries the qa class. */}
              <input type="radio" class="btn-check" name={name} id={`${name}-${l}`} value={l} required
                checked={props.chosen === l} onChange={() => props.onChoose(l)} />
              <label class={`qa-level-${l} btn btn-outline-primary text-start d-flex align-items-center gap-2`} for={`${name}-${l}`}>
                <span class="me-auto">
                  <span class="fw-semibold">{t(`level.${l}`)}</span>
                  <span class="d-block small opacity-75">{t(`level.${l}.hint`)}</span>
                </span>
                <span class="badge text-bg-light">{l}</span>
              </label>
            </>
          )}
        </For>
      </div>
      <div class="form-text">{t("level.changeLater")}</div>
    </fieldset>
  );
}
