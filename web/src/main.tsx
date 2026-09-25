import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import { Navigate, Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { LANGUAGES } from "../../shared/content.ts";
import { LAST_LANG_KEY, Layout } from "./components/Layout.tsx";
import { t } from "./i18n/index.ts";
import { Friends } from "./pages/Friends.tsx";
import { Home } from "./pages/Home.tsx";
import { Notebook } from "./pages/Notebook.tsx";
import { Practice } from "./pages/Practice.tsx";
import { Profile } from "./pages/Profile.tsx";
import { Settings } from "./pages/Settings.tsx";

function lastLanguage(): string {
  try {
    const l = localStorage.getItem(LAST_LANG_KEY);
    if (l && (LANGUAGES as readonly string[]).includes(l)) return l;
  } catch { /* storage unavailable: use the default */ }
  return "it";
}

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={() => <Navigate href={`/${lastLanguage()}`} />} />
      <Route path="/friends" component={Friends} />
      <Route path="/people/:id" component={Profile} />
      <Route path="/:lang" component={Home} />
      <Route path="/:lang/lesson/:lessonId" component={() => <Practice mode="learn" />} />
      <Route path="/:lang/review" component={() => <Practice mode="review" />} />
      <Route path="/:lang/mistakes/practice" component={() => <Practice mode="mistakes" />} />
      <Route path="/:lang/notebook" component={Notebook} />
      <Route path="/:lang/settings" component={Settings} />
      <Route path="*" component={() => <p class="qa-not-found">{t("app.notFound")}</p>} />
    </Router>
  ),
  document.getElementById("root")!,
);
