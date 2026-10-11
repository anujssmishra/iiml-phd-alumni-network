import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const mode = process.argv[2];
if (!["test", "build", "browser"].includes(mode)) {
  throw new Error("Expected test, build, or browser mode.");
}

// Every verification run owns a fresh database. Ambient .env or shell values
// cannot redirect migrations, test writes, or prerendering at member data.
const databaseDirectory = await mkdtemp(join(tmpdir(), "iiml-network-check-"));
const environment = {
  ...process.env,
  APP_ENV: "test",
  NODE_ENV: mode === "build" ? "production" : mode === "browser" ? "development" : "test",
  DATABASE_URL: `file:${join(databaseDirectory, "verification.db")}`,
  NEXTAUTH_URL: "http://127.0.0.1:3100",
  NEXTAUTH_SECRET: randomBytes(48).toString("base64url"),
  GOOGLE_CLIENT_ID: "isolated-check.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "isolated-check-not-a-real-secret",
  ACADEMIC_EMAIL_DOMAINS: "iiml.ac.in",
  ALLOW_DEMO_SEED: "0",
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(arguments_) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`Verification command failed (${result.status ?? result.signal}).`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !["browser", "e2e"].includes(entry.name)) {
      files.push(...await findTests(path));
    } else if (entry.isFile() && /\.test\.[cm]?tsx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files.sort();
}

try {
  run(["node_modules/prisma/build/index.js", "generate"]);
  run(["scripts/migrate.mjs"]);
  if (mode === "build") {
    run(["node_modules/next/dist/bin/next", "build", "--webpack"]);
  } else if (mode === "browser") {
    run(["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(3)]);
  } else {
    const tests = await findTests(resolve("tests"));
    if (!tests.length) throw new Error("No *.test.ts files found under tests/.");
    run(["--import", "tsx", "--test", "--test-concurrency=1", ...tests]);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = error.exitCode ?? 1;
} finally {
  // Only this process's unique temporary directory is removed.
  await rm(databaseDirectory, { recursive: true, force: true });
}
