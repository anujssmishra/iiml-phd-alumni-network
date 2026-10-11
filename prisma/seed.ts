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
  // --- Indian Premier Management Conferences ---
  {
    id: "pan-iim-2026",
    name: "11th PAN IIM World Management Conference (WMC 2026)",
    acronym: "PAN-IIM 2026",
    startDate: new Date("2026-11-27T00:00:00.000Z"),
    endDate: new Date("2026-11-29T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-08-31T23:59:00.000Z"),
    location: "IIM Shillong, Meghalaya, India",
    description: "The flagship annual conference rotationally hosted by the Indian Institutes of Management. Theme: Driving Sustainability and Inclusive Growth for Nation Building.",
    url: "https://iimshillong.ac.in",
  },
  {
    id: "ifc-2026",
    name: "India Finance Conference (IFC 2026)",
    acronym: "IFC 2026",
    startDate: new Date("2026-12-21T00:00:00.000Z"),
    endDate: new Date("2026-12-23T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-09-15T23:59:00.000Z"),
    location: "IIM Bangalore, Bengaluru, India",
    description: "The premier Indian finance academic conference, jointly founded and organized by IIM Ahmedabad, IIM Bangalore, and IIM Calcutta.",
    url: "https://indiafa.org/",
  },
  {
    id: "indam-2027",
    name: "12th Indian Academy of Management Conference (INDAM 2027)",
    acronym: "INDAM 2027",
    startDate: new Date("2027-01-06T00:00:00.000Z"),
    endDate: new Date("2027-01-09T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-09-30T23:59:00.000Z"),
    location: "IIM Sambalpur, Odisha, India",
    description: "The official Indian affiliate of the Academy of Management (AOM). Theme: Reimagining Management in the Era of Disruption.",
    url: "https://iimsambalpur.ac.in/indam/",
  },
  {
    id: "apac-acr-2027",
    name: "Asia-Pacific Association for Consumer Research Conference (APAC ACR 2027)",
    acronym: "APAC-ACR 2027",
    startDate: new Date("2027-01-07T00:00:00.000Z"),
    endDate: new Date("2027-01-10T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-08-31T23:59:00.000Z"),
    location: "SPJIMR, Mumbai, India",
    description: "Premier regional gathering of consumer behavior and behavioral marketing scholars. Theme: Consumer Research for Societal Impact.",
    url: "https://spjimr.org",
  },

  // --- Operations, Analytics & Supply Chain ---
  {
    id: "dsi-2026",
    name: "57th Decision Sciences Institute Annual Conference (DSI 2026)",
    acronym: "DSI 2026",
    startDate: new Date("2026-11-21T00:00:00.000Z"),
    endDate: new Date("2026-11-23T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2026-06-15T23:59:00.000Z"),
    location: "San Francisco, California, USA",
    description: "Global multidisciplinary conference for operations management, supply chain, information systems, and business analytics researchers.",
    url: "https://decisionsciences.org",
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

  // --- Information Systems (AIS Premier Series) ---
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

  // --- Marketing ---
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
    id: "mktg-sci-2027",
    name: "2027 INFORMS ISMS Marketing Science Conference",
    acronym: "MKTG SCI 2027",
    startDate: new Date("2027-06-24T00:00:00.000Z"),
    endDate: new Date("2027-06-26T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-01-20T23:59:00.000Z"),
    location: "Seattle, Washington, USA",
    description: "The premier global conference for quantitative marketing, empirical industrial organization, machine learning in marketing, and econometric models.",
    url: "https://informs.org",
  },
  {
    id: "acr-2027",
    name: "Association for Consumer Research Annual Conference (ACR 2027)",
    acronym: "ACR 2027",
    startDate: new Date("2027-10-28T00:00:00.000Z"),
    endDate: new Date("2027-10-31T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-03-15T23:59:00.000Z"),
    location: "Anaheim, California, USA",
    description: "The world's leading conference for consumer research, behavioral decision theory, and consumer psychology.",
    url: "https://acrwebsite.org",
  },

  // --- Finance & Accounting ---
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
    id: "efa-2027",
    name: "54th European Finance Association Annual Meeting (EFA 2027)",
    acronym: "EFA 2027",
    startDate: new Date("2027-08-18T00:00:00.000Z"),
    endDate: new Date("2027-08-21T00:00:00.000Z"),
    timezone: "Europe/Copenhagen",
    cfpDeadline: new Date("2027-02-01T23:59:00.000Z"),
    location: "Aarhus, Denmark",
    description: "The leading annual academic finance conference in Europe, featuring asset pricing, corporate finance, and banking research.",
    url: "https://au.dk",
  },

  // --- Management, Strategy & Organizational Theory ---
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
