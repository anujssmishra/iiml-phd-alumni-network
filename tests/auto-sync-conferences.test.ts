import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { syncAllConferencesBatch, TIER1_CONFERENCE_SOURCES } from "../src/lib/batch-sync";
import { POST as cronHandler, GET as cronGetHandler } from "../src/app/api/cron/sync-conferences/route";
import { initAutoScheduler, runScheduledSync, stopAutoScheduler } from "../src/lib/auto-scheduler";

const prisma = new PrismaClient();

const mockFetcher = async (url: string) => ({
  name: `Academic Conference (${url})`,
  acronym: "MOCK 2027",
  startDate: new Date("2027-08-01T00:00:00.000Z"),
  endDate: new Date("2027-08-05T00:00:00.000Z"),
  timezone: "UTC",
  cfpDeadline: new Date("2027-03-01T00:00:00.000Z"),
  location: "Academic Venue",
  description: "Mock conference description for offline testing.",
  url,
  sourceUrl: url,
  confidenceScore: 0.95,
  rawMetadata: { jsonLdFound: true, openGraphFound: true, microdataFound: false, microformatsFound: false },
});

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

test("automated batch ingestion & cron scheduler test suite", async (t) => {
  globalThis.__mockConferenceFetcher = mockFetcher;
  t.after(() => {
    delete globalThis.__mockConferenceFetcher;
  });

  beforeEach(async () => {
    await clearDb();
  });

  await t.test("TIER1_CONFERENCE_SOURCES defines curated tier-1 academic management sources", () => {
    assert.ok(TIER1_CONFERENCE_SOURCES.length >= 5);
    const keys = TIER1_CONFERENCE_SOURCES.map((s) => s.key);
    assert.ok(keys.includes("aom"));
    assert.ok(keys.includes("icis"));
    assert.ok(keys.includes("ama"));
  });

  await t.test("syncAllConferencesBatch auto-creates draft records in SQLite for curator review", async () => {
    const summary = await syncAllConferencesBatch();

    assert.equal(summary.totalSources, TIER1_CONFERENCE_SOURCES.length);
    assert.ok(summary.checked > 0);

    const draftCount = await prisma.conference.count({
      where: { publicationState: "draft" },
    });
    assert.ok(draftCount > 0);
  });

  await t.test("cron API route handler enforces CRON_SECRET authentication and rejects GET", async () => {
    // 0. GET requests return 405 Method Not Allowed
    const getRes = await cronGetHandler();
    assert.equal(getRes.status, 405);

    // Fail closed: when CRON_SECRET is missing, POST returns 401
    delete process.env.CRON_SECRET;
    const noSecretRes = await cronHandler(new Request("http://localhost:3000/api/cron/sync-conferences", { method: "POST" }));
    assert.equal(noSecretRes.status, 401);

    process.env.CRON_SECRET = "test-cron-secret-12345";

    // 1. Unauthorized request without token
    const unauthReq = new Request("http://localhost:3000/api/cron/sync-conferences", { method: "POST" });
    const unauthRes = await cronHandler(unauthReq);
    assert.equal(unauthRes.status, 401);

    // Reject secret in URL query parameters
    const queryReq = new Request("http://localhost:3000/api/cron/sync-conferences?secret=test-cron-secret-12345", { method: "POST" });
    const queryRes = await cronHandler(queryReq);
    assert.equal(queryRes.status, 401);

    // 2. Authorized request with Bearer header
    const authReq = new Request("http://localhost:3000/api/cron/sync-conferences", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-cron-secret-12345",
      },
    });
    const authRes = await cronHandler(authReq);
    assert.equal(authRes.status, 200);

    const json = await authRes.json();
    assert.equal(json.success, true);
    assert.ok(json.summary);

    // Reset env
    delete process.env.CRON_SECRET;
  });

  await t.test("auto-scheduler is disabled by default and opt-in via ENABLE_AUTO_CONFERENCE_SYNC", async () => {
    // 1. Disabled by default
    delete process.env.ENABLE_AUTO_CONFERENCE_SYNC;
    stopAutoScheduler();
    initAutoScheduler();
    assert.equal(globalThis.__autoSchedulerInitialized, undefined);

    // 2. Opt-in when enabled
    process.env.ENABLE_AUTO_CONFERENCE_SYNC = "true";
    initAutoScheduler();
    assert.equal(globalThis.__autoSchedulerInitialized, true);

    const summary = await runScheduledSync();
    assert.ok(summary && summary.totalSources > 0);

    // Clean up
    stopAutoScheduler();
    delete process.env.ENABLE_AUTO_CONFERENCE_SYNC;
  });
});
