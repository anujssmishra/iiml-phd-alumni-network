import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PrismaClient } from "@prisma/client";
import { createFixtureDatabase, requireFixtureDatabase } from "../scripts/fixture-database.mjs";

assert.equal(process.env.APP_ENV, "test", "Use npm test with its isolated database.");
assert.match(process.env.DATABASE_URL ?? "", /iiml-network-check-.*verification\.db$/);
const prisma = new PrismaClient();
const scripts = [
  { path: "prisma/seed.ts", optIn: "ALLOW_DEMO_SEED" },
  { path: "scripts/seed-local-dev.ts", optIn: "ALLOW_DEV_SEED" },
];
const run = (script: string, overrides: Record<string, string> = {}) => spawnSync(process.execPath, ["--import", "tsx", script], {
  env: { ...process.env, ...overrides }, encoding: "utf8", timeout: 30_000,
});

beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.conference.deleteMany();
});
after(async () => { await prisma.$disconnect(); });

test("both seeds deny absent opt-in, staging, unset environment and production even with APP_ENV=local", async () => {
  for (const { path, optIn } of scripts) {
    for (const overrides of [
      { [optIn]: "0" },
      { [optIn]: "1", APP_ENV: "" },
      { [optIn]: "1", APP_ENV: "staging" },
      { [optIn]: "1", APP_ENV: "production" },
      { [optIn]: "1", APP_ENV: "local", NODE_ENV: "production" },
      { [optIn]: "1", NODE_ENV: "" },
      { [optIn]: "1", FIXTURE_DATABASE_DIR: "" },
    ]) {
      const result = run(path, overrides);
      assert.notEqual(result.status, 0, `${path} must reject ${JSON.stringify(overrides)}`);
    }
  }
  assert.equal(await prisma.user.count(), 0);
  assert.equal(await prisma.conference.count(), 0);
});

test("owned-target marker denies retained, mismatched and linked files before any seed writes", async () => {
  const target = await createFixtureDatabase();
  const retainedDirectory = await mkdtemp(join(tmpdir(), "iiml-retained-test-"));
  const retainedPath = join(retainedDirectory, "retained.db");
  const sentinel = "retained-data-sentinel";
  await writeFile(retainedPath, sentinel);
  try {
    for (const { path, optIn } of scripts) {
      for (const databaseUrl of [`file:${retainedPath}`, `file:${join(target.directory, "wrong.db")}`, "file:./dev.db"]) {
        const result = run(path, { [optIn]: "1", FIXTURE_DATABASE_DIR: target.directory, DATABASE_URL: databaseUrl });
        assert.notEqual(result.status, 0, `${path} must reject ${databaseUrl}`);
      }
    }
    await symlink(retainedPath, join(target.directory, "fixtures.db"));
    for (const { path, optIn } of scripts) {
      assert.notEqual(run(path, { [optIn]: "1", FIXTURE_DATABASE_DIR: target.directory, DATABASE_URL: target.databaseUrl }).status, 0);
    }
    assert.equal(await readFile(retainedPath, "utf8"), sentinel);
    const environment = { APP_ENV: "test", NODE_ENV: "test", ALLOW_DEMO_SEED: "1", FIXTURE_DATABASE_DIR: target.directory, DATABASE_URL: target.databaseUrl };
    assert.throws(() => requireFixtureDatabase("ALLOW_DEMO_SEED", environment));
    await writeFile(join(target.directory, ".iiml-fixture-database.json"), JSON.stringify({ version: 1, filename: "../retained.db" }));
    assert.throws(() => requireFixtureDatabase("ALLOW_DEMO_SEED", environment));
  } finally {
    await rm(target.directory, { recursive: true, force: true });
    await rm(retainedDirectory, { recursive: true, force: true });
  }
});

test("event seeds preserve non-demo collisions, legacy demos, edits and RSVP identity on every run", async () => {
  const member = await prisma.user.create({ data: { id: "retained-member", email: "retained@example.test" } });
  const collision = await prisma.conference.create({ data: {
    id: "fixture-event-methods-2030", name: "Retained curator event", location: "Retained location",
    publicationState: "archived", isDemo: false, sourceUrl: "https://example.test/retained",
  } });
  const legacy = await prisma.conference.create({ data: { id: "aom-2027", name: "Legacy demo", location: "Original", isDemo: true } });
  await prisma.conferenceAttendee.create({ data: { userId: member.id, conferenceId: legacy.id, role: "presenter", paperTitle: "Keep this title" } });
  const first = run("prisma/seed.ts", { ALLOW_DEMO_SEED: "1" });
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(await prisma.conference.findUnique({ where: { id: collision.id } }), collision);
  assert.deepEqual(await prisma.conference.findUnique({ where: { id: legacy.id } }), legacy);
  const edited = await prisma.conference.update({ where: { id: "fixture-event-systems-2030" }, data: { name: "Fixture correction", publicationState: "archived" } });
  await prisma.conferenceAttendee.create({ data: { userId: member.id, conferenceId: edited.id, role: "doctoral_consortium" } });
  const attendance = await prisma.conferenceAttendee.findMany({ orderBy: { id: "asc" } });
  const second = run("prisma/seed.ts", { ALLOW_DEMO_SEED: "1" });
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(await prisma.conference.findUnique({ where: { id: collision.id } }), collision);
  assert.deepEqual(await prisma.conference.findUnique({ where: { id: edited.id } }), edited);
  assert.deepEqual(await prisma.conferenceAttendee.findMany({ orderBy: { id: "asc" } }), attendance);
  const synthetic = await prisma.conference.findUniqueOrThrow({ where: { id: "fixture-event-doctoral-2030" } });
  assert.equal(synthetic.sourceCheckedAt, null);
  assert.equal(synthetic.sourceUrl, null);
  assert.match(synthetic.url ?? "", /^https:\/\/example\.test\//);
  assert.equal(await prisma.session.count(), 0);
});

test("development fixtures preserve identity/email collisions, membership, consent and existing sessions", async () => {
  const existing = await prisma.user.create({ data: {
    id: "fixture-user-member", email: "retained-person@example.test", name: "Retained profile",
    membershipStatus: "suspended", role: "admin", directoryVisible: false,
  } });
  const emailCollision = await prisma.user.create({ data: { id: "retained-curator-email", email: "curator@example.test", membershipStatus: "rejected" } });
  const session = await prisma.session.create({ data: { userId: existing.id, sessionToken: "test-existing-session-to-preserve", expires: new Date("2030-01-01") } });
  for (let i = 0; i < 2; i++) {
    const result = run("scripts/seed-local-dev.ts", { ALLOW_DEV_SEED: "1" });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /test-existing-session-to-preserve|dev-test-session-token|dev-session-/);
  }
  assert.deepEqual(await prisma.user.findUnique({ where: { id: existing.id } }), existing);
  assert.deepEqual(await prisma.user.findUnique({ where: { id: emailCollision.id } }), emailCollision);
  assert.equal(await prisma.user.findUnique({ where: { id: "fixture-user-curator" } }), null);
  assert.deepEqual(await prisma.session.findMany(), [session]);
  assert.equal(await prisma.account.count(), 0);
  const applicant = await prisma.user.findUniqueOrThrow({ where: { id: "fixture-user-applicant" } });
  assert.equal(applicant.email, "applicant@example.test");
  assert.equal(applicant.emailVerified, null);
  assert.equal(applicant.directoryVisible, false);
  assert.equal(applicant.open_to_chat, false);
  assert.equal(applicant.role, "member");
  assert.equal(applicant.membershipStatus, "pending");
});

test("fixture provisioning ignores ambient retained targets and creates only synthetic private identities without sessions", async () => {
  const result = spawnSync(process.execPath, ["scripts/create-fixture-database.mjs"], {
    env: { ...process.env, ENABLE_AUTO_CONFERENCE_SYNC: "1" }, encoding: "utf8", timeout: 60_000,
  });
  const directory = result.stdout.match(/Creating disposable fixtures in (.+)/)?.[1];
  assert.ok(directory, result.stdout + result.stderr);
  const fixtureDb = new PrismaClient({ datasources: { db: { url: `file:${join(directory, "fixtures.db")}` } } });
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.notEqual(directory, process.env.FIXTURE_DATABASE_DIR);
    assert.equal(await prisma.user.count(), 0);
    assert.equal(await prisma.conference.count(), 0);
    const users = await fixtureDb.user.findMany();
    assert.equal(users.length, 3);
    for (const user of users) {
      assert.match(user.id, /^fixture-user-/);
      assert.match(user.email ?? "", /@example\.test$/);
      assert.equal(user.emailVerified, null);
      assert.equal(user.directoryVisible, false);
      assert.equal(user.open_to_chat, false);
      assert.notEqual(user.role, "admin");
    }
    assert.equal(await fixtureDb.conference.count({ where: { isDemo: true } }), 3);
    assert.equal(await fixtureDb.session.count(), 0);
    assert.equal(await fixtureDb.account.count(), 0);
    assert.equal(await fixtureDb.conferenceAttendee.count(), 0);
    assert.match(result.stdout, /ENABLE_AUTO_CONFERENCE_SYNC=0/);
  } finally {
    await fixtureDb.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
