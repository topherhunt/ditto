import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDb, type DB } from "../../server/db.ts";

const script = join(import.meta.dirname, "../../scripts/reports.ts");
const run = (...args: string[]) => execFileSync("node", [script, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function makeDb(dir: string, name: string, sub: string, username: string): { path: string; db: DB } {
  const path = join(dir, `${name}.db`);
  const db = openDb(path);
  db.prepare("INSERT INTO users (google_sub, email, username, created_at) VALUES (?, ?, ?, ?)").run(sub, `${name}@x.com`, username, "2026-01-01");
  return { path, db };
}
function addReport(db: DB, unitId: string, triaged = false) {
  db.prepare(
    `INSERT INTO reports (user_id, unit_id, unit_rev, language, text, voice, audio_file, kind, note, created_at, decision, admin_note, triaged_at)
     VALUES (1, ?, 1, 'it', 'Ciao', 'openai:marin', 'it/a.m4a', 'audio', '', '2026-01-01', ?, ?, ?)`,
  ).run(unitId, triaged ? "fix_audio" : null, triaged ? "mumbled" : null, triaged ? "2026-01-02" : null);
}

describe("scripts/reports.ts", () => {
  it("mirrors production's reports into a dev DB, keeping local reviews and dropping local-only reports", () => {
    const dir = mkdtempSync(join(tmpdir(), "reports-"));
    const prod = makeDb(dir, "prod", "g-1", "topher");
    addReport(prod.db, "u-a");
    addReport(prod.db, "u-b", true);
    const dev = makeDb(dir, "dev", "dev:me", "topher");
    addReport(dev.db, "local-junk");
    addReport(dev.db, "local-junk-2");
    addReport(dev.db, "local-junk-3");
    // Dev-only report 1 shares an id with a production report; its review must not carry over to it.
    dev.db.prepare("UPDATE reports SET review = 'rejected', review_note = 'x' WHERE id = 1").run();

    const file = join(dir, "export.json");
    writeFileSync(file, run("export", prod.path));
    expect(run("import", dev.path, file)).toContain("Imported 2 reports into");
    dev.db.prepare("UPDATE reports SET review = 'approved' WHERE id = 2").run();
    expect(run("import", dev.path, file)).toContain("removed 0 local-only reports");

    expect(dev.db.prepare(
      "SELECT r.id, r.unit_id, r.decision, r.review, r.review_note, u.google_sub, u.username FROM reports r JOIN users u ON u.id = r.user_id ORDER BY r.id",
    ).all()).toEqual([
      // The prod reporter's username is taken locally, so the imported account has none.
      { id: 1, unit_id: "u-a", decision: null, review: null, review_note: null, google_sub: "g-1", username: null },
      { id: 2, unit_id: "u-b", decision: "fix_audio", review: "approved", review_note: null, google_sub: "g-1", username: null },
    ]);
  });

  it("closes on production the reports approved or closed in the dev DB, skipping ones already closed there", () => {
    const dir = mkdtempSync(join(tmpdir(), "reports-"));
    const prod = makeDb(dir, "prod", "g-1", "topher");
    for (const unit of ["u-a", "u-b", "u-c", "u-d"]) addReport(prod.db, unit, true);
    prod.db.prepare("UPDATE reports SET resolved_at = '2026-01-03', resolution = 'dismissed' WHERE id = 4").run();
    const dev = makeDb(dir, "dev", "dev:me", "topher");
    const file = join(dir, "export.json");
    writeFileSync(file, run("export", prod.path));
    run("import", dev.path, file);
    dev.db.prepare("UPDATE reports SET review = 'approved' WHERE id = 1").run();
    dev.db.prepare("UPDATE reports SET review = 'rejected' WHERE id = 2").run();
    dev.db.prepare("UPDATE reports SET resolved_at = '2026-01-04', resolution = 'voice dropped' WHERE id = 3").run();

    expect(run("close", prod.path, run("closures", dev.path))).toContain("Closed 1, 3; already closed 4");
    expect(prod.db.prepare("SELECT id, resolution FROM reports WHERE resolved_at IS NOT NULL ORDER BY id").all()).toEqual([
      { id: 1, resolution: "Fixed; the new version was approved in review" }, { id: 3, resolution: "voice dropped" }, { id: 4, resolution: "dismissed" },
    ]);
  });

  it("refuses the whole batch if a report is untriaged or is a different report on production", () => {
    const dir = mkdtempSync(join(tmpdir(), "reports-"));
    const prod = makeDb(dir, "prod", "g-1", "topher");
    addReport(prod.db, "u-a");
    addReport(prod.db, "u-b", true);
    const closure = (id: number, unit_id: string) => ({ id, unit_id, created_at: "2026-01-01", resolution: "fixed" });
    expect(() => run("close", prod.path, JSON.stringify([closure(2, "u-b"), closure(1, "u-a")]))).toThrow(/Report 1 is not triaged/);
    expect(() => run("close", prod.path, JSON.stringify([closure(2, "u-other")]))).toThrow(/Report 2 on production is a different report/);
    expect(prod.db.prepare("SELECT count(*) AS n FROM reports WHERE resolved_at IS NOT NULL").get()).toEqual({ n: 0 });
  });
});
