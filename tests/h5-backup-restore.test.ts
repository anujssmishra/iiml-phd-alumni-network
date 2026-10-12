import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { backupDatabase } from "../scripts/backup-db.mjs";
import { restoreDatabase } from "../scripts/restore-db.mjs";
import { existsSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("H5 Readiness — SQLite atomic backup, restore rehearsal, and integrity verification", async (t) => {
  const prisma = new PrismaClient();
  const tempBackupFile = join(tmpdir(), `h5-rehearsal-${Date.now()}.db`);

  t.after(async () => {
    await prisma.$disconnect();
    if (existsSync(tempBackupFile)) {
      unlinkSync(tempBackupFile);
    }
  });

  await t.test("step 1: populates database with rich member, conference, and attendance relations", async () => {
    // Clean slate for test
    await prisma.conferenceAttendee.deleteMany();
    await prisma.conferenceSuggestion.deleteMany();
    await prisma.conference.deleteMany();
    await prisma.user.deleteMany();

    // Create user
    await prisma.user.create({
      data: {
        id: "scholar-h5",
        name: "Dr. H5 Scholar",
        email: "scholar.h5@iiml.ac.in",
        emailVerified: new Date(),
        membershipStatus: "approved",
        role: "member",
        current_institution: "IIM Lucknow",
        current_title: "Assistant Professor",
        doctoralInstitution: "IIM Lucknow",
        programme: "PhD",
        batchYear: 2021,
        research_domain: "Information Systems",
        directoryVisible: true,
      },
    });

    // Create conference
    await prisma.conference.create({
      data: {
        id: "conf-h5",
        name: "H5 Pilot Conference 2030",
        acronym: "H5PC 2030",
        date: new Date("2030-11-01"),
        startDate: new Date("2030-11-01"),
        endDate: new Date("2030-11-03"),
        location: "Lucknow, India",
        publicationState: "published",
        isDemo: true,
        timezone: "Asia/Kolkata",
      },
    });

    // Create attendee RSVP link
    await prisma.conferenceAttendee.create({
      data: {
        userId: "scholar-h5",
        conferenceId: "conf-h5",
      },
    });

    // Verify populated state
    const userCount = await prisma.user.count({ where: { id: "scholar-h5" } });
    const confCount = await prisma.conference.count({ where: { id: "conf-h5" } });
    const attendeeCount = await prisma.conferenceAttendee.count({ where: { conferenceId: "conf-h5" } });

    assert.equal(userCount, 1);
    assert.equal(confCount, 1);
    assert.equal(attendeeCount, 1);
  });

  await t.test("step 2: atomic online backup creates verified SQLite snapshot via VACUUM INTO", async () => {
    const createdPath = await backupDatabase(tempBackupFile);
    assert.equal(existsSync(createdPath), true);

    // Verify snapshot contents using independent Prisma connection
    const snapshotPrisma = new PrismaClient({
      datasources: { db: { url: `file:${tempBackupFile.replace(/\\/g, "/")}` } },
    });
    try {
      const integrity = await snapshotPrisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        "PRAGMA integrity_check"
      );
      assert.equal(integrity[0]?.integrity_check, "ok");

      const user = await snapshotPrisma.user.findUnique({ where: { id: "scholar-h5" } });
      assert.equal(user?.name, "Dr. H5 Scholar");

      const attendee = await snapshotPrisma.conferenceAttendee.findFirst({
        where: { conferenceId: "conf-h5" },
      });
      assert.equal(attendee?.userId, "scholar-h5");
    } finally {
      await snapshotPrisma.$disconnect();
    }
  });

  await t.test("step 3: simulates catastrophic data mutation / deletion on active database", async () => {
    await prisma.conferenceAttendee.deleteMany();
    await prisma.conference.deleteMany();
    await prisma.user.deleteMany();

    const emptyUsers = await prisma.user.count();
    const emptyConfs = await prisma.conference.count();
    assert.equal(emptyUsers, 0);
    assert.equal(emptyConfs, 0);
  });

  await t.test("step 4: restoreDatabase recovers 100% of data, passes PRAGMA integrity_check", async () => {
    // Execute restore from backup
    await restoreDatabase(tempBackupFile);

    // Re-verify active database contents
    const restoredPrisma = new PrismaClient();
    try {
      const integrity = await restoredPrisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        "PRAGMA integrity_check"
      );
      assert.equal(integrity[0]?.integrity_check, "ok");

      const user = await restoredPrisma.user.findUnique({ where: { id: "scholar-h5" } });
      assert.ok(user);
      assert.equal(user.name, "Dr. H5 Scholar");
      assert.equal(user.email, "scholar.h5@iiml.ac.in");

      const conf = await restoredPrisma.conference.findUnique({ where: { id: "conf-h5" } });
      assert.ok(conf);
      assert.equal(conf.name, "H5 Pilot Conference 2030");
      assert.equal(conf.publicationState, "published");

      const attendee = await restoredPrisma.conferenceAttendee.findFirst({
        where: { conferenceId: "conf-h5" },
      });
      assert.ok(attendee);
      assert.equal(attendee.userId, "scholar-h5");
    } finally {
      await restoredPrisma.$disconnect();
    }
  });
});
