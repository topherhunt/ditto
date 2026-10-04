/**
 * Every in-app URL, declared once. `main.tsx` registers each `.pattern`; everything else (components, tests) builds paths by
 * calling the helper, so a path can't be spelled differently in two places. A helper takes its `:params` (typed from the
 * pattern) and an optional query object, and throws on a missing param.
 */

type Query = Record<string, string | undefined>;

type PathParams<P extends string> = P extends `${string}:${infer K}/${infer Rest}`
  ? { [key in K]: string } & PathParams<`/${Rest}`>
  : P extends `${string}:${infer K}` ? { [key in K]: string } : {};

type Args<P extends string> = keyof PathParams<P> extends never ? [query?: Query] : [params: PathParams<P>, query?: Query];

function route<P extends string>(pattern: P) {
  const hasParams = pattern.includes(":");
  const build = (...args: Args<P>): string => {
    const [params, query] = (hasParams ? args : [{}, args[0]]) as [Record<string, string>, Query | undefined];
    const path = pattern.replace(/:(\w+)/g, (_, key: string) => {
      const value = params[key];
      if (!value) throw new Error(`route ${pattern}: missing :${key}`);
      return encodeURIComponent(value);
    });
    const search = new URLSearchParams(Object.entries(query ?? {}).filter((e): e is [string, string] => e[1] !== undefined)).toString();
    return search ? `${path}?${search}` : path;
  };
  return Object.assign(build, { pattern });
}

export const routes = {
  welcome: route("/"),
  about: route("/about"),
  aboutHomeScreen: route("/about/home-screen"),
  privacy: route("/privacy"),
  terms: route("/terms"),
  cap: route("/cap"),
  feedback: route("/feedback"),
  friends: route("/friends"),
  friendBoard: route("/friends/board"),
  leaderboard: route("/leaderboard"),
  settings: route("/settings"),  /** `id` is a user's public ID, or "me". */
  person: route("/people/:id"),

  admin: route("/admin"),
  adminReports: route("/admin/reports"),
  adminPronunciation: route("/admin/pronunciation"),
  adminSpeaking: route("/admin/speaking"),
  adminMetrics: route("/admin/metrics"),
  adminUsers: route("/admin/users"),
  adminUserReports: route("/admin/user-reports"),
  adminFeedback: route("/admin/feedback"),
  adminUser: route("/admin/users/:id"),

  dashboard: route("/:lang"),

  type: route("/:lang/type"),
  typeLesson: route("/:lang/type/lesson/:lessonId"),
  typeMaster: route("/:lang/type/lesson/:lessonId/master"),
  typeTest: route("/:lang/type/test/:level"),
  typeReview: route("/:lang/type/review"),
  typeNotebook: route("/:lang/type/notebook"),

  talk: route("/:lang/talk"),
  talkConversation: route("/:lang/talk/:id"),

  quiz: route("/:lang/quiz"),
  quizTest: route("/:lang/quiz/test/:level"),
  quizDeck: route("/:lang/quiz/:deckId"),
  quizStudy: route("/:lang/quiz/:deckId/study/:mode"),
  quizBrowse: route("/:lang/quiz/:deckId/browse"),
  quizStats: route("/:lang/quiz/:deckId/stats"),
  quizSession: route("/:lang/quiz/:deckId/sessions/:sessionId"),
};
