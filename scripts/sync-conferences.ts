import { PrismaClient } from "@prisma/client";
import { fetchConferenceFromUrl } from "../src/lib/conference-fetcher";
import { computeConferenceDiff, publicConferenceSelect } from "../src/lib/conference-sync";

const prisma = new PrismaClient();

async function main() {
  const autoUpdate = process.argv.includes("--auto-update");
  console.log(`[sync-conferences] Starting conference sync re-check... (autoUpdate=${autoUpdate})`);

  const conferences = await prisma.conference.findMany({
    where: {
      sourceUrl: { not: null },
      publicationState: { in: ["published", "draft"] },
    },
    select: publicConferenceSelect,
  });

  console.log(`[sync-conferences] Found ${conferences.length} active conferences with source URLs.`);

  let checked = 0;
  let updated = 0;
  let diffsFound = 0;
  let errors = 0;

  for (const conf of conferences) {
    if (!conf.sourceUrl) continue;

    console.log(`\n--------------------------------------------------`);
    console.log(`Checking: ${conf.name} (${conf.acronym || "No Acronym"})`);
    console.log(`Source URL: ${conf.sourceUrl}`);

    try {
      const extracted = await fetchConferenceFromUrl(conf.sourceUrl);
      const diff = computeConferenceDiff(conf, extracted);

      checked++;

      if (diff.hasChanges) {
        diffsFound++;
        console.log(`[DIFF DETECTED] Changes found for ${conf.name}:`);
        for (const item of diff.items) {
          console.log(`  - ${item.label}: ${item.oldValue || "None"} -> ${item.newValue || "None"}`);
        }

        if (autoUpdate) {
          await prisma.conference.update({
            where: { id: conf.id },
            data: {
              cfpDeadline: extracted.cfpDeadline,
              startDate: extracted.startDate,
              endDate: extracted.endDate,
              location: extracted.location,
              sourceCheckedAt: new Date(),
            },
          });
          updated++;
          console.log(`[UPDATED] Conference details auto-updated.`);
        } else {
          await prisma.conference.update({
            where: { id: conf.id },
            data: { sourceCheckedAt: new Date() },
          });
          console.log(`[CHECKED] Recorded sourceCheckedAt without modifying details (use --auto-update to apply).`);
        }
      } else {
        await prisma.conference.update({
          where: { id: conf.id },
          data: { sourceCheckedAt: new Date() },
        });
        console.log(`[NO DIFF] Conference details match official source.`);
      }
    } catch (err) {
      errors++;
      console.error(`[ERROR] Failed to sync ${conf.name}:`, err instanceof Error ? err.message : String(err));
    }

    // Rate limiting pause between web requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n==================================================`);
  console.log(`Sync Summary:`);
  console.log(`  Total Checked: ${checked}`);
  console.log(`  Diffs Detected: ${diffsFound}`);
  console.log(`  Records Updated: ${updated}`);
  console.log(`  Fetch Errors: ${errors}`);
  console.log(`==================================================\n`);
}

main()
  .catch((e) => {
    console.error("Fatal error during conference sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
