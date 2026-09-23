import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type DB = DatabaseSync;

const MIGRATIONS = join(import.meta.dirname, "migrations");

/** Opens the DB and applies numbered migrations (`NNN-name.sql`) above `PRAGMA user_version`. */
export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const current = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const version = Number(file.split("-")[0]);
    if (!Number.isInteger(version) || version <= 0) throw new Error(`Bad migration filename: ${file}`);
    if (version <= current) continue;
    transaction(db, () => {
      db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
      db.exec(`PRAGMA user_version = ${version}`);
    });
  }
  return db;
}

export function transaction<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
