import { z } from "zod";
import { LANGUAGES, languageLocale, NATIVE_LOCALES, PATHS, type Language, type Locale, type ServedCourse, type ServedLesson, type ServedUnit, type Stage } from "./content.ts";

export const HINT_LEVELS = ["letters", "initial", "none"] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];
export const MODES = ["learn", "mistakes", "review"] as const;
export type Mode = (typeof MODES)[number];
export const LEARNER_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type LearnerLevel = (typeof LEARNER_LEVELS)[number];

/** The activities whose "how it works" panel a learner can dismiss. */
export const HELP_TOPICS = ["type", "talk", "quiz"] as const;
export type HelpTopic = (typeof HELP_TOPICS)[number];

export const PrefsSchema = z.strictObject({
  path: z.enum(Object.keys(PATHS) as [keyof typeof PATHS]),
  hints: z.enum(HINT_LEVELS),
  rate: z.number().min(0.5).max(1),
  /** Self-rated: the conversation level and which levels the coach suggests testing out of. Null until the learner is asked. */
  level: z.enum(LEARNER_LEVELS).nullable(),
  /** Immersion: the interface, and explanations and coaching, in the course's language. Only for a course that is also a locale. */
  immerseUi: z.boolean(),
  immerseHelp: z.boolean(),
  /** The first time a learner meets an item, show and say it (with its translation) before asking them to type it. */
  studyFirst: z.boolean(),
  /** Activities whose help panel the learner has dismissed in this course, so it stops opening by itself. */
  helpSeen: z.array(z.enum(HELP_TOPICS)),
});
export type Prefs = z.infer<typeof PrefsSchema>;
export const DEFAULT_PREFS: Prefs = { path: "full", hints: "letters", rate: 1, level: null, immerseUi: false, immerseHelp: false, studyFirst: false, helpSeen: [] };

/** Whether a course can be immersed in: the app and the AI write only in a locale. */
export const immersible = (l: Language) => languageLocale(l) !== null;

export const PutPrefsSchema = z.strictObject({ language: z.enum(LANGUAGES), prefs: PrefsSchema })
  .refine((p) => immersible(p.language) || !(p.prefs.immerseUi || p.prefs.immerseHelp), "This course has no immersion");
export const PutLocaleSchema = z.strictObject({ locale: z.enum(NATIVE_LOCALES) });
/** The languages the learner studies, first-added first; at least one. */
export const PutLearningSchema = z.strictObject({
  languages: z.array(z.enum(LANGUAGES)).min(1).refine((ls) => new Set(ls).size === ls.length, "Each language at most once"),
});

export const AttemptSchema = z.strictObject({
  unitId: z.string(),
  rev: z.int().positive(),
  mode: z.enum(MODES),
  path: PrefsSchema.shape.path,
  hintsLevel: z.enum(HINT_LEVELS),
  outcome: z.enum(["clean", "hinted", "corrected", "revealed"]),
  wrongSubmissions: z.int().min(0),
  hintsUsed: z.int().min(0),
  replays: z.int().min(0),
  accentSlips: z.int().min(0),
  /** Every submitted answer, joined as free text, in order. */
  submissions: z.array(z.string()).max(50),
  categories: z.array(z.enum(["spelling", "missing_word", "extra_word", "word_order", "punctuation"])),
  /** The meaning check after the dictation; null exactly when the unit has no translation. A wrong pick counts as a miss. */
  meaningCorrect: z.boolean().nullable(),
  durationMs: z.int().min(0),
  /** The study-first screen was shown before this item (learn mode only). */
  studied: z.boolean(),
  /** The item is part of a Master run: a lesson's sentences with no help, open once the lesson is complete and has waited MASTER_WAIT_MS. */
  master: z.boolean(),
});
/** What a saved attempt answers: `stars` when it finished a run of the lesson, else null. */
export type AttemptOut = { ok: true; stars: { earned: 1 | 2 | 3; best: 1 | 2 | 3 } | null };
export type AttemptBody = z.infer<typeof AttemptSchema>;

export const REPORT_KINDS = ["audio", "text", "translation", "accept", "other"] as const;
export const ReportSchema = z.strictObject({
  unitId: z.string(),
  rev: z.int().positive(),
  /** Index into the unit's `audio`: the voice that played. */
  voice: z.int().min(0),
  kind: z.enum(REPORT_KINDS),
  /** `accept` only: the answer the learner believes should have passed. */
  answer: z.string().min(1).max(1000).optional(),
  note: z.string().max(1000),
}).refine((r) => (r.kind === "accept") === (r.answer !== undefined), { message: "answer is required for accept reports and only for them" });
export type ReportBody = z.infer<typeof ReportSchema>;

/** What the admin wants done about a report, with an optional note; `dismiss` also closes the report. */
export const REPORT_DECISIONS = ["dismiss", "fix_audio", "fix_text", "fix_translation", "accept_answer", "discuss"] as const;
export type ReportDecision = (typeof REPORT_DECISIONS)[number];
export const TriageSchema = z.strictObject({ decision: z.enum(REPORT_DECISIONS), note: z.string().trim().max(2000) });
/** The admin's verdict on a proposed fix; a rejection needs a note saying what's still wrong. */
export const ReviewSchema = z.strictObject({ review: z.enum(["approved", "rejected"]), note: z.string().trim().max(2000) })
  .refine((r) => r.review === "approved" || r.note !== "", { message: "A note is required when rejecting" });
/** A take recorded for the pronunciation judge proof of concept (dev only). `expect: "fail"` is a deliberate mispronunciation. */
export const PocTakeSchema = z.strictObject({
  file: z.string(), sentence: z.string(), expect: z.enum(["pass", "fail"]), mime: z.enum(["audio/webm", "audio/mp4"]), note: z.string().trim().max(500),
});
export type PocTake = z.infer<typeof PocTakeSchema>;
export const PocNoteSchema = z.strictObject({ note: z.string().trim().max(500) });
export type PocSentence = { id: string; lang: Language; text: string; suggestion: string; ttsUrl: string | null };
export type PocData = { sentences: PocSentence[]; takes: PocTake[] };
export const REPORT_STATUSES = ["new", "triaged", "closed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type AdminReport = {
  id: number;
  status: ReportStatus;
  createdAt: string;
  reporter: { email: string; username: string | null };
  kind: ReportBody["kind"];
  note: string;
  answer: string | null;
  unitId: string;
  unitRev: number;
  language: Language;
  /** As reported, with the clip that played. */
  text: string;
  voice: string;
  audioUrl: string;
  decision: ReportDecision | null;
  adminNote: string | null;
  triagedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  review: "approved" | "rejected" | null;
  reviewNote: string | null;
  /** The unit in the content this server runs, with the same voice's clip; null if the unit is gone. */
  current: { rev: number; text: string; translation: string | null; audioUrl: string | null } | null;
};

/** Letters, digits and `_ . -`, ASCII only so lookalike letters can't imitate a taken name. Unique ignoring case. */
export const UsernameSchema = z.string().trim().regex(/^[A-Za-z0-9_.-]{3,20}$/);
export const PutUsernameSchema = z.strictObject({ username: UsernameSchema });
export const PutProfileVisibilitySchema = z.strictObject({ public: z.boolean() });
/** An account's id in URLs and the API: random, so accounts can't be enumerated. The numeric row id never leaves the server. */
export const PublicIdSchema = z.string().regex(/^[A-Za-z0-9_-]{10}$/);

/** By id, from a search result or a profile. */
export const FriendRequestSchema = z.strictObject({ userId: PublicIdSchema });
/** New requests one learner may send in any 24 hours; accepting someone else's doesn't count. Going over is a 403. */
export const FRIEND_REQUESTS_PER_DAY = 3;
export const BOARD_BLURB_MAX = 140;
/** One line; empty means no blurb. */
export const PostBoardSchema = z.strictObject({ blurb: z.string().trim().max(BOARD_BLURB_MAX).regex(/^[^\r\n]*$/) });
export const BOARD_SIZE = 50;
export const FRIEND_ACTIONS = ["accept", "decline", "block", "unblock", "unfriend"] as const;
export const USER_REPORT_REASONS = ["username", "board_post", "requests", "other"] as const;
export type UserReportReason = (typeof USER_REPORT_REASONS)[number];
/** Reporting also blocks. */
export const USER_REPORT_NOTE_MAX = 500;
export const UserReportSchema = z.strictObject({ reason: z.enum(USER_REPORT_REASONS), note: z.string().trim().max(USER_REPORT_NOTE_MAX) });
export const USER_REPORT_ACTIONS = { "take-down": "took_down_post", "clear-username": "cleared_username", dismiss: "dismissed" } as const;
export type UserReportResolution = (typeof USER_REPORT_ACTIONS)[keyof typeof USER_REPORT_ACTIONS];
/** For the operator. `username` and `blurb` are as they were when reported; `blurbNow` is the board entry's blurb today, if it has one. */
export type AdminUserReport = {
  id: number; reporter: Person; reported: Person; reason: UserReportReason; note: string | null;
  username: string | null; blurb: string | null; onBoard: boolean; blurbNow: string | null;
  createdAt: string; resolvedAt: string | null; resolution: UserReportResolution | null;
};

export const RACE_DAYS = [1, 3, 7, 14, 30] as const;
/** High enough that nobody finishes a first-to race on its first day. */
export const RACE_MIN_TARGET = 15;
export const RACE_DEADLINE_DAYS = 30;
export const ChallengeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ opponentId: PublicIdSchema, kind: z.literal("most"), days: z.union(RACE_DAYS.map((d) => z.literal(d))) }),
  z.strictObject({ opponentId: PublicIdSchema, kind: z.literal("first_to"), target: z.int().min(RACE_MIN_TARGET).max(200) }),
]);
export type ChallengeBody = z.infer<typeof ChallengeSchema>;
export const CHALLENGE_ACTIONS = ["accept", "decline", "cancel"] as const;

export const LevelPassSchema = z.strictObject({ language: z.enum(LANGUAGES), level: z.string() });

export const ExplainSchema =z.strictObject({ unitId: z.string(), answer: z.string().min(1).max(500) });

/** Conversation mode (docs/conversation.md). Irish is out until live Irish TTS exists. */
export const SPEAK_LANGUAGES = ["it", "nl", "en", "es", "fr", "el"] as const satisfies readonly Language[];
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const STARTERS = [
  "cafe", "directions", "hotel", "meeting", "market", "weekend", "pharmacy", "train", "reservation", "doctor", "clothes", "taxi", "neighbor", "interview", "hobbies", "airport", "lostitem", "movies", "apartment", "birthday",
] as const;
export type Starter = (typeof STARTERS)[number];
/** Failed tries at one sentence before the coach offers to move on. */
export const MOVE_ON_AFTER = 5;
export const AUDIO_MIMES = ["audio/webm", "audio/mp4"] as const;

export const NewConversationSchema = z.strictObject({
  language: z.enum(SPEAK_LANGUAGES),
  level: z.enum(LEARNER_LEVELS),
  scenario: z.union([z.strictObject({ starter: z.enum(STARTERS) }), z.strictObject({ topic: z.string().trim().min(1).max(300) }), z.strictObject({ surprise: z.literal(true) })]),
  hardMode: z.boolean(),
});
export const PutConversationSchema = z.strictObject({ hardMode: z.boolean() });
/** `target`: the retry screen's sentence, null on a first try. `taps`: chunks translated before this reply. */
export const SpeakAttemptSchema = z.strictObject({
  audio: z.string().min(1), mime: z.enum(AUDIO_MIMES), target: z.string().min(1).max(500).nullable(), usedHow: z.boolean(), taps: z.int().min(0),
});
export const MoveOnSchema = z.strictObject({ target: z.string().min(1).max(500), taps: z.int().min(0) });
export const HowSchema = z.strictObject({ text: z.string().trim().min(1).max(500) });
export const SpeakReportSchema = z.strictObject({ note: z.string().trim().max(1000) });

export type Chunk = { text: string; gloss: string };
export type TurnSource = "suggestion" | "own" | "how" | "moved_on";
export type TurnOut = {
  id: number;
  role: "partner" | "learner";
  text: string;
  /** A learner turn's arrive with the partner's answer to it. */
  chunks: Chunk[] | null;
  /** Partner turns only. */
  suggestions: Chunk[][] | null;
  audioUrl: string | null;
  /** Learner turns only. */
  source: TurnSource | null;
  /** The CEFR grade of the line: the coach's for a learner turn, the partner model's own for a partner turn. */
  level: string | null;
};
export type CoachVerdict = {
  /** The sentence the coach thinks was meant, corrected; the target on a retry. */
  meant: string;
  level: (typeof CEFR_LEVELS)[number];
  grammarOk: boolean;
  /** The reply is substantially one of the suggestions shown, by the coach's judgment. */
  fromSuggestion: boolean;
  fixes: { wrong: string; right: string; why: string }[];
  feedback: string;
};
/** `failures`: failed tries at this target so far, this one included. `targetAudioUrl`: the partner voice saying the target, on a failed attempt. */
export type SpeakAttemptOut = {
  id: number; passed: boolean; target: string; transcript: string; verdict: CoachVerdict; failures: number;
  targetAudioUrl: string | null;
};
/** The attempts route streams these as NDJSON: each step as it starts, then the result or an error. */
export type CheckStep = "listening" | "judging" | "answering";
export type SpeakAttemptEvent = { step: CheckStep } | { result: SpeakAttemptResult } | { error: string; status: number };
/** USD. `today` resets at midnight UTC; nothing paid starts once it reaches `cap`. */
export type Spend = { today: number; cap: number; conversation: number };
/** Every signed-in API response carries the learner's `today` and `cap` in USD. */
export const SPEND_TODAY_HEADER = "X-Spend-Today";
export const SPEND_CAP_HEADER = "X-Spend-Cap";
/** Learner turns that leaned on a suggestion, "How do I say...?" or moving on, out of all learner turns. */
export type Reliance = { leaned: number; of: number };
export type ConversationOut = {
  id: number; language: Language; level: string; title: string; hardMode: boolean; createdAt: string;
  turns: TurnOut[]; reliance: Reliance; spend: Spend;
};
export type ConversationSummary = {
  id: number; language: Language; level: string; title: string; createdAt: string; updatedAt: string;
  /** CEFR grades of the learner's replies, in order. */
  levels: string[];
  reliance: Reliance;
  /** The learner's replies so far; at CONVERSATION_LESSON_REPLIES the conversation counts as a lesson. */
  replies: number;
};
export type ConversationsOut = { conversations: ConversationSummary[]; weakPhrases: { text: string; createdAt: string }[] };
/** `turns`: the learner's new turn and the partner's answer once a reply passes, else empty. */
export type SpeakAttemptResult = { attempt: SpeakAttemptOut; turns: TurnOut[]; reliance: Reliance; spend: Spend };
export type MoveOnResult = { turns: TurnOut[]; reliance: Reliance; spend: Spend };
/** `turns`: the learner's last turn, now with chunks, and the partner's answer. */
export type PartnerRetryResult = { turns: TurnOut[]; spend: Spend };
export type HowOut = { sentence: string; chunks: Chunk[]; spend: Spend };
export type AdminSpendOut = { days: string[]; users: { email: string; username: string | null; total: number; byDay: Record<string, number> }[] };
export type AdminSpeakReport = SpeakAttemptOut & {
  conversationId: number; language: Language; reporter: { email: string; username: string | null }; note: string; reportedAt: string; partnerLine: string;
};
/** Days of history behind /admin/users' "active days" and "spend (30d)" columns and a user's daily activity. */
export const ADMIN_RECENT_DAYS = 30;
/**
 * One account on /admin/users. `items`: dictation items, quiz answers and spoken replies, ever. `activeDays`: UTC days with any
 * item in the last ADMIN_RECENT_DAYS. `blockedBy`: people who blocked this account's friend request. `reports`: problem and
 * speaking reports filed.
 */
export type AdminUserRow = {
  id: string; email: string; username: string | null; createdAt: string; lastSeenAt: string | null; lastPracticedAt: string | null;
  locale: Locale; learning: Language[]; profilePublic: boolean; items: number; activeDays: number; lessonsCompleted: number;
  friends: number; pendingSent: number; blockedBy: number; reports: number; spendRecent: number; spendTotal: number;
};
export type AdminItemCounts = { type: number; quiz: number; talk: number };
export type AdminUserDetail = {
  user: AdminUserRow;
  /** Sessions not yet expired, one per signed-in browser. */
  activeSessions: number;
  languages: (AdminItemCounts & { language: Language; lessonsCompleted: number; levelsPassed: string[]; quizLevelsPassed: string[]; conversations: number })[];
  /** UTC days with any item in the last ADMIN_RECENT_DAYS, newest first. */
  days: (AdminItemCounts & { day: string })[];
  spendByPurpose: { purpose: string; total: number }[];
  friends: Person[];
  /** Accounts that blocked this one, and accounts this one blocked. */
  blockedBy: Person[];
  blocked: Person[];
  reports: { kind: string; note: string; text: string; createdAt: string }[];
};

/** What a signed-in page is for, as engaged time is filed (docs/metrics.md). Admin pages aren't counted. */
export const ACTIVITIES = [
  "home", "lesson", "review", "mistakes", "level-test", "notebook", "talk", "quiz-study", "quiz-test", "quiz-decks", "social", "settings", "other",
] as const;
export type Activity = (typeof ACTIVITIES)[number];
/** The three parts of the app (Type, Talk, Quiz) plus everything else, as /admin/metrics groups activities. */
export const AREAS = ["type", "talk", "quiz", "other"] as const;
export type Area = (typeof AREAS)[number];
export const ACTIVITY_AREAS: Record<Activity, Area> = {
  lesson: "type", review: "type", mistakes: "type", "level-test": "type", notebook: "type",
  talk: "talk",
  "quiz-study": "quiz", "quiz-test": "quiz", "quiz-decks": "quiz",
  home: "other", social: "other", settings: "other", other: "other",
};
/** A learner counts as "actively engaged" on /admin/metrics when they have at least this much engaged time on one UTC day. */
export const ACTIVE_MIN_SECONDS = 120;
/** Seconds of engaged time the client reports at once; the server refuses more. */
export const ENGAGED_MAX_SECONDS = 60;
export const EngagedSchema = z.strictObject({
  activity: z.enum(ACTIVITIES), language: z.enum(LANGUAGES).nullable(), seconds: z.number().int().min(1).max(ENGAGED_MAX_SECONDS),
});
/** Per-user engaged time is kept this long, then folded into anonymous daily totals (server/metrics.ts). */
export const METRICS_KEEP_DAYS = 90;
/** Response-time buckets of http_hourly, by upper bound in ms. */
export const LATENCY_BUCKETS = ["<100ms", "<300ms", "<1s", "<3s", "3s+"] as const;
/**
 * /admin/metrics. `days`: newest first; `activeUsers` had any engaged time, `peakConcurrent` is the most learners engaged in one
 * 5-minute window. `activities` and `routes` cover the whole range; `learnerDays` sums each day's distinct learners. `p95` is the
 * latency bucket holding the 95th percentile. `hours`: the last 48 UTC hours with traffic, newest first.
 */
export type AdminMetricsOut = {
  days: { day: string; activeUsers: number; peakConcurrent: number; engagedMinutes: number; spendUsd: number; requests: number; errors5xx: number }[];
  activities: { activity: Activity; language: Language | null; learnerDays: number; minutes: number }[];
  routes: { route: string; requests: number; errors4xx: number; errors5xx: number; p95: (typeof LATENCY_BUCKETS)[number] }[];
  hours: { hour: string; requests: number; errors5xx: number; peakConcurrent: number }[];
};

/**
 * /admin/metrics/today: engaged time over a window of whole UTC days, `from` to `to`, one row per learner, activity and language.
 * `engagedLearners` had at least `minSeconds` on some single day of the window; `otherLearners` were present for less.
 */
export type AdminTodayOut = {
  from: string; to: string; minSeconds: number; engagedLearners: number; otherLearners: number;
  rows: { activity: Activity; language: Language | null; learner: string; username: string | null; seconds: number }[];
};

export const EXPLORE_GRAINS = ["day", "week"] as const;
export const EXPLORE_GROUPS = ["none", "area", "activity", "language", "learner"] as const;
export const EXPLORE_METRICS = ["minutes", "learners", "perLearner"] as const;
export type ExploreGroup = (typeof EXPLORE_GROUPS)[number];
export type ExploreMetric = (typeof EXPLORE_METRICS)[number];
/**
 * /admin/metrics/explore: one value per bucket (a UTC day, or the UTC Monday that starts a week) for each series. `key` is the
 * area, activity, language ('' for none), learner public id or 'all'; the bucket past the top series is 'other'. `total` is over the
 * whole range, and `by` and `learner` echo the request.
 */
export type AdminExploreOut = {
  by: ExploreGroup; buckets: string[];
  series: { key: string; label: string; total: number; values: number[] }[];
  learner: { publicId: string; username: string | null } | null;
};

/** What each tile on /admin counts. `spendMonthUsd`: AI spend over the last ADMIN_RECENT_DAYS. */
export type AdminSummary = {
  users: number; usersSeenWeek: number; learnersToday: number; spendMonthUsd: number;
  reportsNew: number; reportsTriaged: number; peopleReportsOpen: number; speakReports: number;
};

/** ISO 639-1 codes a visitor can name when asking for a language, plus `other` for any not listed. Names come from `Intl.DisplayNames`. */
export const REQUEST_LANGUAGES = [
  "en", "es", "pt", "fr", "de", "it", "nl", "el", "ga", "ca", "gl", "eu", "pl", "cs", "sk", "hu", "ro", "bg", "sr", "hr", "sl", "uk", "ru",
  "sv", "da", "no", "fi", "is", "et", "lv", "lt", "tr", "ar", "he", "fa", "hi", "bn", "ur", "ta", "th", "vi", "id", "ms", "tl", "zh", "ja", "ko", "sw", "af", "cy", "other",
] as const;
export type RequestLanguage = (typeof REQUEST_LANGUAGES)[number];
/** A visitor's anonymous ask for a language: the one they speak best and the one they want to learn. */
export const LanguageRequestSchema = z.strictObject({ spoken: z.enum(REQUEST_LANGUAGES), wanted: z.enum(REQUEST_LANGUAGES) });
/** Requests per language pair, most asked first. */
export type AdminLanguageRequestsOut = { spoken: RequestLanguage; wanted: RequestLanguage; count: number; lastDay: string }[];

/** `learning`: empty only until a new learner picks a language. `installHintDismissed`: they closed the dashboard's add-to-home-screen alert for good. */
export type Me = { email: string; username: string | null; profilePublic: boolean; installHintDismissed: boolean; locale: Locale; learning: Language[]; prefs: Record<Language, Prefs>; admin: boolean };
/** `poc`: the pronunciation proof-of-concept recorder is on (development only). `speak`: conversation mode is configured. */
/** `quiz`: the languages with quiz decks. `dailySpendCap`: each learner's free AI credit per UTC day, in USD. */
export type Config = { googleClientId: string | null; devLogin: boolean; poc: boolean; speak: boolean; quiz: Language[]; dailySpendCap: number };
export type LessonProgress = { nextIndex: number; completedAt: string | null };
/** Master opens this long after the last run of the lesson finished. */
export const MASTER_WAIT_MS = 6 * 3_600_000;
/** A lesson's best stars, and when its last run finished. */
export type LessonStars = { stars: 1 | 2 | 3; practicedAt: string };
/** A lesson as the catalog lists it: unit counts per stage instead of the units, which `/api/lessons/:id` serves. */
export type CatalogLesson = Omit<ServedLesson, "units"> & { stages: Record<Stage, number> };
export type CatalogCourse = Omit<ServedCourse, "lessons"> & { lessons: CatalogLesson[] };
export type Catalog = {
  courses: CatalogCourse[];
  /** lessonId -> path -> progress */
  progress: Record<string, Partial<Record<keyof typeof PATHS, LessonProgress>>>;
  /** lessonId -> stars, for lessons the learner has completed. */
  stars: Record<string, LessonStars>;
  /** Course and lesson ids the learner can start. */
  unlocked: string[];
  /** Levels the learner tested out of. */
  passedLevels: string[];
  /** Locked lessons a friend has started, which the learner may play anyway: lessonId -> those friends. */
  viaFriends: Record<string, Person[]>;
  /** Units in the Review queue: due cards plus notebook mistakes, each once. */
  reviewCount: number;
};
/** Days of history the dashboard's activity calendar and streak draw on. */
export const ACTIVITY_DAYS = 60;
/** Items practiced per UTC hour (`2026-09-29T14`), so the client can bucket them into its own local days. */
export type ActivityOut = { hours: { hour: string; type: number; talk: number; quiz: number }[] };
export type ExplanationOut = { categories: string[]; summary: string; details: string };
export type MistakeEntry = {
  unit: ServedUnit;
  wrongCount: number;
  lastWrongAt: string;
  lastAnswer: string | null;
  categories: string[];
  cleanStreak: number;
  explanation: ExplanationOut | null;
};
/** `playable` is false for a lesson that is neither unlocked nor started by a friend; its attempts are refused. */
export type LessonOut = ServedLesson & {
  playable: boolean; progress: Catalog["progress"][string]; stars: LessonStars | null;
  /** Ids of the lesson's units the learner has finished at least once, so study-first skips them. */
  seen: string[];
};
export type ReviewOut = { units: ServedUnit[]; reviewCount: number };
export type LevelTestOut = { units: ServedUnit[] };

/** Everything anyone may see about an account. `username` is null until they pick one. */
export type Person = { id: string; username: string | null };
/** How the searcher stands with an account. A blocked requester sees `outgoing`. */
export type Relation = "self" | "none" | "outgoing" | "incoming" | "friends" | "blocked";
/** A search matches an exact email or an exact username, ignoring case. */
export type FriendSearchOut = { found: false } | { found: true; person: Person; relation: Relation };
export type FriendsOut = {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
  blocked: Person[];
};

/** Rolling windows, in days; profiles show lesson counts over these. */
export const LEADERBOARD_WINDOWS = { day: 1, week: 7, month: 30 } as const;
export type LeaderboardWindow = keyof typeof LEADERBOARD_WINDOWS;
export const LEADERBOARD_SIZE = 25;
/** Replies that make a conversation count as a lesson. */
export const CONVERSATION_LESSON_REPLIES = 10;
/** `rank` is the place among everyone who practiced this week; null for you before your first lesson of the week. */
export type LeaderboardRow = {
  rank: number | null; person: Person; language: Language | null; lessonsWeek: number; lessonsAll: number; isMe: boolean;
};
/** The week runs from Monday 00:00 UTC. `rows` are your friends who practiced, then the top learners with public profiles, best first, and you. */
export type LeaderboardOut = {
  rows: LeaderboardRow[];
  stats: { activeLearners: number; lessons: number; seconds: number };
};

export type ActivityWindow = "day" | "week" | "month" | "year";
/** The smallest window with at least two lessons completed, else when the last one was. */
export type RecentActivity = { window: ActivityWindow; lessons: number } | { lastCompletedAt: string } | null;

/** What a learner who opted into the board shows strangers, whether or not their profile is public. */
export type BoardEntry = {
  person: Person;
  relation: Relation;
  isMe: boolean;
  language: Language | null;
  /** The CEFR level of their first unfinished main-track module in `language`. */
  level: string | null;
  activity: RecentActivity;
  blurb: string | null;
};
/** Only learners with an entry see the board: up to BOARD_SIZE entries in a new random order each time, with no search or filter. */
export type BoardOut = { posted: false } | { posted: true; entries: BoardEntry[] };

/** A profile never includes the account's email or anything from Google. */
export type Profile = {
  person: Person;
  relation: Relation;
  /** Null for a private account the viewer isn't friends with. */
  summary: {
    /** The studied language worked on most recently, else the first one studied, else any worked on; null with none. */
    language: Language | null;
    activity: RecentActivity;
    lessons: Record<LeaderboardWindow, number>;
  } | null;
  /** For yourself and friends only. */
  details: {
    /** Latest learn attempt per item, over the last 10 lessons worked on. Percentages; null with no items. */
    accuracy: { lessons: number; dictation: number | null; meaning: number | null };
    /** Languages with any progress, most recent first. */
    languages: LanguageProfile[];
  } | null;
};
export type LanguageProfile = {
  language: Language;
  /** The first main-track module not yet complete (1-based); null once all are. */
  module: { number: number; of: number; title: string } | null;
  optionalDone: number;
  /** When each lesson was first completed, in order. */
  completions: string[];
  /** When each level's main track was completed. */
  levelsDone: { level: string; at: string }[];
  recent: { lessonId: string; lessonTitle: string; courseTitle: string; completed: boolean; lastAt: string }[];
};

export type CompareRow = {
  person: Person;
  isMe: boolean;
  items: number;
  /** Percent of items without correction or reveal; meaning is null when no item had a meaning check. */
  dictation: number;
  meaning: number | null;
  hints: number;
  durationMs: number;
};

export type ChallengeOut = {
  id: number;
  kind: "most" | "first_to";
  days: number;
  target: number | null;
  status: "pending" | "active" | "declined" | "cancelled" | "finished";
  challenger: Person;
  opponent: Person;
  /** The viewer sent this challenge. */
  mine: boolean;
  startedAt: string | null;
  endsAt: string | null;
  finishedAt: string | null;
  winnerId: string | null;
  /** Lessons each side has completed since the start (by the finish, once finished). */
  scores: { challenger: number; opponent: number };
};

export type NotificationKind =
  | "friend_request" | "friend_accepted" | "challenge_invite" | "challenge_accepted" | "challenge_declined" | "challenge_finished";
export type NotificationOut = { id: number; kind: NotificationKind; actor: Person; challenge: ChallengeOut | null; createdAt: string; read: boolean };
export type NotificationsOut = { unread: number; items: NotificationOut[] };

/** Quiz mode (docs/quizzes.md): multiple-choice decks, reviewed on an FSRS schedule. */
export const QUIZ_LEVELS = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;
export type QuizLevel = (typeof QUIZ_LEVELS)[number];
export const QUIZ_KINDS = ["grammar", "vocab"] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];
/** spaced: due cards, then new ones. least: unseen, then least stable. random: any. */
export const QUIZ_MODES = ["spaced", "least", "random"] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];
/** again is a wrong answer; the learner rates a right one hard, good or easy. */
export const QUIZ_RATINGS = ["again", "hard", "good", "easy"] as const;
export type QuizRating = (typeof QUIZ_RATINGS)[number];
/** mastered: in review with a stability of 21+ days. */
export const MASTERY_STATES = ["new", "learning", "review", "mastered"] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];
export type Mastery = Record<MasteryState, number>;
/** What the read-aloud button can voice: a question's own text fields. */
export const QUIZ_SAY_FIELDS = ["question", "correct", "wrong0", "wrong1", "wrong2", "explanation"] as const;

export const StartQuizSchema = z.strictObject({ mode: z.enum(QUIZ_MODES) });
export const QuizAnswerSchema = z.strictObject({ questionId: z.string(), rating: z.enum(QUIZ_RATINGS), responseMs: z.int().min(0) });
export const QuizTestPassSchema = z.strictObject({ language: z.enum(LANGUAGES), level: z.enum(QUIZ_LEVELS) });
/** A level passes once this share of its questions are graduated (in review), or by answering every test question right. */
export const QUIZ_GRADUATE_SHARE = 0.9;
export const QUIZ_TEST_SIZE = 20;

export type QuizDeckOut = { id: string; level: QuizLevel; kind: QuizKind; num: number; total: number; due: number; fresh: number; mastery: Mastery };
/** `activity`: every session with answers in this language, for the practice sparklines. */
export type QuizHomeOut = { decks: QuizDeckOut[]; levels: QuizLevelOut[]; activity: { deckId: string; at: string; answered: number }[] };
/** A level with decks in the language. The first level is always unlocked, as are passed ones and the one after each. */
export type QuizLevelOut = { level: QuizLevel; total: number; graduated: number; passed: "progress" | "test" | null; unlocked: boolean };
/** `passed`: the level this answer finished, and the one it unlocked (null after the last). */
export type QuizAnswerOut = { passed: { level: QuizLevel; next: QuizLevel | null } | null };
export type QuizTestOut = { questions: (QuizQuestionOut & { deckId: string })[]; next: QuizLevel | null };
export type QuizCardOut = { mastery: MasteryState; stability: number; due: string };
export type QuizQuestionOut = { id: string; title: string; question: string; correct: string; wrong: string[]; explanation: string; card: QuizCardOut | null };
/** `mastery`: the deck's breakdown after the session's last answer. */
export type QuizSessionSummary = {
  id: number; mode: QuizMode; startedAt: string; durationS: number; answered: number; ratings: Record<QuizRating, number>;
  newStarted: number; improved: number; mastered: number; mastery: Mastery;
};
export type QuizDeckDetailOut = { deck: QuizDeckOut; questions: QuizQuestionOut[]; sessions: QuizSessionSummary[] };
export type QuizSessionStartOut = { sessionId: number; queue: string[] };
export type QuizSessionOut = QuizSessionSummary & { deckId: string; answers: { questionId: string; title: string; rating: QuizRating; responseMs: number }[] };
