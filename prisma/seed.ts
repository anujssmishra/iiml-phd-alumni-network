import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { requireFixtureDatabase } from "../scripts/fixture-database.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

// Deliberately fictional events: never reuse real-edition IDs or source claims.
const DEMO_FIXTURES = [
  { id: "fixture-event-methods-2030", name: "Demo Research Methods Workshop", acronym: "DEMO METHODS", startDate: new Date("2030-03-10T00:00:00Z"), endDate: new Date("2030-03-11T00:00:00Z"), timezone: "Asia/Kolkata" },
  { id: "fixture-event-systems-2030", name: "Demo Information Systems Symposium", acronym: "DEMO SYSTEMS", startDate: new Date("2030-06-12T00:00:00Z"), endDate: new Date("2030-06-14T00:00:00Z"), timezone: "America/New_York" },
  { id: "fixture-event-doctoral-2030", name: "Demo Doctoral Research Forum", acronym: "DEMO DOCTORAL", startDate: new Date("2030-09-15T00:00:00Z"), endDate: new Date("2030-09-16T00:00:00Z"), timezone: "UTC" },
];

async function main() {
  // Validate before constructing Prisma, so a mistaken target receives no writes.
  requireFixtureDatabase("ALLOW_DEMO_SEED");
  const prisma = new PrismaClient();
  try {
    let created = 0;
    await prisma.$transaction(async (tx) => {
      for (const fixture of DEMO_FIXTURES) {
        // An existing ID belongs to its current owner, even if demo-marked.
        // Never delete/update it: preserve corrections, publication and RSVPs.
        if (await tx.conference.findUnique({ where: { id: fixture.id } })) continue;
        await tx.conference.create({ data: {
          ...fixture,
          date: fixture.startDate,
          location: "Fictional test campus",
          description: "Synthetic fixture for disposable local testing only. This is not a real event.",
          url: `https://example.test/events/${fixture.id}`,
          publicationState: "published",
          isDemo: true,
        } });
        created++;
      }
    });
    console.log(`Created ${created} synthetic events; existing records and attendance were preserved. No identities or sessions were created.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Demo seed refused or failed. Use npm run db:fixtures, or its owned temporary target with ALLOW_DEMO_SEED=1, APP_ENV=local/test and NODE_ENV=development/test.");
  process.exitCode = 1;
});
