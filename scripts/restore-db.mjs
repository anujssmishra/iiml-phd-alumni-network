import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { restoreOffline } from "./database-recovery.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

/** @param {string} backupFilePath @param {Parameters<typeof restoreOffline>[1]} options */
export async function restoreDatabase(backupFilePath, options = {}) {
  if (!backupFilePath) throw new Error("Usage: npm run db:restore -- <backup.db> --offline");
  const result = restoreOffline(backupFilePath, options);
  console.log(`[restore] Verified restore: ${result.active}`);
  console.log(`[restore] Private consistent rollback snapshot retained: ${result.safety}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/restore-db.mjs")) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[1] !== "--offline") {
    console.error("Usage: npm run db:restore -- <backup.db> --offline (all clients and automatic restarts must be stopped)");
    process.exitCode = 1;
  } else restoreDatabase(args[0], { offline: true }).catch(error => {
    console.error(`[restore] ${error.message}${error.cause instanceof Error ? ` Cause: ${error.cause.message}` : ""}`);
    process.exitCode = 1;
  });
}
