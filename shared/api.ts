import { z } from "zod";
import { LANGUAGES, LOCALES, PATHS, type Language, type Locale, type ServedCourse, type ServedLesson, type ServedUnit, type Stage } from "./content.ts";

export const HINT_LEVELS = ["letters", "initial", "none"] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];
export const MODES = ["learn", "mistakes", "review"] as const;
export type Mode = (typeof MODES)[number];

export const PrefsSchema = z.strictObject({
  path: z.enum(Object.keys(PATHS) as [keyof typeof PATHS]),
  hints: z.enum(HINT_LEVELS),
  autoplay: z.int().min(0).max(3),
  rate: z.number().min(0.5).max(1),
});
export type Prefs = z.infer<typeof PrefsSchema>;
export const DEFAULT_PREFS: Prefs = { path: "full", hints: "letters", autoplay: 1, rate: 1 };

export const PutPrefsSchema = z.strictObject({ language: z.enum(LANGUAGES), prefs: PrefsSchema });
export const PutLocaleSchema = z.strictObject({ locale: z.enum(LOCALES) });
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
});
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

/** By email from the Friends page, or by id from a profile. */
export const FriendRequestSchema = z.union([z.strictObject({ email: z.email() }), z.strictObject({ userId: z.int() })]);
export const FRIEND_ACTIONS = ["accept", "decline", "block", "unblock", "unfriend"] as const;

export const RACE_DAYS = [1, 3, 7, 14, 30] as const;
/** High enough that nobody finishes a first-to race on its first day. */
export const RACE_MIN_TARGET = 15;
export const RACE_DEADLINE_DAYS = 30;
export const ChallengeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ opponentId: z.int(), kind: z.literal("most"), days: z.union(RACE_DAYS.map((d) => z.literal(d))) }),
  z.strictObject({ opponentId: z.int(), kind: z.literal("first_to"), target: z.int().min(RACE_MIN_TARGET).max(200) }),
]);
export type ChallengeBody = z.infer<typeof ChallengeSchema>;
export const CHALLENGE_ACTIONS = ["accept", "decline", "cancel"] as const;

export const LevelPassSchema = z.strictObject({ language: z.enum(LANGUAGES), level: z.string() });

export const ExplainSchema =z.strictObject({ unitId: z.string(), answer: z.string().min(1).max(500) });

/** Conversation mode (docs/conversation.md). Irish is out until live Irish TTS exists. */
export const SPEAK_LANGUAGES = ["it", "nl", "en"] as const satisfies readonly Language[];
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const LEARNER_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const STARTERS = ["cafe", "directions", "hotel", "meeting", "market", "weekend"] as const;
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
  id: number; passed: boolean; target: string; transcript: string; verdict: CoachVerdict; failures: number; audioUrl: string;
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

/** `learning`: empty only until a new learner picks a language. */
export type Me = { email: string; username: string | null; name: string; picture: string | null; locale: Locale; learning: Language[]; prefs: Record<Language, Prefs>; admin: boolean };
/** `poc`: the pronunciation proof-of-concept recorder is on (development only). `speak`: conversation mode is configured. */
/** `quiz`: the languages with quiz decks. `dailySpendCap`: each learner's free AI credit per UTC day, in USD. */
export type Config = { googleClientId: string | null; devLogin: boolean; poc: boolean; speak: boolean; quiz: Language[]; dailySpendCap: number };
export type LessonProgress = { nextIndex: number; completedAt: string | null };
/** A lesson as the catalog lists it: unit counts per stage instead of the units, which `/api/lessons/:id` serves. */
export type CatalogLesson = Omit<ServedLesson, "units"> & { stages: Record<Stage, number> };
export type CatalogCourse = Omit<ServedCourse, "lessons"> & { lessons: CatalogLesson[] };
export type Catalog = {
  courses: CatalogCourse[];
  /** lessonId -> path -> progress */
  progress: Record<string, Partial<Record<keyof typeof PATHS, LessonProgress>>>;
  /** Course and lesson ids the learner can start. */
  unlocked: string[];
  /** Levels the learner tested out of. */
  passedLevels: string[];
  /** Locked lessons a friend has started, which the learner may play anyway: lessonId -> those friends. */
  viaFriends: Record<string, Person[]>;
  dueCount: number;
  mistakesCount: number;
};
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
export type LessonOut = ServedLesson & { playable: boolean; progress: Catalog["progress"][string] };
export type ReviewOut = { units: ServedUnit[]; dueCount: number };
export type LevelTestOut = { units: ServedUnit[] };

/** Everything anyone may see about an account. `username` is null until they pick one. */
export type Person = { id: number; username: string | null };
/** How the searcher stands with an account. A blocked requester sees `outgoing`. */
export type Relation = "self" | "none" | "outgoing" | "incoming" | "friends" | "blocked";
export type FriendSearchOut = { found: false } | { found: true; id: number; relation: Relation };
export type FriendsOut = {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
  blocked: Person[];
};

/** Rolling windows, in days. */
export const LEADERBOARD_WINDOWS = { day: 1, week: 7, month: 30 } as const;
export type LeaderboardWindow = keyof typeof LEADERBOARD_WINDOWS;
export const LEADERBOARD_SCOPES = ["everyone", "friends"] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];
export const LEADERBOARD_SIZE = 20;
/** Tied lesson counts share a rank. */
export type LeaderboardRow = { rank: number; person: Person; lessons: number; isMe: boolean; isFriend: boolean };
/** `everyone` lists learners with a username and a lesson in the window; `friends` lists the viewer and all friends. `me` is the viewer's row when it falls outside `rows`. */
export type LeaderboardOut = { rows: LeaderboardRow[]; me: LeaderboardRow | null };

export type ActivityWindow = "day" | "week" | "month" | "year";
/** Anyone's profile shows activity volume; `details` is for yourself and friends only. */
export type Profile = {
  person: Person;
  relation: Relation;
  /** The smallest window with at least two lessons completed, else when the last one was. */
  activity: { window: ActivityWindow; lessons: number } | { lastCompletedAt: string } | null;
  lessons: Record<LeaderboardWindow, number>;
  details: {
    name: string;
    email: string;
    picture: string | null;
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
  winnerId: number | null;
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
