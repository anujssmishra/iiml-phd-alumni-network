import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding conferences...");
  
  const conferences = [
    {
      id: "aom-2027",
      name: "Academy of Management Annual Meeting",
      date: new Date("2027-07-30"),
      location: "Vienna, Austria",
      description: "The premier conference for management and organization scholars.",
      url: "https://aom.org",
    },
    {
      id: "icis-2026",
      name: "International Conference on Information Systems (ICIS)",
      date: new Date("2026-12-13"),
      location: "Lisbon, Portugal",
      description: "Theme: Digital Collaboration and Coexistence. Hosted at the Lisbon Congress Centre.",
      url: "https://icis.aisnet.org/",
    },
    {
      id: "ama-2027",
      name: "AMA Winter Academic Conference",
      date: new Date("2027-02-12"),
      location: "New Orleans, LA, USA",
      description: "Leading event for marketing academics. Will be held at the Sheraton New Orleans.",
      url: "https://www.ama.org",
    },
  ];

  for (const conf of conferences) {
    await prisma.conference.upsert({
      where: { id: conf.id },
      update: conf,
      create: conf,
    });
  }
  
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
