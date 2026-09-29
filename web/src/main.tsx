import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles.css";
import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Layout } from "./components/Layout.tsx";
import { t } from "./i18n/index.ts";
import { About } from "./pages/About.tsx";
import { Conversation } from "./pages/Conversation.tsx";
import { CourseSettings } from "./pages/CourseSettings.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Friends } from "./pages/Friends.tsx";
import { Home } from "./pages/Home.tsx";
import { Leaderboard } from "./pages/Leaderboard.tsx";
import { MetricsAdmin } from "./pages/MetricsAdmin.tsx";
import { Notebook } from "./pages/Notebook.tsx";
import { Practice } from "./pages/Practice.tsx";
import { PocRecorder } from "./pages/PocRecorder.tsx";
import { Profile } from "./pages/Profile.tsx";
import { QuizBrowse, QuizDeck, QuizSession, QuizStats } from "./pages/QuizDeck.tsx";
import { QuizHome } from "./pages/QuizHome.tsx";
import { QuizStudy } from "./pages/QuizStudy.tsx";
import { QuizTest } from "./pages/QuizTest.tsx";
import { CapReached } from "./pages/CapReached.tsx";
import { Reports } from "./pages/Reports.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Speak } from "./pages/Speak.tsx";
import { Welcome } from "./pages/Welcome.tsx";
import { SpeakingAdmin } from "./pages/SpeakingAdmin.tsx";
import { UserAdmin, UsersAdmin } from "./pages/UsersAdmin.tsx";
import { installClickSound } from "./sounds.ts";

installClickSound();

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Welcome} />
      <Route path="/about" component={About} />
      <Route path="/cap" component={CapReached} />
      <Route path="/friends" component={Friends} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/people/:id" component={Profile} />
      <Route path="/admin/reports" component={Reports} />
      <Route path="/admin/pronunciation" component={PocRecorder} />
      <Route path="/admin/speaking" component={SpeakingAdmin} />
      <Route path="/admin/metrics" component={MetricsAdmin} />
      <Route path="/admin/users" component={UsersAdmin} />
      <Route path="/admin/users/:id" component={UserAdmin} />
      <Route path="/:lang" component={Dashboard} />
      <Route path="/:lang/type" component={Home} />
      <Route path="/:lang/settings" component={CourseSettings} />
      <Route path="/:lang/lesson/:lessonId" component={() => <Practice mode="learn" />} />
      <Route path="/:lang/test/:level" component={() => <Practice mode="test" />} />
      <Route path="/:lang/review" component={() => <Practice mode="review" />} />
      <Route path="/:lang/mistakes/practice" component={() => <Practice mode="mistakes" />} />
      <Route path="/:lang/notebook" component={Notebook} />
      <Route path="/:lang/talk" component={Speak} />
      <Route path="/:lang/talk/:id" component={Conversation} />
      <Route path="/:lang/quiz" component={QuizHome} />
      <Route path="/:lang/quiz/test/:level" component={QuizTest} />
      <Route path="/:lang/quiz/:deckId" component={QuizDeck} />
      <Route path="/:lang/quiz/:deckId/study/:mode" component={QuizStudy} />
      <Route path="/:lang/quiz/:deckId/browse" component={QuizBrowse} />
      <Route path="/:lang/quiz/:deckId/stats" component={QuizStats} />
      <Route path="/:lang/quiz/:deckId/sessions/:sessionId" component={QuizSession} />
      <Route path="*" component={() => <p class="qa-not-found">{t("app.notFound")}</p>} />
    </Router>
  ),
  document.getElementById("root")!,
);
