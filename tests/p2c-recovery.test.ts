import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { backupDatabase } from "../scripts/backup-db.mjs";
import { restoreDatabase } from "../scripts/restore-db.mjs";
import { acquireDatabaseAccess } from "../scripts/database-access.mjs";

function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "iiml-recovery-test-"));
  const active = join(directory, "active.db");
  const backup = join(directory, "snapshot'; quoted name.db");
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${active}`;
  const db = new DatabaseSync(active);
  try {
    for (const migration of ["20261011000000_foundation", "20261011000001_conference_curation", "20261012000000_attendee_participation", "20261019000000_conference_review"]) db.exec(readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    db.exec(`INSERT INTO User(id,email,membershipStatus,directoryVisible,updatedAt) VALUES('member','synthetic@example.test','approved',1,0);
      INSERT INTO Conference(id,name,location,startDate,endDate,publicationState,updatedAt) VALUES('event','Synthetic recovery event','Test campus',1900000000000,1900086400000,'archived',0);
      INSERT INTO ConferenceAttendee(id,userId,conferenceId,role,paperTitle,updatedAt) VALUES('rsvp','member','event','presenter','Keep this private title',0);`);
  } finally { db.close(); }
  t.after(() => {
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, active, backup };
}

function read(filename: string, sql: string) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try { return db.prepare(sql).all(); } finally { db.close(); }
}

test("P2C backup is private, quoted-path-safe and no-clobber; offline restore preserves relational data", async t => {
  const { active, backup, directory } = fixture(t);
  await backupDatabase(backup);
  assert.equal(statSync(backup).mode & 0o777, 0o600);
  assert.equal(readdirSync(directory).some(n => n.startsWith(".iiml-backup-stage-")), false);
  const original = read(backup, "SELECT * FROM ConferenceAttendee");
  await assert.rejects(backupDatabase(join(directory, "unsafe.txt")), /filenames must end/);
  await assert.rejects(backupDatabase(backup), /must not exist/);
  const db = new DatabaseSync(active); db.exec("UPDATE ConferenceAttendee SET paperTitle='Changed'; UPDATE User SET directoryVisible=0;"); db.close();
  await assert.rejects(restoreDatabase(backup), /--offline/);
  const result = await restoreDatabase(backup, { offline: true });
  assert.deepEqual(read(active, "SELECT * FROM ConferenceAttendee"), original);
  assert.equal(read(active, "SELECT directoryVisible FROM User")[0].directoryVisible, 1);
  assert.equal(read(result.safety, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Changed");
  assert.equal(statSync(result.recoveryDirectory).mode & 0o777, 0o700);
  assert.equal(statSync(result.safety).mode & 0o777, 0o600);
  assert.equal(existsSync(`${active}.maintenance`), false);
});

test("P2C refuses open SQLite handles, including an idle connection, without replacing bytes", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const before = readFileSync(active);
  const idle = new DatabaseSync(active);
  try { await assert.rejects(restoreDatabase(backup, { offline: true }), /active database was not replaced/); }
  finally { idle.close(); }
  assert.deepEqual(readFileSync(active), before);
});

test("P2C lifetime leases refuse restore even before a client opens SQLite; maintenance blocks new leases and CLIs", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const release = acquireDatabaseAccess();
  try { await assert.rejects(restoreDatabase(backup, { offline: true }), e => e instanceof Error && e.cause instanceof Error && /managed database client/.test(e.cause.message)); }
  finally { release(); }
  mkdirSync(`${active}.maintenance`, { mode: 0o700 });
  assert.throws(() => acquireDatabaseAccess(), /offline maintenance/);
  for (const script of ["scripts/migrate.mjs", "scripts/import-catalogue.ts", "scripts/bootstrap-admin.ts", "src/lib/prisma.ts"]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", script, ...(script.includes("bootstrap") ? ["--email", "synthetic@example.test"] : [])], { encoding: "utf8", env: process.env });
    assert.notEqual(result.status, 0, script);
  }
  await assert.rejects(restoreDatabase(backup, { offline: true }), /marker already exists/);
  assert.equal(existsSync(`${active}.maintenance`), true);
});

test("P2C consistent safety snapshot includes committed WAL left by a stopped/crashed writer", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `import { DatabaseSync } from 'node:sqlite'; const db=new DatabaseSync(process.argv[1]); db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; UPDATE ConferenceAttendee SET paperTitle='Committed WAL title';"); process.exit(0);`, active], { encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  assert.ok(existsSync(`${active}-wal`), "fixture must actually retain uncheckpointed WAL");
  const result = await restoreDatabase(backup, { offline: true });
  assert.equal(read(result.safety, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Committed WAL title");
  assert.equal(read(active, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Keep this private title");
  assert.equal(existsSync(`${active}-wal`), false);
});

test("P2C online backup reads committed WAL without requiring a stopped writer", async t => {
  const { active, backup } = fixture(t);
  const db = new DatabaseSync(active);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; UPDATE ConferenceAttendee SET paperTitle='Online WAL title';");
    await backupDatabase(backup);
    assert.equal(read(backup, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Online WAL title");
  } finally { db.close(); }
});

test("P2C refuses a separate unmanaged writer process with an open WAL connection", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const child = spawn(process.execPath, ["--input-type=module", "-e", `import { DatabaseSync } from 'node:sqlite'; const db=new DatabaseSync(process.argv[1]); db.exec("PRAGMA journal_mode=WAL; UPDATE ConferenceAttendee SET paperTitle='Live writer';"); console.log('ready'); setInterval(()=>db.prepare('SELECT 1').get(),1000);`, active], { stdio: ["ignore", "pipe", "pipe"] });
  const stopped = new Promise<void>(resolve => child.once("close", () => resolve()));
  try {
    await new Promise<void>((resolve, reject) => {
      let output = "";
      child.stdout.on("data", chunk => { output += chunk; if (output.includes("ready\n")) resolve(); });
      child.once("error", reject);
      child.once("exit", code => reject(new Error(`Writer exited early: ${code}`)));
    });
    assert.equal(child.exitCode, null, "writer must still be alive");
    const visibility = spawnSync("lsof", ["-nP", "-t", "--", active], { encoding: "utf8" });
    assert.ok(visibility.stdout.split(/\s+/).includes(String(child.pid)), JSON.stringify({ pid: child.pid, status: visibility.status, out: visibility.stdout, error: visibility.stderr, exited: child.exitCode }));
    await assert.rejects(restoreDatabase(backup, { offline: true }), e => e instanceof Error && e.cause instanceof Error && /Open database handles/.test(e.cause.message));
    assert.equal(read(active, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Live writer");
  } finally { child.kill(); await stopped; }
});

test("P2C failure after replacement rolls back atomically to verified pre-restore content", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const db = new DatabaseSync(active); db.exec("UPDATE ConferenceAttendee SET paperTitle='Rollback baseline';"); db.close();
  await assert.rejects(restoreDatabase(backup, { offline: true, onPhase(phase) {
    if (phase === "replaced") writeFileSync(active, "injected corrupt replacement");
  } }), /pre-restore database was recovered/);
  assert.equal(read(active, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Rollback baseline");
  assert.equal(existsSync(`${active}.maintenance`), false);
});

test("P2C failed rollback retains the maintenance marker and recovery evidence", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  await assert.rejects(restoreDatabase(backup, { offline: true, onPhase(phase, paths) {
    if (phase === "replaced") { writeFileSync(paths.safety, "injected damaged safety snapshot"); throw new Error("injected post-replace failure"); }
  } }), /rollback failed.*marker retained/);
  assert.equal(existsSync(`${active}.maintenance/owner.json`), true);
  assert.throws(() => acquireDatabaseAccess(), /offline maintenance/);
});

test("P2C process interruption after atomic replacement leaves a durable marker and consistent recovery snapshot", async t => {
  const { active, backup, directory } = fixture(t);
  await backupDatabase(backup);
  const db = new DatabaseSync(active); db.exec("UPDATE ConferenceAttendee SET paperTitle='Interrupted baseline';"); db.close();
  const entry = pathToFileURL(resolve("scripts/restore-db.mjs")).href;
  const interrupted = spawnSync(process.execPath, ["--input-type=module", "-e", `const {restoreDatabase}=await import(process.argv[1]); await restoreDatabase(process.argv[2], {offline:true,onPhase(phase){if(phase==='replaced')process.exit(86)}});`, entry, backup], { encoding: "utf8", env: process.env });
  assert.equal(interrupted.status, 86, interrupted.stderr);
  assert.equal(existsSync(`${active}.maintenance/owner.json`), true);
  const evidence = readdirSync(directory).find(n => n.startsWith("active.db.recovery-"));
  assert.ok(evidence);
  const manifest = JSON.parse(readFileSync(join(directory, evidence, "restore.json"), "utf8"));
  assert.equal(manifest.phase, "replaced");
  assert.equal(read(manifest.safety, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Interrupted baseline");
  assert.equal(read(active, "SELECT paperTitle FROM ConferenceAttendee")[0].paperTitle, "Keep this private title");
  assert.throws(() => acquireDatabaseAccess(), /offline maintenance/);
});

test("P2C rejects corrupt/foreign-key-invalid backups and pre-replacement failure preserves active data", async t => {
  const { active, backup } = fixture(t);
  await backupDatabase(backup);
  const before = readFileSync(active);
  await assert.rejects(restoreDatabase(backup, { offline: true, onPhase(phase) { if (phase === "prepared") throw new Error("injected rename failure"); } }), /active database was not replaced/);
  assert.deepEqual(readFileSync(active), before);
  const db = new DatabaseSync(backup); db.exec("PRAGMA foreign_keys=OFF; UPDATE ConferenceAttendee SET userId='missing';"); db.close();
  await assert.rejects(restoreDatabase(backup, { offline: true }), e => e instanceof Error && e.cause instanceof Error && /foreign-key/.test(e.cause.message));
  assert.deepEqual(readFileSync(active), before);
  writeFileSync(backup, "not sqlite");
  await assert.rejects(restoreDatabase(backup, { offline: true }));
  assert.deepEqual(readFileSync(active), before);
});

test("P2C refuses path aliases, linked files, non-private directories and unavailable process inspection", async t => {
  const { active, backup, directory } = fixture(t);
  await backupDatabase(backup);
  await assert.rejects(restoreDatabase(active, { offline: true }), /distinct/);
  const alias = join(directory, "alias.db"); symlinkSync(backup, alias);
  await assert.rejects(restoreDatabase(alias, { offline: true }), /without links/);
  const hardlink = join(directory, "hard.db"); linkSync(backup, hardlink);
  await assert.rejects(restoreDatabase(hardlink, { offline: true }), /without links/);
  rmSync(hardlink);
  chmodSync(directory, 0o755);
  try { await assert.rejects(restoreDatabase(backup, { offline: true }), /0700/); }
  finally { chmodSync(directory, 0o700); }
  const previous = process.env.PATH; process.env.PATH = "";
  try { await assert.rejects(restoreDatabase(backup, { offline: true }), e => e instanceof Error && e.cause instanceof Error && /lsof failed/.test(e.cause.message)); }
  finally { process.env.PATH = previous; }
  assert.equal(existsSync(`${active}.maintenance`), false);
});

test("P2C Git exclusions cover custom/default snapshots, old safety copies, leases and crash evidence", () => {
  const paths = ["backups/no-extension", "private-backups/snapshot.db", "prisma/local.db.pre-restore-123", "prisma/local.db.recovery-abc/restore.json", "prisma/local.db.maintenance/owner.json", "prisma/local.db.access/lease.json", "private-backups/.iiml-backup-stage-abc/snapshot.db"];
  const result = spawnSync("git", ["check-ignore", "--stdin"], { encoding: "utf8", input: paths.join("\n") });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), paths);
});
