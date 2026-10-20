import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { acquireDatabaseAccess } from "../scripts/database-access.mjs";
import { inspectMigrationLineage } from "../scripts/migration-lineage.mjs";
import { inspectLegacyRepair, migrationHistory, referenceDatabase, repairSources } from "../scripts/legacy-lineage.mjs";
import { createLegacyRepairCandidate } from "../scripts/repair-lineage.mjs";

const { files, original } = repairSources();

function withTarget<T>(active: string, run: () => T) {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${active}`;
  try { return run(); } finally { if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
}

function withDatabase<T>(filename: string, run: (db: DatabaseSync) => T) {
  const db = new DatabaseSync(filename);
  try { return run(db); } finally { db.close(); }
}

function root(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "iiml-legacy-repair-"));
  t.after(() => { rmSync(directory, { recursive: true, force: true }); });
  return { directory, active: join(directory, "source's database.db") };
}

function record(db: DatabaseSync, index: number, successful = true) {
  db.prepare("INSERT INTO _prisma_migrations(id,checksum,migration_name,logs,finished_at,applied_steps_count) VALUES(?,?,?,?,CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,?)").run(`attempt-${index}`, index === 1 ? inspectOriginalChecksum() : files[index].checksum, files[index].name, index === 1 ? "Synthetic original diagnostic retained verbatim" : null, Number(successful), Number(successful));
}
function inspectOriginalChecksum() { return "b9a220be717c89cdd110cab67747da95f651ddce9b15ba14710cf9b047168776"; }

function fixture(t: TestContext, kind: "applied" | "failed-acronym" | "failed-no-ddl" = "applied", prefix = 3) {
  const paths = root(t);
  withDatabase(paths.active, db => {
    db.exec(`CREATE TABLE _prisma_migrations(id TEXT PRIMARY KEY NOT NULL,checksum TEXT NOT NULL,finished_at DATETIME,migration_name TEXT NOT NULL,logs TEXT,rolled_back_at DATETIME,started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0);`);
    db.exec(files[0].sql); record(db, 0);
    if (kind === "applied") {
      db.exec(original); record(db, 1);
      for (let i = 2; i < prefix; i++) { db.exec(files[i].sql); record(db, i); }
    } else {
      if (kind === "failed-acronym") db.exec('ALTER TABLE "Conference" ADD COLUMN "acronym" TEXT');
      record(db, 1, false);
    }
    db.exec(`INSERT INTO User(id,email,membershipStatus,role,directoryVisible,membershipEvidence,updatedAt) VALUES('member','synthetic@example.test','approved','member',1,'Synthetic private evidence',123),('curator','curator@example.test','approved','curator',0,NULL,124);
      INSERT INTO Account(id,userId,type,provider,providerAccountId) VALUES('account','member','oauth','google','synthetic-provider-id');
      INSERT INTO Session(id,sessionToken,userId,expires) VALUES('session','synthetic-private-session','member',2100000000000);
      INSERT INTO VerificationToken(identifier,token,expires) VALUES('synthetic@example.test','synthetic-private-verification',2100000000000);
      INSERT INTO MembershipReview(id,reviewerId,targetId,fromStatus,toStatus,fromRole,toRole,method,reason) VALUES('membership','curator','member','pending','approved','member','member','manual','Synthetic review');
      INSERT INTO ContactRequest(id,senderId,recipientId,message,replyEmail,status,updatedAt) VALUES('contact','member','curator','Synthetic private message','reply@example.test','accepted',125);`);
    for (const [id, state, demo] of [["published", "published", 0], ["archived", "archived", 0], ["draft", "draft", 0], ["demo", "published", 1]] as const) {
      if (kind === "applied") db.prepare("INSERT INTO Conference(id,name,acronym,date,startDate,endDate,timezone,cfpDeadline,location,sourceUrl,sourceCheckedAt,publicationState,curatorId,isDemo,createdAt,updatedAt) VALUES(?,?,?,1900000000000,1900086400000,1900259200000,'America/Los_Angeles',1890000000000,'Synthetic campus','https://example.test/edition',1880000000000,?,'curator',?,120,126)").run(id, `Synthetic ${id}`, `KEEP ${id}`, state, demo);
      else {
        db.prepare("INSERT INTO Conference(id,name,date,location,createdAt,updatedAt) VALUES(?,?,1900000000000,'Synthetic legacy campus',120,126)").run(id, `Synthetic ${id}`);
        if (kind === "failed-acronym") db.prepare("UPDATE Conference SET acronym=? WHERE id=?").run(`KEEP ${id}`, id);
      }
      db.prepare("INSERT INTO ConferenceAttendee(id,userId,conferenceId,status,createdAt,updatedAt) VALUES(?, 'member',?,'considering',121,127)").run(`rsvp-${id}`, id);
    }
    if (kind === "applied") {
      db.exec(`INSERT INTO ConferenceSuggestion(id,submitterId,name,startDate,endDate,location,url,updatedAt) VALUES('suggestion','member','Synthetic suggestion',1900000000000,1900086400000,'Test','https://example.test',128);`);
      if (prefix >= 3) db.exec("UPDATE ConferenceAttendee SET role='presenter',paperTitle='Synthetic private paper title'");
      if (prefix === 4) db.exec(`UPDATE Conference SET reviewedAt=1880000000000,reviewedById='curator',reviewedFields='["name"]',sourceFetchedAt=1870000000000;
        UPDATE ConferenceSuggestion SET timezone='Asia/Kolkata',cfpDeadline=1890000000000;
        INSERT INTO ConferenceRevision(id,conferenceId,actorId,reason,sourceUrl,beforeJson,afterJson) VALUES('revision','published','curator','Synthetic correction','https://example.test','{}','{}');`);
    }
  });
  return paths;
}

function create(active: string, onPhase?: (phase: string, db: DatabaseSync) => void) {
  const plan = inspectLegacyRepair(active);
  return withTarget(active, () => createLegacyRepairCandidate({ offline: true, expectedLineageSha: plan.lineageSha, onPhase }));
}

test("P2C reconciles original-applied histories at every known suffix without erasing dates, curation or private relations", t => {
  for (const prefix of [2, 3, 4]) {
    const { active } = fixture(t, "applied", prefix);
    const bytes = readFileSync(active);
    const before = withDatabase(active, db => ({ rows: db.prepare("SELECT * FROM Conference ORDER BY id").all(), history: migrationHistory(db), attendance: db.prepare("SELECT * FROM ConferenceAttendee ORDER BY id").all() }));
    const result = create(active);
    assert.equal(result.sourceReplaced, false);
    assert.deepEqual(readFileSync(active), bytes, "source bytes must not be rewritten");
    assert.equal(inspectMigrationLineage(result.candidate).safeToDeploy, true);
    withDatabase(result.candidate, db => {
      // Compare columns by name: the normalized table has a different order.
      const columns = Object.keys(before.rows[0]).map(c => `"${c}"`).join(",");
      assert.deepEqual(db.prepare(`SELECT ${columns} FROM Conference ORDER BY id`).all(), before.rows);
      assert.deepEqual(db.prepare("SELECT * FROM ConferenceAttendee ORDER BY id").all(), before.attendance);
      assert.equal(db.prepare("SELECT membershipEvidence FROM User WHERE id='member'").get()?.membershipEvidence, "Synthetic private evidence");
      assert.equal(db.prepare("SELECT sessionToken FROM Session").get()?.sessionToken, "synthetic-private-session");
      assert.equal(db.prepare("SELECT replyEmail FROM ContactRequest").get()?.replyEmail, "reply@example.test");
      const history = migrationHistory(db);
      for (const [index, row] of before.history.entries()) assert.deepEqual({ ...history[index] }, index === 1 ? { ...row, checksum: files[1].checksum } : { ...row });
      if (prefix === 4) assert.equal(db.prepare("SELECT count(*) AS n FROM ConferenceRevision").get()?.n, 1);
    });
    const evidence = JSON.parse(readFileSync(result.manifest, "utf8"));
    assert.equal(evidence.phase, "verified"); assert.ok(evidence.preserved.length >= 8);
    assert.equal(JSON.stringify(evidence).includes("synthetic-private-session"), false);
    for (const file of [result.candidate, result.safety, result.manifest]) assert.equal(statSync(file).mode & 0o777, 0o600);
  }
});

test("P2C completes both supported failed states, preserving the original failure/log and partial acronym values", t => {
  for (const kind of ["failed-acronym", "failed-no-ddl"] as const) {
    const { active } = fixture(t, kind);
    const bytes = readFileSync(active);
    const result = create(active);
    assert.deepEqual(readFileSync(active), bytes);
    assert.equal(inspectMigrationLineage(result.candidate).status, "supported-prefix");
    withDatabase(result.candidate, db => {
      const history = migrationHistory(db);
      const originalAttempt = history.find(row => row.id === "attempt-1");
      assert.equal(originalAttempt?.checksum, inspectOriginalChecksum()); assert.equal(originalAttempt?.finished_at, null);
      assert.ok(originalAttempt?.rolled_back_at); assert.equal(originalAttempt?.logs, "Synthetic original diagnostic retained verbatim");
      assert.equal(history.filter(row => row.migration_name === files[1].name && row.finished_at !== null).length, 1);
      const event = db.prepare("SELECT date,startDate,endDate,acronym,publicationState FROM Conference WHERE id='published'").get();
      assert.deepEqual({ ...event }, { date: 1900000000000, startDate: 1900000000000, endDate: 1900000000000, acronym: kind === "failed-acronym" ? "KEEP published" : null, publicationState: "draft" });
      assert.equal(db.prepare("SELECT count(*) AS n FROM ConferenceAttendee").get()?.n, 4);
      assert.equal(db.prepare("SELECT count(*) AS n FROM ConferenceSuggestion").get()?.n, 0);
    });
  }
});

test("P2C candidate install, pending review migration and offline safety rollback work end to end on a populated fixture", t => {
  const { active } = fixture(t);
  const tables = ["User", "Account", "Session", "VerificationToken", "MembershipReview", "ContactRequest", "Conference", "ConferenceAttendee", "ConferenceSuggestion"];
  const applicationRows = () => withDatabase(active, db => tables.map(table => [table, db.prepare(`SELECT * FROM "${table}" ORDER BY 1, 2`).all()]));
  const before = applicationRows();
  const result = create(active);
  const run = (script: string, args: string[] = []) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${active}` }, timeout: 30_000 });
  const install = run("scripts/restore-db.mjs", [result.candidate, "--offline"]); assert.equal(install.status, 0, install.stderr);
  const deploy = run("scripts/migrate.mjs"); assert.equal(deploy.status, 0, deploy.stderr);
  assert.equal(inspectMigrationLineage(active).status, "current");
  withDatabase(active, db => {
    assert.deepEqual(db.prepare("SELECT id,publicationState FROM Conference ORDER BY id").all().map(r => [r.id, r.publicationState]), [["archived", "archived"], ["demo", "published"], ["draft", "draft"], ["published", "draft"]]);
    const audit = db.prepare("SELECT beforeJson,afterJson FROM ConferenceRevision WHERE conferenceId='published'").get();
    assert.equal(JSON.parse(audit?.beforeJson as string).publicationState, "published");
    assert.equal(JSON.parse(audit?.afterJson as string).publicationState, "draft");
    assert.equal(db.prepare("SELECT paperTitle FROM ConferenceAttendee LIMIT 1").get()?.paperTitle, "Synthetic private paper title");
  });
  const rollback = run("scripts/restore-db.mjs", [result.safety, "--offline"]); assert.equal(rollback.status, 0, rollback.stderr);
  assert.equal(inspectLegacyRepair(active).kind, "original-applied");
  // VACUUM/restore may repack bytes; compare retained logical records/history.
  withDatabase(active, db => assert.deepEqual(migrationHistory(db), withDatabase(result.safety, migrationHistory)));
  assert.deepEqual(applicationRows(), before, "rollback must recover every original application row, not merely a valid schema");
});

test("P2C data-loss injection and post-metadata failure roll back the candidate transaction, not the source", t => {
  for (const phase of ["schema-built", "metadata-reconciled", "metadata-loss"]) {
    const { active, directory } = fixture(t);
    const before = readFileSync(active);
    assert.throws(() => create(active, (at, db) => {
      if (at !== (phase === "metadata-loss" ? "metadata-reconciled" : phase)) return;
      if (phase === "schema-built") db.exec("UPDATE ConferenceAttendee SET paperTitle='injected loss'");
      else if (phase === "metadata-loss") db.exec("UPDATE _prisma_migrations SET logs='injected lost diagnostic' WHERE id='attempt-0'");
      else throw new Error("injected failure after checksum reconciliation");
    }), /source database was not replaced/);
    assert.deepEqual(readFileSync(active), before);
    const recovery = readdirSync(directory).find(n => n.includes(".recovery-")); assert.ok(recovery);
    const manifest = JSON.parse(readFileSync(join(directory, recovery, "repair.json"), "utf8")); assert.equal(manifest.phase, "rejected");
    assert.equal(inspectLegacyRepair(manifest.candidate).lineageSha, inspectLegacyRepair(active).lineageSha);
    assert.equal(existsSync(`${active}.maintenance`), false);
  }
});

test("P2C refuses stale plans, unknown checksums/schema, retry histories and absent offline acknowledgement", t => {
  const { active } = fixture(t);
  const plan = inspectLegacyRepair(active);
  assert.throws(() => withTarget(active, () => createLegacyRepairCandidate({ expectedLineageSha: plan.lineageSha })), /--offline/);
  withDatabase(active, db => db.exec("UPDATE _prisma_migrations SET logs='diagnostic changed' WHERE id='attempt-1'"));
  assert.throws(() => withTarget(active, () => createLegacyRepairCandidate({ offline: true, expectedLineageSha: plan.lineageSha })), e => e instanceof Error && e.cause instanceof Error && /Lineage changed/.test(e.cause.message));
  withDatabase(active, db => db.exec("UPDATE _prisma_migrations SET checksum='unknown' WHERE id='attempt-0'"));
  assert.throws(() => inspectLegacyRepair(active), /Unknown checksum/);
  withDatabase(active, db => db.prepare("UPDATE _prisma_migrations SET checksum=? WHERE id='attempt-0'").run(files[0].checksum));
  withDatabase(active, db => db.exec("ALTER TABLE User ADD COLUMN unknown TEXT"));
  assert.throws(() => inspectLegacyRepair(active), /Legacy schema differs/);
  const failed = fixture(t, "failed-acronym");
  withDatabase(failed.active, db => db.exec("INSERT INTO _prisma_migrations SELECT 'retry',checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count FROM _prisma_migrations WHERE id='attempt-1'"));
  assert.throws(() => inspectLegacyRepair(failed.active), /exactly one original/);
});

test("P2C refuses a running managed client and the CLI rejects ambiguous arguments without mutation", t => {
  const { active } = fixture(t);
  const release = acquireDatabaseAccess(`file:${active}`);
  try { assert.throws(() => create(active), e => e instanceof Error && e.cause instanceof Error && /managed database client/.test(e.cause.message)); }
  finally { release(); }
  const before = readFileSync(active);
  const cli = (args: string[]) => spawnSync(process.execPath, ["scripts/repair-lineage.mjs", ...args], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${active}` } });
  assert.equal(cli(["--inspect"]).status, 0);
  assert.notEqual(cli(["--offline"]).status, 0);
  assert.notEqual(cli(["--offline", "--expect-lineage", "x", "--install"]).status, 0);
  assert.deepEqual(readFileSync(active), before);
});

test("P2C abrupt candidate transaction interruption preserves the source, safety snapshot and maintenance marker", t => {
  const { active, directory } = fixture(t, "failed-acronym");
  const before = readFileSync(active);
  const entry = pathToFileURL(resolve("scripts/repair-lineage.mjs")).href;
  const plan = inspectLegacyRepair(active);
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `const {createLegacyRepairCandidate}=await import(process.argv[1]); createLegacyRepairCandidate({offline:true,expectedLineageSha:process.argv[2],onPhase(phase){if(phase==='metadata-reconciled')process.exit(86)}});`, entry, plan.lineageSha], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${active}` } });
  assert.equal(child.status, 86, child.stderr);
  assert.deepEqual(readFileSync(active), before);
  assert.equal(existsSync(`${active}.maintenance/owner.json`), true);
  const recovery = readdirSync(directory).find(n => n.includes(".recovery-")); assert.ok(recovery);
  const manifest = JSON.parse(readFileSync(join(directory, recovery, "repair.json"), "utf8"));
  assert.equal(manifest.phase, "prepared");
  assert.equal(inspectLegacyRepair(manifest.safety).lineageSha, plan.lineageSha);
  // A writable SQLite open recovers only this interrupted disposable candidate.
  withDatabase(manifest.candidate, db => db.prepare("SELECT count(*) FROM Conference").get());
  assert.equal(inspectLegacyRepair(manifest.candidate).lineageSha, plan.lineageSha);
});

test("P2C repairs the actual Prisma 6.19.3 failed migration history, not only fabricated metadata", t => {
  const { active, directory } = root(t);
  // Match the deployment wrapper's exclusive, non-truncating first creation.
  writeFileSync(active, "", { flag: "wx", mode: 0o600 });
  const migrations = join(directory, "migrations"); mkdirSync(migrations);
  const schemaFile = join(directory, "schema.prisma"); writeFileSync(schemaFile, readFileSync("prisma/schema.prisma"));
  writeFileSync(join(migrations, "migration_lock.toml"), 'provider = "sqlite"\n');
  const add = (index: number, sql: string) => { const path = join(migrations, files[index].name); mkdirSync(path); writeFileSync(join(path, "migration.sql"), sql); };
  add(0, files[0].sql);
  const deploy = () => spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", schemaFile], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${active}` }, timeout: 30_000 });
  const foundation = deploy(); assert.equal(foundation.status, 0, foundation.stderr);
  withDatabase(active, db => db.exec("INSERT INTO User(id,updatedAt) VALUES('member',0); INSERT INTO Conference(id,name,date,location,updatedAt) VALUES('event','Synthetic actual-engine fixture',1900000000000,'Test',0); INSERT INTO ConferenceAttendee(id,userId,conferenceId,updatedAt) VALUES('rsvp','member','event',0)"));
  add(1, original);
  const failure = deploy(); assert.notEqual(failure.status, 0); assert.match(failure.stderr, /P3018|non-constant default/);
  const plan = inspectLegacyRepair(active); assert.ok(plan.kind.startsWith("failed-"));
  const result = create(active);
  assert.equal(inspectMigrationLineage(result.candidate).safeToDeploy, true);
  const upgraded = spawnSync(process.execPath, ["scripts/migrate.mjs"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${result.candidate}` }, timeout: 30_000 });
  assert.equal(upgraded.status, 0, upgraded.stderr);
  withDatabase(result.candidate, db => {
    assert.equal(db.prepare("SELECT userId FROM ConferenceAttendee WHERE id='rsvp'").get()?.userId, "member");
    assert.equal(db.prepare("SELECT startDate FROM Conference WHERE id='event'").get()?.startDate, 1900000000000);
    assert.equal(migrationHistory(db).filter(row => row.rolled_back_at !== null).length, 1);
  });
});

test("P2C repair rejects a known-shape database with foreign-key violations", t => {
  const { active } = fixture(t);
  withDatabase(active, db => db.exec("PRAGMA foreign_keys=OFF; UPDATE ConferenceAttendee SET userId='missing'"));
  assert.throws(() => inspectLegacyRepair(active), /integrity and foreign keys/);
  const reference = referenceDatabase(4); reference.close();
});

test("P2C reconciles an original successful history produced by Prisma and applies only pending migrations", t => {
  const { active, directory } = root(t);
  writeFileSync(active, "", { flag: "wx", mode: 0o600 });
  const migrations = join(directory, "migrations"); mkdirSync(migrations);
  const schemaFile = join(directory, "schema.prisma"); writeFileSync(schemaFile, readFileSync("prisma/schema.prisma"));
  writeFileSync(join(migrations, "migration_lock.toml"), 'provider = "sqlite"\n');
  for (let i = 0; i < 3; i++) {
    const path = join(migrations, files[i].name); mkdirSync(path);
    writeFileSync(join(path, "migration.sql"), i === 1 ? original : files[i].sql);
  }
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", schemaFile], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${active}` }, timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
  withDatabase(active, db => db.exec(`INSERT INTO User(id,updatedAt) VALUES('member',0);
    INSERT INTO Conference(id,name,date,startDate,endDate,publicationState,location,updatedAt) VALUES('event','Synthetic successful-engine fixture',1900000000000,1900086400000,1900259200000,'published','Test',0);
    INSERT INTO ConferenceAttendee(id,userId,conferenceId,role,paperTitle,updatedAt) VALUES('rsvp','member','event','presenter','Preserved paper',0);`));
  const plan = inspectLegacyRepair(active); assert.equal(plan.kind, "original-applied");
  const candidate = create(active);
  const deploy = spawnSync(process.execPath, ["scripts/migrate.mjs"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${candidate.candidate}` }, timeout: 30_000 });
  assert.equal(deploy.status, 0, deploy.stderr);
  assert.equal(inspectMigrationLineage(candidate.candidate).status, "current");
  withDatabase(candidate.candidate, db => {
    assert.deepEqual({ ...db.prepare("SELECT date,startDate,endDate,publicationState FROM Conference WHERE id='event'").get() }, { date: 1900000000000, startDate: 1900086400000, endDate: 1900259200000, publicationState: "draft" });
    assert.equal(db.prepare("SELECT paperTitle FROM ConferenceAttendee WHERE id='rsvp'").get()?.paperTitle, "Preserved paper");
    assert.equal(db.prepare("SELECT count(*) AS n FROM ConferenceRevision").get()?.n, 1);
  });
});
