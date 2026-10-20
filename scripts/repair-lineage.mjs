import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { databasePath } from "./database-access.mjs";
import { assertDatabaseIntegrity, inspectLegacyRepair, legacyPlanFromConnection, migrationHistory, preservationEvidence, quoteIdentifier, referenceDatabase, repairSources, tableEvidence } from "./legacy-lineage.mjs";
import { inspectMigrationLineage, schema } from "./migration-lineage.mjs";
import { createMaintenanceMarker, releaseMaintenanceMarker, requireStoppedClients, snapshotConnection, snapshotFile, syncFile, validateDatabase, writeRecoveryManifest } from "./database-recovery.mjs";

/** Only private candidate copies are modified. This is not an install command.
 * @param {{offline?: boolean, expectedLineageSha?: string, onPhase?: (phase: string, db: import('node:sqlite').DatabaseSync) => void}} options
 */
export function createLegacyRepairCandidate(options = {}) {
  if (options.offline !== true || !/^[a-f0-9]{64}$/.test(options.expectedLineageSha ?? "")) throw new Error("Candidate creation requires --offline and --expect-lineage <SHA from --inspect>.");
  const active = databasePath();
  const marker = createMaintenanceMarker(active, "legacy-repair-copy");
  let directory;
  let manifest;
  let record;
  try {
    requireStoppedClients(active);
    directory = mkdtempSync(`${active}.recovery-`);
    const safety = join(directory, "before-repair.db");
    const candidate = join(directory, "repaired-candidate.db");
    manifest = join(directory, "repair.json");
    const source = new DatabaseSync(active, { timeout: 0 });
    let plan;
    try {
      source.prepare("SELECT count(*) FROM sqlite_schema").get();
      source.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; COMMIT;");
      plan = legacyPlanFromConnection(source);
      if (plan.lineageSha !== options.expectedLineageSha) throw new Error("Lineage changed since inspection; obtain a fresh plan before repair.");
      snapshotConnection(source, safety);
    } finally { source.close(); }
    snapshotFile(safety, candidate);
    record = { version: 1, operation: "legacy-repair-copy", active, safety, candidate, plan, sourceReplaced: false };
    writeRecoveryManifest(manifest, { ...record, phase: "prepared" });
    const result = repairCandidate(candidate, options.expectedLineageSha, options.onPhase);
    syncFile(candidate);
    validateDatabase(candidate);
    const acceptance = inspectMigrationLineage(candidate);
    if (!acceptance.safeToDeploy) throw new Error("Repaired candidate did not pass deployment preflight.");
    writeRecoveryManifest(manifest, { ...record, ...result, phase: "verified" });
    return { candidate, safety, manifest, kind: plan.kind, pendingMigrations: plan.pendingMigrations, sourceReplaced: false };
  } catch (error) {
    if (manifest && record) writeRecoveryManifest(manifest, { ...record, phase: "rejected" });
    throw new Error(`Legacy repair candidate refused or failed; source database was not replaced.${directory ? ` Private evidence: ${directory}` : ""}`, { cause: error });
  } finally { releaseMaintenanceMarker(marker); }
}

function repairCandidate(filename, expectedLineageSha, onPhase) {
  const db = new DatabaseSync(filename, { timeout: 0 });
  let reference;
  let inTransaction = false;
  try {
    const plan = legacyPlanFromConnection(db);
    if (plan.lineageSha !== expectedLineageSha) throw new Error("Candidate snapshot does not match the inspected lineage.");
    reference = referenceDatabase(plan.targetPrefix);
    const beforeHistory = migrationHistory(db);
    const preserved = preservationEvidence(db);
    const conference = preserved.find(t => t.table === "Conference");
    const create = reference.prepare("SELECT sql FROM sqlite_schema WHERE name='Conference'").get().sql;
    const rebuild = create.replace('CREATE TABLE "Conference"', 'CREATE TABLE "_repair_Conference"');
    if (rebuild === create) throw new Error("Unexpected target table definition.");
    db.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
    inTransaction = true;
    db.exec(rebuild);
    const columns = reference.prepare("PRAGMA table_info(Conference)").all().map(c => c.name);
    const mapped = columns.filter(c => conference.columns.includes(c) || ["startDate", "endDate"].includes(c));
    const values = mapped.map(c => quoteIdentifier(conference.columns.includes(c) ? c : "date"));
    db.exec(`INSERT INTO "_repair_Conference" (${mapped.map(quoteIdentifier).join(", ")}) SELECT ${values.join(", ")} FROM "Conference";
      DROP TABLE "Conference"; ALTER TABLE "_repair_Conference" RENAME TO "Conference";`);
    for (const index of schema(reference).filter(row => row.type === "index" && row.tbl_name === "Conference")) db.exec(index.sql);
    if (plan.kind.startsWith("failed-")) {
      for (const item of schema(reference).filter(row => row.tbl_name === "ConferenceSuggestion").sort((a, b) => (a.type === "table" ? -1 : 1) - (b.type === "table" ? -1 : 1))) db.exec(item.sql);
    }
    onPhase?.("schema-built", db);
    if (JSON.stringify(schema(db)) !== JSON.stringify(schema(reference))) throw new Error("Rebuilt schema does not match the pinned current migration prefix.");
    // Only after actual normalization: reconcile the exact known old metadata.
    const { files } = repairSources();
    const old = beforeHistory.find(row => row.migration_name === files[1].name);
    if (plan.kind === "original-applied") {
      db.prepare("UPDATE _prisma_migrations SET checksum=? WHERE id=? AND checksum=?").run(files[1].checksum, old.id, old.checksum);
    } else {
      // Retain the failed attempt and its error log; supersede it with a new
      // completed record only for the schema that has actually been built.
      db.prepare("UPDATE _prisma_migrations SET rolled_back_at=CURRENT_TIMESTAMP WHERE id=? AND finished_at IS NULL AND rolled_back_at IS NULL").run(old.id);
      db.prepare("INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES(?,?,?,CURRENT_TIMESTAMP,1)").run(randomUUID(), files[1].checksum, files[1].name);
    }
    onPhase?.("metadata-reconciled", db);
    assertDatabaseIntegrity(db);
    if (JSON.stringify(schema(db)) !== JSON.stringify(schema(reference))) throw new Error("Candidate schema changed during verification.");
    for (const item of preserved) {
      if (JSON.stringify(tableEvidence(db, item.table, item.columns)) !== JSON.stringify(item)) throw new Error(`Repair changed existing records in ${item.table}; transaction refused.`);
    }
    if (plan.kind.startsWith("failed-") && db.prepare('SELECT count(*) AS n FROM Conference WHERE startDate IS NOT date OR endDate IS NOT date').get().n !== 0) throw new Error("Legacy date backfill did not preserve calendar values.");
    const afterHistory = migrationHistory(db);
    const inserted = afterHistory.filter(row => !beforeHistory.some(before => before.id === row.id));
    if (inserted.length !== (plan.kind === "original-applied" ? 0 : 1) || afterHistory.length !== beforeHistory.length + inserted.length) throw new Error("Unexpected migration-history additions/removals.");
    for (const before of beforeHistory) {
      const after = afterHistory.find(row => row.id === before.id);
      if (!after) throw new Error("Original migration history was removed.");
      const expected = before.id !== old.id ? before : plan.kind === "original-applied" ? { ...before, checksum: files[1].checksum } : { ...before, rolled_back_at: after.rolled_back_at };
      if ((before.id === old.id && plan.kind !== "original-applied" && after.rolled_back_at === null) || JSON.stringify(after) !== JSON.stringify(expected)) throw new Error("Unexpected change to original migration history or diagnostic logs.");
    }
    if (inserted.some(row => row.migration_name !== files[1].name || row.checksum !== files[1].checksum || row.finished_at === null || row.rolled_back_at !== null || row.applied_steps_count !== 1 || row.logs !== null)) throw new Error("New completion record does not describe the normalized migration.");
    if (plan.kind.startsWith("failed-") && db.prepare("SELECT count(*) AS n FROM ConferenceSuggestion").get().n !== 0) throw new Error("Repair invented suggestion records.");
    db.exec("COMMIT; PRAGMA foreign_keys=ON;");
    inTransaction = false;
    const headers = rows => rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "logs")));
    return { preserved, beforeHistory: headers(beforeHistory), afterHistory: headers(afterHistory) };
  } catch (error) {
    if (inTransaction) db.exec("ROLLBACK");
    throw error;
  } finally { reference?.close(); db.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/repair-lineage.mjs")) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--inspect") console.log(JSON.stringify(inspectLegacyRepair(), null, 2));
    else if (args.length === 3 && args[0] === "--offline" && args[1] === "--expect-lineage") console.log(JSON.stringify(createLegacyRepairCandidate({ offline: true, expectedLineageSha: args[2] }), null, 2));
    else throw new Error("Usage: npm run db:repair-lineage -- --inspect | --offline --expect-lineage <SHA>. Creates a candidate copy only.");
  } catch (error) {
    console.error(`[repair] ${error.message}${error.cause instanceof Error ? ` Cause: ${error.cause.message}` : ""}`);
    process.exitCode = 1;
  }
}
