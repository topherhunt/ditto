import { z } from "zod";
import { LANGUAGES, LOCALES, PATHS, type Language, type Locale, type ServedCourse, type ServedUnit } from "./content.ts";

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

export const REPORT_KINDS = ["audio", "text", "translation", "other"] as const;
export const ReportSchema = z.strictObject({
  unitId: z.string(),
  rev: z.int().positive(),
  /** Index into the unit's `audio`: the voice that played. */
  voice: z.int().min(0),
  kind: z.enum(REPORT_KINDS),
  note: z.string().max(1000),
});
export type ReportBody = z.infer<typeof ReportSchema>;

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

export const ExplainSchema =z.strictObject({ unitId: z.string(), answer: z.string().min(1).max(500) });

export type Me = { email: string; username: string | null; name: string; picture: string | null; locale: Locale; prefs: Record<Language, Prefs> };
export type Config = { googleClientId: string | null; devLogin: boolean };
export type LessonProgress = { nextIndex: number; completedAt: string | null };
export type Catalog = {
  courses: ServedCourse[];
  /** lessonId -> path -> progress */
  progress: Record<string, Partial<Record<keyof typeof PATHS, LessonProgress>>>;
  /** Course and lesson ids the learner can start. */
  unlocked: string[];
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
export type ReviewOut = { units: ServedUnit[]; dueCount: number };

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
