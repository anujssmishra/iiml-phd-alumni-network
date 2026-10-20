import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { acquireDatabaseAccess, databasePath, requirePrivateDirectory, requireRegularFile } from "./database-access.mjs";
import { publishSnapshot, snapshotFile } from "./database-recovery.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

export async function backupDatabase(targetBackupPath) {
  const active = databasePath();
  requireRegularFile(active);
  const backupDirectory = resolve("backups");
  if (!targetBackupPath && !existsSync(backupDirectory)) mkdirSync(backupDirectory, { mode: 0o700 });
  const destination = targetBackupPath ? resolve(targetBackupPath) : join(backupDirectory, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  if (!/\.(?:db|sqlite|sqlite3)$/.test(destination)) throw new Error("Backup filenames must end in .db, .sqlite or .sqlite3 so repository-wide snapshot exclusions apply.");
  if (existsSync(destination) || destination === active) throw new Error("Backup destination must be distinct and must not exist.");
  requirePrivateDirectory(dirname(destination));
  const release = acquireDatabaseAccess();
  let stage;
  try {
    stage = mkdtempSync(join(dirname(destination), ".iiml-backup-stage-"));
    const candidate = join(stage, "snapshot.db");
    snapshotFile(active, candidate);
    publishSnapshot(candidate, destination);
    console.log(`[backup] Verified private SQLite snapshot: ${destination}`);
    return destination;
  } finally { if (stage) rmSync(stage, { recursive: true, force: true }); release(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/backup-db.mjs")) {
  backupDatabase(process.argv[2]).catch(error => { console.error(`[backup] ${error.message}`); process.exitCode = 1; });
}
