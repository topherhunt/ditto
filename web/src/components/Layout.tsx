import { A, useLocation, useNavigate, type RouteSectionProps } from "@solidjs/router";
import { createEffect, createResource, createSignal, ErrorBoundary, Match, on, onCleanup, Show, Switch } from "solid-js";
import { immersible, SPEAK_LANGUAGES, type Config } from "../../../shared/api.ts";
import { LANGUAGES, type Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { setImmersion, t } from "../i18n/index.ts";
import { homeLanguage, rememberLanguage } from "../learning.ts";
import { FEEDBACK_URL } from "../links.ts";
import { trackPage } from "../metrics.ts";
import { Welcome } from "../pages/Welcome.tsx";
import { logout, me, refetchMe } from "../session.ts";
import { capHits, spend, usdShort } from "../spend.ts";
import { Notifications } from "./Notifications.tsx";
import { LearnPicker } from "./LearnPicker.tsx";
import { Setup } from "./Setup.tsx";

export function Layout(props: RouteSectionProps) {
  const location = useLocation();
  const lang = () => {
    const seg = location.pathname.split("/")[1];
    return (LANGUAGES as readonly string[]).includes(seg) ? seg as Language : null;
  };
  /** The language the nav points at: the current route's, else the learner's home course. Only read once they study one. */
  const navLang = () => lang() ?? homeLanguage(me()!.learning);
  // A course's settings page stays in the learner's own language, so the switch that turns immersion off is always readable.
  createEffect(() => {
    const l = lang();
    const user = me();
    setImmersion(user && l && immersible(l) && user.prefs[l].immerseUi && location.pathname !== `/${l}/settings` ? l : null);
  });
  const navigate = useNavigate();
  createEffect(on(capHits, () => navigate("/cap"), { defer: true }));
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
    <ErrorBoundary fallback={(err) => <div class="container py-4"><div class="alert alert-danger">{String(err)}</div></div>}>
      <Switch>
        <Match when={me.loading && me() === undefined}><div class="container py-5 text-body-secondary">{t("app.loading")}</div></Match>
        <Match when={me() === null}><div class="container py-4" style={{ "max-width": "52rem" }}><Welcome /></div></Match>
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
              if (location.pathname === "/") navigate(`/${l}`);
            }} />
          </div>
        </Match>
        <Match when={me()}>
          {(user) => (
            <>
              <nav class="navbar navbar-expand bg-body border-bottom" data-silent>
                <div class="container gap-2 flex-wrap">
                  <A class="qa-nav-home navbar-brand" href={`/${navLang()}`}><i class="bi bi-chat-heart me-2" aria-hidden="true" />Ditto</A>
                  <ul class="navbar-nav">
                    <li class="nav-item"><A class="qa-nav-type nav-link" href={`/${navLang()}/type`}><i class="bi bi-keyboard me-1" aria-hidden="true" />{t("nav.type")}</A></li>
                    <Show when={config()?.speak && (SPEAK_LANGUAGES as readonly string[]).includes(navLang())}>
                      <li class="nav-item"><A class="qa-nav-speak nav-link" href={`/${navLang()}/talk`}><i class="bi bi-mic me-1" aria-hidden="true" />{t("nav.speak")}</A></li>
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
                        {user().admin && <li><A href="/admin/users" class="qa-nav-users dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-people me-2" aria-hidden="true" />Users</A></li>}
                        {user().admin && <li><A href="/admin/metrics" class="qa-nav-metrics dropdown-item" onClick={() => setMenuOpen(false)}><i class="bi bi-graph-up me-2" aria-hidden="true" />Metrics</A></li>}
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
              <main class="container py-4" style={{ "max-width": "52rem" }}>
                {props.children}
              </main>
            </>
          )}
        </Match>
      </Switch>
      <footer class="container py-3 small text-body-secondary d-flex flex-wrap justify-content-between gap-2" style={{ "max-width": "52rem" }}>
        <a class="qa-feedback-link link-secondary" href={FEEDBACK_URL} target="_blank" rel="noopener">
          <i class="bi bi-chat-left-text me-1" aria-hidden="true" />{t("footer.feedback")}
        </a>
        <Show when={me()}><A class="qa-footer-home link-secondary" href="/">{t("footer.home")}</A></Show>
        <Show when={me() && spend()}>
          {(s) => <span class="qa-spend-today">{t("footer.spend", { today: usdShort(s().today), cap: usdShort(s().cap) })}</span>}
        </Show>
      </footer>
    </ErrorBoundary>
  );
}
