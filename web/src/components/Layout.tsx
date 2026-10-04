import { A, useLocation, useNavigate, type RouteSectionProps } from "@solidjs/router";
import { createEffect, createResource, createSignal, ErrorBoundary, Match, on, onCleanup, Show, Switch } from "solid-js";
import { SPEAK_LANGUAGES, type Config } from "../../../shared/api.ts";
import { LANGUAGES, languageLocale, type Language } from "../../../shared/content.ts";
import { api, NetworkError } from "../api.ts";
import { setImmersion, t } from "../i18n/index.ts";
import { homeLanguage, rememberLanguage } from "../learning.ts";
import { trackPage } from "../metrics.ts";
import { About } from "../pages/About.tsx";
import { Privacy } from "../pages/Privacy.tsx";
import { Terms } from "../pages/Terms.tsx";
import { Welcome } from "../pages/Welcome.tsx";
import { logout, me, refetchMe } from "../session.ts";
import { capHits, spend, usdShort } from "../spend.ts";
import { Notifications } from "./Notifications.tsx";
import { LearnPicker } from "./LearnPicker.tsx";
import { Setup } from "./Setup.tsx";
import { Loading } from "./Loading.tsx";
import { routes } from "../routes.ts";

/** Any error under the layout, effects and resources included, lands here instead of blanking the page. */
export function Layout(props: RouteSectionProps) {
  return (
    <ErrorBoundary fallback={(err, reset) => (
      <div class="container py-4">
        <div class="qa-error alert alert-danger">
          <p class="mb-2">{err instanceof NetworkError ? t("app.offline") : t("app.error")}</p>
          <Show when={!(err instanceof NetworkError)}><p class="small mb-2">{String(err)}</p></Show>
          {/* Resources keep their rejection, so a network retry refetches the session before re-rendering. */}
          <button type="button" class="qa-error-retry btn btn-sm btn-danger" onClick={() => {
            if (err instanceof NetworkError) {
              refetchMe();
              reset();
            } else {
              window.location.reload();
            }
          }}>{err instanceof NetworkError ? t("app.retry") : t("app.reload")}</button>
        </div>
      </div>
    )}>
      <LayoutBody {...props} />
    </ErrorBoundary>
  );
}

function LayoutBody(props: RouteSectionProps) {
  const location = useLocation();
  const lang = () => {
    const seg = location.pathname.split("/")[1];
    return (LANGUAGES as readonly string[]).includes(seg) ? seg as Language : null;
  };
  /** The language the nav points at: the current route's, else the learner's home course. Only read once they study one. */
  const navLang = () => lang() ?? homeLanguage(me()!.learning);
  // Every page follows the current course's immersion. Signed out or still loading, the device's last value stays.
  createEffect(() => {
    const user = me();
    if (!user) return;
    const l = user.learning.length ? navLang() : null;
    setImmersion(l && user.prefs[l].immerseUi ? languageLocale(l) : null);
  });
  const navigate = useNavigate();
  createEffect(on(capHits, () => navigate(routes.cap()), { defer: true }));
  createEffect(() => { if (me()) trackPage(location.pathname); });
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [config] = createResource(() => api.get<Config>("/api/config"));
  let menuRoot: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (menuRoot && !menuRoot.contains(e.target as Node)) setMenuOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => document.removeEventListener("click", closeOnOutsideClick));
  return (
    <>
      <Switch>
        <Match when={me.loading && me() === undefined}><div class="container"><Loading /></div></Match>
        {/* Signed out, every path but these shows the homepage. Google's OAuth review needs /privacy and /terms public. */}
        <Match when={me() === null}>
          <div class="container py-4" style={{ "max-width": "52rem" }}>
            <Switch fallback={<Welcome />}>
              <Match when={location.pathname === routes.about()}><About /></Match>
              <Match when={location.pathname === routes.privacy()}><Privacy /></Match>
              <Match when={location.pathname === routes.terms()}><Terms /></Match>
            </Switch>
          </div>
        </Match>
        {/* A new account has no username yet, and the leaderboard and profiles need one. */}
        <Match when={me() && me()!.username === null}><Setup /></Match>
        {/* Only a learner who skipped the homepage's question gets here: a new account without a pick, or one from before the question. */}
        <Match when={me() && me()!.learning.length === 0}>
          <div class="qa-choose-learning container py-5" style={{ "max-width": "28rem" }}>
            <h1 class="h4 mb-3">{t("welcome.learnQ")}</h1>
            <LearnPicker locale={me()!.locale} chosen={null} onChoose={async (l) => {
              await api.put("/api/learning", { languages: [l] });
              rememberLanguage(l);
              await refetchMe();
              if (location.pathname === "/") navigate(routes.dashboard({ lang: l }));
            }} />
          </div>
        </Match>
        <Match when={me()}>
          {(user) => (
            <>
              <nav class="navbar navbar-expand bg-body border-bottom" data-silent>
                <div class="nav-inner container gap-2 flex-wrap" style={{ "max-width": "52rem" }}>
                  <A class="qa-nav-home navbar-brand" href={routes.dashboard({ lang: navLang() })}><img class="logo-icon me-2" src="/favicon.svg" alt="" />Ditto</A>
                  <ul class="navbar-nav">
                    <li class="nav-item"><A class="qa-nav-type nav-link" href={routes.type({ lang: navLang() })}><i class="bi bi-keyboard me-1" aria-hidden="true" />{t("nav.type")}</A></li>
                    <Show when={config()?.speak && (SPEAK_LANGUAGES as readonly string[]).includes(navLang())}>
                      <li class="nav-item"><A class="qa-nav-speak nav-link" href={routes.talk({ lang: navLang() })}><i class="bi bi-mic me-1" aria-hidden="true" />{t("nav.speak")}</A></li>
                    </Show>
                    <Show when={config()?.quiz.includes(navLang())}>
                      <li class="nav-item"><A class="qa-nav-quiz nav-link" href={routes.quiz({ lang: navLang() })}><i class="bi bi-patch-question me-1" aria-hidden="true" />{t("nav.quiz")}</A></li>
                    </Show>
                  </ul>
                  <div class="ms-auto d-flex align-items-center gap-2">
                    {/* Tiny screens get the bell on the dashboard's first row (in place of the settings button) instead. */}
                    <div class="xs-hide"><Notifications /></div>
                    <div class="dropdown" ref={menuRoot}>
                      <button type="button" class="qa-user btn btn-sm btn-outline-info dropdown-toggle" aria-expanded={menuOpen()}
                        onClick={() => setMenuOpen(!menuOpen())}>
                        <i class="bi bi-person" aria-hidden="true" /><span class="nav-username ms-1">{user().username}</span>
                      </button>
                      {/* data-bs-popper="static" makes Bootstrap's CSS position the menu without its JS. */}
                      <ul class="dropdown-menu dropdown-menu-end" classList={{ show: menuOpen() }} data-bs-popper="static">
                        <li><A href={routes.person({ id: "me" })} class="qa-nav-profile dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-person-circle me-2" aria-hidden="true" />{t("nav.profile")}</A></li>
                        <li><A href={routes.friends()} class="qa-nav-friends dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-people-fill me-2" aria-hidden="true" />{t("nav.friends")}</A></li>
                        <li><A href={routes.leaderboard()} class="qa-nav-leaderboard dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-trophy me-2" aria-hidden="true" />{t("nav.leaderboard")}</A></li>
                        <li><A href={routes.settings()} class="qa-nav-settings dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-gear me-2" aria-hidden="true" />{t("nav.settings")}</A></li>
                        <li><A href={routes.about()} class="qa-nav-about dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-question-circle me-2" aria-hidden="true" />{t("nav.about")}</A></li>
                        {/* Admin-only, so not translated. */}
                        {user().admin && <li><A href={routes.admin()} class="qa-nav-admin dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-shield-lock me-2" aria-hidden="true" />Admin</A></li>}
                        <li><hr class="dropdown-divider" /></li>
                        <li><button type="button" class="qa-logout dropdown-item text-danger" onClick={logout}><i class="bi bi-power me-2" aria-hidden="true" />{t("nav.signOut")}</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </nav>
              <main class="container py-4" style={{ "max-width": "52rem" }}>
                {props.children}
              </main>
            </>
          )}
        </Match>
      </Switch>
      <footer class="container py-3 small text-body-secondary d-flex flex-wrap justify-content-between gap-2" style={{ "max-width": "52rem" }}>
        <span>
          <A class="qa-footer-home link-secondary" href={routes.welcome()}>{t("footer.home")}</A><span class="mx-2" aria-hidden="true">•</span>
          <A class="qa-footer-about link-secondary" href={routes.about()}>{t("nav.about")}</A><span class="mx-2" aria-hidden="true">•</span>
          <A class="qa-footer-privacy link-secondary" href={routes.privacy()}>{t("footer.privacy")}</A><span class="mx-2" aria-hidden="true">•</span>
          <A class="qa-footer-terms link-secondary" href={routes.terms()}>{t("footer.terms")}</A>
          <Show when={me()}>
            <span class="mx-2" aria-hidden="true">•</span>
            <A class="qa-feedback-link link-secondary text-nowrap" href={routes.feedback({ from: location.pathname })}>
              <i class="bi bi-bug-fill me-1" aria-hidden="true" />{t("footer.feedback")}
            </A>
          </Show>
        </span>
        <Show when={me() && spend()}>
          {(s) => <span class="qa-spend-today">{t("footer.spend", { today: usdShort(s().today), cap: usdShort(s().cap) })}</span>}
        </Show>
      </footer>
    </>
  );
}
