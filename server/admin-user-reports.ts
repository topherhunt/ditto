import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { USER_REPORT_ACTIONS, type AdminUserReport, type UserReportReason, type UserReportResolution } from "../shared/api.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { transaction } from "./db.ts";

type Row = {
  id: number; reporter_id: string; reporter_name: string | null; reported_id: string; reported_name: string | null; reported_user: number;
  reason: UserReportReason; note: string | null; username: string | null; blurb: string | null; on_board: number; blurb_now: string | null;
  created_at: string; resolved_at: string | null; resolution: UserReportResolution | null;
};

/** /admin/user-reports: learners reporting other learners. `/api/admin/*` is admin-only (server/admin.ts). */
export function registerAdminUserReports(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const SELECT = `
    SELECT r.*, a.public_id AS reporter_id, a.username AS reporter_name, b.public_id AS reported_id, b.username AS reported_name,
      r.reported_id AS reported_user, fb.user_id IS NOT NULL AS on_board, fb.blurb AS blurb_now
    FROM user_reports r JOIN users a ON a.id = r.reporter_id JOIN users b ON b.id = r.reported_id
    LEFT JOIN friend_board fb ON fb.user_id = r.reported_id`;
  const toReport = (r: Row): AdminUserReport => ({
    id: r.id, reporter: { id: r.reporter_id, username: r.reporter_name }, reported: { id: r.reported_id, username: r.reported_name },
    reason: r.reason, note: r.note, username: r.username, blurb: r.blurb, onBoard: r.on_board === 1, blurbNow: r.blurb_now,
    createdAt: r.created_at, resolvedAt: r.resolved_at, resolution: r.resolution,
  });

  app.get("/api/admin/user-reports", (c) =>
    c.json<AdminUserReport[]>((db.prepare(`${SELECT} ORDER BY r.resolved_at IS NOT NULL, r.created_at DESC`).all() as Row[]).map(toReport)));

  app.post("/api/admin/user-reports/:id/:action", (c) => {
    const id = z.coerce.number().int().parse(c.req.param("id"));
    const action = z.enum(Object.keys(USER_REPORT_ACTIONS) as [keyof typeof USER_REPORT_ACTIONS]).parse(c.req.param("action"));
    const row = db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as Row | undefined;
    if (!row) throw new HTTPException(404, { message: `No report ${id}` });
    if (row.resolved_at) throw new HTTPException(409, { message: `Report ${id} is already resolved` });
    const resolution = USER_REPORT_ACTIONS[action];
    transaction(db, () => {
      if (action === "take-down") db.prepare("DELETE FROM friend_board WHERE user_id = ?").run(row.reported_user);
      // The app asks a learner without a username to pick one before anything else.
      if (action === "clear-username") db.prepare("UPDATE users SET username = NULL WHERE id = ?").run(row.reported_user);
      // One action settles every open report about the same thing, so the operator never handles it twice.
      const also = action === "dismiss" ? "id = ?2" : action === "take-down" ? "reason = 'board_post'" : "reason = 'username'";
      db.prepare(`UPDATE user_reports SET resolved_at = ?1, resolution = ?3 WHERE resolved_at IS NULL AND (id = ?2 OR (reported_id = ?4 AND ${also}))`)
        .run(deps.now().toISOString(), id, resolution, row.reported_user);
    });
    return c.json(toReport(db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as Row));
  });
}
