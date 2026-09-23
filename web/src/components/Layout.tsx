import { A, useLocation, type RouteSectionProps } from "@solidjs/router";
import { createSignal, ErrorBoundary, For, Match, onCleanup, Switch } from "solid-js";
import { LANGUAGES } from "../../../shared/content.ts";
import { logout, me } from "../session.ts";
import { theme, toggleTheme } from "../theme.ts";
import { Login } from "./Login.tsx";

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
        <Match when={me.loading && me() === undefined}><div class="container py-5 text-body-secondary">Loading…</div></Match>
        <Match when={me() === null}><Login /></Match>
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
                      <li class="nav-item"><A class="qa-nav-learn nav-link" href={`/${lang()}`} end>Learn</A></li>
                      <li class="nav-item"><A class="qa-nav-review nav-link" href={`/${lang()}/review`}>Review</A></li>
                      <li class="nav-item"><A class="qa-nav-notebook nav-link" href={`/${lang()}/notebook`}>Notebook</A></li>
                      <li class="nav-item"><A class="qa-nav-settings nav-link" href={`/${lang()}/settings`}>Settings</A></li>
                    </ul>
                  )}
                  <div class="ms-auto d-flex align-items-center gap-2">
                    <button type="button" class="qa-theme-toggle btn btn-sm btn-outline-secondary" onClick={toggleTheme}
                      aria-label={theme() === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                      {theme() === "dark" ? "☀" : "☾"}
                    </button>
                    <div class="dropdown" ref={menuRoot}>
                      <button type="button" class="qa-user btn btn-sm btn-outline-secondary dropdown-toggle" aria-expanded={menuOpen()}
                        onClick={() => setMenuOpen(!menuOpen())}>
                        {user().email}
                      </button>
                      {/* data-bs-popper="static" makes Bootstrap's CSS position the menu without its JS. */}
                      <ul class="dropdown-menu dropdown-menu-end" classList={{ show: menuOpen() }} data-bs-popper="static">
                        <li><button type="button" class="qa-logout dropdown-item" onClick={logout}>Sign out</button></li>
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
