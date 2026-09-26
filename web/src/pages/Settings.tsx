import { createSignal, For, onCleanup } from "solid-js";
import { LOCALES, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { createSaver } from "../components/LanguagePrefs.tsx";
import { UsernameForm } from "../components/UsernameForm.tsx";
import { LOCALE_LABELS, t } from "../i18n/index.ts";
import { me } from "../session.ts";
import { chooseTheme, theme, type Theme } from "../theme.ts";

export function Settings() {
  const { save, markSaved, Status } = createSaver();
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }} data-silent>
      <h1 class="qa-settings-title h4 mb-0">{t("settings.title")}</h1>
      <div class="qa-settings-general d-flex flex-column gap-3">
        <label class="form-label mb-0">
          {t("settings.interface")}
          <select class="qa-settings-locale form-select" value={me()!.locale}
            onChange={(e) => save(() => api.put("/api/locale", { locale: e.currentTarget.value as Locale }))}>
            <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
          </select>
        </label>
        <ThemePicker />
        <UsernameForm initial={me()!.username} submitLabel={t("username.save")} onSaved={markSaved} />
        <Status />
      </div>
    </div>
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
