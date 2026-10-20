import { PrismaClient } from "@prisma/client";
import { acquireDatabaseAccess } from "../../scripts/database-access.mjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  databaseLease: (() => void) | undefined;
};

// Retain access while Prisma is idle; recovery requires this process to stop.
globalForPrisma.databaseLease ??= acquireDatabaseAccess();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging can include membership evidence and contact details.
    log: [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
