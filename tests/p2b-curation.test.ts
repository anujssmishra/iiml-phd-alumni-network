import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createFixtureDatabase } from "../scripts/fixture-database.mjs";
import { PrismaClient } from "@prisma/client";
import ICAL from "ical.js";
import { createConference, updateConference, setPublicationState, listConferenceRevisions, restoreConferenceRevision, getConferenceDetail, listAllConferencesForCurator, submitConferenceSuggestion, reviewConferenceSuggestion, listPendingSuggestions, listOwnSuggestions } from "../src/lib/conference-service";
import { setAttendance, listOwnAttendance, getRoster } from "../src/lib/member-service";
import { NetworkError, parseConference, parseConferenceDeadline, parseAttendanceDetails } from "../src/lib/validation";
import { conferenceDay, zonedDateTimeInput } from "../src/lib/conference-dates";
import { fetchConferenceFromUrl, parseConferenceHtml } from "../src/lib/conference-fetcher";
import { initAutoScheduler, stopAutoScheduler, runScheduledSync, isAutoSchedulerEnabled } from "../src/lib/auto-scheduler";
import { syncAllConferencesBatch } from "../src/lib/batch-sync";
import { POST } from "../src/app/api/cron/sync-conferences/route";
import { generateConferenceICal } from "../src/lib/ical-generator";

assert.equal(process.env.APP_ENV, "test");
assert.match(process.env.DATABASE_URL ?? "", /iiml-network-check-.*verification\.db$/);
const db = new PrismaClient();
const status = (code: number) => (error: unknown) => error instanceof NetworkError && error.status === code;
const draft = {
  name: "Synthetic Edition 2030", acronym: "SE 2030", startDate: "2030-07-10", endDate: "2030-07-12", timezone: "America/New_York",
  cfpDeadline: "2030-05-01T17:00", location: "Fictional Campus", description: "Synthetic source facts for tests.",
  url: "https://example.test/edition/2030", sourceUrl: "https://example.test/edition/2030/cfp", publicationState: "draft",
  changeReason: "Checked the synthetic edition-specific source.",
};
beforeEach(async () => {
  await db.conferenceSuggestion.deleteMany(); await db.conference.deleteMany(); await db.user.deleteMany();
  for (const [id, role] of [["curator", "curator"], ["member", "member"], ["other", "member"]]) await db.user.create({ data: { id, role, email: `${id}@example.test`, membershipStatus: "approved", directoryVisible: true } });
});
after(async () => { stopAutoScheduler(); await db.$disconnect(); });

test("publication requires explicit field review; reviewer/time are server-derived and private", async () => {
  await assert.rejects(createConference(null, draft), status(401));
  await assert.rejects(createConference("member", draft), status(403));
  await assert.rejects(createConference("curator", { ...draft, publicationState: "published", sourceCheckedAt: new Date(), reviewedAt: new Date() }), status(400));
  await assert.rejects(createConference("curator", { ...draft, publicationState: "published", sourceUrl: "", reviewConfirmed: true }), status(400));
  const conf = await createConference("curator", { ...draft, publicationState: "published", reviewConfirmed: true, reviewedById: "other", reviewedAt: "2000-01-01" });
  assert.equal(conf.reviewedById, "curator");
  assert.ok(conf.reviewedAt && conf.reviewedAt.getFullYear() > 2020);
  assert.equal(conf.sourceCheckedAt?.getTime(), conf.reviewedAt?.getTime());
  assert.equal(conf.sourceFetchedAt, null);
  assert.ok(JSON.parse(conf.reviewedFields ?? "[]").includes("cfpDeadline"));
  const publicRow = await getConferenceDetail(null, conf.id);
  for (const key of ["reviewedById", "curator", "curatorId", "revisions"]) assert.equal(key in publicRow, false);
  const history = await listConferenceRevisions("curator", conf.id);
  assert.equal(history.total, 1); assert.equal(history.rows[0].actorId, "curator");
  await assert.rejects(listConferenceRevisions("member", conf.id), status(403));
});

test("corrections invalidate review, record before/after and reject stale edits; restore preserves attendance as a draft", async () => {
  const original = await createConference("curator", { ...draft, publicationState: "published", reviewConfirmed: true });
  await setAttendance("member", original.id, true, { role: "presenter", paperTitle: "Private synthetic title" });
  const first = (await listConferenceRevisions("curator", original.id)).rows[0];
  await assert.rejects(updateConference("curator", original.id, { ...draft, publicationState: "published", location: "Changed campus" }), status(400));
  await assert.rejects(updateConference("curator", original.id, { ...draft, changeReason: "" }), status(400));
  const changed = await updateConference("curator", original.id, { ...draft, location: "Changed campus", expectedUpdatedAt: original.updatedAt.toISOString() });
  assert.equal(changed.reviewedAt, null); assert.equal(changed.sourceCheckedAt, null);
  await assert.rejects(setPublicationState("curator", original.id, "published"), status(400));
  await assert.rejects(updateConference("curator", original.id, { ...draft, expectedUpdatedAt: original.updatedAt.toISOString() }), status(409));
  const second = (await listConferenceRevisions("curator", original.id)).rows[0];
  assert.equal(JSON.parse(second.beforeJson!).location, draft.location);
  assert.equal(JSON.parse(second.afterJson).location, "Changed campus");
  await assert.rejects(restoreConferenceRevision("member", original.id, first.id, "Restore the initial reviewed version."), status(403));
  const restored = await restoreConferenceRevision("curator", original.id, first.id, "Restore the initial reviewed version.");
  assert.equal(restored.location, draft.location); assert.equal(restored.publicationState, "draft"); assert.equal(restored.reviewedAt, null);
  assert.equal(await db.conferenceAttendee.count({ where: { conferenceId: original.id } }), 1);
  assert.equal((await listConferenceRevisions("curator", original.id)).total, 3);
});

test("calendar days and timed deadlines round-trip across America/Asia zones and reject gaps, overlaps and invalid dates", () => {
  for (const timezone of ["America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Tokyo"]) {
    const parsed = parseConference({ ...draft, timezone });
    assert.equal(conferenceDay(parsed.startDate), "2030-07-10");
    assert.equal(zonedDateTimeInput(parsed.cfpDeadline!, timezone), draft.cfpDeadline);
  }
  assert.equal(parseConferenceDeadline("2030-05-01T17:00", "Asia/Kolkata")?.toISOString(), "2030-05-01T11:30:00.000Z");
  assert.throws(() => parseConferenceDeadline("2030-03-10T02:30", "America/New_York"), /ambiguous|does not exist/);
  assert.throws(() => parseConferenceDeadline("2030-11-03T01:30", "America/New_York"), /ambiguous|does not exist/);
  assert.equal(parseConferenceDeadline("2030-11-03T01:30-04:00", "America/New_York")?.toISOString(), "2030-11-03T05:30:00.000Z");
  for (const startDate of ["2030-02-30", "2030-13-01", "2030-07-10Tgarbage"]) assert.throws(() => parseConference({ ...draft, startDate }));
  assert.throws(() => parseConferenceDeadline("2030-02-30T10:00Z", "UTC"));
  assert.throws(() => parseConferenceDeadline("2030-05-01", "UTC"));
  assert.throws(() => parseAttendanceDetails({ role: "admin" }));
  assert.throws(() => parseAttendanceDetails({ role: "presenter", paperTitle: "x".repeat(301) }));
});

test("suggestions retain timezone/deadline, require draft review and paginate all queues without truncation", async () => {
  const suggestion = await submitConferenceSuggestion("member", draft);
  assert.equal(suggestion.timezone, draft.timezone);
  assert.equal(suggestion.cfpDeadline?.toISOString(), "2030-05-01T21:00:00.000Z");
  await assert.rejects(reviewConferenceSuggestion("curator", suggestion.id, { status: "approved", publicationState: "published" }), status(400));
  const reviewed = await reviewConferenceSuggestion("curator", suggestion.id, { status: "approved", publicationState: "draft" });
  assert.equal(reviewed.conference?.timezone, draft.timezone);
  assert.equal(reviewed.conference?.cfpDeadline?.getTime(), suggestion.cfpDeadline?.getTime());
  assert.equal(reviewed.conference?.reviewedAt, null);
  for (let i = 0; i < 205; i++) {
    await db.conference.create({ data: { name: `Queue ${i}`, location: "Test campus" } });
    await db.conferenceSuggestion.create({ data: { name: `Suggestion ${i}`, submitterId: "member", startDate: new Date("2030-07-10"), endDate: new Date("2030-07-12"), location: "Test campus", url: "https://example.test/2030" } });
  }
  const ids = new Set<string>();
  for (let page = 1; page <= 11; page++) { const result = await listAllConferencesForCurator("curator", page); for (const row of result.rows) ids.add(row.id); }
  assert.equal(ids.size, 206);
  assert.equal((await listPendingSuggestions("curator", 11)).rows.length, 5);
  assert.equal((await listOwnSuggestions("member", 11)).rows.length, 6);
  await assert.rejects(listAllConferencesForCurator("member"), status(403));
  await assert.rejects(listPendingSuggestions("curator", "-1"), status(400));
});

test("own attendance remains cancellable after archive without exposing unpublished facts or another member's RSVP", async () => {
  const conf = await createConference("curator", { ...draft, publicationState: "published", reviewConfirmed: true });
  await setAttendance("member", conf.id, true); await setAttendance("other", conf.id, true);
  await setPublicationState("curator", conf.id, "archived");
  const own = await listOwnAttendance("member");
  assert.equal(own.rows.length, 1); assert.equal(own.rows[0].name, "Unavailable event"); assert.equal(own.rows[0].published, false);
  assert.equal("userId" in own.rows[0], false);
  await assert.rejects(getRoster("member", conf.id), status(404));
  await assert.rejects(getConferenceDetail("member", conf.id), status(404));
  await setAttendance("member", conf.id, false, { role: "invalid" });
  assert.equal((await listOwnAttendance("member")).total, 0);
  assert.equal((await listOwnAttendance("other")).total, 1);
  await assert.rejects(listOwnAttendance(null), status(401));
});

test("catalogue imports are additive unverified drafts and --publish cannot mutate reviewed facts", async () => {
  const retained = await db.conference.create({ data: { id: "pan-iim-2026", name: "Retained synthetic correction", location: "Keep this location", publicationState: "published", sourceCheckedAt: new Date(), curatorId: "curator" } });
  const run = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", ...args], { env: process.env, encoding: "utf8", timeout: 30_000 });
  const denied = run(["scripts/import-catalogue.ts", "--publish"]);
  assert.notEqual(denied.status, 0); assert.equal(await db.conference.count(), 1);
  for (let i = 0; i < 2; i++) { const result = run(["scripts/import-catalogue.ts"]); assert.equal(result.status, 0, result.stderr); }
  assert.deepEqual(await db.conference.findUnique({ where: { id: retained.id } }), retained);
  assert.equal(await db.conference.count({ where: { publicationState: "draft", sourceCheckedAt: null, reviewedAt: null } }), 26);
  for (const path of ["scripts/sync-conferences.ts", "scripts/auto-sync-all-conferences.ts"]) assert.notEqual(run([path, "--auto-update"]).status, 0);
  assert.deepEqual(await db.conference.findUnique({ where: { id: retained.id } }), retained);
});

test("runtime ingestion refuses before DNS/HTTP/database effects even with scheduler enabled", async () => {
  let calls = 0; const originalFetch = globalThis.fetch, originalSecret = process.env.CRON_SECRET, originalFlag = process.env.ENABLE_AUTO_CONFERENCE_SYNC;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected external request"); };
  try {
    process.env.ENABLE_AUTO_CONFERENCE_SYNC = "true"; process.env.CRON_SECRET = "synthetic-test-cron-secret";
    initAutoScheduler(); assert.equal(isAutoSchedulerEnabled(), false); assert.equal(globalThis.__autoSchedulerTimer, undefined);
    await assert.rejects(runScheduledSync(), status(503));
    await assert.rejects(fetchConferenceFromUrl("https://example.test/2030"), status(503));
    await assert.rejects(syncAllConferencesBatch(), status(503));
    const response = await POST(new Request("http://localhost/api/cron/sync-conferences", { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    assert.equal(response.status, 503); assert.equal(calls, 0); assert.equal(await db.conference.count(), 0);
    assert.throws(() => parseConferenceHtml('<title>No dates</title>', "https://example.test/2030"), /incomplete/);
  } finally {
    globalThis.fetch = originalFetch; stopAutoScheduler();
    if (originalSecret == null) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = originalSecret;
    if (originalFlag == null) delete process.env.ENABLE_AUTO_CONFERENCE_SYNC; else process.env.ENABLE_AUTO_CONFERENCE_SYNC = originalFlag;
  }
});

test("an independent calendar parser imports folded Unicode, date-only days and the exact UTC CFP instant", () => {
  const name = "研究 🧑🏽‍🎓 " .repeat(25);
  const parsed = parseConference({ ...draft, timezone: "Asia/Kolkata" });
  const ics = generateConferenceICal({ ...parsed, id: "id\r\nATTENDEE:injected", name, description: "Line one\rLine two\nComma, semicolon; backslash\\", url: "https://example.test/2030" });
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  const calendar = new ICAL.Component(ICAL.parse(ics));
  const events = calendar.getAllSubcomponents("vevent").map(component => new ICAL.Event(component));
  assert.equal(events.length, 2); assert.equal(events[0].summary, `${draft.acronym} - ${name}`);
  assert.equal(events[0].startDate.isDate, true); assert.equal(events[0].startDate.toString(), "2030-07-10");
  assert.equal(events[0].endDate.toString(), "2030-07-13");
  assert.equal(events[1].startDate.toJSDate().toISOString(), "2030-05-01T11:30:00.000Z");
  assert.equal(events[0].component.getAllProperties("attendee").length, 0);
  assert.equal(events[0].description, "Line one\nLine two\nComma, semicolon; backslash\\");
});

test("the new review migration returns unreviewed legacy publications to draft while preserving dates, IDs, attendance and audit evidence", async () => {
  const target = await createFixtureDatabase();
  const sqlite = new DatabaseSync(join(target.directory, "fixtures.db"));
  try {
    sqlite.exec("PRAGMA foreign_keys=ON");
    for (const name of ["20261011000000_foundation", "20261011000001_conference_curation", "20261012000000_attendee_participation"]) sqlite.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
    sqlite.exec(`INSERT INTO User (id,email,updatedAt) VALUES ('legacy-user','legacy@example.test',CURRENT_TIMESTAMP);
      INSERT INTO Conference (id,name,date,startDate,endDate,location,publicationState,sourceCheckedAt,updatedAt) VALUES ('legacy-event','Legacy event','2030-07-10','2030-07-10','2030-07-12','Test campus','published',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO ConferenceAttendee (id,userId,conferenceId,role,paperTitle,updatedAt) VALUES ('legacy-rsvp','legacy-user','legacy-event','presenter','Retain this title',CURRENT_TIMESTAMP);`);
    const before = sqlite.prepare("SELECT date,startDate,endDate FROM Conference").get();
    sqlite.exec(readFileSync("prisma/migrations/20261019000000_conference_review/migration.sql", "utf8"));
    assert.deepEqual(sqlite.prepare("SELECT date,startDate,endDate FROM Conference").get(), before);
    const event = sqlite.prepare("SELECT publicationState,sourceCheckedAt,reviewedAt FROM Conference").get();
    assert.equal(event?.publicationState, "draft"); assert.equal(event?.sourceCheckedAt, null); assert.equal(event?.reviewedAt, null);
    assert.equal(sqlite.prepare("SELECT paperTitle FROM ConferenceAttendee WHERE id='legacy-rsvp'").get()?.paperTitle, "Retain this title");
    const history = sqlite.prepare("SELECT beforeJson,afterJson FROM ConferenceRevision WHERE conferenceId='legacy-event'").get();
    assert.equal(JSON.parse(String(history?.beforeJson)).publicationState, "published");
    assert.equal(JSON.parse(String(history?.afterJson)).publicationState, "draft");
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally { sqlite.close(); await rm(target.directory, { recursive: true, force: true }); }
});
