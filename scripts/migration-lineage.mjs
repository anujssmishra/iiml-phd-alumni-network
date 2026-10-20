import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { databasePath, requireRegularFile } from "./database-access.mjs";

export function migrationFiles() {
  const directory = resolve("prisma/migrations");
  return readdirSync(directory).filter(name => /^\d{14}_[a-z_]+$/.test(name)).sort().map(name => {
    const sql = readFileSync(join(directory, name, "migration.sql"), "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  });
}

export function schema(db) {
  return db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY type, name").all();
}

// Read-only metadata inventory: never reset data, resolve checksums or print
// membership/session records. Unknown or failed histories block deployment.
export function inspectMigrationLineage(filename = databasePath()) {
  requireRegularFile(filename);
  const db = new DatabaseSync(filename, { readOnly: true, timeout: 0 });
  try {
    const files = migrationFiles();
    const hasHistory = db.prepare("SELECT 1 FROM sqlite_schema WHERE name='_prisma_migrations' AND type='table'").get();
    const history = hasHistory ? db.prepare("SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at, id").all() : [];
    // Several fast migrations may share a timestamp. IDs are random UUIDs,
    // not an execution order; compare the unique migration-name prefix.
    const applied = history.filter(row => row.finished_at !== null && row.rolled_back_at === null).sort((a, b) => a.migration_name.localeCompare(b.migration_name));
    const failed = history.filter(row => row.finished_at === null && row.rolled_back_at === null);
    const base = { path: filename, history, applied: applied.map(row => row.migration_name) };
    if (failed.length) return { ...base, status: "failed-migration", safeToDeploy: false, reason: "An unresolved failed migration requires a populated disposable-copy repair rehearsal; do not blindly mark it applied or reset data." };
    if (!hasHistory && schema(db).length) return { ...base, status: "unmanaged-schema", safeToDeploy: false, reason: "Tables exist without migration history; explicit operator-reviewed baselining is required." };
    for (const [index, row] of applied.entries()) {
      if (!files[index] || files[index].name !== row.migration_name) return { ...base, status: "non-prefix-history", safeToDeploy: false, reason: "Applied migrations are not a supported prefix of this checkout." };
      if (row.checksum !== files[index].checksum) return { ...base, status: "checksum-mismatch", safeToDeploy: false, reason: `Applied SQL differs for ${row.migration_name}. Inventory the original SQL and actual schema; no automatic checksum reconciliation is allowed.` };
    }
    const expected = new DatabaseSync(":memory:");
    try {
      for (const file of files.slice(0, applied.length)) expected.exec(file.sql);
      if (JSON.stringify(schema(db)) !== JSON.stringify(schema(expected))) return { ...base, status: "schema-drift", safeToDeploy: false, reason: "Schema differs from the recorded migration prefix; rehearse a forward repair on a disposable populated copy." };
    } finally { expected.close(); }
    if (db.prepare("PRAGMA foreign_key_check").all().length) return { ...base, status: "foreign-key-failure", safeToDeploy: false, reason: "Foreign-key violations require investigation before migration." };
    const integrity = db.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") return { ...base, status: "integrity-failure", safeToDeploy: false, reason: "SQLite integrity check failed; investigate or restore a verified snapshot." };
    return { ...base, status: applied.length ? (applied.length === files.length ? "current" : "supported-prefix") : "fresh", safeToDeploy: true, reason: "Checksums, schema and foreign keys match the supported migration prefix." };
  } finally { db.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/migration-lineage.mjs")) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  try {
    const result = inspectMigrationLineage();
    console.log(JSON.stringify(result, null, 2));
    if (!result.safeToDeploy) process.exitCode = 1;
  } catch (error) { console.error(`[lineage] ${error.message}`); process.exitCode = 1; }
}
