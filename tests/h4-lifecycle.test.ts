import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  setPublicationState,
  updateConference,
  reviewConferenceSuggestion,
  submitConferenceSuggestion,
} from "../src/lib/conference-service";
import { setAttendance, getRoster, getOwnAttendance, NetworkError } from "../src/lib/member-service";

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

test("H4 Hardening — Conference lifecycle, RSVP boundaries & curator editing", async (t) => {
  beforeEach(async () => {
    await clearDb();
  });

  await t.test("RSVP boundary rejects RSVPs on draft and archived events, allows cancellations", async () => {
    const member = await createUser("member@example.com", "approved", "member");
    const curator = await createUser("curator@example.com", "approved", "curator");

    // 1. Create a draft conference
    const draftConf = await prisma.conference.create({
      data: {
        id: "draft-conf-2027",
        name: "Draft Academic Conference 2027",
        date: new Date("2027-09-01T00:00:00.000Z"),
        startDate: new Date("2027-09-01T00:00:00.000Z"),
        endDate: new Date("2027-09-03T00:00:00.000Z"),
        location: "Lucknow, India",
        publicationState: "draft",
      },
    });

    // Attempting to RSVP to a draft conference must fail with 403
    await assert.rejects(
      () => setAttendance(member.id, draftConf.id, true),
      (err: unknown) => err instanceof NetworkError && err.status === 403 && err.message.includes("Only published conferences accept RSVPs")
    );

    // 2. Publish the conference
    await setPublicationState(curator.id, draftConf.id, "published");

    // Now RSVP must succeed
    await setAttendance(member.id, draftConf.id, true);
    const att = await getOwnAttendance(member.id, draftConf.id);
    assert.equal(att?.status, "attending");

    // 3. Archive the conference
    await setPublicationState(curator.id, draftConf.id, "archived");

    // Another member attempting new RSVP on archived conference must fail with 403
    const member2 = await createUser("member2@example.com", "approved", "member");
    await assert.rejects(
      () => setAttendance(member2.id, draftConf.id, true),
      (err: unknown) => err instanceof NetworkError && err.status === 403 && err.message.includes("Only published conferences accept RSVPs")
    );

    // The existing member CAN cancel their RSVP even though the event was archived
    await setAttendance(member.id, draftConf.id, false);
    const attAfterCancel = await getOwnAttendance(member.id, draftConf.id);
    assert.equal(attAfterCancel, null);
  });

  await t.test("getRoster protects attendee rosters on draft/archived events from non-curator members", async () => {
    const member = await createUser("member@example.com", "approved", "member");
    const curator = await createUser("curator@example.com", "approved", "curator");

    const conf = await prisma.conference.create({
      data: {
        id: "test-roster-conf",
        name: "Roster Test Conference",
        date: new Date("2027-09-01T00:00:00.000Z"),
        startDate: new Date("2027-09-01T00:00:00.000Z"),
        endDate: new Date("2027-09-03T00:00:00.000Z"),
        location: "Delhi, India",
        publicationState: "draft",
      },
    });

    // Ordinary member cannot read roster on draft conference
    await assert.rejects(
      () => getRoster(member.id, conf.id),
      (err: unknown) => err instanceof NetworkError && err.status === 404
    );

    // Curator CAN inspect roster on draft conference
    const curatorRoster = await getRoster(curator.id, conf.id);
    assert.ok(Array.isArray(curatorRoster));
  });

  await t.test("curator manual editing preserves curatorId and updates conference fields", async () => {
    const curator = await createUser("curator@example.com", "approved", "curator");
    const member = await createUser("member@example.com", "approved", "member");

    const conf = await prisma.conference.create({
      data: {
        id: "editable-conf",
        name: "Original Name",
        date: new Date("2027-10-01T00:00:00.000Z"),
        startDate: new Date("2027-10-01T00:00:00.000Z"),
        endDate: new Date("2027-10-03T00:00:00.000Z"),
        location: "Original City",
        publicationState: "draft",
      },
    });

    // Non-curator cannot edit
    await assert.rejects(
      () =>
        updateConference(member.id, conf.id, {
          name: "Hacked Name",
          startDate: "2027-10-01",
          endDate: "2027-10-03",
          location: "Original City",
        }),
      (err: unknown) => err instanceof NetworkError && err.status === 403
    );

    // Curator updates details
    const updated = await updateConference(curator.id, conf.id, {
      name: "Curated & Verified Name",
      acronym: "CVN 2027",
      startDate: "2027-10-05",
      endDate: "2027-10-08",
      timezone: "Asia/Kolkata",
      location: "New Verified Campus",
      description: "Updated detailed academic tracks and workshops.",
      url: "https://example.com/cvn",
      publicationState: "published",
    });

    assert.equal(updated.name, "Curated & Verified Name");
    assert.equal(updated.acronym, "CVN 2027");
    assert.equal(updated.location, "New Verified Campus");
    assert.equal(updated.curatorId, curator.id);
    assert.equal(updated.publicationState, "published");
  });

  await t.test("reviewConferenceSuggestion carries suggestion fields through to created conference", async () => {
    const member = await createUser("submitter@example.com", "approved", "member");
    const curator = await createUser("curator@example.com", "approved", "curator");

    const suggestion = await submitConferenceSuggestion(member.id, {
      name: "Suggested International Colloquium",
      acronym: "SIC 2027",
      startDate: "2027-11-10",
      endDate: "2027-11-12",
      location: "Vienna, Austria",
      description: "Annual colloquium on organization theory.",
      url: "https://sic2027.example.org",
    });

    const result = await reviewConferenceSuggestion(curator.id, suggestion.id, {
      status: "approved",
      publicationState: "draft",
    });

    assert.equal(result.suggestion.status, "approved");
    assert.ok(result.conference);
    assert.equal(result.conference.name, "Suggested International Colloquium");
    assert.equal(result.conference.acronym, "SIC 2027");
    assert.equal(result.conference.location, "Vienna, Austria");
    assert.equal(result.conference.curatorId, curator.id);
    assert.equal(result.conference.publicationState, "draft");
  });
});
