import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { open } from "node:fs/promises";
import { acquireDatabaseAccess, databasePath } from "./database-access.mjs";
import { inspectMigrationLineage } from "./migration-lineage.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL for this deployment.");
  }
  const filename = databaseUrl.slice("file:".length).split("?")[0];
  if (!filename || filename === ":memory:") {
    throw new Error("Migrations require a persistent SQLite file path.");
  }
  // Prisma resolves relative SQLite paths against the schema directory. Some
  // platform engines cannot create the first file during migrate deploy.
  // Exclusive creation fixes that case without truncating an existing database.
  const targetPath = databasePath(databaseUrl);
  const release = acquireDatabaseAccess(databaseUrl);
  try {
    const database = await open(targetPath, "wx", 0o600);
    await database.close();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const lineage = inspectMigrationLineage(targetPath);
  if (!lineage.safeToDeploy) throw new Error(`Migration refused (${lineage.status}): ${lineage.reason}`);
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  release();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database migration failed.");
  process.exitCode = 1;
}
