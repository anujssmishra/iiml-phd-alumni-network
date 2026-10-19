import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createFixtureDatabase } from "./fixture-database.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

try {
  if (!["local", "test"].includes(process.env.APP_ENV ?? "")
    || (process.env.NODE_ENV && !["development", "test"].includes(process.env.NODE_ENV))) {
    throw new Error("Disposable fixture provisioning requires APP_ENV=local or test and a development/test runtime.");
  }
  const target = await createFixtureDatabase();
  const environment = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    DATABASE_URL: target.databaseUrl,
    FIXTURE_DATABASE_DIR: target.directory,
    ALLOW_DEMO_SEED: "1",
    ALLOW_DEV_SEED: "1",
    ENABLE_AUTO_CONFERENCE_SYNC: "0",
  };
  console.log(`Creating disposable fixtures in ${target.directory}`);
  for (const arguments_ of [
    ["scripts/migrate.mjs"],
    ["--import", "tsx", "prisma/seed.ts"],
    ["--import", "tsx", "scripts/seed-local-dev.ts"],
  ]) {
    const result = spawnSync(process.execPath, arguments_, { env: environment, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Fixture provisioning failed; inspect the disposable target reported above.");
  }
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  console.log("Fixture data created without accounts or sessions. Application sign-in still uses Google.");
  console.log(`DATABASE_URL=${quote(target.databaseUrl)} ENABLE_AUTO_CONFERENCE_SYNC=0 npm run dev`);
  console.log(`For repeated fixture seeds, also set FIXTURE_DATABASE_DIR=${quote(target.directory)} and the command's explicit opt-in.`);
  console.log("Temporary storage may be removed by the operating system; keep retained data elsewhere.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Fixture provisioning failed.");
  process.exitCode = 1;
}
