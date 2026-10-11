import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

interface ConferenceSeedData {
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

const CONFERENCES_TO_SEED: ConferenceSeedData[] = [
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
    timezone: "Europe/Lisbon",
    cfpDeadline: new Date("2026-05-01T23:59:00.000Z"),
    location: "Lisbon, Portugal",
    description: "The flagship annual conference of the Association for Information Systems (AIS). Theme: Digital Collaboration and Coexistence.",
    url: "https://icis.aisnet.org",
  },
  {
    id: "ecis-2027",
    name: "35th European Conference on Information Systems",
    acronym: "ECIS 2027",
    startDate: new Date("2027-05-24T00:00:00.000Z"),
    endDate: new Date("2027-05-26T00:00:00.000Z"),
    timezone: "Europe/Luxembourg",
    cfpDeadline: new Date("2026-11-20T23:59:00.000Z"),
    location: "Luxembourg City, Luxembourg",
    description: "The premier European conference for Information Systems academics and professionals, an official AIS Region 2 conference.",
    url: "https://ecis2027.uni.lu",
  },
  {
    id: "sms-2027",
    name: "Strategic Management Society 47th Annual Conference",
    acronym: "SMS 2027",
    startDate: new Date("2027-10-16T00:00:00.000Z"),
    endDate: new Date("2027-10-19T00:00:00.000Z"),
    timezone: "America/Vancouver",
    cfpDeadline: new Date("2027-02-28T23:59:00.000Z"),
    location: "Vancouver, Canada",
    description: "Leading international conference bringing together strategic management academics, business leaders, and consultants.",
    url: "https://www.strategicmanagement.net",
  },
  {
    id: "informs-2027",
    name: "2027 INFORMS Annual Meeting",
    acronym: "INFORMS 2027",
    startDate: new Date("2027-10-24T00:00:00.000Z"),
    endDate: new Date("2027-10-27T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-05-15T23:59:00.000Z"),
    location: "Seattle, Washington, USA",
    description: "The largest gathering of operations research, management science, and analytics scholars and professionals worldwide.",
    url: "https://www.informs.org",
  },
  {
    id: "poms-2027",
    name: "37th Annual Conference of the Production and Operations Management Society",
    acronym: "POMS 2027",
    startDate: new Date("2027-04-22T00:00:00.000Z"),
    endDate: new Date("2027-04-26T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2026-12-01T23:59:00.000Z"),
    location: "Orlando, Florida, USA",
    description: "The premier global conference for production, operations management, supply chain, and service operations researchers.",
    url: "https://pomsmeetings.org",
  },
  {
    id: "ama-2027",
    name: "2027 AMA Winter Academic Conference",
    acronym: "AMA 2027",
    startDate: new Date("2027-02-12T00:00:00.000Z"),
    endDate: new Date("2027-02-14T00:00:00.000Z"),
    timezone: "America/Chicago",
    cfpDeadline: new Date("2026-08-15T23:59:00.000Z"),
    location: "New Orleans, Louisiana, USA",
    description: "The flagship academic conference of the American Marketing Association for marketing educators and researchers.",
    url: "https://www.ama.org/events/",
  },
  {
    id: "afa-2027",
    name: "2027 American Finance Association Annual Meeting",
    acronym: "AFA 2027",
    startDate: new Date("2027-01-03T00:00:00.000Z"),
    endDate: new Date("2027-01-05T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2026-03-15T23:59:00.000Z"),
    location: "Washington, D.C., USA",
    description: "The premier academic finance conference in the world, held jointly with the Allied Social Science Associations (ASSA).",
    url: "https://afajof.org",
  },
  {
    id: "pacis-2027",
    name: "Pacific Asia Conference on Information Systems 2027",
    acronym: "PACIS 2027",
    startDate: new Date("2027-07-05T00:00:00.000Z"),
    endDate: new Date("2027-07-09T00:00:00.000Z"),
    timezone: "Pacific/Auckland",
    cfpDeadline: new Date("2027-02-15T23:59:00.000Z"),
    location: "Auckland, New Zealand",
    description: "The premier information systems conference in the Asia-Pacific region, an official AIS Region 3 conference.",
    url: "https://aisnet.org",
  },
  {
    id: "amcis-2027",
    name: "Americas Conference on Information Systems 2027",
    acronym: "AMCIS 2027",
    startDate: new Date("2027-07-28T00:00:00.000Z"),
    endDate: new Date("2027-07-30T00:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    cfpDeadline: new Date("2027-03-01T23:59:00.000Z"),
    location: "São Paulo, Brazil",
    description: "The premier information systems conference in the Americas, an official AIS Region 1 conference.",
    url: "https://aisnet.org",
  },
  {
    id: "euram-2027",
    name: "European Academy of Management Annual Conference 2027",
    acronym: "EURAM 2027",
    startDate: new Date("2027-06-23T00:00:00.000Z"),
    endDate: new Date("2027-06-25T00:00:00.000Z"),
    timezone: "Europe/Rome",
    cfpDeadline: new Date("2027-01-10T23:59:00.000Z"),
    location: "Florence, Italy",
    description: "Europe's leading academic community of management scholars and doctoral research consortia.",
    url: "https://euram.academy/",
  },
  {
    id: "egos-2027",
    name: "43rd EGOS Colloquium 2027",
    acronym: "EGOS 2027",
    startDate: new Date("2027-07-08T00:00:00.000Z"),
    endDate: new Date("2027-07-10T00:00:00.000Z"),
    timezone: "Europe/Vienna",
    cfpDeadline: new Date("2027-01-09T23:59:00.000Z"),
    location: "Vienna, Austria",
    description: "The European Group for Organizational Studies flagship colloquium for organization theory and qualitative sociology scholars.",
    url: "https://www.egos.org/",
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

    for (const conf of CONFERENCES_TO_SEED) {
      await prisma.conference.upsert({
        where: { id: conf.id },
        update: {
          name: conf.name,
          acronym: conf.acronym,
          date: conf.startDate,
          startDate: conf.startDate,
          endDate: conf.endDate,
          timezone: conf.timezone,
          cfpDeadline: conf.cfpDeadline,
          location: conf.location,
          description: conf.description,
          url: conf.url,
          sourceUrl: conf.url,
          sourceCheckedAt: checkedAt,
          publicationState: "published",
          isDemo: false,
        },
        create: {
          id: conf.id,
          name: conf.name,
          acronym: conf.acronym,
          date: conf.startDate,
          startDate: conf.startDate,
          endDate: conf.endDate,
          timezone: conf.timezone,
          cfpDeadline: conf.cfpDeadline,
          location: conf.location,
          description: conf.description,
          url: conf.url,
          sourceUrl: conf.url,
          sourceCheckedAt: checkedAt,
          publicationState: "published",
          isDemo: false,
        },
      });
    }

    console.log(`Successfully seeded ${CONFERENCES_TO_SEED.length} tier-1 academic conferences across all management domains.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Demo seed failed. Check the environment guard and database setup.", err);
  process.exitCode = 1;
});
