import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const markerName = ".iiml-fixture-database.json";

// Only the provisioning command and verification harness create these targets.
export async function createFixtureDatabase(verification = false) {
  const directory = await mkdtemp(join(tmpdir(), verification ? "iiml-network-check-" : "iiml-network-fixtures-"));
  const canonicalDirectory = realpathSync(directory);
  const filename = verification ? "verification.db" : "fixtures.db";
  await writeFile(join(canonicalDirectory, markerName), JSON.stringify({ version: 1, filename }), { flag: "wx", mode: 0o600 });
  return { directory: canonicalDirectory, databaseUrl: `file:${join(canonicalDirectory, filename)}` };
}

/** @param {string} optIn @param {Record<string, string | undefined>} environment */
export function requireFixtureDatabase(optIn, environment = process.env) {
  if (environment[optIn] !== "1" || !["local", "test"].includes(environment.APP_ENV ?? "")
    || !["development", "test"].includes(environment.NODE_ENV ?? "")) {
    throw new Error(`Fixture seeding requires ${optIn}=1, APP_ENV=local or test, and NODE_ENV=development or test.`);
  }

  const directory = environment.FIXTURE_DATABASE_DIR;
  const filename = environment.DATABASE_URL?.slice("file:".length);
  if (!directory || !isAbsolute(directory) || !environment.DATABASE_URL?.startsWith("file:")
    || !filename || !isAbsolute(filename) || /[?#%\0]/.test(filename)) {
    throw new Error("Use a disposable database created by npm run db:fixtures or the isolated verification harness.");
  }

  // Resolve paths before comparing; refuse symlink aliases and arbitrary SQLite
  // files even when someone accidentally opts in with a retained DATABASE_URL.
  const canonicalDirectory = realpathSync(directory);
  const directoryStat = lstatSync(directory);
  const markerPath = join(canonicalDirectory, markerName);
  const markerStat = lstatSync(markerPath);
  const marker = JSON.parse(readFileSync(markerPath, "utf8"));
  const databasePath = resolve(filename);
  const owner = process.getuid?.();
  if (canonicalDirectory !== resolve(directory) || !directoryStat.isDirectory()
    || dirname(canonicalDirectory) !== realpathSync(tmpdir())
    || !/^iiml-network-(?:fixtures|check)-[A-Za-z0-9]+$/.test(basename(canonicalDirectory))
    || (directoryStat.mode & 0o077) !== 0 || (owner !== undefined && directoryStat.uid !== owner)
    || !markerStat.isFile() || markerStat.nlink !== 1 || (markerStat.mode & 0o077) !== 0
    || (owner !== undefined && markerStat.uid !== owner)
    || marker.version !== 1 || !["fixtures.db", "verification.db"].includes(marker.filename)
    || filename !== databasePath || databasePath !== join(canonicalDirectory, marker.filename)) {
    throw new Error("Fixture database ownership or target marker is invalid; retained databases cannot be seeded.");
  }
  try {
    const databaseStat = lstatSync(databasePath);
    if (!databaseStat.isFile() || databaseStat.nlink !== 1
      || (owner !== undefined && databaseStat.uid !== owner)) {
      throw new Error("Fixture database must be an owned regular file, not a link.");
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return databasePath;
}
