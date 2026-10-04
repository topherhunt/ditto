import { routes } from "../web/src/routes.ts";

/** IDs that only exist once something has created them; the "every route renders" e2e test creates them first. */
export type SampleIds = { conversationId: string; quizSessionId: string; userId: string };

/**
 * One concrete URL for every route helper, over the fixture content (Italian, lesson `it-a1-bar-1`, deck `it-a1-grammar-1`).
 * The type is exhaustive, so adding a helper to `routes` without a sample here fails `tsc`; `tests/unit/routes.test.ts` checks
 * the same at runtime, and `tests/e2e/routes.spec.ts` visits every sample.
 */
export const ROUTE_SAMPLES: { [K in keyof typeof routes]: (ids: SampleIds) => string } = {
  welcome: () => routes.welcome(),
  about: () => routes.about(),
  aboutHomeScreen: () => routes.aboutHomeScreen(),
  privacy: () => routes.privacy(),
  terms: () => routes.terms(),
  cap: () => routes.cap(),
  feedback: () => routes.feedback({ from: routes.dashboard({ lang: "it" }) }),
  friends: () => routes.friends(),
  friendBoard: () => routes.friendBoard(),
  leaderboard: () => routes.leaderboard(),
  settings: () => routes.settings(),
  person: () => routes.person({ id: "me" }),

  admin: () => routes.admin(),
  adminReports: () => routes.adminReports(),
  adminPronunciation: () => routes.adminPronunciation(),
  adminSpeaking: () => routes.adminSpeaking(),
  adminMetrics: () => routes.adminMetrics(),
  adminUsers: () => routes.adminUsers(),
  adminUserReports: () => routes.adminUserReports(),
  adminFeedback: () => routes.adminFeedback(),
  adminUser: (ids) => routes.adminUser({ id: ids.userId }),

  dashboard: () => routes.dashboard({ lang: "it" }),

  type: () => routes.type({ lang: "it" }),
  typeLesson: () => routes.typeLesson({ lang: "it", lessonId: "it-a1-bar-1" }),
  typeMaster: () => routes.typeMaster({ lang: "it", lessonId: "it-a1-bar-1" }),
  typeTest: () => routes.typeTest({ lang: "it", level: "A1" }),
  typeReview: () => routes.typeReview({ lang: "it" }),
  typeNotebook: () => routes.typeNotebook({ lang: "it" }),

  talk: () => routes.talk({ lang: "it" }),
  talkConversation: (ids) => routes.talkConversation({ lang: "it", id: ids.conversationId }),

  quiz: () => routes.quiz({ lang: "it" }),
  quizTest: () => routes.quizTest({ lang: "it", level: "A1" }),
  quizDeck: () => routes.quizDeck({ lang: "it", deckId: "it-a1-grammar-1" }),
  quizStudy: () => routes.quizStudy({ lang: "it", deckId: "it-a1-grammar-1", mode: "spaced" }),
  quizBrowse: () => routes.quizBrowse({ lang: "it", deckId: "it-a1-grammar-1" }),
  quizStats: () => routes.quizStats({ lang: "it", deckId: "it-a1-grammar-1" }),
  quizSession: (ids) => routes.quizSession({ lang: "it", deckId: "it-a1-grammar-1", sessionId: ids.quizSessionId }),
};

/**
 * A CSS selector per route for something only the page's loaded content renders (never the nav bar or a spinner). The "every
 * route renders" e2e test waits for it, so a page stuck on Loading or rendering nothing fails. Exhaustive like `ROUTE_SAMPLES`.
 * A route whose sample URL deliberately shows an error page (see `EXPECTED_ERRORS` in `tests/e2e/helpers.ts`) uses `.qa-error`.
 */
export const ROUTE_MARKERS: { [K in keyof typeof routes]: string } = {
  welcome: ".qa-welcome",
  about: ".qa-about-tips",
  aboutHomeScreen: ".qa-install",
  privacy: ".qa-privacy",
  terms: ".qa-terms",
  cap: ".qa-cap-reached",
  feedback: ".qa-feedback",
  friends: ".qa-make-friends",
  friendBoard: ".qa-board-form, .qa-board-you",
  leaderboard: ".qa-leaderboard",
  settings: ".qa-settings-general",
  person: ".qa-profile",

  admin: ".qa-admin-tile-summary",
  adminReports: ".qa-reports-empty, .qa-report-group",
  adminPronunciation: ".qa-poc-progress",
  adminSpeaking: ".qa-admin-spend-user, .qa-admin-spend-empty",
  adminMetrics: ".qa-metrics-day",
  adminUsers: ".qa-admin-user",
  adminUserReports: ".qa-user-report, .qa-user-reports-empty",
  adminFeedback: ".qa-feedback-moods",
  adminUser: ".qa-admin-user-email",

  dashboard: ".qa-dash-friends",

  type: ".qa-course",
  typeLesson: ".qa-position",
  typeMaster: ".qa-error",
  typeTest: ".qa-position",
  typeReview: ".qa-position, .qa-session-done",
  typeNotebook: ".qa-mistake, .qa-notebook-empty",

  talk: ".qa-speak-starter",
  talkConversation: ".qa-conversation-title",

  quiz: ".qa-quiz-level",
  quizTest: ".qa-quiz-test",
  quizDeck: ".qa-quiz-deck-home",
  quizStudy: ".qa-quiz-question",
  quizBrowse: ".qa-quiz-browse-page",
  quizStats: ".qa-quiz-stats",
  quizSession: ".qa-quiz-session-detail",
};
