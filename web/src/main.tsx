import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles.css";
import { Navigate, Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Layout, lastLanguage } from "./components/Layout.tsx";
import { t } from "./i18n/index.ts";
import { About } from "./pages/About.tsx";
import { CourseSettings } from "./pages/CourseSettings.tsx";
import { Friends } from "./pages/Friends.tsx";
import { Home } from "./pages/Home.tsx";
import { Leaderboard } from "./pages/Leaderboard.tsx";
import { Notebook } from "./pages/Notebook.tsx";
import { Practice } from "./pages/Practice.tsx";
import { PocRecorder } from "./pages/PocRecorder.tsx";
import { Profile } from "./pages/Profile.tsx";
import { Reports } from "./pages/Reports.tsx";
import { Settings } from "./pages/Settings.tsx";
import { installClickSound } from "./sounds.ts";

installClickSound();

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={() => <Navigate href={`/${lastLanguage()}`} />} />
      <Route path="/about" component={About} />
      <Route path="/friends" component={Friends} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/people/:id" component={Profile} />
      <Route path="/admin/reports" component={Reports} />
      <Route path="/admin/pronunciation" component={PocRecorder} />
      <Route path="/:lang" component={Home} />
      <Route path="/:lang/settings" component={CourseSettings} />
      <Route path="/:lang/lesson/:lessonId" component={() => <Practice mode="learn" />} />
      <Route path="/:lang/test/:level" component={() => <Practice mode="test" />} />
      <Route path="/:lang/review" component={() => <Practice mode="review" />} />
      <Route path="/:lang/mistakes/practice" component={() => <Practice mode="mistakes" />} />
      <Route path="/:lang/notebook" component={Notebook} />
      <Route path="*" component={() => <p class="qa-not-found">{t("app.notFound")}</p>} />
    </Router>
  ),
  document.getElementById("root")!,
);
