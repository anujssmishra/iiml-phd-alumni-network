import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { databasePath, requireRegularFile } from "./database-access.mjs";
import { migrationFiles, schema } from "./migration-lineage.mjs";

export const originalChecksum = "b9a220be717c89cdd110cab67747da95f651ddce9b15ba14710cf9b047168776";
const pins = [
  ["20261011000000_foundation", "44cddba5e165fccd5ac6d752a65e8590490b9962846097d8d50e5c9e3c67e00b"],
  ["20261011000001_conference_curation", "93388d33c37d378fe3b82a8125570c21d35c6f7cc9df9350a941807b882d1b6b"],
  ["20261012000000_attendee_participation", "c2894567308511c3296758f86d829b36413ffd3727eb7c083b1cac81196921b0"],
  ["20261019000000_conference_review", "622e67a6e0beaee2ede3528fe17ee39f4c9693c394b07ba965d77c72a797b7dc"],
];
export const sha256 = value => createHash("sha256").update(value).digest("hex");

export function repairSources() {
  const files = migrationFiles();
  const original = readFileSync(new URL("./legacy-migrations/20261011000001_conference_curation.sql", import.meta.url), "utf8");
  if (sha256(original) !== originalChecksum || JSON.stringify(files.map(f => [f.name, f.checksum])) !== JSON.stringify(pins)) {
    throw new Error("Repair SQL/version pins differ from the rehearsed sources; this checkout requires a new repair review.");
  }
  return { files, original };
}

export function referenceDatabase(prefix, legacy = false) {
  const { files, original } = repairSources();
  const db = new DatabaseSync(":memory:");
  try {
    for (const [index, file] of files.slice(0, prefix).entries()) db.exec(legacy && index === 1 ? original : file.sql);
    return db;
  } catch (error) { db.close(); throw error; }
}

/** @param {import('node:sqlite').DatabaseSync} db */
export function migrationHistory(db) {
  return db.prepare("SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations ORDER BY migration_name, id").all();
}

export function assertDatabaseIntegrity(db) {
  const check = db.prepare("PRAGMA integrity_check").all();
  if (check.length !== 1 || check[0].integrity_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Repair requires clean SQLite integrity and foreign keys.");
}

export function legacyPlanFromConnection(db) {
  const { files } = repairSources();
  assertDatabaseIntegrity(db);
  if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE name='_prisma_migrations' AND type='table'").get()) throw new Error("No supported migration history exists.");
  const history = migrationHistory(db);
  const original = history.filter(row => row.migration_name === files[1].name);
  if (original.length !== 1 || original[0].checksum !== originalChecksum || original[0].rolled_back_at !== null) throw new Error("Repair supports exactly one original conference attempt, without prior reconciliation or retries.");
  const failed = original[0].finished_at === null;
  const targetPrefix = failed ? 2 : history.length;
  if (history.length < 2 || history.length > files.length || (failed && history.length !== 2)) throw new Error("Unsupported migration suffix or additional failed attempts.");
  for (const [index, row] of history.entries()) {
    if (row.migration_name !== files[index].name || (index !== 1 && (row.checksum !== files[index].checksum || row.finished_at === null || row.rolled_back_at !== null))) throw new Error("Unknown checksum, failure, or non-prefix history; case-specific review required.");
  }
  const actual = schema(db);
  const expected = referenceDatabase(failed ? 1 : targetPrefix, true);
  let kind = failed ? "failed-no-ddl" : "original-applied";
  try {
    if (failed && JSON.stringify(actual) !== JSON.stringify(schema(expected))) {
      expected.exec('ALTER TABLE "Conference" ADD COLUMN "acronym" TEXT');
      kind = "failed-acronym";
    }
    if (JSON.stringify(actual) !== JSON.stringify(schema(expected))) throw new Error("Legacy schema differs from the exact supported state; no repair was selected.");
  } finally { expected.close(); }
  const lineageSha = sha256(JSON.stringify({ version: 1, pins, history, schema: actual }));
  return { eligible: true, kind, lineageSha, targetPrefix, pendingMigrations: files.slice(targetPrefix).map(f => f.name), originalChecksum, replacementChecksum: files[1].checksum };
}

export function inspectLegacyRepair(filename = databasePath()) {
  requireRegularFile(filename);
  const db = new DatabaseSync(filename, { readOnly: true, timeout: 0 });
  try { return legacyPlanFromConnection(db); }
  finally { db.close(); }
}

export const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`;

// Stream typed rows in a deterministic order. No private records or individual
// values are logged; hashes/counts stay in the owner-only repair manifest.
export function tableEvidence(db, table, columns) {
  const projection = columns.map(quoteIdentifier).join(", ");
  const statement = db.prepare(`SELECT ${projection} FROM ${quoteIdentifier(table)} ORDER BY ${projection}`);
  statement.setReadBigInts(true);
  const digest = createHash("sha256");
  let rows = 0;
  for (const row of statement.iterate()) {
    digest.update(JSON.stringify(row, (_key, value) => typeof value === "bigint" ? { integer: value.toString() } : value));
    digest.update("\n"); rows++;
  }
  return { table, columns, rows, sha256: digest.digest("hex") };
}

export function preservationEvidence(db) {
  return schema(db).filter(row => row.type === "table").map(row => {
    const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(row.name)})`).all().map(c => c.name);
    return tableEvidence(db, row.name, columns);
  });
}
