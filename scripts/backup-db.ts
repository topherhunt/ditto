import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Usage: node scripts/backup-db.ts <db path> <backup dir> <copies to keep>
// VACUUM INTO writes a consistent snapshot while the app keeps writing (WAL), with no sqlite3 CLI needed.
const [dbPath, dir, keepArg] = process.argv.slice(2);
const keep = Number(keepArg);
if (!dbPath || !dir || !Number.isInteger(keep) || keep < 1) throw new Error("Usage: node scripts/backup-db.ts <db> <dir> <keep>");

mkdirSync(dir, { recursive: true });
const out = join(dir, `app-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
const db = new DatabaseSync(dbPath, { readOnly: true });
db.exec(`VACUUM INTO '${out.replaceAll("'", "''")}'`);
db.close();

const pruned = readdirSync(dir).filter((f) => /^app-.*\.db$/.test(f)).sort().slice(0, -keep);
for (const f of pruned) rmSync(join(dir, f));
console.log(`Backed up ${dbPath} -> ${out}; pruned ${pruned.length}`);
