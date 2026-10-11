import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  parseConferenceHtml,
  extractAcronym,
  inferTimezone,
} from "../src/lib/conference-fetcher";
import {
  findExistingConferenceMatch,
  computeConferenceDiff,
  reconcileConferenceSync,
} from "../src/lib/conference-sync";
import { createConference } from "../src/lib/conference-service";

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

async function createCurator(email = "curator@example.com") {
  return prisma.user.create({
    data: {
      name: "Test Curator",
      email,
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "curator",
    },
  });
}

test("automated conference fetcher & sync test suite", async (t) => {
  beforeEach(async () => {
    await clearDb();
  });

  await t.test("extractAcronym and inferTimezone helper functions work correctly", () => {
    assert.equal(extractAcronym("87th Annual Meeting of the Academy of Management (AOM 2027)"), "AOM 2027");
    assert.equal(extractAcronym("International Conference on Information Systems (ICIS 2026)"), "ICIS 2026");
    assert.equal(extractAcronym("Plain Conference Name"), null);

    assert.equal(inferTimezone("Hynes Convention Center, Boston, MA"), "America/New_York");
    assert.equal(inferTimezone("London, UK"), "Europe/London");
    assert.equal(inferTimezone("Tokyo, Japan"), "Asia/Tokyo");
    assert.equal(inferTimezone("Unknown Location"), "UTC");
  });

  await t.test("parseConferenceHtml extracts structured facts from JSON-LD schema.org/Event", () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Annual Meeting of Management 2027</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ConferenceEvent",
              "name": "Academy of Management Annual Meeting (AOM 2027)",
              "startDate": "2027-08-06",
              "endDate": "2027-08-10",
              "description": "Premier gathering of management scholars worldwide.",
              "url": "https://aom.org/events/annual-meeting-2027",
              "location": {
                "@type": "Place",
                "name": "Boston Convention Center",
                "address": "Boston, MA, USA"
              },
              "offers": {
                "@type": "Offer",
                "validThrough": "2027-01-12"
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    const extracted = parseConferenceHtml(mockHtml, "https://aom.org/events/annual-meeting-2027");

    assert.equal(extracted.name, "Academy of Management Annual Meeting (AOM 2027)");
    assert.equal(extracted.acronym, "AOM 2027");
    assert.equal(extracted.timezone, "America/New_York");
    assert.equal(extracted.location, "Boston Convention Center, Boston, MA, USA");
    assert.equal(extracted.startDate.toISOString().split("T")[0], "2027-08-06");
    assert.equal(extracted.endDate.toISOString().split("T")[0], "2027-08-10");
    assert.equal(extracted.cfpDeadline?.toISOString().split("T")[0], "2027-01-12");
    assert.ok(extracted.confidenceScore >= 0.7);
    assert.equal(extracted.rawMetadata.jsonLdFound, true);
  });

  await t.test("parseConferenceHtml falls back gracefully to Open Graph & HTML title", () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>European Conference on Information Systems (ECIS 2027)</title>
          <meta property="og:title" content="European Conference on Information Systems (ECIS 2027)" />
          <meta property="og:description" content="Information systems research conference in Stockholm." />
        </head>
        <body>
          <h1>ECIS 2027</h1>
          <p>Call for Papers Deadline: January 15, 2027</p>
        </body>
      </html>
    `;

    const extracted = parseConferenceHtml(mockHtml, "https://ecis2027.eu");

    assert.equal(extracted.name, "European Conference on Information Systems (ECIS 2027)");
    assert.equal(extracted.acronym, "ECIS 2027");
    assert.equal(extracted.description, "Information systems research conference in Stockholm.");
    assert.equal(extracted.cfpDeadline?.toISOString().split("T")[0], "2027-01-15");
    assert.equal(extracted.rawMetadata.openGraphFound, true);
  });

  await t.test("findExistingConferenceMatch and computeConferenceDiff identify updates", async () => {
    const curator = await createCurator();

    const existingConf = await createConference(curator.id, {
      name: "International Conference on Information Systems",
      acronym: "ICIS 2026",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      timezone: "Asia/Bangkok",
      cfpDeadline: "2026-05-01",
      location: "Bangkok, Thailand",
      url: "https://icis2026.aisnet.org",
      publicationState: "published",
    });

    const mockExtractedUpdated = {
      name: "International Conference on Information Systems",
      acronym: "ICIS 2026",
      startDate: new Date("2026-12-10"),
      endDate: new Date("2026-12-13"),
      timezone: "Asia/Bangkok",
      cfpDeadline: new Date("2026-05-15"), // Deadline extended by 2 weeks
      location: "Bangkok, Thailand",
      description: "Updated conference overview.",
      url: "https://icis2026.aisnet.org",
      sourceUrl: "https://icis2026.aisnet.org",
      confidenceScore: 0.9,
      rawMetadata: {
        jsonLdFound: true,
        openGraphFound: true,
        microdataFound: false,
        microformatsFound: false,
      },
    };

    const match = await findExistingConferenceMatch(mockExtractedUpdated);
    assert.ok(match);
    assert.equal(match.conference.id, existingConf.id);
    assert.equal(match.matchType, "exact_url");

    const diff = computeConferenceDiff(match.conference, mockExtractedUpdated);
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.cfpDeadlineChanged, true);
    assert.equal(diff.items[0].field, "cfpDeadline");
    assert.equal(diff.items[0].oldValue, "2026-05-01");
    assert.equal(diff.items[0].newValue, "2026-05-15");
  });

  await t.test("reconcileConferenceSync creates draft and updates existing records while preserving state", async () => {
    const curator = await createCurator();

    const extracted = {
      name: "Strategic Management Society Annual Conference",
      acronym: "SMS 2027",
      startDate: new Date("2027-09-18"),
      endDate: new Date("2027-09-21"),
      timezone: "Europe/Paris",
      cfpDeadline: new Date("2027-02-28"),
      location: "Paris, France",
      description: "SMS Annual Conference on Strategic Management.",
      url: "https://www.strategicmanagement.net/paris",
      sourceUrl: "https://www.strategicmanagement.net/paris",
      confidenceScore: 0.85,
      rawMetadata: {
        jsonLdFound: true,
        openGraphFound: false,
        microdataFound: false,
        microformatsFound: false,
      },
    };

    // 1. Reconcile create draft
    const createdDraft = await reconcileConferenceSync(curator.id, "create_draft", extracted);
    assert.equal(createdDraft.publicationState, "draft");
    assert.equal(createdDraft.name, "Strategic Management Society Annual Conference");
    assert.equal(createdDraft.acronym, "SMS 2027");
    assert.ok(createdDraft.sourceCheckedAt);

    // 2. Reconcile update existing
    const updatedExtracted = {
      ...extracted,
      cfpDeadline: new Date("2027-03-15"), // Extended deadline
    };

    const updated = await reconcileConferenceSync(curator.id, "update_existing", updatedExtracted, createdDraft.id);
    assert.equal(updated.id, createdDraft.id);
    assert.equal(updated.cfpDeadline?.toISOString().split("T")[0], "2027-03-15");
    assert.equal(updated.publicationState, "draft"); // Preserved draft publication state
  });
});
