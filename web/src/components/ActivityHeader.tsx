import { createSignal, For, Show } from "solid-js";
import type { Language } from "../../../shared/content.ts";
import type { Key } from "../i18n/en.ts";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";

export type Activity = "type" | "talk" | "quiz";

const STEPS: Record<Activity, Key[]> = {
  type: ["help.type.1", "help.type.2", "help.type.3", "help.type.4"],
  talk: ["help.talk.1", "help.talk.2", "help.talk.3", "help.talk.4"],
  quiz: ["help.quiz.1", "help.quiz.2", "help.quiz.3", "help.quiz.4"],
};

/**
 * An activity page's title, its course, and a "?" that toggles how the activity works. The panel opens by itself while
 * the learner has done nothing in the activity, until they close it once on this device.
 */
export function ActivityHeader(props: { activity: Activity; lang: Language; fresh: boolean }) {
  const key = `helpSeen.${props.activity}`;
  const seen = () => {
    try { return localStorage.getItem(key) !== null; } catch { return false; }
  };
  const [open, setOpen] = createSignal(props.fresh && !seen());
  const close = () => {
    setOpen(false);
    try { localStorage.setItem(key, "1"); } catch { /* storage unavailable: it opens again next time */ }
  };
  return (
    <div class="d-flex flex-column gap-3">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h1 class="qa-activity-title h3 mb-0">{t(`activity.${props.activity}`)}</h1>
        <button type="button" class="qa-help-toggle btn btn-link p-0 fs-4 lh-1" aria-expanded={open()} aria-label={t("help.toggle")}
          onClick={() => (open() ? close() : setOpen(true))}>
          <i class={`bi ${open() ? "bi-question-circle-fill" : "bi-question-circle"}`} aria-hidden="true" />
        </button>
        <span class="text-body-secondary me-auto">{LANGUAGE_FLAGS[props.lang]} {languageName(props.lang)}</span>
      </div>
      <Show when={open()}>
        <div class="qa-help card border-primary-subtle bg-primary-subtle">
          <div class="card-body">
            <h2 class="h6">{t("help.title")}</h2>
            <ol class="d-flex flex-column gap-1 ps-3">
              <For each={STEPS[props.activity]}>{(k) => <li>{t(k)}</li>}</For>
            </ol>
            <button type="button" class="qa-help-close btn btn-sm btn-primary" onClick={close}>{t("help.gotIt")}</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
