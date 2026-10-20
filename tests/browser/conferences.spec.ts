import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./offline-fixture";
import { PrismaClient } from "@prisma/client";

if (process.env.APP_ENV !== "test" || !process.env.DATABASE_URL?.includes("iiml-network-check-")) {
  throw new Error("Run with npm run test:e2e to use an isolated database.");
}

const db = new PrismaClient();

async function signIn(context: BrowserContext, userId: string) {
  const token = `fixture-${userId}-${Date.now()}`;
  await db.session.create({
    data: {
      userId,
      sessionToken: token,
      expires: new Date(Date.now() + 3_600_000),
    },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.beforeEach(async () => {
  await db.conferenceAttendee.deleteMany();
  await db.conferenceSuggestion.deleteMany();
  await db.conference.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  // Create curator and member fixtures
  await db.user.create({
    data: {
      id: "curator-1",
      name: "Curator User",
      email: "curator@example.test",
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "curator",
      current_institution: "IIM Lucknow",
      current_title: "Assistant Professor",
      doctoralInstitution: "IIM Lucknow",
      programme: "PhD",
      batchYear: 2020,
      research_domain: "Information Systems",
      directoryVisible: true,
    },
  });

  await db.user.create({
    data: {
      id: "member-1",
      name: "Member User",
      email: "member@example.test",
      emailVerified: new Date(),
      membershipStatus: "approved",
      role: "member",
      current_institution: "IIM Ahmedabad",
      current_title: "Research Scholar",
      doctoralInstitution: "IIM Ahmedabad",
      programme: "PhD",
      batchYear: 2022,
      research_domain: "Strategy",
      directoryVisible: true,
    },
  });

  // Seed one published conference fixture
  await db.conference.create({
    data: {
      id: "test-conf-1",
      name: "Academic Research Conference 2030",
      acronym: "ARC 2030",
      date: new Date("2030-05-15"),
      startDate: new Date("2030-05-15"),
      endDate: new Date("2030-05-17"),
      location: "Lucknow, India",
      url: "https://example.org/arc2030",
      publicationState: "published",
      isDemo: true,
      timezone: "Asia/Kolkata",
    },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("curator can edit conference details via modal and persist updates", async ({ page, context }) => {
  await signIn(context, "curator-1");
  await page.goto("/admin/conferences");

  await expect(page.getByRole("heading", { name: "Conference Catalogue & Curation" })).toBeVisible();
  await expect(page.getByText("Academic Research Conference 2030")).toBeVisible();

  // Open Edit Modal
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit Conference Details" })).toBeVisible();

  // Modify location inside modal
  await page.locator("#edit-loc-test-conf-1").fill("Hyderabad, India");
  await page.getByRole("dialog").getByLabel("Edition-specific source URL").fill("https://example.test/arc2030/source");
  await page.getByRole("dialog").getByLabel("Change reason *", { exact: true }).fill("Checked the synthetic source and corrected its venue.");
  await page.getByRole("dialog").getByRole("checkbox").check();

  // Save changes
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Verify database record was updated
  await expect.poll(async () => {
    const updated = await db.conference.findUnique({ where: { id: "test-conf-1" } });
    return updated?.location;
  }).toBe("Hyderabad, India");
});

test("curator can archive a published conference and restore it to draft", async ({ page, context }) => {
  // Confirm visible in public catalogue first
  await page.goto("/conferences");
  await expect(page.getByRole("heading", { name: "Academic Research Conference 2030" })).toBeVisible();

  // Sign in as curator and archive the conference
  await signIn(context, "curator-1");
  await page.goto("/admin/conferences");

  const archiveBtn = page.getByRole("button", { name: "Archive" });
  await archiveBtn.click();

  // Confirm state changed to archived in DB
  await expect.poll(async () => {
    const conf = await db.conference.findUnique({ where: { id: "test-conf-1" } });
    return conf?.publicationState;
  }).toBe("archived");

  // Verify it is no longer listed in public catalogue
  await page.goto("/conferences");
  await expect(page.getByRole("heading", { name: "Academic Research Conference 2030" })).toHaveCount(0);

  // Restore to draft from curator workspace
  await page.goto("/admin/conferences");
  const restoreBtn = page.getByRole("button", { name: "Restore to Draft" });
  await restoreBtn.click();

  await expect.poll(async () => {
    const conf = await db.conference.findUnique({ where: { id: "test-conf-1" } });
    return conf?.publicationState;
  }).toBe("draft");
});

test("member can submit conference suggestion and curator can review it", async ({ page, context }) => {
  await signIn(context, "member-1");
  await page.goto("/conferences/suggest");

  await expect(page.getByRole("heading", { name: "Suggest a Conference" })).toBeVisible();

  await page.getByLabel("Conference Full Name *").fill("Global Management Forum 2030");
  await page.getByLabel("Acronym / Short Name").fill("GMF 2030");
  await page.getByLabel("Official Organizer URL *").fill("https://example.org/gmf2030");
  await page.getByLabel("Start Date *").fill("2030-08-10");
  await page.getByLabel("End Date *").fill("2030-08-12");
  await page.getByLabel("Location *").fill("Singapore");
  await page.getByRole("button", { name: "Submit Suggestion" }).click();

  await expect(page.getByRole("status")).toContainText("submitted for curator review");

  // Verify suggestion created in DB
  const sug = await db.conferenceSuggestion.findFirst({
    where: { name: "Global Management Forum 2030" },
  });
  expect(sug).not.toBeNull();
  expect(sug?.status).toBe("pending");

  // Switch to curator and review suggestion
  await context.clearCookies();
  await signIn(context, "curator-1");
  await page.goto("/admin/conferences");

  await expect(page.getByText("Global Management Forum 2030")).toBeVisible();
  await page.getByRole("button", { name: "Approve as Draft" }).click();

  await expect.poll(async () => {
    const reviewedSug = await db.conferenceSuggestion.findUnique({
      where: { id: sug!.id },
    });
    return reviewedSug?.status;
  }).toBe("approved");

  // Confirm newly created draft conference
  const createdConf = await db.conference.findFirst({
    where: { name: "Global Management Forum 2030" },
  });
  expect(createdConf).not.toBeNull();
  expect(createdConf?.publicationState).toBe("draft");
});

test("guests cannot access draft or archived conferences directly", async ({ page }) => {
  // Create a draft conference
  await db.conference.create({
    data: {
      id: "draft-conf",
      name: "Secret Draft Symposium",
      date: new Date("2030-09-01"),
      startDate: new Date("2030-09-01"),
      endDate: new Date("2030-09-02"),
      location: "Virtual",
      publicationState: "draft",
      isDemo: true,
      timezone: "UTC",
    },
  });

  // Guest visits draft conference directly -> should be 404
  const response = await page.goto("/conferences/draft-conf");
  expect([404, 307, 308]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: "Secret Draft Symposium" })).toHaveCount(0);
});
