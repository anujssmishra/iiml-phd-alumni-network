import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { acquireDatabaseAccess } from "./database-access.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length !== 2 || arguments_[0] !== "--email") {
    throw new Error("Usage: npm run admin:bootstrap -- --email existing-member@example.org");
  }
  const email = arguments_[1].trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Pass one valid email address belonging to an existing Google-signed-in member.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!["local", "test", "staging", "production"].includes(process.env.APP_ENV ?? "")) {
    throw new Error("APP_ENV must identify the intended local, test, staging, or production database.");
  }

  const release = acquireDatabaseAccess();
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (transaction) => {
      const existingAdmin = await transaction.user.findFirst({
        where: { role: "admin", membershipStatus: "approved" },
        select: { id: true },
      });
      if (existingAdmin) {
        throw new Error("An approved administrator already exists. Use the membership review interface.");
      }
      const member = await transaction.user.findUnique({
        where: { email },
        include: { accounts: { where: { provider: "google" }, select: { id: true } } },
      });
      if (!member?.emailVerified || !member.accounts.length) {
        throw new Error("The selected member must first sign in through Google with a verified email.");
      }
      if (member.membershipStatus === "suspended" || member.membershipStatus === "rejected") {
        throw new Error("Bootstrap cannot bypass an existing rejection or suspension.");
      }
      await transaction.user.update({
        where: { id: member.id },
        data: { role: "admin", membershipStatus: "approved", reviewedAt: new Date() },
      });
      await transaction.membershipReview.create({
        data: {
          targetId: member.id,
          reviewerId: null,
          fromStatus: member.membershipStatus,
          toStatus: "approved",
          fromRole: member.role,
          toRole: "admin",
          method: "operator_bootstrap",
          reason: "Initial administrator designated by the database operator.",
        },
      });
    });
    console.log(`Initial administrator approved for ${email}.`);
  } finally {
    await prisma.$disconnect();
    release();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator bootstrap failed.");
  process.exitCode = 1;
});
