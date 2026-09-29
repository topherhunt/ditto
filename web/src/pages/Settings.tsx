import { createSignal, For, onCleanup } from "solid-js";
import { LANGUAGES, LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { createSaver } from "../components/LanguagePrefs.tsx";
import { UsernameForm } from "../components/UsernameForm.tsx";
import { languageName, LOCALE_LABELS, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS, learnable } from "../learning.ts";
import { me } from "../session.ts";
import { chooseTheme, theme, type Theme } from "../theme.ts";

export function Settings() {
  const { save, markSaved, Status } = createSaver();
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }} data-silent>
      <h1 class="qa-settings-title h4 mb-0">{t("settings.title")}</h1>
      <div class="qa-settings-general d-flex flex-column gap-3">
        <label class="form-label mb-0">
          {t("settings.yourLanguage")}
          <select class="qa-settings-locale form-select" value={me()!.locale}
            onChange={(e) => save(() => api.put("/api/locale", { locale: e.currentTarget.value as Locale }))}>
            <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
          </select>
          <div class="form-text">{t("settings.yourLanguageHint")}</div>
        </label>
        <LearningPicker save={save} />
        <ThemePicker />
        <UsernameForm initial={me()!.username} submitLabel={t("username.save")} onSaved={markSaved} />
        <div>
          <div class="form-check form-switch">
            <input class="qa-settings-profile-public form-check-input" type="checkbox" role="switch" id="profile-public" checked={me()!.profilePublic}
              onChange={(e) => save(() => api.put("/api/profile-visibility", { public: e.currentTarget.checked }))} />
            <label class="form-check-label" for="profile-public">{t("settings.profilePublic")}</label>
          </div>
          <div class="form-text">{t("settings.profilePublicHint")}</div>
        </div>
        <Status />
      </div>
    </div>
  );
}

/** Hiding a course only drops it from the nav; its progress stays. The last one can't be hidden. */
function LearningPicker(props: { save: (request: () => Promise<unknown>) => Promise<void> }) {
  const learning = () => me()!.learning;
  // Courses already studied stay listed even when the interface language has no translations for them.
  const offered = () => LANGUAGES.filter((l) => learning().includes(l) || learnable(me()!.locale).includes(l));
  const toggle = (l: Language, on: boolean) => {
    const languages = on ? [...learning(), l] : learning().filter((x) => x !== l);
    void props.save(() => api.put("/api/learning", { languages }));
  };
  return (
    <fieldset>
      <legend class="fs-6 mb-1">{t("settings.learning")}</legend>
      <For each={offered()}>
        {(l) => (
          <div class="form-check form-switch">
            <input class={`qa-settings-learn-${l} form-check-input`} type="checkbox" role="switch" id={`learn-${l}`}
              checked={learning().includes(l)} disabled={learning().length === 1 && learning()[0] === l}
              onChange={(e) => toggle(l, e.currentTarget.checked)} />
            <label class="form-check-label" for={`learn-${l}`}>{LANGUAGE_FLAGS[l]} {languageName(l)}</label>
          </div>
        )}
      </For>
      <div class="form-text">{t("settings.learningHint")}</div>
    </fieldset>
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
