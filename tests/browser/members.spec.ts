import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./offline-fixture";
import { PrismaClient } from "@prisma/client";

if (process.env.APP_ENV !== "test" || !process.env.DATABASE_URL?.includes("iiml-network-check-")) throw new Error("Run with npm run test:e2e to use an isolated database.");
const db = new PrismaClient();

async function signIn(context: BrowserContext, userId: string) {
  const token = `fixture-${userId}-${Date.now()}`;
  await db.session.create({ data: { userId, sessionToken: token, expires: new Date(Date.now() + 3_600_000) } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
}

async function saveName(page: Page, name: string) {
  await page.getByLabel("Display name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect.poll(async () => (await db.user.findUnique({ where: { id: "alice" } }))?.name).toBe(name);
}

test.beforeEach(async () => {
  await db.contactRequest.deleteMany(); await db.membershipReview.deleteMany(); await db.user.deleteMany(); await db.conference.deleteMany();
  for (const [id, name, status, role] of [["alice", "Alice Researcher", "approved", "member"], ["bob", "Bob Researcher", "approved", "member"], ["pending", "Pending Person", "pending", "member"], ["admin", "Admin Reviewer", "approved", "admin"], ["curator", "Curator Person", "approved", "curator"]]) {
    await db.user.create({ data: { id, name, email: `${id}@example.test`, emailVerified: new Date(), membershipStatus: status, role, current_institution: "IIM Lucknow", current_title: "Research scholar", doctoralInstitution: "IIM Lucknow", programme: "PhD", batchYear: 2024, research_domain: "Information Systems", methodological_expertise: "Case studies", directoryVisible: status === "approved", open_to_chat: status === "approved", profileConfirmedAt: new Date(), applicationSubmittedAt: new Date(), membershipEvidence: "Synthetic private evidence that must never appear in the directory." } });
  }
  await db.conference.create({ data: { id: "test-event", name: "Synthetic Test Symposium", date: new Date("2030-01-15"), startDate: new Date("2030-01-15"), endDate: new Date("2030-01-16"), publicationState: "published", isDemo: true, location: "Test campus" } });
  await db.conferenceAttendee.create({ data: { userId: "bob", conferenceId: "test-event" } });
});
test.afterAll(async () => { await db.$disconnect(); });

test("guests cannot see rosters or directory and private responses are not publicly cached", async ({ page }) => {
  await page.goto("/conferences/test-event");
  await expect(page.getByRole("heading", { name: "Synthetic Test Symposium" })).toBeVisible();
  await expect(page.getByText("Bob Researcher")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Count me in" })).toHaveCount(0);
  const response = await page.goto("/directory");
  await expect(page).toHaveURL(/\/signin/);
  expect(response?.headers()["cache-control"] ?? "").not.toMatch(/public|s-maxage=[1-9]/);
});

test("profile submission ignores a forged target/role; withdrawal immediately removes directory and roster data", async ({ page, context }) => {
  await signIn(context, "alice");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "My profile", exact: true })).toBeVisible();
  await page.locator("form").filter({ has: page.getByRole("button", { name: "Save profile", exact: true }) }).evaluate(form => {
    for (const [name, value] of [["userId", "bob"], ["role", "admin"]]) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); }
  });
  await saveName(page, "Alice Updated");
  expect((await db.user.findUnique({ where: { id: "bob" } }))?.name).toBe("Bob Researcher");
  expect((await db.user.findUnique({ where: { id: "alice" } }))?.role).toBe("member");
  await page.goto("/directory?q=Alice");
  await expect(page.getByRole("heading", { name: "Alice Updated" })).toBeVisible();
  await expect(page.getByText("alice@example.test")).toHaveCount(0);
  await expect(page.getByText("Synthetic private evidence", { exact: false })).toHaveCount(0);
  await page.goto("/profile");
  await page.getByRole("button", { name: /Withdraw|Hide my profile/i }).click();
  await expect.poll(async () => (await db.user.findUnique({ where: { id: "alice" } }))?.directoryVisible).toBe(false);
  await page.goto("/directory?q=Alice");
  await expect(page.getByRole("heading", { name: "Alice Updated" })).toHaveCount(0);
});

test("suspension blocks an already-open profile action and subsequent private navigation", async ({ page, context }) => {
  await signIn(context, "alice"); await page.goto("/profile");
  await page.getByLabel("Display name", { exact: true }).fill("Unauthorized edit");
  await db.user.update({ where: { id: "alice" }, data: { membershipStatus: "suspended" } });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Approved membership" })).toBeVisible();
  expect((await db.user.findUnique({ where: { id: "alice" } }))?.name).toBe("Alice Researcher");
  await page.goto("/directory"); await expect(page).toHaveURL(/\/membership/);
});

test("two authenticated members maintain independent RSVPs and anonymous action replay is rejected", async ({ page, context, browser }) => {
  await signIn(context, "alice"); await page.goto("/conferences/test-event");
  const posted = page.waitForRequest(request => request.method() === "POST" && request.url().includes("/conferences/test-event"));
  await page.getByRole("button", { name: "Count me in" }).click();
  const request = await posted;
  await expect(page.getByRole("button", { name: "Cancel RSVP" })).toBeVisible();
  expect(await db.conferenceAttendee.count()).toBe(2);
  await page.getByRole("button", { name: "Cancel RSVP" }).click();
  await expect(page.getByRole("button", { name: "Count me in" })).toBeVisible();
  const guest = await browser.newContext();
  const headers = { ...request.headers() }; delete headers.cookie; delete headers["content-length"];
  await guest.request.post(request.url(), { headers, data: request.postDataBuffer() ?? undefined });
  expect(await db.conferenceAttendee.count()).toBe(1);
  expect((await db.conferenceAttendee.findFirst())?.userId).toBe("bob");
  await guest.close();
});

test("contact email stays hidden until the recipient accepts, and cancellation removes it", async ({ page, context, browser }) => {
  await signIn(context, "alice"); await page.goto("/directory?q=Bob");
  await page.getByText("Request contact with Bob Researcher", { exact: true }).click();
  await page.getByLabel("Introduction", { exact: true }).fill("I would like to discuss our qualitative research methods.");
  await page.getByLabel("Reply email to share on acceptance", { exact: true }).fill("chosen-contact@example.test");
  await page.getByRole("checkbox", { name: /I agree to share this reply email/ }).check();
  await page.getByRole("button", { name: "Send contact request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Request sent");
  const bobContext = await browser.newContext(); await signIn(bobContext, "bob"); const bob = await bobContext.newPage();
  await bob.goto("/contacts"); await expect(bob.getByText("chosen-contact@example.test", { exact: true })).toHaveCount(0);
  await bob.getByRole("button", { name: /Accept request/i }).click();
  await expect(bob.getByText("chosen-contact@example.test", { exact: true })).toBeVisible();
  await page.goto("/contacts"); await page.getByRole("button", { name: /Cancel request/i }).click();
  await expect.poll(async () => (await db.contactRequest.findFirst())?.replyEmail).toBeNull();
  await bob.reload(); await expect(bob.getByText("chosen-contact@example.test", { exact: true })).toHaveCount(0);
  await bobContext.close();
});

test("membership roles protect reviewer evidence and pending users receive clear status", async ({ page, context }) => {
  await signIn(context, "pending"); await page.goto("/membership");
  await expect(page.getByRole("heading", { name: /membership/i }).first()).toBeVisible();
  await page.goto("/admin/members"); await expect(page.getByText("Synthetic private evidence", { exact: false })).toHaveCount(0);
  await context.clearCookies(); await signIn(context, "curator"); await page.goto("/admin/members");
  await expect(page.getByText("Synthetic private evidence", { exact: false })).toHaveCount(0);
  await context.clearCookies(); await signIn(context, "admin"); await page.goto("/admin/members");
  await expect(page.getByText("Synthetic private evidence", { exact: false }).first()).toBeVisible();
});

test("directory supports filtering/pagination and profile remains usable at mobile width by keyboard", async ({ page, context }) => {
  await signIn(context, "alice");
  for (let i = 0; i < 14; i++) await db.user.create({ data: { id: `extra-${i}`, name: `Extra Scholar ${i}`, email: `extra${i}@example.test`, membershipStatus: "approved", directoryVisible: true, current_institution: "Other University", research_domain: "Strategy" } });
  await page.goto("/directory");
  await page.getByLabel("Institution", { exact: true }).selectOption("Other University");
  await page.getByLabel("Research domain", { exact: true }).selectOption("Strategy");
  await page.getByRole("button", { name: "Search directory" }).click();
  await expect(page.getByText("14 members found", { exact: true })).toBeVisible();
  await expect(page.locator("article.member-card")).toHaveCount(12);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page.locator("article.member-card")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/profile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("Display name", { exact: true }).focus(); await expect(page.getByLabel("Display name", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByLabel("Current institution", { exact: true })).toBeFocused();
  await page.screenshot({ path: "test-results/profile-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto("/directory");
  await page.screenshot({ path: "test-results/directory-desktop.png", fullPage: true });
});

test("an application can be submitted and approved through the UI without refreshing the member session", async ({ page, context, browser }) => {
  await signIn(context, "pending"); await page.goto("/membership");
  await page.getByLabel("Membership evidence", { exact: true }).fill("Synthetic doctoral record supplied for review in this browser test.");
  await page.getByRole("button", { name: "Save application for review" }).click();
  await expect(page.getByRole("status")).toContainText("Application saved");
  const adminContext = await browser.newContext(); await signIn(adminContext, "admin"); const admin = await adminContext.newPage();
  await admin.goto("/admin/members");
  const panel = admin.getByRole("region", { name: "Pending Person", exact: true });
  await panel.getByLabel("Membership decision", { exact: true }).selectOption("approved");
  await panel.getByLabel("Verification method", { exact: true }).selectOption("manual_review");
  await panel.getByLabel("Reason for this decision", { exact: true }).fill("Synthetic doctoral evidence reviewed during browser test.");
  await panel.getByRole("button", { name: "Save membership decision" }).click();
  await expect(panel.getByRole("status")).toContainText("Membership decision saved");
  await page.goto("/directory"); await expect(page.getByRole("heading", { name: "Private member directory", exact: true })).toBeVisible();
  expect((await db.user.findUnique({ where: { id: "pending" } }))?.directoryVisible).toBe(false);
  await adminContext.close();
});

test("deleting an account ends its existing session and removes its private data", async ({ page, context }) => {
  await signIn(context, "alice"); await page.goto("/profile");
  await page.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  await page.getByRole("button", { name: "Permanently delete my account" }).click();
  await expect(page).toHaveURL(/\/signin/);
  expect(await db.user.findUnique({ where: { id: "alice" } })).toBeNull();
  expect(await db.session.count({ where: { userId: "alice" } })).toBe(0);
  await page.goto("/directory"); await expect(page).toHaveURL(/\/signin/);
});

test("withdrawing visibility invalidates a previously visited roster on browser back navigation", async ({ page, context }) => {
  await db.conferenceAttendee.create({ data: { userId: "alice", conferenceId: "test-event" } });
  await signIn(context, "alice"); await page.goto("/conferences/test-event");
  await expect(page.getByText("Alice Researcher", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My profile" }).click();
  await page.getByRole("button", { name: "Hide my profile" }).click();
  await expect(page.getByRole("status")).toContainText("Your profile is hidden");
  for (let i = 0; i < 3 && !page.url().includes("/conferences/test-event"); i++) await page.goBack();
  await expect(page).toHaveURL(/\/conferences\/test-event/);
  await expect(page.getByText("Alice Researcher", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Bob Researcher", { exact: true })).toBeVisible();
});
