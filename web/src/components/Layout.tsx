import { A, useLocation, type RouteSectionProps } from "@solidjs/router";
import { createResource, createSignal, ErrorBoundary, For, Match, onCleanup, Show, Switch } from "solid-js";
import { SPEAK_LANGUAGES, type Config } from "../../../shared/api.ts";
import { LANGUAGES, LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { languageName, LOCALE_LABELS, t } from "../i18n/index.ts";
import { logout, me, refetchMe } from "../session.ts";
import { Login } from "./Login.tsx";
import { Notifications } from "./Notifications.tsx";
import { UsernameForm } from "./UsernameForm.tsx";

const LAST_LANG_KEY = "lastLanguage";

const LANGUAGE_FLAGS: Record<Language, string> = { en: "🇺🇸", it: "🇮🇹", nl: "🇳🇱", ga: "🇮🇪" };

export function lastLanguage(): Language {
  try {
    const l = localStorage.getItem(LAST_LANG_KEY);
    if (l && (LANGUAGES as readonly string[]).includes(l)) return l as Language;
  } catch { /* storage unavailable: use the default */ }
  return "it";
}

export function Layout(props: RouteSectionProps) {
  const location = useLocation();
  const lang = () => {
    const seg = location.pathname.split("/")[1];
    return (LANGUAGES as readonly string[]).includes(seg) ? seg as Language : null;
  };
  /** The language the nav points at: the current route's, else the last one picked. */
  const navLang = () => lang() ?? lastLanguage();
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [langMenuOpen, setLangMenuOpen] = createSignal(false);
  let menuRoot: HTMLDivElement | undefined;
  let langMenuRoot: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (menuRoot && !menuRoot.contains(e.target as Node)) setMenuOpen(false);
    if (langMenuRoot && !langMenuRoot.contains(e.target as Node)) setLangMenuOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => document.removeEventListener("click", closeOnOutsideClick));
  return (
    <ErrorBoundary fallback={(err) => <div class="container py-4"><div class="alert alert-danger">{String(err)}</div></div>}>
      <Switch>
        <Match when={me.loading && me() === undefined}><div class="container py-5 text-body-secondary">{t("app.loading")}</div></Match>
        <Match when={me() === null}><Login /></Match>
        {/* A new account has no username yet, and the leaderboard and profiles need one. */}
        <Match when={me() && me()!.username === null}>
          <div class="qa-choose-username container py-5" style={{ "max-width": "28rem" }}>
            <h1 class="h4">{t("username.title")}</h1>
            <p class="text-body-secondary">{t("username.intro")}</p>
            <LocalePicker />
            <UsernameForm initial={null} submitLabel={t("username.continue")} />
            <button type="button" class="qa-logout btn btn-link btn-sm px-0 mt-3" onClick={logout}>{t("nav.signOut")}</button>
          </div>
        </Match>
        <Match when={me()}>
          {(user) => (
            <>
              <nav class="navbar navbar-expand bg-body border-bottom" data-silent>
                <div class="container gap-2 flex-wrap">
                  <A class="navbar-brand" href={`/${navLang()}`}><i class="bi bi-chat-heart me-2" aria-hidden="true" />Ditto</A>
                  <div class="dropdown" ref={langMenuRoot}>
                    <button type="button" class="qa-lang-picker btn btn-sm btn-outline-primary dropdown-toggle" aria-expanded={langMenuOpen()}
                      aria-label={languageName(navLang())} onClick={() => setLangMenuOpen(!langMenuOpen())}>
                      {LANGUAGE_FLAGS[navLang()]} <span class="text-uppercase">{navLang()}</span>
                    </button>
                    <ul class="dropdown-menu" classList={{ show: langMenuOpen() }} data-bs-popper="static">
                      <For each={LANGUAGES}>
                        {(l) => (
                          <li>
                            <A href={`/${l}`} class={`qa-lang-${l} dropdown-item`} classList={{ active: navLang() === l }} end
                              onClick={() => {
                                try { localStorage.setItem(LAST_LANG_KEY, l); } catch { /* storage unavailable */ }
                                setLangMenuOpen(false);
                              }}>
                              {LANGUAGE_FLAGS[l]} {languageName(l)}
                            </A>
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>
                  <ul class="navbar-nav">
                    <li class="nav-item"><A class="qa-nav-type nav-link" href={`/${navLang()}`}><i class="bi bi-keyboard me-1" aria-hidden="true" />{t("nav.type")}</A></li>
                    <Show when={config()?.speak && (SPEAK_LANGUAGES as readonly string[]).includes(navLang())}>
                      <li class="nav-item"><A class="qa-nav-speak nav-link" href={`/${navLang()}/speak`}><i class="bi bi-mic me-1" aria-hidden="true" />{t("nav.speak")}</A></li>
                    </Show>
                    <Show when={config()?.quiz.includes(navLang())}>
                      <li class="nav-item"><A class="qa-nav-quiz nav-link" href={`/${navLang()}/quiz`}><i class="bi bi-patch-question me-1" aria-hidden="true" />{t("nav.quiz")}</A></li>
                    </Show>
                  </ul>
                  <div class="ms-auto d-flex align-items-center gap-2">
                    <Notifications />
                    <div class="dropdown" ref={menuRoot}>
                      <button type="button" class="qa-user btn btn-sm btn-outline-info dropdown-toggle" aria-expanded={menuOpen()}
                        onClick={() => setMenuOpen(!menuOpen())}>
                        <i class="bi bi-person me-1" aria-hidden="true" />{user().username}
                      </button>
                      {/* data-bs-popper="static" makes Bootstrap's CSS position the menu without its JS. */}
                      <ul class="dropdown-menu dropdown-menu-end" classList={{ show: menuOpen() }} data-bs-popper="static">
                        <li><A href="/people/me" class="qa-nav-profile dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-person-circle me-2" aria-hidden="true" />{t("nav.profile")}</A></li>
                        <li><A href="/friends" class="qa-nav-friends dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-people-fill me-2" aria-hidden="true" />{t("nav.friends")}</A></li>
                        <li><A href="/leaderboard" class="qa-nav-leaderboard dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-trophy me-2" aria-hidden="true" />{t("nav.leaderboard")}</A></li>
                        <li><A href="/settings" class="qa-nav-settings dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-gear me-2" aria-hidden="true" />{t("nav.settings")}</A></li>
                        <li><A href="/about" class="qa-nav-about dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-question-circle me-2" aria-hidden="true" />{t("nav.about")}</A></li>
                        {/* Admin-only, so not translated. */}
                        {user().admin && <li><A href="/admin/reports" class="qa-nav-reports dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-bug me-2" aria-hidden="true" />Reports</A></li>}
                        {user().admin && config()?.poc && <li><A href="/admin/pronunciation" class="qa-nav-poc dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-mic me-2" aria-hidden="true" />Pronunciation POC</A></li>}
                        {user().admin && <li><A href="/admin/speaking" class="qa-nav-speaking dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-chat-dots me-2" aria-hidden="true" />Speaking</A></li>}
                        <li><hr class="dropdown-divider" /></li>
                        <li><button type="button" class="qa-logout dropdown-item text-danger" onClick={logout}><i class="bi bi-power me-2" aria-hidden="true" />{t("nav.signOut")}</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </nav>
              <main class="container py-4" style={{ "max-width": "52rem" }}>{props.children}</main>
            </>
          )}
        </Match>
      </Switch>
    </ErrorBoundary>
  );
}

/** Saves on change, so the rest of the new-account screen switches language right away. */
function LocalePicker() {
  const [error, setError] = createSignal<string | null>(null);
  const choose = async (locale: Locale) => {
    setError(null);
    try {
      await api.put("/api/locale", { locale });
      await refetchMe();
    } catch (e) {
      setError(t("settings.saveFailed", { error: (e as Error).message }));
    }
  };
  return (
    <label class="form-label mb-3 d-block">
      {t("settings.interface")}
      <select class="qa-choose-locale form-select" value={me()!.locale} onChange={(e) => choose(e.currentTarget.value as Locale)}>
        <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
      </select>
      <Show when={error()}>{(m) => <div class="qa-choose-locale-error text-danger small">{m()}</div>}</Show>
    </label>
  );
}
