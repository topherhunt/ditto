import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles.css";
import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Layout } from "./components/Layout.tsx";
import { t } from "./i18n/index.ts";
import { Admin } from "./pages/Admin.tsx";
import { About } from "./pages/About.tsx";
import { AddToHome } from "./pages/AddToHome.tsx";
import { Conversation } from "./pages/Conversation.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { FriendBoard } from "./pages/FriendBoard.tsx";
import { Privacy } from "./pages/Privacy.tsx";
import { Terms } from "./pages/Terms.tsx";
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
import { Feedback } from "./pages/Feedback.tsx";
import { Reports } from "./pages/Reports.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Speak } from "./pages/Speak.tsx";
import { Welcome } from "./pages/Welcome.tsx";
import { SpeakingAdmin } from "./pages/SpeakingAdmin.tsx";
import { FeedbackAdmin } from "./pages/FeedbackAdmin.tsx";
import { UserReportsAdmin } from "./pages/UserReportsAdmin.tsx";
import { UserAdmin, UsersAdmin } from "./pages/UsersAdmin.tsx";
import { routes } from "./routes.ts";
import { installClickSound } from "./sounds.ts";

installClickSound();

render(
  () => (
    <Router root={Layout}>
      <Route path={routes.welcome.pattern} component={Welcome} />
      <Route path={routes.about.pattern} component={About} />
      <Route path={routes.aboutHomeScreen.pattern} component={AddToHome} />
      <Route path={routes.privacy.pattern} component={Privacy} />
      <Route path={routes.terms.pattern} component={Terms} />
      <Route path={routes.cap.pattern} component={CapReached} />
      <Route path={routes.feedback.pattern} component={Feedback} />
      <Route path={routes.friends.pattern} component={Friends} />
      <Route path={routes.friendBoard.pattern} component={FriendBoard} />
      <Route path={routes.leaderboard.pattern} component={Leaderboard} />
      <Route path={routes.settings.pattern} component={Settings} />
      <Route path={routes.person.pattern} component={Profile} />
      <Route path={routes.admin.pattern} component={Admin} />
      <Route path={routes.adminReports.pattern} component={Reports} />
      <Route path={routes.adminPronunciation.pattern} component={PocRecorder} />
      <Route path={routes.adminSpeaking.pattern} component={SpeakingAdmin} />
      <Route path={routes.adminMetrics.pattern} component={MetricsAdmin} />
      <Route path={routes.adminUsers.pattern} component={UsersAdmin} />
      <Route path={routes.adminUserReports.pattern} component={UserReportsAdmin} />
      <Route path={routes.adminFeedback.pattern} component={FeedbackAdmin} />
      <Route path={routes.adminUser.pattern} component={UserAdmin} />
      <Route path={routes.dashboard.pattern} component={Dashboard} />
      <Route path={routes.type.pattern} component={Home} />
      <Route path={routes.typeLesson.pattern} component={() => <Practice mode="learn" />} />
      <Route path={routes.typeMaster.pattern} component={() => <Practice mode="master" />} />
      <Route path={routes.typeTest.pattern} component={() => <Practice mode="test" />} />
      <Route path={routes.typeReview.pattern} component={() => <Practice mode="review" />} />
      <Route path={routes.typeNotebook.pattern} component={Notebook} />
      <Route path={routes.talk.pattern} component={Speak} />
      <Route path={routes.talkConversation.pattern} component={Conversation} />
      <Route path={routes.quiz.pattern} component={QuizHome} />
      <Route path={routes.quizTest.pattern} component={QuizTest} />
      <Route path={routes.quizDeck.pattern} component={QuizDeck} />
      <Route path={routes.quizStudy.pattern} component={QuizStudy} />
      <Route path={routes.quizBrowse.pattern} component={QuizBrowse} />
      <Route path={routes.quizStats.pattern} component={QuizStats} />
      <Route path={routes.quizSession.pattern} component={QuizSession} />
      <Route path="*" component={() => <p class="qa-not-found">{t("app.notFound")}</p>} />
    </Router>
  ),
  document.getElementById("root")!,
);
