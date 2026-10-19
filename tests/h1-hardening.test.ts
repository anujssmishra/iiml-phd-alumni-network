import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  isPrivateOrRestrictedIp,
  validateTargetUrl,
} from "../src/lib/conference-fetcher";
import {
  reconcileConferenceSync,
} from "../src/lib/conference-sync";
import {
  quickFetchConferenceAction,
} from "../src/app/admin/conferences/actions";
import { POST as cronHandler, GET as cronGetHandler } from "../src/app/api/cron/sync-conferences/route";
import { isSyncInProgress, syncAllConferencesBatch } from "../src/lib/batch-sync";
import {
  isAutoSchedulerEnabled,
  initAutoScheduler,
  stopAutoScheduler,
} from "../src/lib/auto-scheduler";
import { NetworkError } from "../src/lib/validation";

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(email: string, status = "approved", role = "member") {
  return prisma.user.create({
    data: {
      name: `User ${email}`,
      email,
      emailVerified: new Date(),
      membershipStatus: status,
      role,
      directoryVisible: true,
      open_to_chat: true,
      current_institution: "IIM Lucknow",
    },
  });
}

const mockH1Fetcher = async (url: string) => ({
  name: `Academic Conference (${url})`,
  acronym: "H1MOCK 2027",
  startDate: new Date("2027-08-01T00:00:00.000Z"),
  endDate: new Date("2027-08-05T00:00:00.000Z"),
  timezone: "UTC",
  cfpDeadline: new Date("2027-03-01T00:00:00.000Z"),
  location: "H1 Test Venue",
  description: "Mock conference description for offline H1 testing.",
  url,
  sourceUrl: url,
  confidenceScore: 0.95,
  rawMetadata: { jsonLdFound: true, openGraphFound: true, microdataFound: false, microformatsFound: false },
});

test("H1 Hardening — Ingestion entry points and unattended writes", async (t) => {
  globalThis.__mockConferenceFetcher = mockH1Fetcher;
  t.after(() => {
    delete globalThis.__mockConferenceFetcher;
  });

  beforeEach(async () => {
    await clearDb();
  });

  await t.test("SSRF: isPrivateOrRestrictedIp catches private, loopback, link-local and metadata addresses", () => {
    // IPv4 Loopback
    assert.equal(isPrivateOrRestrictedIp("127.0.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("127.255.255.255"), true);

    // IPv4 Private
    assert.equal(isPrivateOrRestrictedIp("10.0.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("172.16.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("172.31.255.255"), true);
    assert.equal(isPrivateOrRestrictedIp("192.168.1.1"), true);

    // IPv4 Link-local & Cloud Metadata
    assert.equal(isPrivateOrRestrictedIp("169.254.169.254"), true);
    assert.equal(isPrivateOrRestrictedIp("169.254.1.1"), true);

    // IPv4 Special/CGNAT/Multicast/Broadcast
    assert.equal(isPrivateOrRestrictedIp("0.0.0.0"), true);
    assert.equal(isPrivateOrRestrictedIp("100.64.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("224.0.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("255.255.255.255"), true);

    // IPv6 Loopback & Special
    assert.equal(isPrivateOrRestrictedIp("::1"), true);
    assert.equal(isPrivateOrRestrictedIp("::"), true);
    assert.equal(isPrivateOrRestrictedIp("::ffff:127.0.0.1"), true);
    assert.equal(isPrivateOrRestrictedIp("::ffff:169.254.169.254"), true);
    assert.equal(isPrivateOrRestrictedIp("fe80::1"), true);
    assert.equal(isPrivateOrRestrictedIp("fc00::1"), true);

    // Public IPs are not restricted
    assert.equal(isPrivateOrRestrictedIp("8.8.8.8"), false);
    assert.equal(isPrivateOrRestrictedIp("1.1.1.1"), false);
    assert.equal(isPrivateOrRestrictedIp("142.250.190.46"), false);
  });

  await t.test("SSRF: validateTargetUrl rejects loopback, metadata, credentials, unsafe schemes and ports", async () => {
    // Unsafe schemes
    await assert.rejects(() => validateTargetUrl("ftp://example.com/test"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Only http:// and https:// destinations are allowed")
    );
    await assert.rejects(() => validateTargetUrl("file:///etc/passwd"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Only http:// and https:// destinations are allowed")
    );
    await assert.rejects(() => validateTargetUrl("data:text/html,test"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Only http:// and https:// destinations are allowed")
    );

    // Embedded credentials
    await assert.rejects(() => validateTargetUrl("http://user:pass@example.com"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("URLs with embedded credentials are not allowed")
    );

    // Sensitive / non-standard ports
    await assert.rejects(() => validateTargetUrl("http://example.com:22/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Restricted port")
    );
    await assert.rejects(() => validateTargetUrl("http://example.com:6379/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Restricted port")
    );

    // Localhost & internal hostnames
    await assert.rejects(() => validateTargetUrl("http://localhost/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Access to local and internal destinations is prohibited")
    );
    await assert.rejects(() => validateTargetUrl("http://service.local/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Access to local and internal destinations is prohibited")
    );
    await assert.rejects(() => validateTargetUrl("http://db.internal/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("Access to local and internal destinations is prohibited")
    );

    // Loopback / metadata IP literals
    await assert.rejects(() => validateTargetUrl("http://127.0.0.1/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("private or restricted network address")
    );
    await assert.rejects(() => validateTargetUrl("http://169.254.169.254/latest/meta-data/"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("private or restricted network address")
    );
    await assert.rejects(() => validateTargetUrl("http://10.0.0.1/admin"), (err: unknown) =>
      err instanceof NetworkError && err.message.includes("private or restricted network address")
    );
  });

  await t.test("Authorization: quickFetchConferenceAction enforces curator or admin access", async () => {
    // 1. Unauthenticated (no session)
    const unauthResult = await quickFetchConferenceAction("https://aom.org");
    assert.equal(unauthResult.success, false);
    assert.match(String(unauthResult.error), /Sign in to continue|Approved membership is required|Curator or administrator access is required/);
  });

  await t.test("Reconcile: validate reconciliation payload with parseConference schema at service boundary", async () => {
    const curator = await createUser("curator@example.com", "approved", "curator");

    // Invalid action
    await assert.rejects(
      () =>
        reconcileConferenceSync(curator.id, "invalid_action" as unknown as "create_draft", {
          name: "Test",
          acronym: null,
          startDate: new Date("2027-08-01"),
          endDate: new Date("2027-08-05"),
          timezone: "UTC",
          cfpDeadline: null,
          location: "Boston",
          description: null,
          url: "https://example.com",
          sourceUrl: "https://example.com",
          confidenceScore: 0.8,
          rawMetadata: { jsonLdFound: false, openGraphFound: false, microdataFound: false, microformatsFound: false },
        }),
      (err: unknown) => err instanceof NetworkError && err.message.includes("Invalid reconciliation action choice")
    );

    // Invalid dates (endDate < startDate)
    await assert.rejects(
      () =>
        reconcileConferenceSync(curator.id, "create_draft", {
          name: "Test Conf",
          acronym: null,
          startDate: new Date("2027-08-10"),
          endDate: new Date("2027-08-01"),
          timezone: "UTC",
          cfpDeadline: null,
          location: "Boston",
          description: null,
          url: "https://example.com",
          sourceUrl: "https://example.com",
          confidenceScore: 0.8,
          rawMetadata: { jsonLdFound: false, openGraphFound: false, microdataFound: false, microformatsFound: false },
        }),
      (err: unknown) => err instanceof NetworkError && err.message.includes("End date must be on or after start date")
    );

    // Non-curator caller rejected
    const member = await createUser("member@example.com", "approved", "member");
    await assert.rejects(
      () =>
        reconcileConferenceSync(member.id, "create_draft", {
          name: "Test Conf",
          acronym: null,
          startDate: new Date("2027-08-01"),
          endDate: new Date("2027-08-05"),
          timezone: "UTC",
          cfpDeadline: null,
          location: "Boston",
          description: null,
          url: "https://example.com",
          sourceUrl: "https://example.com",
          confidenceScore: 0.8,
          rawMetadata: { jsonLdFound: false, openGraphFound: false, microdataFound: false, microformatsFound: false },
        }),
      (err: unknown) => err instanceof NetworkError && err.status === 403
    );
  });

  await t.test("Cron: route handler fails closed, requires POST, and rejects URL secret query parameter", async () => {
    // GET returns 405 Method Not Allowed
    const getRes = await cronGetHandler();
    assert.equal(getRes.status, 405);
    const getBody = await getRes.json();
    assert.match(getBody.error, /Method Not Allowed/);

    // Fail closed: Missing secret in any environment
    delete process.env.CRON_SECRET;
    const missingSecretRes = await cronHandler(new Request("http://localhost:3000/api/cron/sync-conferences", { method: "POST" }));
    assert.equal(missingSecretRes.status, 401);

    // Empty secret fails closed
    process.env.CRON_SECRET = "   ";
    const emptySecretRes = await cronHandler(new Request("http://localhost:3000/api/cron/sync-conferences", { method: "POST" }));
    assert.equal(emptySecretRes.status, 401);

    // Secret in URL query param is strictly rejected
    process.env.CRON_SECRET = "valid-secret-token";
    const querySecretRes = await cronHandler(
      new Request("http://localhost:3000/api/cron/sync-conferences?secret=valid-secret-token", { method: "POST" })
    );
    assert.equal(querySecretRes.status, 401);

    // Invalid secret header
    const badHeaderRes = await cronHandler(
      new Request("http://localhost:3000/api/cron/sync-conferences", {
        method: "POST",
        headers: { "x-cron-secret": "wrong-secret" },
      })
    );
    assert.equal(badHeaderRes.status, 401);

    // Valid header authorized
    const validHeaderRes = await cronHandler(
      new Request("http://localhost:3000/api/cron/sync-conferences", {
        method: "POST",
        headers: { "x-cron-secret": "valid-secret-token" },
      })
    );
    assert.equal(validHeaderRes.status, 503);

    // Cleanup
    delete process.env.CRON_SECRET;
  });

  await t.test("Concurrency & single-run lock: blocks overlapping execution and returns 409", async () => {
    process.env.CRON_SECRET = "lock-test-secret";

    // Simulate batch sync lock active
    globalThis.__conferenceBatchSyncLock = true;
    assert.equal(isSyncInProgress(), true);

    // 1. Cron endpoint returns 409 Conflict when lock is held
    const cronConflictRes = await cronHandler(
      new Request("http://localhost:3000/api/cron/sync-conferences", {
        method: "POST",
        headers: { Authorization: "Bearer lock-test-secret" },
      })
    );
    assert.equal(cronConflictRes.status, 409);
    const cronConflictJson = await cronConflictRes.json();
    assert.match(cronConflictJson.error, /already in progress/);

    // 2. Direct batch sync function throws 409 NetworkError when lock is held
    await assert.rejects(
      () => syncAllConferencesBatch(),
      (err: unknown) => err instanceof NetworkError && err.status === 409
    );

    // Release lock
    globalThis.__conferenceBatchSyncLock = false;
    assert.equal(isSyncInProgress(), false);
    delete process.env.CRON_SECRET;
  });

  await t.test("Auto-scheduler: disabled by default and requires ENABLE_AUTO_CONFERENCE_SYNC", () => {
    delete process.env.ENABLE_AUTO_CONFERENCE_SYNC;
    stopAutoScheduler();

    assert.equal(isAutoSchedulerEnabled(), false);
    initAutoScheduler();
    assert.equal(globalThis.__autoSchedulerInitialized, undefined);

    process.env.ENABLE_AUTO_CONFERENCE_SYNC = "true";
    assert.equal(isAutoSchedulerEnabled(), false);
    initAutoScheduler();
    assert.equal(globalThis.__autoSchedulerInitialized, undefined);

    stopAutoScheduler();
    delete process.env.ENABLE_AUTO_CONFERENCE_SYNC;
  });
});
