import { syncAllConferencesBatch } from "../src/lib/batch-sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("[auto-sync-all-conferences] Starting automated batch conference sync...");
  const summary = await syncAllConferencesBatch();

  console.log("\n==================================================");
  console.log(`Automated Sync Batch Summary:`);
  console.log(`  Total Sources Evaluated: ${summary.totalSources}`);
  console.log(`  Checked Successfully:   ${summary.checked}`);
  console.log(`  Records Created:        ${summary.created}`);
  console.log(`  Records Updated:        ${summary.updated}`);
  console.log(`  Unchanged Records:      ${summary.unchanged}`);
  console.log(`  Errors Encountered:     ${summary.errors}`);
  console.log("==================================================");

  for (const detail of summary.details) {
    console.log(`  - [${detail.status.toUpperCase()}] ${detail.name}: ${detail.message || ""}`);
  }
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("Fatal error during automated batch conference sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
