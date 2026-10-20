import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { chmodSync, closeSync, existsSync, fsyncSync, linkSync, mkdirSync, mkdtempSync, openSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { databasePath, leaseProcessIsAlive, requirePrivateDirectory, requireRegularFile } from "./database-access.mjs";

export function syncFile(filename) {
  const descriptor = openSync(filename, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

export function assertNoSidecars(filename) {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${filename}${suffix}`)) throw new Error(`Database is not a standalone snapshot; preserve its SQLite sidecars: ${filename}`);
  }
}

export function validateDatabase(filename) {
  requireRegularFile(filename);
  const db = new DatabaseSync(filename, { readOnly: true, timeout: 0 });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") throw new Error("SQLite integrity check failed.");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("SQLite foreign-key check failed.");
    for (const table of ["User", "Conference", "ConferenceAttendee"]) {
      if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table)) throw new Error(`Not an alumni-network database: missing ${table}.`);
    }
  } finally { db.close(); }
}

// Binding the filename handles quotes without SQL interpolation. VACUUM reads
// committed WAL state; the private staging directory protects initial creation.
export function snapshotConnection(db, destination) {
  if (existsSync(destination)) throw new Error("Snapshot destination already exists.");
  requirePrivateDirectory(dirname(destination));
  db.exec("PRAGMA synchronous=FULL");
  db.prepare("VACUUM INTO ?").run(destination);
  chmodSync(destination, 0o600);
  const snapshot = new DatabaseSync(destination);
  try { snapshot.exec("PRAGMA journal_mode=DELETE"); } finally { snapshot.close(); }
  syncFile(destination);
  assertNoSidecars(destination);
  validateDatabase(destination);
}

export function snapshotFile(source, destination) {
  requireRegularFile(source);
  const db = new DatabaseSync(source, { readOnly: true, timeout: 0 });
  try { snapshotConnection(db, destination); } finally { db.close(); }
}

export function publishSnapshot(candidate, destination) {
  // Atomic no-clobber publication: unlike rename, link refuses an existing name.
  linkSync(candidate, destination);
  syncFile(dirname(destination));
}

export function requireStoppedClients(filename) {
  const leases = `${filename}.access`;
  if (existsSync(leases)) {
    requirePrivateDirectory(leases);
    for (const entry of readdirSync(leases)) {
      if (leaseProcessIsAlive(join(leases, entry))) throw new Error("A managed database client is still running; stop the app and every writer before restore.");
    }
  }
  // Mandatory on supported single-user local-volume Linux/macOS hosts. Missing
  // tools, incomplete visibility, timeout and diagnostics all refuse recovery.
  if (!["linux", "darwin"].includes(process.platform)) throw new Error("Offline recovery supports Linux/macOS hosts with lsof only.");
  const paths = [filename, ...["-wal", "-shm", "-journal"].map(s => `${filename}${s}`)].filter(p => existsSync(p));
  const scan = spawnSync("lsof", ["-nP", "-t", "--", ...paths], { encoding: "utf8", timeout: 10_000 });
  if (scan.error || scan.stderr?.trim() || ![0, 1].includes(scan.status)) throw new Error("Cannot prove database clients stopped: lsof failed or reported incomplete visibility.");
  if (scan.stdout.trim()) throw new Error("Open database handles remain; stop and disconnect every database client before restore.");
}

export function createMaintenanceMarker(active, operation) {
  requireRegularFile(active);
  requirePrivateDirectory(dirname(active));
  const marker = `${active}.maintenance`;
  try { mkdirSync(marker, { mode: 0o700 }); } catch (error) {
    if (error.code === "EEXIST") throw new Error("Database maintenance marker already exists; operator recovery review is required.");
    throw error;
  }
  // A failed durable marker write deliberately leaves maintenance in place.
  const owner = join(marker, "owner.json");
  writeFileSync(owner, JSON.stringify({ version: 1, operation, pid: process.pid, startedAt: new Date().toISOString() }), { flag: "wx", mode: 0o600 });
  syncFile(owner); syncFile(marker); syncFile(dirname(active));
  return marker;
}

export function releaseMaintenanceMarker(marker) {
  rmSync(marker, { recursive: true });
  syncFile(dirname(marker));
}

/** @param {string} source
 * @param {{offline?: boolean, onPhase?: (phase: string, paths: {recoveryDirectory: string, active: string, safety: string}) => void}} options
 */
export function restoreOffline(source, options = {}) {
  if (options.offline !== true) throw new Error("Restore requires --offline after stopping the app, all CLI clients and automatic restarts.");
  const active = databasePath();
  const backup = resolve(source);
  const activeStat = requireRegularFile(active);
  const backupStat = requireRegularFile(backup);
  requirePrivateDirectory(dirname(active));
  requirePrivateDirectory(dirname(backup));
  if (active === backup || (activeStat.dev === backupStat.dev && activeStat.ino === backupStat.ino)) throw new Error("Backup and active database must be distinct files.");
  assertNoSidecars(backup);
  const marker = createMaintenanceMarker(active, "restore");
  let recoveryDirectory;
  let safety;
  let manifest;
  let record;
  let replaced = false;
  let releaseMarker = false;
  try {
    requireStoppedClients(active);
    validateDatabase(backup);
    recoveryDirectory = mkdtempSync(`${active}.recovery-`);
    safety = join(recoveryDirectory, "before-restore.db");
    const candidate = join(recoveryDirectory, "replacement.db");
    const paths = { recoveryDirectory, active, safety };
    snapshotFile(backup, candidate);
    const current = new DatabaseSync(active, { timeout: 0 });
    try {
      // Attach a pre-existing WAL index in normal mode first, so SQLite owns
      // its cleanup even when the previous writer crashed leaving sidecars.
      current.prepare("SELECT count(*) FROM sqlite_schema").get();
      // The retained EXCLUSIVE locking mode also blocks unregistered SQLite
      // clients. No transaction remains open during the consistent snapshot.
      current.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; COMMIT;");
      snapshotConnection(current, safety);
      const checkpoint = current.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
      if (checkpoint.busy) throw new Error("WAL checkpoint is busy; restore refused.");
      current.exec("PRAGMA journal_mode=DELETE");
    } finally { current.close(); }
    // SQLite, not filesystem deletion, merges/removes WAL/SHM on close.
    assertNoSidecars(active);
    requireStoppedClients(active);
    options.onPhase?.("prepared", paths);
    manifest = join(recoveryDirectory, "restore.json");
    record = { version: 1, active, backup, safety };
    writeManifest(manifest, { ...record, phase: "prepared" });
    renameSync(candidate, active);
    replaced = true;
    syncFile(dirname(active));
    writeManifest(manifest, { ...record, phase: "replaced" });
    options.onPhase?.("replaced", paths);
    validateDatabase(active);
    assertNoSidecars(active);
    writeManifest(manifest, { ...record, phase: "verified" });
    releaseMarker = true;
    return { active, safety, recoveryDirectory };
  } catch (error) {
    if (replaced) {
      try {
        assertNoSidecars(active);
        const rollback = join(recoveryDirectory, "rollback.db");
        snapshotFile(safety, rollback);
        renameSync(rollback, active);
        syncFile(dirname(active));
        validateDatabase(active);
        writeManifest(manifest, { ...record, phase: "rolled-back" });
        releaseMarker = true;
      } catch {
        throw new Error(`Restore and rollback failed. Keep all writers stopped; maintenance marker retained. Recovery snapshots: ${recoveryDirectory}`, { cause: error });
      }
    } else releaseMarker = true;
    throw new Error(`Restore refused or failed${replaced ? "; the verified pre-restore database was recovered" : "; active database was not replaced"}.${recoveryDirectory ? ` Recovery evidence: ${recoveryDirectory}` : ""}`, { cause: error });
  } finally {
    if (releaseMarker) releaseMaintenanceMarker(marker);
  }
}

export function writeRecoveryManifest(filename, record) {
  const pending = `${filename}.pending`;
  writeFileSync(pending, JSON.stringify({ ...record, recordedAt: new Date().toISOString() }, null, 2), { flag: "wx", mode: 0o600 });
  syncFile(pending);
  renameSync(pending, filename);
  syncFile(dirname(filename));
}

const writeManifest = writeRecoveryManifest;
