import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { syncAllConferencesBatch, TIER1_CONFERENCE_SOURCES } from "../src/lib/batch-sync";
import { GET as cronHandler } from "../src/app/api/cron/sync-conferences/route";
import { initAutoScheduler, runScheduledSync } from "../src/lib/auto-scheduler";

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

test("automated batch ingestion & cron scheduler test suite", async (t) => {
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

  await t.test("syncAllConferencesBatch auto-creates and publishes records in SQLite", async () => {
    const summary = await syncAllConferencesBatch();

    assert.equal(summary.totalSources, TIER1_CONFERENCE_SOURCES.length);
    assert.ok(summary.checked > 0);

    const publishedCount = await prisma.conference.count({
      where: { publicationState: "published" },
    });
    assert.ok(publishedCount > 0);
  });

  await t.test("cron API route handler enforces CRON_SECRET authentication", async () => {
    process.env.CRON_SECRET = "test-cron-secret-12345";

    // 1. Unauthorized request without token
    const unauthReq = new Request("http://localhost:3000/api/cron/sync-conferences");
    const unauthRes = await cronHandler(unauthReq);
    assert.equal(unauthRes.status, 401);

    // 2. Authorized request with Bearer header
    const authReq = new Request("http://localhost:3000/api/cron/sync-conferences", {
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

  await t.test("auto-scheduler initializes cleanly and executes runScheduledSync", async () => {
    initAutoScheduler();
    assert.equal(globalThis.__autoSchedulerInitialized, true);

    const summary = await runScheduledSync();
    assert.ok(summary.totalSources > 0);
  });
});
