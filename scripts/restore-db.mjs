import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

export async function restoreDatabase(backupFilePath) {
  if (!backupFilePath) {
    throw new Error("Usage: node scripts/restore-db.mjs <path-to-backup.db>");
  }

  const backupSource = resolve(backupFilePath);
  if (!existsSync(backupSource)) {
    throw new Error(`Backup file does not exist: ${backupSource}`);
  }

  // 1. Validate backup file integrity before touching active database
  const sqliteBackupPath = backupSource.replace(/\\/g, "/");
  const testPrisma = new PrismaClient({
    datasources: { db: { url: `file:${sqliteBackupPath}` } },
  });
  try {
    const check = await testPrisma.$queryRawUnsafe(
      "PRAGMA integrity_check"
    );
    if (check[0]?.integrity_check !== "ok") {
      throw new Error(`Integrity check failed on source backup: ${JSON.stringify(check)}`);
    }
  } finally {
    await testPrisma.$disconnect();
  }

  // 2. Resolve active database path from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL (file:...).");
  }
  const relativeDb = databaseUrl.slice("file:".length).split("?")[0];
  const activeDbPath = isAbsolute(relativeDb) ? relativeDb : resolve("prisma", relativeDb);

  // 3. Create safety copy of current active database if it exists
  if (existsSync(activeDbPath)) {
    const safetyCopy = `${activeDbPath}.pre-restore-${Date.now()}`;
    copyFileSync(activeDbPath, safetyCopy);
    console.log(`[restore] Safety copy of active database saved to: ${safetyCopy}`);
  }

  // 4. Overwrite active database file with backup
  copyFileSync(backupSource, activeDbPath);

  // 5. Clean up any lingering WAL/SHM sidecars to prevent replaying stale logs
  const walPath = `${activeDbPath}-wal`;
  const shmPath = `${activeDbPath}-shm`;
  if (existsSync(walPath)) rmSync(walPath, { force: true });
  if (existsSync(shmPath)) rmSync(shmPath, { force: true });

  // 6. Verify restored database
  const sqliteActivePath = activeDbPath.replace(/\\/g, "/");
  const restoredPrisma = new PrismaClient({
    datasources: { db: { url: `file:${sqliteActivePath}` } },
  });
  try {
    const check = await restoredPrisma.$queryRawUnsafe(
      "PRAGMA integrity_check"
    );
    if (check[0]?.integrity_check !== "ok") {
      throw new Error(`Restored database failed integrity check: ${JSON.stringify(check)}`);
    }
    console.log(`[restore] Database successfully restored from: ${backupSource}`);
    console.log(`[restore] Active database path: ${activeDbPath}`);
    console.log("[restore] Integrity check: OK");
  } finally {
    await restoredPrisma.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/restore-db.mjs")) {
  restoreDatabase(process.argv[2]).catch((err) => {
    console.error(`[restore] Failed: ${err.message}`);
    process.exit(1);
  });
}
