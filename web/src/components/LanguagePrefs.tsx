import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { immersible, type Prefs } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { languageInSentence, languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";
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

const putPrefs = (lang: Language, patch: Partial<Prefs>) => api.put("/api/prefs", { language: lang, prefs: { ...me()!.prefs[lang], ...patch } });

/** One language's typing prefs as a form, saved on change. */
function PracticePrefs(props: { lang: Language }) {
  const { save, Status } = createSaver();
  const prefs = () => me()!.prefs[props.lang];
  const savePrefs = (patch: Partial<Prefs>) => save(() => putPrefs(props.lang, patch));
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
      <Status />
    </div>
  );
}

/** One row per course with its two immersion switches: the app in the course's language, and the AI's help in it. They affect the whole app, so they live in account settings. */
export function ImmersionTable(props: { courses: Language[]; save: (request: () => Promise<unknown>) => Promise<void> }) {
  return (
    <table class="w-auto align-middle mb-1">
      <thead>
        <tr class="small text-body-secondary">
          <th class="fw-normal pe-4" />
          <For each={IMMERSION}>{(f) => <th class="fw-normal text-center px-2">{t(f.column)}</th>}</For>
        </tr>
      </thead>
      <tbody>
        <For each={props.courses}>
          {(lang) => (
            <tr>
              <td class="py-1 pe-4">{LANGUAGE_FLAGS[lang]} {languageName(lang)}</td>
              <For each={IMMERSION}>
                {(f) => (
                  <td class="py-1 px-2">
                    <div class="form-check form-switch d-flex justify-content-center ps-0 mb-0">
                      <input class={`qa-settings-${f.field} qa-settings-${f.field}-${lang} form-check-input m-0`} type="checkbox" role="switch"
                        aria-label={t(f.label, { language: languageInSentence(lang) })} checked={me()!.prefs[lang][f.field]}
                        onChange={(e) => void props.save(() => putPrefs(lang, { [f.field]: e.currentTarget.checked }))} />
                    </div>
                  </td>
                )}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

const IMMERSION = [
  { field: "immerseUi", label: "settings.immerseUi", column: "settings.immerseUiCol" },
  { field: "immerseHelp", label: "settings.immerseHelp", column: "settings.immerseHelpCol" },
] as const;

/** The typing prefs behind a collapsed header that recaps them on one line; click the header to edit them. */
export function PracticeSettingsPanel(props: { lang: Language }) {
  const [open, setOpen] = createSignal(false);
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
    <div class="qa-prefs-panel border rounded-3 overflow-hidden">
      <button type="button" class="qa-prefs-toggle btn border-0 rounded-0 d-flex align-items-center gap-2 w-100 text-start" aria-expanded={open()}
        onClick={() => setOpen(!open())}>
        <i class={`bi ${open() ? "bi-chevron-down" : "bi-chevron-right"} flex-shrink-0`} aria-hidden="true" />
        <span class="flex-shrink-0">{t("home.practiceSettings")}</span>
        <Show when={!open()}>
          <span class="qa-prefs-summary small text-body-secondary text-truncate">
            <For each={parts()}>
              {(p, i) => (
                <>
                  <Show when={i() > 0}><span aria-hidden="true"> · </span></Show>
                  <span class={`qa-prefs-summary-${p.qa}`}>{p.text}</span>
                </>
              )}
            </For>
          </span>
        </Show>
      </button>
      <Show when={open()}>
        <div class="qa-prefs-form border-top p-3"><div style={{ "max-width": "28rem" }}><PracticePrefs lang={props.lang} /></div></div>
      </Show>
    </div>
  );
}
