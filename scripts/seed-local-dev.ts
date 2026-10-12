import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding local development test data...");

  // 1. Seed Priyasharma
  await prisma.user.upsert({
    where: { id: "dev-priya" },
    update: {},
    create: {
      id: "dev-priya",
      name: "Prof. Priya Sharma",
      email: "priya.sharma@iima.ac.in",
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "member",
      doctoralInstitution: "IIM Ahmedabad",
      programme: "PhD",
      batchYear: 2020,
      research_domain: "Strategy",
      current_institution: "IIM Ahmedabad",
      current_title: "Associate Professor",
      directoryVisible: true,
      open_to_chat: true,
    },
  });

  // 2. Seed Anuj Mishra (Member)
  await prisma.user.upsert({
    where: { id: "dev-scholar-1" },
    update: {},
    create: {
      id: "dev-scholar-1",
      name: "Dr. Anuj Mishra",
      email: "anuj.phd@iiml.ac.in",
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "member",
      doctoralInstitution: "IIM Lucknow",
      programme: "PhD",
      batchYear: 2021,
      research_domain: "Information Systems",
      current_institution: "IIM Lucknow",
      current_title: "Assistant Professor",
      directoryVisible: true,
      open_to_chat: true,
    },
  });

  // 3. Seed Curator Scholar
  await prisma.user.upsert({
    where: { id: "dev-curator-1" },
    update: {},
    create: {
      id: "dev-curator-1",
      name: "Curator Scholar",
      email: "curator@iiml.ac.in",
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "curator",
      doctoralInstitution: "IIM Lucknow",
      programme: "PhD",
      batchYear: 2019,
      research_domain: "Information Systems",
      current_institution: "IIM Lucknow",
      current_title: "Professor",
      directoryVisible: true,
      open_to_chat: true,
    },
  });

  // 4. Priya's RSVP on PAN-IIM 2026
  const panIim = await prisma.conference.findUnique({ where: { id: "pan-iim-2026" } });
  if (panIim) {
    await prisma.conferenceAttendee.upsert({
      where: { userId_conferenceId: { userId: "dev-priya", conferenceId: "pan-iim-2026" } },
      update: {
        role: "presenter",
        paperTitle: "Digital Platforms & Public Policy in South Asia",
      },
      create: {
        userId: "dev-priya",
        conferenceId: "pan-iim-2026",
        status: "attending",
        role: "presenter",
        paperTitle: "Digital Platforms & Public Policy in South Asia",
      },
    });
    console.log("Seeded attendance for Prof. Priya Sharma on PAN-IIM 2026.");
  }

  // 5. Create a pre-authenticated session for dev-scholar-1
  const sessionToken = "dev-test-session-token";
  await prisma.session.upsert({
    where: { sessionToken },
    update: {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId: "dev-scholar-1",
    },
    create: {
      sessionToken,
      userId: "dev-scholar-1",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seeded session token: dev-test-session-token for dev-scholar-1");
  console.log("Local development data ready!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
