import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

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
    await prisma.conference.upsert({
      where: { id: "aom-2027" },
      update: {
        name: "87th Annual Meeting of the Academy of Management",
        acronym: "AOM 2027",
        date: new Date("2027-08-06T00:00:00.000Z"),
        startDate: new Date("2027-08-06T00:00:00.000Z"),
        endDate: new Date("2027-08-10T00:00:00.000Z"),
        timezone: "America/New_York",
        cfpDeadline: new Date("2027-01-12T17:00:00.000Z"),
        location: "Boston, Massachusetts, USA",
        description: "The premier global conference for management, strategy, organizational behavior, and scholarly research.",
        url: "https://aom.org/events/annual-meeting",
        sourceUrl: "https://aom.org/events/annual-meeting",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
      create: {
        id: "aom-2027",
        name: "87th Annual Meeting of the Academy of Management",
        acronym: "AOM 2027",
        date: new Date("2027-08-06T00:00:00.000Z"),
        startDate: new Date("2027-08-06T00:00:00.000Z"),
        endDate: new Date("2027-08-10T00:00:00.000Z"),
        timezone: "America/New_York",
        cfpDeadline: new Date("2027-01-12T17:00:00.000Z"),
        location: "Boston, Massachusetts, USA",
        description: "The premier global conference for management, strategy, organizational behavior, and scholarly research.",
        url: "https://aom.org/events/annual-meeting",
        sourceUrl: "https://aom.org/events/annual-meeting",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
    });

    await prisma.conference.upsert({
      where: { id: "icis-2026" },
      update: {
        name: "International Conference on Information Systems 2026",
        acronym: "ICIS 2026",
        date: new Date("2026-12-13T00:00:00.000Z"),
        startDate: new Date("2026-12-13T00:00:00.000Z"),
        endDate: new Date("2026-12-16T00:00:00.000Z"),
        timezone: "Asia/Bangkok",
        cfpDeadline: new Date("2026-05-01T23:59:00.000Z"),
        location: "Bangkok, Thailand",
        description: "The flagship annual conference of the Association for Information Systems (AIS).",
        url: "https://icis2026.aisnet.org",
        sourceUrl: "https://icis2026.aisnet.org",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
      create: {
        id: "icis-2026",
        name: "International Conference on Information Systems 2026",
        acronym: "ICIS 2026",
        date: new Date("2026-12-13T00:00:00.000Z"),
        startDate: new Date("2026-12-13T00:00:00.000Z"),
        endDate: new Date("2026-12-16T00:00:00.000Z"),
        timezone: "Asia/Bangkok",
        cfpDeadline: new Date("2026-05-01T23:59:00.000Z"),
        location: "Bangkok, Thailand",
        description: "The flagship annual conference of the Association for Information Systems (AIS).",
        url: "https://icis2026.aisnet.org",
        sourceUrl: "https://icis2026.aisnet.org",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
    });

    await prisma.conference.upsert({
      where: { id: "ecis-2027" },
      update: {
        name: "35th European Conference on Information Systems",
        acronym: "ECIS 2027",
        date: new Date("2027-05-24T00:00:00.000Z"),
        startDate: new Date("2027-05-24T00:00:00.000Z"),
        endDate: new Date("2027-05-26T00:00:00.000Z"),
        timezone: "Europe/Luxembourg",
        cfpDeadline: new Date("2026-11-20T23:59:00.000Z"),
        location: "Luxembourg City, Luxembourg",
        description: "The premier European conference for Information Systems academics and professionals, an official AIS Region 2 conference.",
        url: "https://ecis2027.uni.lu",
        sourceUrl: "https://ecis2027.uni.lu",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
      create: {
        id: "ecis-2027",
        name: "35th European Conference on Information Systems",
        acronym: "ECIS 2027",
        date: new Date("2027-05-24T00:00:00.000Z"),
        startDate: new Date("2027-05-24T00:00:00.000Z"),
        endDate: new Date("2027-05-26T00:00:00.000Z"),
        timezone: "Europe/Luxembourg",
        cfpDeadline: new Date("2026-11-20T23:59:00.000Z"),
        location: "Luxembourg City, Luxembourg",
        description: "The premier European conference for Information Systems academics and professionals, an official AIS Region 2 conference.",
        url: "https://ecis2027.uni.lu",
        sourceUrl: "https://ecis2027.uni.lu",
        sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
        publicationState: "published",
        isDemo: true,
      },
    });

    await prisma.conference.upsert({
      where: { id: "demo-research-symposium" },
      update: {
        name: "Demo Research Symposium — synthetic example",
        acronym: "DRS 2030",
        date: new Date("2030-01-15T00:00:00.000Z"),
        startDate: new Date("2030-01-15T00:00:00.000Z"),
        endDate: new Date("2030-01-17T00:00:00.000Z"),
        timezone: "Asia/Kolkata",
        location: "Demo campus (not a real event)",
        description: "Synthetic development fixture. Dates and location are fictional; do not publish as a real conference.",
        publicationState: "published",
        isDemo: true,
      },
      create: {
        id: "demo-research-symposium",
        name: "Demo Research Symposium — synthetic example",
        acronym: "DRS 2030",
        date: new Date("2030-01-15T00:00:00.000Z"),
        startDate: new Date("2030-01-15T00:00:00.000Z"),
        endDate: new Date("2030-01-17T00:00:00.000Z"),
        timezone: "Asia/Kolkata",
        location: "Demo campus (not a real event)",
        description: "Synthetic development fixture. Dates and location are fictional; do not publish as a real conference.",
        publicationState: "published",
        isDemo: true,
      },
    });
    console.log("Synthetic conference fixtures ready. No real members or accounts were created.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Demo seed failed. Check the environment guard and database setup.", err);
  process.exitCode = 1;
});
