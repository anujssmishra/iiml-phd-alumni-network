import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function databasePath(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("file:")) throw new Error("DATABASE_URL must be a SQLite file URL.");
  const filename = databaseUrl.slice(5);
  if (!filename || /[?#%\0]/.test(filename) || filename === ":memory:") throw new Error("Use a plain persistent SQLite file path, without URL parameters.");
  const target = resolve("prisma", filename);
  return resolve(realpathSync(dirname(target)), basename(target));
}

export function requireRegularFile(filename) {
  const stat = lstatSync(filename);
  if (!stat.isFile() || stat.nlink !== 1 || (process.getuid && stat.uid !== process.getuid())) throw new Error(`Database files must be owned regular files without links: ${filename}`);
  return stat;
}

export function requirePrivateDirectory(directory) {
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) throw new Error(`Recovery requires an owned, owner-only directory (0700): ${directory}`);
}

export function assertNotInMaintenance(filename) {
  if (existsSync(`${filename}.maintenance`)) throw new Error("Database is in offline maintenance. Do not start writers or remove the marker without operator recovery review.");
}

// Lifetime leases detect idle/startup clients that open-file scanning cannot.
// Marker-before/after registration closes the managed-client startup race.
// Dead PIDs are ignored, never deleted; reused PIDs deliberately fail closed.
export function acquireDatabaseAccess(databaseUrl = process.env.DATABASE_URL) {
  const filename = databasePath(databaseUrl);
  if (existsSync(filename)) requireRegularFile(filename);
  assertNotInMaintenance(filename);
  const directory = `${filename}.access`;
  try { mkdirSync(directory, { mode: 0o700 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
  requirePrivateDirectory(directory);
  const lease = resolve(directory, `${process.pid}-${randomUUID()}.json`);
  writeFileSync(lease, JSON.stringify({ version: 1, pid: process.pid }), { flag: "wx", mode: 0o600 });
  let released = false;
  function release() {
    if (!released) { unlinkSync(lease); released = true; process.off("exit", release); }
  }
  process.once("exit", release);
  try { assertNotInMaintenance(filename); } catch (error) { release(); throw error; }
  return release;
}

export function leaseProcessIsAlive(filename) {
  requireRegularFile(filename);
  const lease = JSON.parse(readFileSync(filename, "utf8"));
  if (lease.version !== 1 || !Number.isSafeInteger(lease.pid) || lease.pid <= 0) throw new Error("Invalid database access lease; operator review required.");
  try { process.kill(lease.pid, 0); return true; } catch (error) {
    if (error.code === "ESRCH") return false;
    throw new Error("Cannot establish whether a database client has stopped.");
  }
}
