import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { spawnSync } from "node:child_process";
import { prisma } from "../src/lib/prisma";
import { parseEmail } from "../src/lib/validation";
import { deleteAccount, getActor, getOwnAttendance, getRoster, listContacts, listDirectory, listMemberships, NetworkError, requestContact, requireAdmin, requireMember, respondContact, reviewMembership, saveProfile, setAttendance, submitApplication, withdrawProfile } from "../src/lib/member-service";

assert.equal(process.env.APP_ENV, "test", "Run through npm test with its isolated database.");
assert.match(process.env.DATABASE_URL ?? "", /iiml-network-check-.*verification\.db$/);

const profile = { name: "Alice Scholar", currentInstitution: "IIM Lucknow", currentTitle: "Research scholar", doctoralInstitution: "IIM Lucknow", programme: "PhD", batchYear: 2024, researchDomain: "Information Systems", methods: ["Case studies"], directoryVisible: true, openToChat: true };
const application = { doctoralInstitution: "IIM Lucknow", programme: "PhD", batchYear: 2024, evidence: "Synthetic institutional reference for isolated tests only." };
const errorStatus = (status: number) => (error: unknown) => error instanceof NetworkError && error.status === status;

beforeEach(async () => {
  await prisma.contactRequest.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.user.deleteMany();
  await prisma.conference.deleteMany();
});
after(async () => { await prisma.$disconnect(); });

async function user(id: string, status = "approved", role = "member") {
  return prisma.user.create({ data: { id, name: `${id} Scholar`, email: `${id}@example.test`, emailVerified: new Date(), membershipStatus: status, role, applicationSubmittedAt: new Date(), doctoralInstitution: "IIM Lucknow", programme: "PhD" } });
}
async function visible(id: string, extra = {}) { await user(id); return saveProfile(id, { ...profile, name: `${id} Scholar`, ...extra }); }
async function event() { return prisma.conference.create({ data: { id: "test-event", name: "Synthetic event", date: new Date("2030-01-15"), startDate: new Date("2030-01-15"), endDate: new Date("2030-01-16"), publicationState: "published", isDemo: true, location: "Test campus" } }); }

test("reply email rejects mailto query and fragment injection", () => {
  for (const address of ["victim@example.com?bcc=observer%40example.net", "victim@example.com?subject=meeting", "victim@example.com#fragment"]) assert.throws(() => parseEmail(address), errorStatus(400));
  assert.equal(parseEmail("Scholar+research@Example.com"), "scholar+research@example.com");
});

test("new identities are pending and private; all protected services deny guests and unapproved identities", async () => {
  const pending = await prisma.user.create({ data: { id: "pending", email: "pending@example.test" } });
  assert.equal(pending.membershipStatus, "pending"); assert.equal(pending.directoryVisible, false); assert.equal(pending.open_to_chat, false);
  await assert.rejects(requireMember(null), errorStatus(401));
  await assert.rejects(getActor("missing"), errorStatus(401));
  for (const state of ["pending", "rejected", "suspended"]) {
    const id = state === "pending" ? "pending" : (await user(state, state)).id;
    await assert.rejects(listDirectory(id), errorStatus(403));
    await assert.rejects(saveProfile(id, profile), errorStatus(403));
    await assert.rejects(getRoster(id, "test-event"), errorStatus(403));
    await assert.rejects(setAttendance(id, "test-event", true), errorStatus(403));
  }
});

test("application, approval, audit, roles and immediate suspension use current database state", async () => {
  await user("admin", "approved", "admin"); await user("curator", "approved", "curator"); await user("applicant", "pending");
  await submitApplication("applicant", application);
  await assert.rejects(listMemberships("curator"), errorStatus(403));
  await assert.rejects(requireAdmin("applicant"), errorStatus(403));
  const decision = { targetId: "applicant", status: "approved", role: "member", reason: "Institutional evidence checked for test.", verificationMethod: "institutional_record" };
  await assert.rejects(reviewMembership("curator", decision), errorStatus(403));
  await reviewMembership("admin", decision);
  await saveProfile("applicant", profile);
  assert.equal((await requireMember("applicant")).id, "applicant");
  await reviewMembership("admin", { ...decision, status: "suspended" });
  await assert.rejects(listDirectory("applicant"), errorStatus(403));
  await assert.rejects(submitApplication("applicant", application), errorStatus(403));
  assert.equal((await getActor("applicant")).directoryVisible, false);
  assert.equal(await prisma.membershipReview.count({ where: { targetId: "applicant" } }), 2);
  await assert.rejects(reviewMembership("admin", { ...decision, targetId: "admin" }), errorStatus(403));
});

test("approval requires submitted evidence and a verified mailbox; a rejected applicant can resubmit", async () => {
  await user("admin", "approved", "admin"); await prisma.user.create({ data: { id: "applicant", email: "new@example.test" } });
  const decision = { targetId: "applicant", status: "approved", role: "member", reason: "Evidence independently checked by reviewer.", verificationMethod: "manual_review" };
  await assert.rejects(reviewMembership("admin", decision), errorStatus(400));
  await submitApplication("applicant", application);
  await assert.rejects(reviewMembership("admin", decision), errorStatus(400));
  await prisma.user.update({ where: { id: "applicant" }, data: { emailVerified: new Date() } });
  await reviewMembership("admin", { ...decision, status: "rejected" });
  await submitApplication("applicant", application);
  assert.equal((await getActor("applicant")).membershipStatus, "pending");
});

test("profile writes derive ownership from the session actor and cannot change privileges", async () => {
  await user("alice"); await user("bob");
  await saveProfile("alice", { ...profile, id: "bob", userId: "bob", role: "admin", membershipStatus: "approved", email: "attacker@example.test" });
  assert.equal((await getActor("alice")).name, "Alice Scholar");
  assert.equal((await getActor("alice")).role, "member");
  assert.equal((await getActor("alice")).email, "alice@example.test");
  assert.equal((await getActor("bob")).name, "bob Scholar");
  for (const invalid of [{ name: "x" }, { batchYear: 100 }, { methods: ["Unknown"] }, { researchDomain: "Invented" }, { directoryVisible: false, openToChat: true }, { directoryVisible: "yes" }, { methods: Array(7).fill("Case studies") }]) {
    await assert.rejects(saveProfile("alice", { ...profile, ...invalid }), errorStatus(400));
  }
});

test("directory combines search, exact filters and pagination, exposing only consented safe fields", async () => {
  await user("viewer");
  for (let i = 0; i < 14; i++) await visible(`visible${i.toString().padStart(2, "0")}`);
  await visible("other", { currentInstitution: "Other University", researchDomain: "Strategy" });
  await user("hidden"); await user("pending", "pending");
  await prisma.user.update({ where: { id: "pending" }, data: { directoryVisible: true } });
  const first = await listDirectory("viewer", { institution: "IIM Lucknow", domain: "Information Systems", q: "visible" });
  assert.equal(first.total, 14); assert.equal(first.members.length, 12);
  const second = await listDirectory("viewer", { institution: "IIM Lucknow", q: "visible", page: 2 });
  assert.equal(second.members.length, 2);
  assert.equal(new Set([...first.members, ...second.members].map(m => m.id)).size, 14);
  assert.deepEqual(first.institutions, ["IIM Lucknow", "Other University"]);
  for (const member of first.members) for (const privateField of ["email", "emailVerified", "membershipEvidence", "accounts", "sessions", "role"]) assert.equal(privateField in member, false);
  assert.equal((await listDirectory("viewer", { q: "hidden" })).total, 0);
  await assert.rejects(listDirectory("viewer", { page: -1 }), errorStatus(400));
});

test("RSVP is independent per member, idempotent, guarded and consented in the roster", async () => {
  await visible("alice"); await visible("bob"); await event();
  await setAttendance("alice", "test-event", true); await setAttendance("alice", "test-event", true); await setAttendance("bob", "test-event", true);
  assert.equal(await prisma.conferenceAttendee.count(), 2);
  await setAttendance("alice", "test-event", false); await setAttendance("alice", "test-event", false);
  assert.equal(await getOwnAttendance("alice", "test-event"), null);
  assert.equal((await getOwnAttendance("bob", "test-event"))?.status, "attending");
  await assert.rejects(setAttendance(null, "test-event", true), errorStatus(401));
  await assert.rejects(setAttendance("alice", "missing-event", true), errorStatus(404));
  await assert.rejects(getRoster(null, "test-event"), errorStatus(401));
  assert.equal((await getRoster("alice", "test-event")).length, 1);
  await withdrawProfile("bob");
  assert.equal((await getRoster("alice", "test-event")).length, 0);
});

test("contact acceptance reveals only the explicitly supplied address and enforces both owners", async () => {
  await visible("alice"); await visible("bob"); await visible("charlie");
  const input = { recipientId: "bob", message: "I would like to discuss our shared research interests.", replyEmail: "chosen-address@example.test" };
  const request = await requestContact("alice", input);
  await assert.rejects(requestContact("alice", input), errorStatus(409));
  assert.equal((await listContacts("bob")).incoming[0].replyEmail, null);
  assert.equal((await listContacts("alice")).outgoing[0].replyEmail, "chosen-address@example.test");
  assert.deepEqual((await listContacts("charlie")).incoming, []);
  await assert.rejects(respondContact("charlie", { requestId: request.id, status: "accepted" }), errorStatus(403));
  await assert.rejects(respondContact("alice", { requestId: request.id, status: "accepted" }), errorStatus(403));
  await respondContact("bob", { requestId: request.id, status: "accepted" });
  const contact = (await listContacts("bob")).incoming[0];
  assert.equal(contact.replyEmail, "chosen-address@example.test");
  assert.equal("email" in contact.sender, false);
  await respondContact("alice", { requestId: request.id, status: "cancelled" });
  assert.equal((await listContacts("bob")).incoming[0].replyEmail, null);
});

test("withdrawal immediately removes search results, cancels contact requests and erases shared addresses", async () => {
  await visible("alice"); await visible("bob");
  const request = await requestContact("alice", { recipientId: "bob", message: "Could we discuss methodological approaches together?", replyEmail: "alice-contact@example.test" });
  await respondContact("bob", { requestId: request.id, status: "accepted" });
  await withdrawProfile("alice");
  assert.equal((await listDirectory("bob", { q: "alice" })).total, 0);
  const stored = await prisma.contactRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(stored.status, "cancelled"); assert.equal(stored.replyEmail, null);
  await assert.rejects(requestContact("bob", { recipientId: "alice", message: "A further message after profile withdrawal.", replyEmail: "bob@example.test" }), errorStatus(404));
});

test("contact requests are bounded and require sender opt-in as well as recipient opt-in", async () => {
  await visible("alice"); await user("private");
  await assert.rejects(requestContact("private", { recipientId: "alice", message: "I have not consented to sharing my own profile.", replyEmail: "x@example.test" }), errorStatus(403));
  for (let i = 0; i < 6; i++) await visible(`recipient${i}`);
  for (let i = 0; i < 5; i++) await requestContact("alice", { recipientId: `recipient${i}`, message: "A synthetic request to discuss research interests.", replyEmail: "a@example.test" });
  await assert.rejects(requestContact("alice", { recipientId: "recipient5", message: "A synthetic request exceeding the daily limit.", replyEmail: "a@example.test" }), errorStatus(429));
});

test("account deletion requires confirmation, cascades sessions/attendance/contacts and protects the last admin", async () => {
  await visible("alice"); await visible("bob"); await user("admin", "approved", "admin"); await event();
  await prisma.session.create({ data: { userId: "alice", sessionToken: "delete-me", expires: new Date(Date.now() + 60000) } });
  await setAttendance("alice", "test-event", true);
  await requestContact("alice", { recipientId: "bob", message: "Please discuss research before this test account is deleted.", replyEmail: "a@example.test" });
  await assert.rejects(deleteAccount("alice", "yes"), errorStatus(400));
  await assert.rejects(deleteAccount("admin", "DELETE"), errorStatus(409));
  await deleteAccount("alice", "DELETE");
  assert.equal(await prisma.session.count(), 0); assert.equal(await prisma.conferenceAttendee.count(), 0); assert.equal(await prisma.contactRequest.count(), 0);
  await assert.rejects(getActor("alice"), errorStatus(401));
  assert.equal((await getActor("bob")).id, "bob");
});

test("database constraints reject invalid roles/statuses and retain unique RSVP pairs", async () => {
  await user("alice"); await event(); await setAttendance("alice", "test-event", true);
  await assert.rejects(prisma.user.update({ where: { id: "alice" }, data: { role: "superuser" } }));
  await assert.rejects(prisma.user.update({ where: { id: "alice" }, data: { membershipStatus: "made-up" } }));
  await assert.rejects(prisma.conferenceAttendee.create({ data: { userId: "alice", conferenceId: "test-event" } }));
});

test("synthetic seed is guarded, repeatable and never creates identities", async () => {
  const run = (extra: Record<string, string>) => spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], { env: { ...process.env, ...extra }, encoding: "utf8" });
  assert.notEqual(run({ ALLOW_DEMO_SEED: "0" }).status, 0);
  assert.notEqual(run({ ALLOW_DEMO_SEED: "1", NODE_ENV: "production" }).status, 0);
  assert.notEqual(run({ ALLOW_DEMO_SEED: "1", APP_ENV: "staging" }).status, 0);
  assert.equal(run({ ALLOW_DEMO_SEED: "1" }).status, 0);
  assert.equal(run({ ALLOW_DEMO_SEED: "1" }).status, 0);
  assert.equal(await prisma.conference.count(), 3); assert.equal(await prisma.user.count(), 0);
});

test("first administrator bootstrap requires a verified Google account and cannot replace an existing admin", async () => {
  await user("operator", "pending");
  const run = () => spawnSync(process.execPath, ["--import", "tsx", "scripts/bootstrap-admin.ts", "--email", "operator@example.test"], { env: process.env, encoding: "utf8" });
  assert.notEqual(run().status, 0);
  await prisma.account.create({ data: { userId: "operator", type: "oauth", provider: "google", providerAccountId: "synthetic-google-account" } });
  assert.equal(run().status, 0);
  assert.equal((await getActor("operator")).role, "admin");
  assert.equal(await prisma.membershipReview.count({ where: { method: "operator_bootstrap" } }), 1);
  assert.notEqual(run().status, 0);
});
