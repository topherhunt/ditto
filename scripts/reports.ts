import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// Moves problem reports between production and a dev DB; devops/reports.sh wraps it. Usage:
//   node scripts/reports.ts export <db>                   every report with its reporter, as JSON on stdout
//   node scripts/reports.ts import <db> <file>            make the dev DB's reports mirror an export, keeping local reviews
//   node scripts/reports.ts close <db> <resolution> <id>...  close triaged reports once their fix is deployed
// import and close need a migrated DB: start the app against it once first.

type Exported = Record<string, unknown> & { id: number; reporter: { google_sub: string; email: string; name: string; username: string | null } };
const REPORT_COLUMNS = [
  "id", "unit_id", "unit_rev", "language", "text", "voice", "audio_file", "kind", "answer", "note", "created_at",
  "decision", "admin_note", "triaged_at", "resolved_at", "resolution",
] as const;

const [command, dbPath, ...rest] = process.argv.slice(2);
if (!dbPath) throw new Error("Usage: node scripts/reports.ts export|import|close <db> ...");

if (command === "export") {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db.prepare(
    `SELECT r.*, u.google_sub, u.email, u.name, u.username FROM reports r JOIN users u ON u.id = r.user_id ORDER BY r.id`,
  ).all() as Record<string, unknown>[];
  const reports = rows.map(({ user_id: _, google_sub, email, name, username, ...r }) => ({ ...r, reporter: { google_sub, email, name, username } }));
  console.log(JSON.stringify({ exportedAt: new Date().toISOString(), reports }, null, 2));
} else if (command === "import") {
  const { reports } = JSON.parse(readFileSync(rest[0], "utf8")) as { reports: Exported[] };
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
  try {
    // A reporter's username comes along unless a local account already has it.
    const user = db.prepare(
      `INSERT INTO users (google_sub, email, name, username, created_at)
       VALUES (?1, ?2, ?3, (SELECT ?4 WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?4 COLLATE NOCASE)), ?5)
       ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email, name = excluded.name RETURNING id`,
    );
    // A local review survives only when the local row is the same report, not a dev-only one that shares its id.
    const same = "reports.unit_id = excluded.unit_id AND reports.created_at = excluded.created_at";
    const upsert = db.prepare(
      `INSERT INTO reports (user_id, ${REPORT_COLUMNS.join(", ")}) VALUES (?, ${REPORT_COLUMNS.map(() => "?").join(", ")})
       ON CONFLICT (id) DO UPDATE SET user_id = excluded.user_id, ${REPORT_COLUMNS.slice(1).map((c) => `${c} = excluded.${c}`).join(", ")},
         review = CASE WHEN ${same} THEN reports.review END, review_note = CASE WHEN ${same} THEN reports.review_note END`,
    );
    const ids = reports.map((r) => r.id);
    const dropped = db.prepare(`DELETE FROM reports WHERE id NOT IN (SELECT value FROM json_each(?))`).run(JSON.stringify(ids)).changes;
    for (const r of reports) {
      const { google_sub, email, name, username } = r.reporter;
      const { id: userId } = user.get(google_sub, email, name, username, new Date().toISOString()) as { id: number };
      upsert.run(userId, ...REPORT_COLUMNS.map((c) => r[c] as string | number | null));
    }
    db.exec("COMMIT");
    console.log(`Imported ${reports.length} reports into ${dbPath}; removed ${dropped} local-only reports`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
} else if (command === "close") {
  const [resolution, ...idArgs] = rest;
  const ids = idArgs.map(Number);
  if (!resolution || !ids.length || !ids.every(Number.isInteger)) throw new Error("Usage: node scripts/reports.ts close <db> <resolution> <id>...");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
  try {
    const find = db.prepare("SELECT triaged_at, resolved_at FROM reports WHERE id = ?");
    for (const id of ids) {
      const row = find.get(id) as { triaged_at: string | null; resolved_at: string | null } | undefined;
      if (!row?.triaged_at || row.resolved_at) throw new Error(`Report ${id} is ${!row ? "missing" : row.resolved_at ? "already closed" : "not triaged"}`);
    }
    const close = db.prepare("UPDATE reports SET resolved_at = ?, resolution = ? WHERE id = ?");
    for (const id of ids) close.run(new Date().toISOString(), resolution, id);
    db.exec("COMMIT");
    console.log(`Closed reports ${ids.join(", ")}: ${resolution}`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
} else {
  throw new Error(`Unknown command ${command}; expected export, import or close`);
}
