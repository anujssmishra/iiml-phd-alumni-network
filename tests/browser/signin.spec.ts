import { expect, test } from "./offline-fixture";
import { PrismaClient } from "@prisma/client";

if (process.env.APP_ENV !== "test" || !process.env.DATABASE_URL?.includes("iiml-network-check-")) throw new Error("Use the isolated browser harness.");
const db = new PrismaClient();

test.afterAll(async () => { await db.$disconnect(); });

test("sign-in offers no fixture login and forged user IDs cannot create sessions", async ({ page, context }) => {
  await db.user.deleteMany();
  await db.user.create({ data: { id: "arbitrary-existing-admin", email: "admin@example.test", membershipStatus: "approved", role: "admin" } });
  await page.goto("/signin?callbackUrl=/admin/members");
  await expect(page.getByRole("heading", { name: "Sign in to your network" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByText(/Local Dev Sign-In|Testing Bypass|Sign In as Curator/)).toHaveCount(0);
  await expect(page.locator('input[name="userId"]')).toHaveCount(0);
  await expect(page.locator('input[name^="$ACTION_"]')).toHaveCount(0);

  // Neither a plain form POST nor an arbitrary action ID may mint a session.
  for (const userId of ["arbitrary-existing-admin", "dev-scholar-1", "nonexistent-user"]) {
    await context.request.post("/signin", { form: { userId }, headers: { origin: "http://127.0.0.1:3100" } });
    await context.request.post("/signin", { form: { userId }, headers: { origin: "http://127.0.0.1:3100", "next-action": "removed-dev-login-action" } });
  }
  expect(await db.session.count()).toBe(0);
  expect((await context.cookies()).some(cookie => cookie.name.includes("session-token"))).toBe(false);

  // Even persisted tokens from the removed shortcut must no longer authenticate.
  for (const token of ["dev-session-arbitrary-existing-admin", "dev-test-session-token"]) {
    await db.session.create({ data: { userId: "arbitrary-existing-admin", sessionToken: token, expires: new Date(Date.now() + 3_600_000) } });
    await context.clearCookies();
    // HTTPS auth configuration selects the secure cookie in production. The
    // loopback test transport is HTTP, so use a raw request header in that case.
    const cookieName = process.env.BROWSER_SERVER_MODE === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token";
    const headers = { cookie: `${cookieName}=${token}` };
    const session = await context.request.get("/api/auth/session", { headers });
    expect(await session.json()).toEqual({});
    const response = await context.request.get("/admin/members", { headers, maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/signin");
  }
  // Retirement is enforced at reads; existing records have not been removed.
  expect(await db.session.count()).toBe(2);
});
