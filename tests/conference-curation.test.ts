import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  requireCurator,
  listPublicConferences,
  getConferenceDetail,
  createConference,
  updateConference,
  setPublicationState,
  deleteConference,
  submitConferenceSuggestion,
  listPendingSuggestions,
  reviewConferenceSuggestion,
} from "../src/lib/conference-service";
import { setAttendance, getRoster } from "../src/lib/member-service";
import { NetworkError, parseConference, parseConferenceSuggestion } from "../src/lib/validation";

const prisma = new PrismaClient();

const errorStatus = (status: number) => (error: unknown) =>
  error instanceof NetworkError && error.status === status;

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

test("conference curation & suggestion test suite", async (t) => {
  beforeEach(async () => {
    await clearDb();
  });

  await t.test("requireCurator enforces approved membership and curator/admin role", async () => {
    const member = await createUser("member@example.com", "approved", "member");
    const pendingCurator = await createUser("pending@example.com", "pending", "curator");
    const curator = await createUser("curator@example.com", "approved", "curator");
    const admin = await createUser("admin@example.com", "approved", "admin");

    await assert.rejects(() => requireCurator(null), errorStatus(401));
    await assert.rejects(() => requireCurator(member.id), errorStatus(403));
    await assert.rejects(() => requireCurator(pendingCurator.id), errorStatus(403));

    const curatorActor = await requireCurator(curator.id);
    assert.equal(curatorActor.id, curator.id);

    const adminActor = await requireCurator(admin.id);
    assert.equal(adminActor.id, admin.id);
  });

  await t.test("parseConference & parseConferenceSuggestion enforce valid date bounds and URLs", async () => {
    assert.throws(
      () =>
        parseConference({
          name: "Invalid Dates Conf",
          startDate: "2027-08-10",
          endDate: "2027-08-05", // End date before start date
          location: "Boston",
        }),
      (err: unknown) => err instanceof NetworkError && err.message.includes("End date must be on or after start date")
    );

    const parsed = parseConference({
      name: "Academy of Management",
      acronym: "AOM 2027",
      startDate: "2027-08-06",
      endDate: "2027-08-10",
      timezone: "America/New_York",
      location: "Boston, MA",
      url: "https://aom.org",
      publicationState: "published",
    });

    assert.equal(parsed.name, "Academy of Management");
    assert.equal(parsed.acronym, "AOM 2027");
    assert.equal(parsed.publicationState, "published");
    assert.ok(parsed.endDate >= parsed.startDate);

    const parsedSug = parseConferenceSuggestion({
      name: "Suggested Conf",
      startDate: "2027-09-01",
      endDate: "2027-09-05",
      location: "Tokyo",
      url: "https://suggested.org",
    });
    assert.equal(parsedSug.name, "Suggested Conf");
    assert.equal(parsedSug.url, "https://suggested.org");
  });

  await t.test("listPublicConferences hides draft/archived events and filters by timeframe", async () => {
    const curator = await createUser("curator@example.com", "approved", "curator");

    // Create 1 published upcoming, 1 published past, 1 draft
    await createConference(curator.id, {
      name: "Upcoming Published Conf",
      acronym: "UPC 2028",
      startDate: "2028-06-01",
      endDate: "2028-06-05",
      location: "Paris",
      url: "https://example.com/upc",
      publicationState: "published",
    });

    await createConference(curator.id, {
      name: "Past Published Conf",
      acronym: "PPC 2020",
      startDate: "2020-01-01",
      endDate: "2020-01-05",
      location: "London",
      url: "https://example.com/ppc",
      publicationState: "published",
    });

    await createConference(curator.id, {
      name: "Draft Conf",
      acronym: "DC 2028",
      startDate: "2028-09-01",
      endDate: "2028-09-05",
      location: "Berlin",
      url: "https://example.com/dc",
      publicationState: "draft",
    });

    const upcoming = await listPublicConferences({ timeframe: "upcoming" });
    assert.equal(upcoming.conferences.length, 1);
    assert.equal(upcoming.conferences[0].acronym, "UPC 2028");

    const past = await listPublicConferences({ timeframe: "past" });
    assert.equal(past.conferences.length, 1);
    assert.equal(past.conferences[0].acronym, "PPC 2020");

    const all = await listPublicConferences({ timeframe: "all" });
    assert.equal(all.conferences.length, 2); // Only published ones
  });

  await t.test("curator CRUD and publication state transitions work cleanly", async () => {
    const curator = await createUser("curator@example.com", "approved", "curator");
    const member = await createUser("member@example.com", "approved", "member");

    // Curator creates draft
    const conf = await createConference(curator.id, {
      name: "New Journal Symposium",
      acronym: "NJS 2027",
      startDate: "2027-05-10",
      endDate: "2027-05-12",
      location: "Mumbai",
      url: "https://njs2027.org",
      publicationState: "draft",
    });

    // Public detail throws 404 for member or guest
    await assert.rejects(() => getConferenceDetail(member.id, conf.id), errorStatus(404));

    // Curator updates details
    await updateConference(curator.id, conf.id, {
      name: "Updated Journal Symposium",
      acronym: "UJS 2027",
      startDate: "2027-05-10",
      endDate: "2027-05-12",
      location: "Mumbai",
      url: "https://njs2027.org",
      publicationState: "draft",
    });

    // Curator can read detail
    const curatorDetail = await getConferenceDetail(curator.id, conf.id);
    assert.equal(curatorDetail.name, "Updated Journal Symposium");
    assert.equal(curatorDetail.id, conf.id);

    // Curator publishes conference
    await setPublicationState(curator.id, conf.id, "published");

    // Now member can read detail
    const memberDetail = await getConferenceDetail(member.id, conf.id);
    assert.equal(memberDetail.publicationState, "published");

    // Curator deletes conference
    await deleteConference(curator.id, conf.id);
    await assert.rejects(() => getConferenceDetail(curator.id, conf.id), errorStatus(404));
  });

  await t.test("member suggestion submission and curator approval workflow", async () => {
    const member = await createUser("member@example.com", "approved", "member");
    const curator = await createUser("curator@example.com", "approved", "curator");

    // Member submits suggestion
    const suggestion = await submitConferenceSuggestion(member.id, {
      name: "European Conference on Information Systems",
      acronym: "ECIS 2027",
      startDate: "2027-06-14",
      endDate: "2027-06-18",
      location: "Stockholm, Sweden",
      description: "Premier European information systems conference.",
      url: "https://ecis2027.eu",
    });

    assert.equal(suggestion.status, "pending");

    // Curator lists pending suggestions
    const pending = await listPendingSuggestions(curator.id);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, suggestion.id);

    // Curator approves and publishes suggestion
    const result = await reviewConferenceSuggestion(curator.id, suggestion.id, {
      status: "approved",
      publicationState: "published",
    });

    assert.equal(result.suggestion.status, "approved");
    assert.ok(result.conference);
    assert.equal(result.conference.name, "European Conference on Information Systems");
    assert.equal(result.conference.publicationState, "published");

    // Member can now RSVP to created conference
    await setAttendance(member.id, result.conference.id, true);
    const roster = await getRoster(member.id, result.conference.id);
    assert.equal(roster.length, 1);
    assert.equal(roster[0].userId, member.id);
  });
});
