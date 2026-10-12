import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

export async function backupDatabase(targetBackupPath) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL (file:...).");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve("backups");
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const destination = targetBackupPath ? resolve(targetBackupPath) : join(backupDir, `backup-${timestamp}.db`);

  // Ensure target file doesn't already exist (VACUUM INTO fails if destination exists)
  if (existsSync(destination)) {
    throw new Error(`Target backup destination already exists: ${destination}`);
  }

  const prisma = new PrismaClient();
  try {
    // Normalise path for SQLite string literal (use forward slashes)
    const sqlitePath = destination.replace(/\\/g, "/");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlitePath}'`);

    // Verify backup integrity with a separate connection
    const backupPrisma = new PrismaClient({
      datasources: { db: { url: `file:${sqlitePath}` } },
    });
    try {
      const integrityResult = await backupPrisma.$queryRawUnsafe(
        "PRAGMA integrity_check"
      );
      if (integrityResult[0]?.integrity_check !== "ok") {
        throw new Error(`Backup integrity check failed: ${JSON.stringify(integrityResult)}`);
      }
    } finally {
      await backupPrisma.$disconnect();
    }

    console.log(`[backup] Database successfully backed up to: ${destination}`);
    console.log("[backup] Integrity check: OK");
    return destination;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/backup-db.mjs")) {
  backupDatabase(process.argv[2]).catch((err) => {
    console.error(`[backup] Failed: ${err.message}`);
    process.exit(1);
  });
}
