import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectMigrationLineage, migrationFiles } from "../scripts/migration-lineage.mjs";

const files = migrationFiles();
const legacy = readFileSync("scripts/legacy-migrations/20261011000001_conference_curation.sql", "utf8");
const checksum = (sql: string) => createHash("sha256").update(sql).digest("hex");

function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "iiml-lineage-test-"));
  const filename = join(directory, "lineage.db");
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE _prisma_migrations(id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, finished_at DATETIME,
    migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME, started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0);`);
  t.after(() => { rmSync(directory, { recursive: true, force: true }); });
  return { db, filename };
}

function record(db: DatabaseSync, name: string, sql: string, successful = true) {
  db.prepare("INSERT INTO _prisma_migrations(id,migration_name,checksum,finished_at,applied_steps_count) VALUES(?,?,?,CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,?)").run(name, name, checksum(sql), Number(successful), Number(successful));
}

function deploy(filename: string) {
  return spawnSync(process.execPath, ["scripts/migrate.mjs"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: `file:${filename}` }, timeout: 30_000 });
}

function populateFoundation(db: DatabaseSync) {
  db.exec(`INSERT INTO User(id,email,membershipStatus,directoryVisible,updatedAt) VALUES('retained-member','synthetic@example.test','approved',1,0);
    INSERT INTO Conference(id,name,date,location,updatedAt) VALUES('retained-event','Retained fixture',1900000000000,'Original campus',0);
    INSERT INTO ConferenceAttendee(id,userId,conferenceId,updatedAt) VALUES('retained-rsvp','retained-member','retained-event',0);`);
}

test("P2C fresh and populated foundation-only histories upgrade without resets or relation/date loss", t => {
  for (const populated of [false, true]) {
    const { db, filename } = fixture(t);
    if (populated) { db.exec(files[0].sql); record(db, files[0].name, files[0].sql); populateFoundation(db); }
    db.close();
    assert.equal(inspectMigrationLineage(filename).status, populated ? "supported-prefix" : "fresh");
    const result = deploy(filename); assert.equal(result.status, 0, result.stderr);
    assert.equal(inspectMigrationLineage(filename).status, "current");
    if (populated) {
      const upgraded = new DatabaseSync(filename, { readOnly: true });
      try {
        const row = upgraded.prepare("SELECT date,startDate,endDate,publicationState FROM Conference WHERE id='retained-event'").get();
        assert.deepEqual({ ...row }, { date: 1900000000000, startDate: 1900000000000, endDate: 1900000000000, publicationState: "draft" });
        assert.equal(upgraded.prepare("SELECT userId FROM ConferenceAttendee WHERE id='retained-rsvp'").get()?.userId, "retained-member");
        assert.equal(upgraded.prepare("SELECT directoryVisible FROM User WHERE id='retained-member'").get()?.directoryVisible, 1);
        assert.deepEqual(upgraded.prepare("PRAGMA foreign_key_check").all(), []);
      } finally { upgraded.close(); }
    }
  }
});

test("P2C old fully-applied SQL is inventoried and refused instead of silently rewriting checksums", t => {
  const { db, filename } = fixture(t);
  db.exec(files[0].sql); record(db, files[0].name, files[0].sql);
  db.exec(legacy); record(db, files[1].name, legacy);
  db.exec(files[2].sql); record(db, files[2].name, files[2].sql);
  db.exec(`INSERT INTO User(id,updatedAt) VALUES('member',0);
    INSERT INTO Conference(id,name,date,startDate,endDate,location,publicationState,updatedAt) VALUES('event','Old applied fixture',1900000000000,1900000000000,1900086400000,'Original','published',0);
    INSERT INTO ConferenceAttendee(id,userId,conferenceId,role,paperTitle,updatedAt) VALUES('rsvp','member','event','presenter','Keep title',0);`);
  const before = db.prepare("SELECT * FROM ConferenceAttendee").all(); db.close();
  const report = inspectMigrationLineage(filename);
  assert.equal(report.status, "checksum-mismatch"); assert.equal(report.safeToDeploy, false);
  const result = deploy(filename); assert.notEqual(result.status, 0); assert.match(result.stderr, /checksum-mismatch/);
  const check = new DatabaseSync(filename, { readOnly: true });
  try { assert.deepEqual(check.prepare("SELECT * FROM ConferenceAttendee").all(), before); assert.equal(check.prepare("SELECT count(*) AS n FROM _prisma_migrations").get()?.n, 3); }
  finally { check.close(); }
});

test("P2C reproduces partially applied legacy failure on populated data and blocks unsafe retries", t => {
  const { db, filename } = fixture(t);
  db.exec(files[0].sql); record(db, files[0].name, files[0].sql); populateFoundation(db);
  assert.throws(() => db.exec(legacy), /non-constant default/);
  record(db, files[1].name, legacy, false);
  assert.ok(db.prepare("PRAGMA table_info(Conference)").all().some(row => row.name === "acronym"));
  const before = db.prepare("SELECT * FROM Conference").all(); db.close();
  assert.equal(inspectMigrationLineage(filename).status, "failed-migration");
  const result = deploy(filename); assert.notEqual(result.status, 0); assert.match(result.stderr, /failed-migration/);
  const check = new DatabaseSync(filename, { readOnly: true });
  try { assert.deepEqual(check.prepare("SELECT * FROM Conference").all(), before); assert.equal(check.prepare("SELECT count(*) AS n FROM ConferenceAttendee").get()?.n, 1); }
  finally { check.close(); }
});

test("P2C refuses unmanaged tables, drift, unknown checksums and non-prefix migration histories", t => {
  const { db, filename } = fixture(t);
  db.exec(files[0].sql); record(db, files[0].name, files[0].sql); db.close();
  const edit = (sql: string) => { const connection = new DatabaseSync(filename); try { connection.exec(sql); } finally { connection.close(); } };
  edit("ALTER TABLE User ADD COLUMN unreviewed TEXT");
  assert.equal(inspectMigrationLineage(filename).status, "schema-drift");
  edit("UPDATE _prisma_migrations SET checksum='unknown'");
  assert.equal(inspectMigrationLineage(filename).status, "checksum-mismatch");
  edit("UPDATE _prisma_migrations SET migration_name='unknown'");
  assert.equal(inspectMigrationLineage(filename).status, "non-prefix-history");
  edit("DROP TABLE _prisma_migrations");
  assert.equal(inspectMigrationLineage(filename).status, "unmanaged-schema");
});
