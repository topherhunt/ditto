import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { Locale } from "../shared/content.ts";
import type { DB } from "./db.ts";

export type GoogleProfile = { sub: string; email: string; name: string; picture: string | null };
export type VerifyGoogle = (credential: string) => Promise<GoogleProfile>;
export type User = { id: number; email: string; name: string; picture: string | null; prefs: string; locale: Locale };

export const SESSION_COOKIE = "lp_session";
export const SESSION_DAYS = 30;

export function googleVerifier(clientId: string): VerifyGoogle {
  const client = new OAuth2Client(clientId);
  return async (credential) => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) throw new Error("Google token has no subject or email");
    if (!p.email_verified) throw new Error("Google email is not verified");
    return { sub: p.sub, email: p.email, name: p.name ?? p.email, picture: p.picture ?? null };
  };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** `locale` is the UI language at sign-in; it is stored for a new user only, so a saved choice wins. */
export function upsertUser(db: DB, profile: GoogleProfile, locale: Locale, now: Date): number {
  const row = db
    .prepare(
      `INSERT INTO users (google_sub, email, name, picture, locale, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture
       RETURNING id`,
    )
    .get(profile.sub, profile.email, profile.name, profile.picture, locale, now.toISOString()) as { id: number };
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
      `SELECT u.id, u.email, u.name, u.picture, u.prefs, u.locale FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now.toISOString());
  return (row as User | undefined) ?? null;
}

export function deleteSession(db: DB, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
