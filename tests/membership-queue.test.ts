import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { listMemberships, NetworkError } from "../src/lib/member-service";

assert.equal(process.env.APP_ENV, "test", "Run through npm test with its isolated database.");
assert.match(process.env.DATABASE_URL ?? "", /iiml-network-check-.*verification\.db$/);

beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { id: "review-admin", name: "Review Administrator", email: "review-admin@example.test", membershipStatus: "approved", role: "admin" } });
});
after(async () => { await prisma.$disconnect(); });

test("review queue keeps every pending applicant reachable beyond 200 approved accounts", async () => {
  await prisma.user.createMany({ data: Array.from({ length: 201 }, (_, index) => ({
    id: `approved-${String(index).padStart(3, "0")}`, membershipStatus: "approved", name: `Approved member ${index}`,
    applicationSubmittedAt: new Date("2025-01-01"),
  })) });
  await prisma.user.createMany({ data: Array.from({ length: 26 }, (_, index) => ({
    id: `pending-${String(index).padStart(3, "0")}`, membershipStatus: "pending", name: `Pending applicant ${index}`,
    applicationSubmittedAt: new Date("2026-01-01"),
  })) });

  const all = await listMemberships("review-admin");
  assert.equal(all.total, 228);
  assert.equal(all.members.length, 25);
  assert.equal(all.members.every(member => member.membershipStatus === "pending"), true);
  const first = await listMemberships("review-admin", { status: "pending" });
  const second = await listMemberships("review-admin", { status: "pending", page: 2 });
  assert.equal(first.total, 26);
  assert.equal(first.members.length, 25);
  assert.equal(second.members.length, 1);
  assert.equal(new Set([...first.members, ...second.members].map(member => member.id)).size, 26);
  assert.equal((await listMemberships("review-admin", { status: "pending", page: 999999 })).page, 2);
  const admin = await listMemberships("review-admin", { status: "approved", q: "review-admin@example.test" });
  assert.deepEqual(admin.members.map(member => member.id), ["review-admin"]);
  const noMatches = await listMemberships("review-admin", { q: "missing-account", page: 2 });
  assert.equal(noMatches.total, 0);
  assert.equal(noMatches.page, 1);
});

test("review queue validates filters and checks current administrator access first", async () => {
  const status = (code: number) => (error: unknown) => error instanceof NetworkError && error.status === code;
  for (const filters of [{ status: "invented" }, { page: 0 }, { page: "1.5" }, { page: "1000000" }, { q: "x".repeat(101) }]) {
    await assert.rejects(listMemberships("review-admin", filters), status(400));
  }
  await assert.rejects(listMemberships(null, { status: "invented" }), status(401));
  await prisma.user.update({ where: { id: "review-admin" }, data: { membershipStatus: "suspended" } });
  await assert.rejects(listMemberships("review-admin"), status(403));
});
