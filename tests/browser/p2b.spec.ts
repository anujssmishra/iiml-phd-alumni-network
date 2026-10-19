import { expect, test, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import ICAL from "ical.js";
import { CONFERENCE_REVIEW_FIELDS } from "../../src/lib/validation";

if (process.env.APP_ENV !== "test" || !process.env.DATABASE_URL?.includes("iiml-network-check-")) throw new Error("Use the isolated browser harness.");
const db = new PrismaClient();

async function signIn(context: BrowserContext, userId: string) {
  const token = randomUUID();
  await db.session.create({ data: { userId, sessionToken: token, expires: new Date(Date.now() + 3_600_000) } });
  await context.clearCookies();
  if (process.env.BROWSER_SERVER_MODE === "production") await context.setExtraHTTPHeaders({ cookie: `__Secure-next-auth.session-token=${token}; next-auth.session-token=${token}` });
  else await context.addCookies([{ name: "next-auth.session-token", value: token, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
}

async function publishFixture() {
  await db.conference.update({ where: { id: "p2b-event" }, data: { publicationState: "published", reviewedAt: new Date(), sourceCheckedAt: new Date(), reviewedById: "curator", reviewedFields: JSON.stringify(CONFERENCE_REVIEW_FIELDS) } });
}

test.beforeEach(async () => {
  await db.conferenceSuggestion.deleteMany(); await db.conference.deleteMany(); await db.user.deleteMany();
  for (const [id, role, visible] of [["curator", "curator", true], ["member", "member", true], ["hidden", "member", false]] as const) await db.user.create({ data: { id, name: `${id} Synthetic Profile`, email: `${id}@example.test`, membershipStatus: "approved", role, directoryVisible: visible } });
  await db.conference.create({ data: { id: "p2b-event", name: "Calendar Boundary Conference 2030", acronym: "CBC 2030", date: new Date("2030-07-10"), startDate: new Date("2030-07-10"), endDate: new Date("2030-07-12"), timezone: "America/Los_Angeles", cfpDeadline: new Date("2030-05-01T16:30:00Z"), location: "Synthetic Original Campus", url: "https://example.test/2030", sourceUrl: "https://example.test/2030/cfp", publicationState: "draft", isDemo: true } });
});
test.afterAll(async () => { await db.$disconnect(); });

test("curator reviews and publishes a correction, then restores its history as a draft; dates and calendar agree", async ({ page, context }) => {
  await signIn(context, "curator");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/conferences");
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  await edit.click();
  const dialog = page.getByRole("dialog", { name: "Edit Conference Details" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("CFP Deadline", { exact: true })).toHaveValue("2030-05-01T09:30");
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(edit).toBeFocused();
  await edit.click();
  await dialog.getByLabel("Location *", { exact: true }).fill("Synthetic Corrected Campus");
  await dialog.getByLabel("Change reason *", { exact: true }).fill("Corrected venue in the draft.");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect.poll(async () => (await db.conferenceRevision.count())).toBe(1);
  await expect(dialog).toHaveCount(0);
  await edit.click();
  await dialog.getByLabel("Publication State *", { exact: true }).selectOption("published");
  await dialog.getByLabel("Change reason *", { exact: true }).fill("Reviewed every fact against the synthetic edition source.");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect.poll(async () => (await db.conference.findUnique({ where: { id: "p2b-event" } }))?.publicationState).toBe("published");
  await page.goto("/conferences/p2b-event");
  await expect(page.getByText("10–12 Jul 2030", { exact: true })).toBeVisible();
  const exportResponse = await context.request.get("/api/conferences/p2b-event/ics");
  expect(exportResponse.headers()["cache-control"]).toContain("no-store");
  const imported = new ICAL.Component(ICAL.parse(await exportResponse.text())).getAllSubcomponents("vevent").map(c => new ICAL.Event(c));
  expect(imported[0].startDate.toString()).toBe("2030-07-10");
  expect(imported[0].endDate.toString()).toBe("2030-07-13");
  expect(imported[1].startDate.toJSDate().toISOString()).toBe("2030-05-01T16:30:00.000Z");
  await page.goto("/admin/conferences/p2b-event/history");
  const originalVersion = page.locator("section").filter({ has: page.getByText("Corrected venue in the draft.", { exact: true }) });
  await originalVersion.getByLabel("Restore reason").fill("Restore this draft for a second source review.");
  await originalVersion.getByRole("button", { name: "Restore this version as draft" }).click();
  await expect(page.getByRole("status")).toContainText("Version restored as a draft");
  const restored = await db.conference.findUniqueOrThrow({ where: { id: "p2b-event" } });
  expect(restored.publicationState).toBe("draft"); expect(restored.reviewedAt).toBeNull();
  expect((await context.request.get("/api/conferences/p2b-event/ics")).headers()["cache-control"]).toContain("no-store");
});

test("a member cancels an archived RSVP from My RSVPs; forged ownership cannot cancel another member", async ({ page, context, browser }) => {
  await publishFixture();
  await db.conferenceAttendee.createMany({ data: [{ userId: "member", conferenceId: "p2b-event" }, { userId: "hidden", conferenceId: "p2b-event", paperTitle: "Hidden private title" }] });
  await page.goto("/conferences/p2b-event");
  const before = await page.evaluate(async () => { const r = await fetch("/api/conferences/p2b-event/ics"); return { status: r.status, cache: r.headers.get("cache-control") }; });
  expect(before.status).toBe(200); expect(before.cache).toContain("no-store");
  await signIn(context, "curator"); await page.goto("/admin/conferences");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect.poll(async () => (await db.conference.findUnique({ where: { id: "p2b-event" } }))?.publicationState).toBe("archived");
  await signIn(context, "member"); await page.goto("/conferences/attendance");
  await expect(page.getByRole("heading", { name: "Unavailable event" })).toBeVisible();
  await expect(page.getByText("Hidden private title")).toHaveCount(0);
  await page.locator("form").filter({ has: page.getByRole("button", { name: "Cancel RSVP" }) }).evaluate(form => { const input = document.createElement("input"); input.name = "userId"; input.value = "hidden"; input.type = "hidden"; form.appendChild(input); });
  await page.getByRole("button", { name: "Cancel RSVP" }).click();
  await expect(page.getByRole("status")).toContainText("cancelled");
  expect(await db.conferenceAttendee.count({ where: { userId: "member" } })).toBe(0);
  expect(await db.conferenceAttendee.count({ where: { userId: "hidden" } })).toBe(1);
  const after = await page.evaluate(async () => { const r = await fetch("/api/conferences/p2b-event/ics"); return { status: r.status, text: await r.text(), cache: r.headers.get("cache-control") }; });
  expect(after.status).toBe(404); expect(after.cache).toContain("no-store"); expect(after.text).not.toContain("Calendar Boundary");
  const guest = await browser.newContext();
  try { const response = await guest.request.get("/conferences/attendance", { maxRedirects: 0 }); expect(response.status()).toBe(307); expect(response.headers().location).toContain("signin"); } finally { await guest.close(); }
});

test("public calendars omit private participation and hidden profiles stay out of member rosters", async ({ page, context }) => {
  await publishFixture();
  await db.conferenceAttendee.createMany({ data: [{ userId: "member", conferenceId: "p2b-event", role: "presenter", paperTitle: "Visible opted-in synthetic paper" }, { userId: "hidden", conferenceId: "p2b-event", role: "chair_discussant", paperTitle: "Hidden confidential synthetic title" }] });
  await page.goto("/conferences/p2b-event");
  await expect(page.getByText("Visible opted-in synthetic paper")).toHaveCount(0);
  const publicCalendar = await (await context.request.get("/api/conferences/p2b-event/ics")).text();
  for (const privateValue of ["member@example.test", "hidden@example.test", "Visible opted-in", "Hidden confidential", "ATTENDEE:"]) expect(publicCalendar).not.toContain(privateValue);
  await signIn(context, "member"); await page.reload();
  await expect(page.getByText("Visible opted-in synthetic paper", { exact: true })).toBeVisible();
  await expect(page.getByText("Hidden confidential synthetic title")).toHaveCount(0);
  await expect(page.getByText(/Your role and optional paper title are visible to approved members/)).toBeVisible();
  await db.user.update({ where: { id: "member" }, data: { directoryVisible: false } });
  await page.reload();
  await expect(page.getByText("Visible opted-in synthetic paper", { exact: true })).toHaveCount(0);
});

test("curator queue navigation reaches records beyond each page and retains both page selections", async ({ page, context }) => {
  for (let i = 0; i < 22; i++) {
    await db.conference.create({ data: { id: `queue-${String(i).padStart(2, "0")}`, name: `Queue fixture ${i}`, location: "Synthetic campus", startDate: new Date("2030-07-10"), endDate: new Date("2030-07-12") } });
    await db.conferenceSuggestion.create({ data: { name: `Suggestion fixture ${i}`, submitterId: "member", startDate: new Date("2030-07-10"), endDate: new Date("2030-07-12"), location: "Synthetic campus", url: "https://example.test/2030" } });
  }
  await signIn(context, "curator"); await page.goto("/admin/conferences");
  await page.getByRole("link", { name: "Next conferences" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("heading", { name: "Queue fixture 21", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Next suggestions" }).click();
  await expect(page).toHaveURL(/page=2&suggestionsPage=2/);
  await expect(page.getByRole("heading", { name: "Suggestion fixture 21", exact: true })).toBeVisible();
});
