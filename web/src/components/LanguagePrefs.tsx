import { A } from "@solidjs/router";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { immersible, type Prefs } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { languageInSentence, t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";

type SaveStatus = "saving" | "saved" | { error: string } | null;

/** A save-status line per section, so it shows next to the control that was changed. "Saved" clears after 3 seconds; errors stay. */
export function createSaver() {
  const [status, setStatus] = createSignal<SaveStatus>(null);
  createEffect(() => {
    if (status() !== "saved") return;
    const timer = setTimeout(() => setStatus(null), 3000);
    onCleanup(() => clearTimeout(timer));
  });
  const save = async (request: () => Promise<unknown>) => {
    setStatus("saving");
    try {
      await request();
      await refetchMe();
      setStatus("saved");
    } catch (e) {
      setStatus({ error: (e as Error).message });
    }
  };
  const text = (s: NonNullable<SaveStatus>) => (s === "saving" ? t("settings.saving") : s === "saved" ? t("settings.saved") : t("settings.saveFailed", s));
  const Status = () => <Show when={status()}>{(s) => <div class="qa-settings-status small text-body-secondary">{text(s())}</div>}</Show>;
  return { save, markSaved: () => setStatus("saved"), Status };
}

type Field = keyof Prefs;

/** Each pref's label and options, shared by the form and the catalog's summary line. */
const FIELDS: { field: Field; label: () => string; parse: (v: string) => Prefs[Field]; options: [value: string, label: () => string][] }[] = [
  { field: "path", label: () => t("settings.path"), parse: (v) => v as Prefs["path"], options: [
    ["full", () => t("settings.pathFull")], ["chunks", () => t("settings.pathChunks")], ["sentences", () => t("settings.pathSentences")],
  ] },
  { field: "hints", label: () => t("settings.hints"), parse: (v) => v as Prefs["hints"], options: [
    ["letters", () => t("settings.hintsLetters")], ["initial", () => t("settings.hintsInitial")], ["none", () => t("settings.hintsNone")],
  ] },
  { field: "autoplay", label: () => t("settings.autoplay"), parse: Number, options: [
    ["0", () => t("settings.autoplay0")], ["1", () => t("settings.autoplay1")], ["2", () => t("settings.autoplay2")], ["3", () => t("settings.autoplay3")],
  ] },
  { field: "rate", label: () => t("settings.rate"), parse: Number, options: [
    ["1", () => t("settings.rateNormal")], ["0.9", () => "0.9×"], ["0.75", () => "0.75×"],
  ] },
];

/** One language's practice prefs as a form, saved on change. */
export function LanguagePrefs(props: { lang: Language }) {
  const { save, Status } = createSaver();
  const prefs = () => me()!.prefs[props.lang];
  const savePrefs = (patch: Partial<Prefs>) => save(() => api.put("/api/prefs", { language: props.lang, prefs: { ...prefs(), ...patch } }));
  return (
    <div class="d-flex flex-column gap-3">
      <For each={FIELDS}>
        {(f) => (
          <label class="form-label mb-0">
            {f.label()}
            <select class={`qa-settings-${f.field} form-select`} value={String(prefs()[f.field])}
              onChange={(e) => savePrefs({ [f.field]: f.parse(e.currentTarget.value) })}>
              <For each={f.options}>{([value, label]) => <option value={value}>{label()}</option>}</For>
            </select>
          </label>
        )}
      </For>
      <Show when={immersible(props.lang)}>
        <fieldset class="qa-settings-immersion">
          <legend class="form-label fs-6 mb-2">{t("settings.immersion")}</legend>
          <For each={IMMERSION}>
            {(f) => (
              <div class="mb-2">
                <div class="form-check form-switch">
                  <input class={`qa-settings-${f.field} form-check-input`} type="checkbox" role="switch" id={f.field} checked={prefs()[f.field]}
                    onChange={(e) => savePrefs({ [f.field]: e.currentTarget.checked })} />
                  <label class="form-check-label" for={f.field}>{t(f.label, { language: languageInSentence(props.lang) })}</label>
                </div>
                <div class="form-text">{t(f.hint, { language: languageInSentence(props.lang) })}</div>
              </div>
            )}
          </For>
        </fieldset>
      </Show>
      <Status />
    </div>
  );
}

const IMMERSION = [
  { field: "immerseUi", label: "settings.immerseUi", hint: "settings.immerseUiHint" },
  { field: "immerseHelp", label: "settings.immerseHelp", hint: "settings.immerseHelpHint" },
] as const;

/** A link to change the language's practice prefs, followed by a one-line recap of them. */
export function LanguagePrefsSummary(props: { lang: Language }) {
  const prefs = () => me()!.prefs[props.lang];
  const valueLabel = (f: (typeof FIELDS)[number]) => {
    const option = f.options.find(([value]) => value === String(prefs()[f.field]));
    if (!option) throw new Error(`No option for ${f.field} = ${prefs()[f.field]}`);
    return option[1]();
  };
  return (
    <div class="d-flex align-items-center gap-2">
      <A href={`/${props.lang}/settings`} class="qa-home-settings btn btn-sm btn-outline-secondary flex-shrink-0">
        <i class="bi bi-sliders me-1" aria-hidden="true" />{t("home.practiceSettings")}
      </A>
      <div class="small">
        <For each={FIELDS}>
          {(f, i) => (
            <>
              <Show when={i() > 0}><span class="text-body-secondary" aria-hidden="true"> · </span></Show>
              <span class={`qa-prefs-summary-${f.field}`}><span class="text-body-secondary">{f.label()}:</span> {valueLabel(f)}</span>
            </>
          )}
        </For>
      </div>
    </div>
  );
}
