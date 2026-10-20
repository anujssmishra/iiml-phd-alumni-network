import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { requireFixtureDatabase } from "./fixture-database.mjs";
import { acquireDatabaseAccess } from "./database-access.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

// Synthetic and private by default. Never seed a real identity or admin role.
const USER_FIXTURES = [
  { id: "fixture-user-member", name: "Demo Member", email: "member@example.test", membershipStatus: "approved", role: "member" },
  { id: "fixture-user-curator", name: "Demo Curator", email: "curator@example.test", membershipStatus: "approved", role: "curator" },
  { id: "fixture-user-applicant", name: "Demo Applicant", email: "applicant@example.test", membershipStatus: "pending", role: "member" },
];

async function main() {
  requireFixtureDatabase("ALLOW_DEV_SEED");
  const release = acquireDatabaseAccess();
  const prisma = new PrismaClient();
  try {
    let created = 0;
    await prisma.$transaction(async (tx) => {
      for (const fixture of USER_FIXTURES) {
        // Neither an ID collision nor an email collision permits changing an
        // existing identity, membership, role, consent or session.
        const existing = await tx.user.findFirst({ where: { OR: [{ id: fixture.id }, { email: fixture.email }] } });
        if (existing) continue;
        await tx.user.create({ data: fixture });
        created++;
      }
    });
    console.log(`Created ${created} synthetic private profiles; existing identities were preserved. No OAuth accounts, verified mailboxes, sessions or attendance were created.`);
  } finally {
    await prisma.$disconnect();
    release();
  }
}

main().catch(() => {
  console.error("Development seed refused or failed. Use npm run db:fixtures, or its owned temporary target with ALLOW_DEV_SEED=1, APP_ENV=local/test and NODE_ENV=development/test.");
  process.exitCode = 1;
});
