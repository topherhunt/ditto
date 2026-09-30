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

/** Each pref's label and options for the form; `short` is the option's wording in the catalog's summary line. */
const FIELDS: { field: Field; label: () => string; parse: (v: string) => Prefs[Field]; options: [value: string, label: () => string, short?: () => string][] }[] = [
  { field: "path", label: () => t("settings.path"), parse: (v) => v as Prefs["path"], options: [
    ["full", () => t("settings.pathFull"), () => t("settings.sumPathFull")],
    ["chunks", () => t("settings.pathChunks"), () => t("settings.sumPathChunks")],
    ["sentences", () => t("settings.pathSentences"), () => t("settings.pathSentences")],
  ] },
  { field: "hints", label: () => t("settings.hints"), parse: (v) => v as Prefs["hints"], options: [
    ["letters", () => t("settings.hintsLetters"), () => t("settings.sumHintsLetters")],
    ["initial", () => t("settings.hintsInitial"), () => t("settings.sumHintsInitial")],
    ["none", () => t("settings.hintsNone"), () => t("settings.sumHintsNone")],
  ] },
  { field: "rate", label: () => t("settings.rate"), parse: Number, options: [
    ["1", () => t("settings.rateNormal"), () => t("settings.sumRateNormal")],
    ["0.9", () => "0.9×", () => t("settings.sumRate", { rate: "0.9" })],
    ["0.75", () => "0.75×", () => t("settings.sumRate", { rate: "0.75" })],
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
      <div>
        <div class="form-check form-switch">
          <input class="qa-settings-studyFirst form-check-input" type="checkbox" role="switch" id="studyFirst" checked={prefs().studyFirst}
            onChange={(e) => savePrefs({ studyFirst: e.currentTarget.checked })} />
          <label class="form-check-label" for="studyFirst">{t("settings.studyFirst")}</label>
        </div>
        <div class="form-text">{t("settings.studyFirstHint")}</div>
      </div>
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

/** A link to change the language's practice prefs, followed by a one-line recap of the ones that matter at a glance. */
export function LanguagePrefsSummary(props: { lang: Language }) {
  const prefs = () => me()!.prefs[props.lang];
  const shortLabel = (field: Field) => {
    const f = FIELDS.find((f) => f.field === field)!;
    const option = f.options.find(([value]) => value === String(prefs()[field]));
    if (!option?.[2]) throw new Error(`No summary label for ${field} = ${prefs()[field]}`);
    return option[2]();
  };
  const parts = () => [
    { qa: "path", text: shortLabel("path") },
    { qa: "hints", text: shortLabel("hints") },
    ...(prefs().studyFirst ? [{ qa: "studyFirst", text: t("settings.studyFirst") }] : []),
    { qa: "rate", text: shortLabel("rate") },
  ];
  return (
    <div class="d-flex align-items-center gap-2">
      <A href={`/${props.lang}/settings`} class="qa-home-settings btn btn-sm btn-outline-secondary flex-shrink-0">
        <i class="bi bi-sliders me-1" aria-hidden="true" />{t("home.practiceSettings")}
      </A>
      <div class="small">
        <For each={parts()}>
          {(p, i) => (
            <>
              <Show when={i() > 0}><span class="text-body-secondary" aria-hidden="true"> · </span></Show>
              <span class={`qa-prefs-summary-${p.qa}`}>{p.text}</span>
            </>
          )}
        </For>
      </div>
    </div>
  );
}
