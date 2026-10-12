import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

interface DemoConferenceFixture {
  id: string;
  name: string;
  acronym: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  cfpDeadline: Date | null;
  location: string;
  description: string;
  url: string;
}

const DEMO_FIXTURES: DemoConferenceFixture[] = [
  {
    id: "aom-2027",
    name: "87th Annual Meeting of the Academy of Management",
    acronym: "AOM 2027",
    startDate: new Date("2027-08-06T00:00:00.000Z"),
    endDate: new Date("2027-08-10T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2027-01-12T17:00:00.000Z"),
    location: "Boston, Massachusetts, USA",
    description: "The premier global conference for management, strategy, organizational behavior, and scholarly research.",
    url: "https://aom.org/events/annual-meeting",
  },
  {
    id: "icis-2026",
    name: "International Conference on Information Systems 2026",
    acronym: "ICIS 2026",
    startDate: new Date("2026-12-13T00:00:00.000Z"),
    endDate: new Date("2026-12-16T00:00:00.000Z"),
    timezone: "Asia/Bangkok",
    cfpDeadline: new Date("2026-05-01T23:59:00.000Z"),
    location: "Bangkok, Thailand",
    description: "The flagship annual conference of the Association for Information Systems (AIS).",
    url: "https://icis2026.aisnet.org",
  },
  {
    id: "pan-iim-2026",
    name: "11th PAN IIM World Management Conference (WMC 2026)",
    acronym: "PAN-IIM 2026",
    startDate: new Date("2026-11-27T00:00:00.000Z"),
    endDate: new Date("2026-11-29T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-08-31T23:59:00.000Z"),
    location: "IIM Shillong, Meghalaya, India",
    description: "Driving Sustainability and Inclusive Growth for Nation Building. The premier annual gathering hosted by the Indian Institutes of Management.",
    url: "https://iimshillong.ac.in",
  },
];

async function main() {
  if (
    process.env.ALLOW_DEMO_SEED !== "1" ||
    !["local", "test"].includes(process.env.APP_ENV ?? "") ||
    process.env.NODE_ENV === "production" ||
    !process.env.DATABASE_URL?.startsWith("file:")
  ) {
    throw new Error("Demo seeding requires ALLOW_DEMO_SEED=1, APP_ENV=local or test, a local SQLite database, and a non-production runtime.");
  }
  const prisma = new PrismaClient();
  try {
    const checkedAt = new Date("2026-10-11T00:00:00.000Z");

    // Only clean up previous demo/synthetic fixtures; never delete curator or production records.
    await prisma.conference.deleteMany({
      where: {
        OR: [
          { isDemo: true },
          { id: "demo-research-symposium" },
        ],
      },
    });

    for (const fixture of DEMO_FIXTURES) {
      await prisma.conference.upsert({
        where: { id: fixture.id },
        update: {
          name: fixture.name,
          acronym: fixture.acronym,
          date: fixture.startDate,
          startDate: fixture.startDate,
          endDate: fixture.endDate,
          timezone: fixture.timezone,
          cfpDeadline: fixture.cfpDeadline,
          location: fixture.location,
          description: fixture.description,
          url: fixture.url,
          sourceUrl: fixture.url,
          sourceCheckedAt: checkedAt,
          publicationState: "published",
          isDemo: true,
        },
        create: {
          id: fixture.id,
          name: fixture.name,
          acronym: fixture.acronym,
          date: fixture.startDate,
          startDate: fixture.startDate,
          endDate: fixture.endDate,
          timezone: fixture.timezone,
          cfpDeadline: fixture.cfpDeadline,
          location: fixture.location,
          description: fixture.description,
          url: fixture.url,
          sourceUrl: fixture.url,
          sourceCheckedAt: checkedAt,
          publicationState: "published",
          isDemo: true,
        },
      });
    }

    console.log(`Successfully seeded ${DEMO_FIXTURES.length} synthetic demo conference fixtures. No real member accounts were created.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Demo seed failed. Check the environment guard and database setup.", err);
  process.exitCode = 1;
});
