import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { DEFAULT_PREFS, PrefsSchema, type Prefs } from "../shared/api.ts";
import { LANGUAGES, languageLocale, supportLocale, type Language, type Locale } from "../shared/content.ts";
import type { DB } from "./db.ts";

export type GoogleProfile = { sub: string; email: string };
export type VerifyGoogle = (credential: string) => Promise<GoogleProfile>;
/** `locale` is the learner's own language: translations, explanations and coaching come in it, and so does the UI unless immersed. */
export type User = { id: number; email: string; username: string | null; profilePublic: boolean; installHintDismissed: boolean; prefs: string; locale: Locale };

export const prefsOf = (user: User): Record<Language, Prefs> => {
  const stored = JSON.parse(user.prefs) as Partial<Record<Language, Prefs>>;
  // Defaults fill fields added since the prefs were saved.
  return Object.fromEntries(LANGUAGES.map((l) => [l, PrefsSchema.parse({ ...DEFAULT_PREFS, ...stored[l] })])) as Record<Language, Prefs>;
};

/** The language AI writes glosses in for `language`: the learner's own, or the course's support language if that is the one practiced. */
export const ownLocale = (user: User, language: Language): Locale =>
  user.locale === languageLocale(language) ? supportLocale(language, user.locale) : user.locale;

function immersedLocale(user: User, language: Language, pref: "immerseUi" | "immerseHelp"): Locale {
  if (!prefsOf(user)[language][pref]) return ownLocale(user, language);
  const locale = languageLocale(language);
  if (!locale) throw new Error(`${pref} is on for ${language}, which has no locale`);
  return locale;
}
/** The language of explanations and coaching: the course's own with help immersion on, else as `ownLocale`. */
export const helpLocale = (user: User, language: Language) => immersedLocale(user, language, "immerseHelp");
/** The language of AI-written interface text, such as conversation titles: the course's own with interface immersion on, else as `ownLocale`. */
export const uiLocale = (user: User, language: Language) => immersedLocale(user, language, "immerseUi");

export const SESSION_COOKIE = "lp_session";
export const SESSION_DAYS = 30;

export function googleVerifier(clientId: string): VerifyGoogle {
  const client = new OAuth2Client(clientId);
  return async (credential) => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) throw new Error("Google token has no subject or email");
    if (!p.email_verified) throw new Error("Google email is not verified");
    return { sub: p.sub, email: p.email };
  };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** `locale` is the UI language at sign-in; it is stored for a new user only, so a saved choice wins. */
export function upsertUser(db: DB, profile: GoogleProfile, locale: Locale, now: Date): number {
  const row = db
    .prepare(
      `INSERT INTO users (google_sub, email, locale, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email
       RETURNING id`,
    )
    .get(profile.sub, profile.email, locale, now.toISOString()) as { id: number };
  return row.id;
}

export function createSession(db: DB, userId: number, now: Date): string {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(hashToken(token), userId, now.toISOString(), expires.toISOString());
  return token;
}

export function sessionUser(db: DB, token: string, now: Date): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.username, u.profile_public, u.install_hint_dismissed, u.prefs, u.locale FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now.toISOString()) as (Omit<User, "profilePublic" | "installHintDismissed"> & { profile_public: number; install_hint_dismissed: number }) | undefined;
  if (!row) return null;
  const { profile_public, install_hint_dismissed, ...user } = row;
  return { ...user, profilePublic: profile_public === 1, installHintDismissed: install_hint_dismissed === 1 };
}

export function deleteSession(db: DB, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
