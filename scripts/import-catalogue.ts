import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { CATALOGUE_CONFERENCES } from "../src/lib/catalogue-data";

if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient();

async function main() {
  const asPublished = process.argv.includes("--publish");
  const publicationState = asPublished ? "published" : "draft";

  console.log(`[import-catalogue] Starting non-destructive catalogue import (${CATALOGUE_CONFERENCES.length} items)...`);
  console.log(`[import-catalogue] Target publication state for new entries: ${publicationState}`);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const conf of CATALOGUE_CONFERENCES) {
    const existing = await prisma.conference.findUnique({
      where: { id: conf.id },
    });

    if (existing) {
      // If a curator has modified this record, preserve curator edits!
      if (existing.curatorId != null) {
        console.log(`[SKIP] Preserving curator-reviewed record: ${conf.name} (${conf.id})`);
        skipped++;
        continue;
      }

      // If record is archived, do not resurrect
      if (existing.publicationState === "archived") {
        console.log(`[SKIP] Preserving archived state for: ${conf.name} (${conf.id})`);
        skipped++;
        continue;
      }

      // Safe update of uncurated record while preserving existing publicationState
      await prisma.conference.update({
        where: { id: conf.id },
        data: {
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
          sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
          isDemo: false,
        },
      });
      updated++;
    } else {
      // Create new candidate record
      await prisma.conference.create({
        data: {
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
          sourceCheckedAt: new Date("2026-10-11T00:00:00.000Z"),
          publicationState,
          isDemo: false,
        },
      });
      created++;
    }
  }

  console.log(`[import-catalogue] Completed: ${created} created, ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error("[import-catalogue] Import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
