import { A, useLocation, type RouteSectionProps } from "@solidjs/router";
import { createSignal, ErrorBoundary, For, Match, onCleanup, Switch } from "solid-js";
import { LANGUAGES } from "../../../shared/content.ts";
import { t } from "../i18n/index.ts";
import { logout, me } from "../session.ts";
import { theme, toggleTheme } from "../theme.ts";
import { Login } from "./Login.tsx";
import { Notifications } from "./Notifications.tsx";
import { UsernameForm } from "./UsernameForm.tsx";

export const LAST_LANG_KEY = "lastLanguage";

export function Layout(props: RouteSectionProps) {
  const location = useLocation();
  const lang = () => {
    const seg = location.pathname.split("/")[1];
    return (LANGUAGES as readonly string[]).includes(seg) ? seg : null;
  };
  const [menuOpen, setMenuOpen] = createSignal(false);
  let menuRoot: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (menuRoot && !menuRoot.contains(e.target as Node)) setMenuOpen(false);
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
            <UsernameForm initial={null} submitLabel={t("username.continue")} />
            <button type="button" class="qa-logout btn btn-link btn-sm px-0 mt-3" onClick={logout}>{t("nav.signOut")}</button>
          </div>
        </Match>
        <Match when={me()}>
          {(user) => (
            <>
              <nav class="navbar navbar-expand bg-body border-bottom">
                <div class="container gap-2 flex-wrap">
                  <A class="navbar-brand" href={`/${lang() ?? ""}`}>Ditto</A>
                  <div class="btn-group btn-group-sm" role="group">
                    <For each={LANGUAGES}>
                      {(l) => (
                        <A href={`/${l}`} class={`qa-lang-${l} btn btn-outline-primary text-uppercase`} classList={{ active: lang() === l }}
                          onClick={() => { try { localStorage.setItem(LAST_LANG_KEY, l); } catch { /* storage unavailable */ } }}>
                          {l}
                        </A>
                      )}
                    </For>
                  </div>
                  {lang() && (
                    <ul class="navbar-nav">
                      <li class="nav-item"><A class="qa-nav-learn nav-link" href={`/${lang()}`} end>{t("nav.learn")}</A></li>
                      <li class="nav-item"><A class="qa-nav-review nav-link" href={`/${lang()}/review`}>{t("nav.review")}</A></li>
                      <li class="nav-item"><A class="qa-nav-notebook nav-link" href={`/${lang()}/notebook`}>{t("nav.notebook")}</A></li>
                    </ul>
                  )}
                  <div class="ms-auto d-flex align-items-center gap-2">
                    <button type="button" class="qa-theme-toggle btn btn-sm btn-outline-info" onClick={toggleTheme}
                      aria-label={theme() === "dark" ? t("nav.themeLight") : t("nav.themeDark")}>
                      {theme() === "dark" ? "☀" : "☾"}
                    </button>
                    <Notifications />
                    <div class="dropdown" ref={menuRoot}>
                      <button type="button" class="qa-user btn btn-sm btn-outline-info dropdown-toggle" aria-expanded={menuOpen()}
                        onClick={() => setMenuOpen(!menuOpen())}>
                        {user().username}
                      </button>
                      {/* data-bs-popper="static" makes Bootstrap's CSS position the menu without its JS. */}
                      <ul class="dropdown-menu dropdown-menu-end" classList={{ show: menuOpen() }} data-bs-popper="static">
                        <li><A href="/people/me" class="qa-nav-profile dropdown-item" onClick={() => setMenuOpen(false)}>{t("nav.profile")}</A></li>
                        <li><A href="/friends" class="qa-nav-friends dropdown-item" onClick={() => setMenuOpen(false)}>{t("nav.friends")}</A></li>
                        <li><A href="/leaderboard" class="qa-nav-leaderboard dropdown-item" onClick={() => setMenuOpen(false)}>{t("nav.leaderboard")}</A></li>
                        <li><A href="/settings" class="qa-nav-settings dropdown-item" onClick={() => setMenuOpen(false)}>{t("nav.settings")}</A></li>
                        <li><A href="/about" class="qa-nav-about dropdown-item" onClick={() => setMenuOpen(false)}>{t("nav.about")}</A></li>
                        <li><hr class="dropdown-divider" /></li>
                        <li><button type="button" class="qa-logout dropdown-item" onClick={logout}>{t("nav.signOut")}</button></li>
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
