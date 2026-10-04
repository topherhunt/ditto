import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  FEEDBACK_PER_DAY, FEEDBACK_TAG_LIST, FeedbackHandledSchema, FeedbackSchema, FeedbackUpdateSchema,
  type AdminFeedback, type AdminFeedbackOut, type FeedbackOut, type FeedbackTag,
} from "../shared/api.ts";
import type { AppDeps } from "./app.ts";
import type { User } from "./auth.ts";
import { transaction } from "./db.ts";

type Row = {
  id: number; mood: number | null; message: string | null; may_contact: number; page: string; locale: string; created_at: string;
  handled_at: string | null; admin_note: string | null; public_id: string; username: string | null; email: string; tags: string;
};

const Id = z.coerce.number().int();

/** In-app feedback: a learner's own rows (one is created by a mood tap and filled in later) and the operator's list. */
export function registerFeedback(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const saveTags = (id: number, tags: FeedbackTag[]) => {
    db.prepare("DELETE FROM feedback_tags WHERE feedback_id = ?").run(id);
    for (const tag of new Set(tags)) db.prepare("INSERT INTO feedback_tags (feedback_id, tag) VALUES (?, ?)").run(id, tag);
  };
  const out = (id: number): FeedbackOut => {
    const r = db.prepare("SELECT id, mood, message, may_contact FROM feedback WHERE id = ?").get(id) as Pick<Row, "id" | "mood" | "message" | "may_contact">;
    const tags = (db.prepare("SELECT tag FROM feedback_tags WHERE feedback_id = ? ORDER BY tag").all(id) as { tag: FeedbackTag }[]).map((x) => x.tag);
    return { id: r.id, mood: r.mood, tags, message: r.message ?? "", mayContact: r.may_contact === 1 };
  };
  const ownedOr404 = (c: { req: { param: (k: string) => string }; get: (k: "user") => User }) => {
    const id = Id.parse(c.req.param("id"));
    if (!db.prepare("SELECT 1 FROM feedback WHERE id = ? AND user_id = ?").get(id, c.get("user").id)) throw new HTTPException(404, { message: `No feedback ${id}` });
    return id;
  };

  app.post("/api/feedback", async (c) => {
    const user = c.get("user");
    const body = FeedbackSchema.parse(await c.req.json());
    const since = new Date(deps.now().getTime() - 86_400_000).toISOString();
    const { n } = db.prepare("SELECT count(*) AS n FROM feedback WHERE user_id = ? AND created_at >= ?").get(user.id, since) as { n: number };
    // 503, not 429: the client treats every 429 as the daily AI spend cap.
    if (n >= FEEDBACK_PER_DAY) throw new HTTPException(503, { message: "That's a lot of feedback for one day. Please try again tomorrow." });
    const id = transaction(db, () => {
      const { lastInsertRowid } = db.prepare("INSERT INTO feedback (user_id, mood, message, may_contact, page, locale, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(user.id, body.mood, body.message || null, body.mayContact ? 1 : 0, body.page, user.locale, deps.now().toISOString());
      saveTags(Number(lastInsertRowid), body.tags);
      return Number(lastInsertRowid);
    });
    return c.json<FeedbackOut>(out(id));
  });

  app.get("/api/feedback/:id", (c) => c.json<FeedbackOut>(out(ownedOr404(c))));

  app.put("/api/feedback/:id", async (c) => {
    const id = ownedOr404(c);
    const body = FeedbackUpdateSchema.parse(await c.req.json());
    transaction(db, () => {
      db.prepare("UPDATE feedback SET mood = ?, message = ?, may_contact = ? WHERE id = ?").run(body.mood, body.message || null, body.mayContact ? 1 : 0, id);
      saveTags(id, body.tags);
    });
    return c.json<FeedbackOut>(out(id));
  });
}

/** Registered after `registerAdmin`, whose middleware makes `/api/admin/*` admin-only. */
export function registerAdminFeedback(app: Hono<{ Variables: { user: User } }>, deps: AppDeps) {
  const { db } = deps;
  const SELECT = `
    SELECT f.*, u.public_id AS public_id, u.username, u.email,
      coalesce((SELECT group_concat(tag) FROM feedback_tags WHERE feedback_id = f.id), '') AS tags
    FROM feedback f JOIN users u ON u.id = f.user_id`;
  const toItem = (r: Row): AdminFeedback => ({
    id: r.id, user: { id: r.public_id, username: r.username }, email: r.may_contact === 1 ? r.email : null, mood: r.mood,
    tags: (r.tags ? r.tags.split(",") : []) as FeedbackTag[], message: r.message ?? "", mayContact: r.may_contact === 1, page: r.page, locale: r.locale,
    createdAt: r.created_at, handledAt: r.handled_at, adminNote: r.admin_note,
  });

  app.get("/api/admin/feedback", (c) => {
    const items = (db.prepare(`${SELECT} ORDER BY f.handled_at IS NOT NULL, f.created_at DESC, f.id DESC`).all() as Row[]).map(toItem);
    const moods = [1, 2, 3, 4, 5].map((m) => items.filter((i) => i.mood === m).length);
    const counts = new Map(FEEDBACK_TAG_LIST.map((tag) => [tag, 0]));
    for (const i of items) for (const tag of i.tags) counts.set(tag, counts.get(tag)! + 1);
    const tags = [...counts].filter(([, count]) => count > 0).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
    return c.json<AdminFeedbackOut>({ moods, tags, items });
  });

  app.post("/api/admin/feedback/:id", async (c) => {
    const id = Id.parse(c.req.param("id"));
    const { handled, note } = FeedbackHandledSchema.parse(await c.req.json());
    const { changes } = db.prepare("UPDATE feedback SET handled_at = ?, admin_note = ? WHERE id = ?").run(handled ? deps.now().toISOString() : null, note || null, id);
    if (changes === 0) throw new HTTPException(404, { message: `No feedback ${id}` });
    return c.json<AdminFeedback>(toItem(db.prepare(`${SELECT} WHERE f.id = ?`).get(id) as Row));
  });
}
