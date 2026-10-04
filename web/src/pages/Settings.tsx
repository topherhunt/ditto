import { A, useNavigate } from "@solidjs/router";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { immersible } from "../../../shared/api.ts";
import { LANGUAGES, NATIVE_LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { createSaver, ImmersionTable } from "../components/LanguagePrefs.tsx";
import { RequestLanguagePopup } from "../components/RequestLanguage.tsx";
import { UsernameForm } from "../components/UsernameForm.tsx";
import { languageName, locale, LOCALE_LABELS, t } from "../i18n/index.ts";
import { homeLanguage, LANGUAGE_FLAGS, learnable } from "../learning.ts";
import { me } from "../session.ts";
import { chooseTheme, theme, type Theme } from "../theme.ts";

export function Settings() {
  const { save, Status } = createSaver();
  const navigate = useNavigate();
  const [requesting, setRequesting] = createSignal(false);
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }} data-silent>
      <h1 class="qa-settings-title h4 mb-0">{t("settings.title")}</h1>
      <div class="qa-settings-general d-flex flex-column gap-3">
        <LocalePicker save={save} onRequest={() => setRequesting(true)} />
        <LearningPicker save={save} onRequest={() => setRequesting(true)} />
        <ImmersionPicker save={save} />
        <div>
          <div class="form-check form-switch">
            <input class="qa-settings-profile-public form-check-input" type="checkbox" role="switch" id="profile-public" checked={me()!.profilePublic}
              onChange={(e) => save(() => api.put("/api/profile-visibility", { public: e.currentTarget.checked }))} />
            <label class="form-check-label" for="profile-public">{t("settings.profilePublic")}</label>
          </div>
          <div class="form-text">{t("settings.profilePublicHint")}</div>
        </div>
        <div><A href="/about/home-screen" class="qa-settings-install"><i class="bi bi-phone me-1" aria-hidden="true" />{t("install.title")}</A></div>
        <ThemePicker />
        <UsernameForm initial={me()!.username} submitLabel={t("username.save")} onSaved={() => navigate(`/${homeLanguage(me()!.learning)}`)} />
        <Status />
      </div>
      <RequestLanguagePopup open={requesting()} onClose={() => setRequesting(false)} />
    </div>
  );
}

const LOCALE_FLAGS: Record<Locale, string> = { en: LANGUAGE_FLAGS.en, "es-419": LANGUAGE_FLAGS.es, nl: LANGUAGE_FLAGS.nl, it: LANGUAGE_FLAGS.it, el: LANGUAGE_FLAGS.el };

/** The interface language as a collapsed row showing the current one, expanding to a grid of the others. Picking one saves it and collapses the row. */
function LocalePicker(props: { save: (request: () => Promise<unknown>) => Promise<void>; onRequest: () => void }) {
  const [open, setOpen] = createSignal(false);
  const sorted = () => [...NATIVE_LOCALES].sort((a, b) => LOCALE_LABELS[a].localeCompare(LOCALE_LABELS[b], locale()));
  const choose = (next: Locale) => {
    setOpen(false);
    if (next !== me()!.locale) void props.save(() => api.put("/api/locale", { locale: next }));
  };
  return (
    <div>
      <div id="settings-locale-label" class="form-label mb-0">{t("settings.yourLanguage")}</div>
      <div class="qa-settings-locale border rounded-3 overflow-hidden">
        <button type="button" class="qa-settings-locale-toggle btn border-0 rounded-0 d-flex align-items-center gap-2 w-100 text-start" aria-labelledby="settings-locale-label"
          aria-expanded={open()} onClick={() => setOpen(!open())}>
          <i class={`bi ${open() ? "bi-chevron-down" : "bi-chevron-right"} flex-shrink-0`} aria-hidden="true" />
          <span class="qa-settings-locale-current">{LOCALE_FLAGS[me()!.locale]} {LOCALE_LABELS[me()!.locale]}</span>
        </button>
        <Show when={open()}>
          <div class="option-grid border-top p-2">
            <For each={sorted()}>
              {(l) => (
                <button type="button" class={`qa-settings-locale-${l} btn btn-outline-primary px-2 text-start text-nowrap`} classList={{ active: l === me()!.locale }} onClick={() => choose(l)}>
                  {LOCALE_FLAGS[l]} {LOCALE_LABELS[l]}
                </button>
              )}
            </For>
            <button type="button" class="qa-settings-locale-other btn btn-outline-secondary px-2 text-start" onClick={() => { setOpen(false); props.onRequest(); }}>{t("request.menu")}</button>
          </div>
        </Show>
      </div>
      <div class="form-text">{t("settings.yourLanguageHint")}</div>
    </div>
  );
}

/** Hiding a course only drops it from the nav; its progress stays. The last one can't be hidden. */
function LearningPicker(props: { save: (request: () => Promise<unknown>) => Promise<void>; onRequest: () => void }) {
  const [open, setOpen] = createSignal(false);
  const learning = () => me()!.learning;
  const byName = (ls: Language[]) => ls.sort((a, b) => languageName(a).localeCompare(languageName(b), locale()));
  // Courses already studied stay listed even when the interface language has no translations for them.
  const offered = () => byName(LANGUAGES.filter((l) => learning().includes(l) || learnable(me()!.locale).includes(l)));
  const toggle = (l: Language, on: boolean) => {
    const languages = on ? [...learning(), l] : learning().filter((x) => x !== l);
    void props.save(() => api.put("/api/learning", { languages }));
  };
  return (
    <div>
      <div id="settings-learning-label" class="form-label mb-0">{t("settings.learning")}</div>
      <div class="qa-settings-learning border rounded-3 overflow-hidden">
        <button type="button" class="qa-settings-learning-toggle btn border-0 rounded-0 d-flex align-items-center gap-2 w-100 text-start" aria-labelledby="settings-learning-label"
          aria-expanded={open()} onClick={() => setOpen(!open())}>
          <i class={`bi ${open() ? "bi-chevron-down" : "bi-chevron-right"} flex-shrink-0`} aria-hidden="true" />
          <Show when={!open()}>
            <span class="qa-settings-learning-current">
              <For each={byName([...learning()])}>
                {(l, i) => <><Show when={i() > 0}><span aria-hidden="true">, </span></Show>{LANGUAGE_FLAGS[l]} {languageName(l)}</>}
              </For>
            </span>
          </Show>
        </button>
        <Show when={open()}>
          <div class="option-grid border-top p-2">
            <For each={offered()}>
              {(l) => (
                <>
                  <input class={`qa-settings-learn-${l} btn-check`} type="checkbox" id={`learn-${l}`} autocomplete="off"
                    checked={learning().includes(l)} disabled={learning().length === 1 && learning()[0] === l}
                    onChange={(e) => toggle(l, e.currentTarget.checked)} />
                  <label class="btn btn-outline-primary px-2 text-start text-nowrap" for={`learn-${l}`}>
                    <i class={`bi ${learning().includes(l) ? "bi-check-square-fill" : "bi-square"} me-1`} aria-hidden="true" />{LANGUAGE_FLAGS[l]} {languageName(l)}
                  </label>
                </>
              )}
            </For>
            <button type="button" class="qa-settings-learn-other btn btn-outline-secondary px-2 text-start" onClick={props.onRequest}>{t("request.menu")}</button>
          </div>
        </Show>
      </div>
      <div class="form-text">{t("settings.learningHint")}</div>
    </div>
  );
}

/** Immersion is stored per course, so each studied course that has it gets a row of switches. */
function ImmersionPicker(props: { save: (request: () => Promise<unknown>) => Promise<void> }) {
  const courses = () => me()!.learning.filter(immersible);
  return (
    <Show when={courses().length > 0}>
      <fieldset class="qa-settings-immersion">
        <legend class="fs-6 mb-1">{t("settings.immersion")}</legend>
        <div class="form-text mt-0 mb-2">{t("settings.immersionIntro")}</div>
        <ImmersionTable courses={courses()} save={props.save} />
        <div class="form-text">{t("settings.immerseHint")}</div>
      </fieldset>
    </Show>
  );
}

const THEME_ICONS: Record<Theme, string> = { light: "bi-sun-fill", dark: "bi-moon-fill" };

/** A dropdown rather than a select so the options can show icons. The theme is per device, so it isn't saved to the account. */
function ThemePicker() {
  const [open, setOpen] = createSignal(false);
  let root: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (root && !root.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => document.removeEventListener("click", closeOnOutsideClick));
  const label = (th: Theme) => <><i class={`bi ${THEME_ICONS[th]} me-2`} aria-hidden="true" />{th === "light" ? t("settings.themeLight") : t("settings.themeDark")}</>;
  return (
    <div>
      <div id="settings-theme-label" class="form-label">{t("settings.theme")}</div>
      <div class="dropdown" ref={root}>
        <button type="button" class="qa-settings-theme form-select text-start" aria-labelledby="settings-theme-label" aria-expanded={open()}
          onClick={() => setOpen(!open())}>
          {label(theme())}
        </button>
        <ul class="dropdown-menu w-100" classList={{ show: open() }} data-bs-popper="static">
          <For each={["light", "dark"] as const}>
            {(th) => (
              <li>
                <button type="button" class={`qa-settings-theme-${th} dropdown-item`} classList={{ active: theme() === th }}
                  onClick={() => { chooseTheme(th); setOpen(false); }}>
                  {label(th)}
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
}
