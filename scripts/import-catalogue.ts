import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { CATALOGUE_CONFERENCES } from "../src/lib/catalogue-data";
if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  if (process.argv.includes("--publish")) throw new Error("Catalogue imports create drafts only. Review each edition manually before publication.");
  const prisma = new PrismaClient();
  try {
    let created = 0;
    await prisma.$transaction(async db => {
      for (const conf of CATALOGUE_CONFERENCES) {
        // A repeated import never updates any existing record, including an
        // uncurated draft or a collision with a synthetic fixture.
        if (await db.conference.findUnique({ where: { id: conf.id } })) continue;
        await db.conference.create({ data: {
          ...conf, date: conf.startDate, sourceUrl: conf.url,
          publicationState: "draft", sourceCheckedAt: null,
          sourceFetchedAt: null, isDemo: false,
        } });
        created++;
      }
    });
    console.log(`Created ${created} unreviewed drafts; existing records preserved. No source checks or publication claimed.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Catalogue import refused or failed. --publish is disabled; candidates require manual review."); process.exitCode = 1; });
