import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { isSameEdition, extractBaseAcronym, findExistingConferenceMatch } from "../src/lib/conference-sync";
import { ExtractedConference } from "../src/lib/conference-fetcher";

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

test("H2 Hardening — Upgrades, fixtures, provenance & edition matching", async (t) => {
  beforeEach(async () => {
    await clearDb();
  });

  await t.test("extractBaseAcronym correctly strips year numbers and punctuation", () => {
    assert.equal(extractBaseAcronym("AOM 2027"), "AOM");
    assert.equal(extractBaseAcronym("ICIS '26"), "ICIS");
    assert.equal(extractBaseAcronym("PACIS-2027"), "PACIS");
    assert.equal(extractBaseAcronym("AMCIS_2027"), "AMCIS");
    assert.equal(extractBaseAcronym("HICSS-60"), "HICSS");
    assert.equal(extractBaseAcronym(null), null);
  });

  await t.test("isSameEdition distinguishes editions across years and different acronyms sharing URLs", () => {
    // 1. Same conference, distinct years -> NOT same edition
    const aom2026 = {
      name: "Academy of Management Annual Meeting",
      acronym: "AOM 2026",
      startDate: new Date("2026-08-07T00:00:00.000Z"),
    };
    const aom2027 = {
      name: "Academy of Management Annual Meeting",
      acronym: "AOM 2027",
      startDate: new Date("2027-08-06T00:00:00.000Z"),
    };
    assert.equal(isSameEdition(aom2026, aom2027), false);

    // 2. Distinct conferences sharing organizer URL (e.g. aisnet.org) in the same year -> NOT same edition
    const pacis2027 = {
      name: "Pacific Asia Conference on Information Systems",
      acronym: "PACIS 2027",
      startDate: new Date("2027-07-05T00:00:00.000Z"),
    };
    const amcis2027 = {
      name: "Americas Conference on Information Systems",
      acronym: "AMCIS 2027",
      startDate: new Date("2027-07-28T00:00:00.000Z"),
    };
    assert.equal(isSameEdition(pacis2027, amcis2027), false);

    // 3. Same conference, same year, matching base acronym -> IS same edition
    const icisA = {
      name: "International Conference on Information Systems 2026",
      acronym: "ICIS 2026",
      startDate: new Date("2026-12-13T00:00:00.000Z"),
    };
    const icisB = {
      name: "ICIS 2026 Bangkok",
      acronym: "ICIS",
      startDate: new Date("2026-12-13T00:00:00.000Z"),
    };
    assert.equal(isSameEdition(icisA, icisB), true);
  });

  await t.test("findExistingConferenceMatch rejects cross-conference matches on shared organizer URLs", async () => {
    // Seed PACIS pointing to aisnet.org
    await prisma.conference.create({
      data: {
        id: "pacis-2027",
        name: "Pacific Asia Conference on Information Systems 2027",
        acronym: "PACIS 2027",
        date: new Date("2027-07-05T00:00:00.000Z"),
        startDate: new Date("2027-07-05T00:00:00.000Z"),
        endDate: new Date("2027-07-09T00:00:00.000Z"),
        location: "Auckland, New Zealand",
        url: "https://aisnet.org",
        sourceUrl: "https://aisnet.org",
        publicationState: "published",
      },
    });

    // AMCIS also points to aisnet.org
    const extractedAmcis: ExtractedConference = {
      name: "Americas Conference on Information Systems 2027",
      acronym: "AMCIS 2027",
      startDate: new Date("2027-07-28T00:00:00.000Z"),
      endDate: new Date("2027-07-30T00:00:00.000Z"),
      timezone: "America/Sao_Paulo",
      cfpDeadline: null,
      location: "São Paulo, Brazil",
      description: null,
      url: "https://aisnet.org",
      sourceUrl: "https://aisnet.org",
      confidenceScore: 0.9,
      rawMetadata: { jsonLdFound: true, openGraphFound: false, microdataFound: false, microformatsFound: false },
    };

    // Must NOT match PACIS!
    const match = await findExistingConferenceMatch(extractedAmcis);
    assert.equal(match, null);
  });

  await t.test("synthetic demo seed does not delete curator-created or non-demo conferences", async () => {
    // 1. Create a curator user and a non-demo conference
    const curator = await prisma.user.create({
      data: {
        id: "curator-1",
        email: "curator@example.test",
        role: "curator",
        membershipStatus: "approved",
      },
    });

    const realConf = await prisma.conference.create({
      data: {
        id: "custom-symposium-2027",
        name: "Custom Real Symposium 2027",
        acronym: "CRS 2027",
        date: new Date("2027-09-01T00:00:00.000Z"),
        startDate: new Date("2027-09-01T00:00:00.000Z"),
        endDate: new Date("2027-09-03T00:00:00.000Z"),
        location: "IIM Lucknow, India",
        curatorId: curator.id,
        publicationState: "published",
        isDemo: false,
      },
    });

    // 2. Run seed
    const res = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
      env: { ...process.env, ALLOW_DEMO_SEED: "1" },
      encoding: "utf8",
    });
    assert.equal(res.status, 0);

    // 3. The real conference must still exist!
    const stillExists = await prisma.conference.findUnique({
      where: { id: realConf.id },
    });
    assert.ok(stillExists);
    assert.equal(stillExists.name, "Custom Real Symposium 2027");
    assert.equal(stillExists.isDemo, false);

    // 4. And exactly 3 demo conferences exist alongside it
    const demoCount = await prisma.conference.count({ where: { isDemo: true } });
    assert.equal(demoCount, 3);
  });

  await t.test("import-catalogue preserves curator edits and does not resurrect archived records", async () => {
    const curator = await prisma.user.create({
      data: {
        id: "curator-2",
        email: "curator2@example.test",
        role: "curator",
        membershipStatus: "approved",
      },
    });

    // Create an edited conference with curatorId set
    await prisma.conference.create({
      data: {
        id: "pan-iim-2026",
        name: "Curator Curated Title for PAN IIM",
        acronym: "PAN-IIM 2026",
        date: new Date("2026-11-27T00:00:00.000Z"),
        startDate: new Date("2026-11-27T00:00:00.000Z"),
        endDate: new Date("2026-11-29T00:00:00.000Z"),
        location: "Custom Verified Location",
        curatorId: curator.id,
        publicationState: "published",
        isDemo: false,
      },
    });

    // Create an archived conference
    await prisma.conference.create({
      data: {
        id: "ifc-2026",
        name: "India Finance Conference (IFC 2026)",
        acronym: "IFC 2026",
        date: new Date("2026-12-21T00:00:00.000Z"),
        startDate: new Date("2026-12-21T00:00:00.000Z"),
        endDate: new Date("2026-12-23T00:00:00.000Z"),
        location: "IIM Bangalore, Bengaluru, India",
        publicationState: "archived",
        isDemo: false,
      },
    });

    // Run import catalogue script
    const res = spawnSync(process.execPath, ["--import", "tsx", "scripts/import-catalogue.ts"], {
      env: process.env,
      encoding: "utf8",
    });
    assert.equal(res.status, 0);

    // Verify curator title was preserved
    const panIim = await prisma.conference.findUnique({ where: { id: "pan-iim-2026" } });
    assert.equal(panIim?.name, "Curator Curated Title for PAN IIM");
    assert.equal(panIim?.location, "Custom Verified Location");

    // Verify archived record was NOT resurrected
    const ifc = await prisma.conference.findUnique({ where: { id: "ifc-2026" } });
    assert.equal(ifc?.publicationState, "archived");
  });
});
