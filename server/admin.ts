import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { REPORT_STATUSES, ReviewSchema, TriageSchema, ADMIN_RECENT_DAYS, type AdminReport, type AdminSummary, type ReportStatus } from "../shared/api.ts";
import type { Language } from "../shared/content.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { VOICES, voiceId } from "./content.ts";

type ReportRow = {
  id: number; created_at: string; email: string; username: string | null; kind: AdminReport["kind"]; note: string; answer: string | null;
  unit_id: string; unit_rev: number; language: Language; text: string; voice: string; audio_file: string;
  decision: AdminReport["decision"]; admin_note: string | null; triaged_at: string | null; resolved_at: string | null; resolution: string | null;
  review: AdminReport["review"]; review_note: string | null;
};

const WHERE: Record<ReportStatus, string> = {
  new: "r.triaged_at IS NULL AND r.resolved_at IS NULL",
  triaged: "r.triaged_at IS NOT NULL AND r.resolved_at IS NULL",
  closed: "r.resolved_at IS NOT NULL",
};

export const isAdmin = (deps: AppDeps, user: User) => deps.adminEmails.has(user.email.toLowerCase());

export function registerAdmin(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db, content } = deps;

  app.use("/api/admin/*", async (c, next) => {
    if (!isAdmin(deps, c.get("user"))) throw new HTTPException(403, { message: "Admins only" });
    await next();
  });

  app.get("/api/admin/summary", (c) => {
    const now = deps.now();
    const day = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
    const count = (sql: string, ...params: string[]) => (db.prepare(sql).get(...params) as { n: number }).n;
    return c.json<AdminSummary>({
      users: count("SELECT count(*) AS n FROM users"),
      usersSeenWeek: count("SELECT count(*) AS n FROM users WHERE last_seen_at >= ?", day(7)),
      learnersToday: count("SELECT count(DISTINCT user_id) AS n FROM engaged_time WHERE day = ?", day(0).slice(0, 10)),
      spendMonthUsd: (db.prepare("SELECT coalesce(sum(cost_usd), 0) AS n FROM api_usage WHERE created_at >= ?").get(day(ADMIN_RECENT_DAYS - 1).slice(0, 10)) as { n: number }).n,
      reportsNew: count(`SELECT count(*) AS n FROM reports r WHERE ${WHERE.new}`),
      reportsTriaged: count(`SELECT count(*) AS n FROM reports r WHERE ${WHERE.triaged}`),
      peopleReportsOpen: count("SELECT count(*) AS n FROM user_reports WHERE resolved_at IS NULL"),
      speakReports: count("SELECT count(*) AS n FROM conversation_attempts WHERE reported_at IS NOT NULL"),
    });
  });

  const toReport = (r: ReportRow): AdminReport => {
    const unit = content.locales.en.units.get(r.unit_id);
    const voiceIndex = VOICES[r.language].findIndex((v) => voiceId(v) === r.voice);
    return {
      id: r.id, createdAt: r.created_at, reporter: { email: r.email, username: r.username }, kind: r.kind, note: r.note, answer: r.answer,
      unitId: r.unit_id, unitRev: r.unit_rev, language: r.language, text: r.text, voice: r.voice, audioUrl: `/audio/${r.audio_file}`,
      decision: r.decision, adminNote: r.admin_note, triagedAt: r.triaged_at, resolvedAt: r.resolved_at, resolution: r.resolution,
      review: r.review, reviewNote: r.review_note,
      status: r.resolved_at ? "closed" : r.triaged_at ? "triaged" : "new",
      current: unit
        ? { rev: unit.rev, text: unit.text, translation: unit.translation ?? null, audioUrl: voiceIndex < 0 ? null : unit.audio[voiceIndex] }
        : null,
    };
  };

  const SELECT = `SELECT r.*, u.email, u.username FROM reports r JOIN users u ON u.id = r.user_id`;
  const reportOr404 = (id: number) => {
    const row = db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as ReportRow | undefined;
    if (!row) throw new HTTPException(404, { message: `No report ${id}` });
    return row;
  };
  const openOr409 = (id: number) => {
    const row = reportOr404(id);
    if (row.resolved_at) throw new HTTPException(409, { message: `Report ${id} is closed; reopen it first` });
    return row;
  };
  const Id = z.coerce.number().int();

  app.get("/api/admin/reports", (c) => {
    const status = z.enum(REPORT_STATUSES).parse(c.req.query("status"));
    const rows = db.prepare(`${SELECT} WHERE ${WHERE[status]} ORDER BY r.created_at`).all() as ReportRow[];
    return c.json<AdminReport[]>(rows.map(toReport));
  });

  app.put("/api/admin/reports/:id/triage", async (c) => {
    const id = Id.parse(c.req.param("id"));
    const { decision, note } = TriageSchema.parse(await c.req.json());
    openOr409(id);
    const now = deps.now().toISOString();
    const dismissed = decision === "dismiss";
    db.prepare("UPDATE reports SET decision = ?, admin_note = ?, triaged_at = ?, resolved_at = ?, resolution = ? WHERE id = ?")
      .run(decision, note || null, now, dismissed ? now : null, dismissed ? "dismissed" : null, id);
    return c.json(toReport(reportOr404(id)));
  });

  app.put("/api/admin/reports/:id/review", async (c) => {
    const id = Id.parse(c.req.param("id"));
    const { review, note } = ReviewSchema.parse(await c.req.json());
    if (!openOr409(id).triaged_at) throw new HTTPException(409, { message: `Report ${id} is not triaged` });
    db.prepare("UPDATE reports SET review = ?, review_note = ? WHERE id = ?").run(review, note || null, id);
    return c.json(toReport(reportOr404(id)));
  });

  // A dismissed report goes back to new; one closed after a fix goes back to triaged.
  app.post("/api/admin/reports/:id/reopen", (c) => {
    const id = Id.parse(c.req.param("id"));
    const row = reportOr404(id);
    if (!row.resolved_at) throw new HTTPException(409, { message: `Report ${id} is not closed` });
    if (row.decision === "dismiss")
      db.prepare("UPDATE reports SET decision = NULL, admin_note = NULL, triaged_at = NULL, resolved_at = NULL, resolution = NULL WHERE id = ?").run(id);
    else db.prepare("UPDATE reports SET resolved_at = NULL, resolution = NULL WHERE id = ?").run(id);
    return c.json(toReport(reportOr404(id)));
  });
}
