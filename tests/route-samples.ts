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
