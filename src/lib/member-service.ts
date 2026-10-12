import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { NetworkError, parseApplication, parseEmail, parseProfile, RESEARCH_DOMAINS, text } from "./validation";
export { NetworkError } from "./validation";

type Database = Prisma.TransactionClient;
async function actor(db: Database, userId: string | null) {
  if (!userId) throw new NetworkError("Sign in to continue.", 401);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NetworkError("Your session has ended. Please sign in again.", 401);
  return user;
}
async function member(db: Database, userId: string | null) {
  const user = await actor(db, userId);
  if (user.membershipStatus !== "approved") throw new NetworkError("Approved membership is required.", 403);
  return user;
}
async function admin(db: Database, userId: string | null) {
  const user = await member(db, userId);
  if (user.role !== "admin") throw new NetworkError("Administrator access is required.", 403);
  return user;
}

// Actor IDs are supplied only by server-side session helpers, never by request fields.
// Re-read status for every operation, including mutations and contact retrieval.
export const getActor = (userId: string | null) => actor(prisma, userId);
export const requireMember = (userId: string | null) => member(prisma, userId);
export const requireAdmin = (userId: string | null) => admin(prisma, userId);
export const getOwnProfile = (userId: string | null) => member(prisma, userId);

async function cancelContacts(db: Database, id: string) {
  await db.contactRequest.updateMany({ where: { OR: [{ senderId: id }, { recipientId: id }], status: { in: ["pending", "accepted"] } }, data: { status: "cancelled", message: "Contact request withdrawn.", replyEmail: null } });
}

export async function saveProfile(userId: string | null, input: unknown) {
  const data = parseProfile(input);
  return prisma.$transaction(async db => {
    const user = await member(db, userId);
    const updated = await db.user.update({ where: { id: user.id }, data });
    if (!data.directoryVisible || !data.open_to_chat) await cancelContacts(db, user.id);
    return updated;
  });
}

export async function withdrawProfile(userId: string | null) {
  return prisma.$transaction(async db => {
    const user = await actor(db, userId);
    await cancelContacts(db, user.id);
    return db.user.update({ where: { id: user.id }, data: { directoryVisible: false, open_to_chat: false } });
  });
}

export async function deleteAccount(userId: string | null, confirmation: string) {
  if (confirmation !== "DELETE") throw new NetworkError("Type DELETE to confirm account deletion.");
  await prisma.$transaction(async db => {
    const user = await actor(db, userId);
    if (user.role === "admin" && user.membershipStatus === "approved" && await db.user.count({ where: { role: "admin", membershipStatus: "approved" } }) <= 1) throw new NetworkError("Assign another approved administrator before deleting this account.", 409);
    // Keep only non-identifying audit metadata; reviewer notes may contain personal details.
    await db.membershipReview.updateMany({ where: { targetId: user.id }, data: { reason: "Member account deleted.", targetId: null } });
    // Remove submitted evidence and contact records with the account; audit links become null.
    await db.user.delete({ where: { id: user.id } });
  });
}

export async function submitApplication(userId: string | null, input: unknown) {
  const data = parseApplication(input);
  return prisma.$transaction(async db => {
    const user = await actor(db, userId);
    if (!["pending", "rejected"].includes(user.membershipStatus)) throw new NetworkError("This membership cannot be resubmitted. Contact the membership reviewer.", 403);
    return db.user.update({ where: { id: user.id }, data: { ...data, membershipStatus: "pending", applicationSubmittedAt: new Date() } });
  });
}

export type MembershipFilters = { status?: string; q?: string; page?: string | number };
export async function listMemberships(userId: string | null, filters: MembershipFilters = {}) {
  await admin(prisma, userId);
  const status = filters.status ?? "all";
  if (!["all", "pending", "approved", "rejected", "suspended"].includes(status)) throw new NetworkError("Choose a listed membership status.");
  const q = text(filters.q ?? "", "Member search", 100);
  const rawPage = String(filters.page ?? "1");
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) throw new NetworkError("Invalid membership page.");
  const where: Prisma.UserWhereInput = {
    ...(status === "all" ? {} : { membershipStatus: status }),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  const pageSize = 25;
  const total = await prisma.user.count({ where });
  const page = Math.min(Number(rawPage), Math.max(1, Math.ceil(total / pageSize)));
  const members = await prisma.user.findMany({
    where,
    orderBy: [{ applicationSubmittedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { members, total, page, pageSize, status, q };
}

type ReviewInput = { targetId: string; status: string; role: string; reason: string; verificationMethod: string };
export async function reviewMembership(userId: string | null, input: ReviewInput) {
  const reason = text(input.reason, "Review reason", 500, 10);
  if (!["pending", "approved", "rejected", "suspended"].includes(input.status) || !["member", "curator", "admin"].includes(input.role) || !["institutional_record", "alumni_reference", "manual_review"].includes(input.verificationMethod)) throw new NetworkError("Invalid review decision.");
  return prisma.$transaction(async db => {
    const reviewer = await admin(db, userId);
    if (reviewer.id === input.targetId) throw new NetworkError("Ask another administrator to review your membership.", 403);
    const target = await db.user.findUnique({ where: { id: input.targetId } });
    if (!target) throw new NetworkError("Member not found.", 404);
    if (input.status === "approved" && (!target.applicationSubmittedAt || !target.emailVerified)) throw new NetworkError("A submitted application and verified login email are required before approval.");
    const updated = await db.user.update({ where: { id: target.id }, data: { membershipStatus: input.status, role: input.role, reviewedAt: new Date(), ...(input.status !== "approved" ? { directoryVisible: false, open_to_chat: false } : {}) } });
    await db.membershipReview.create({ data: { reviewerId: reviewer.id, targetId: target.id, fromStatus: target.membershipStatus, toStatus: input.status, fromRole: target.role, toRole: input.role, reason, method: input.verificationMethod } });
    if (input.status !== "approved") await cancelContacts(db, target.id);
    return updated;
  });
}

export const directorySelect = { id: true, name: true, current_institution: true, current_title: true, research_domain: true, methodological_expertise: true, doctoralInstitution: true, programme: true, batchYear: true, open_to_chat: true, profileConfirmedAt: true } satisfies Prisma.UserSelect;
export type DirectoryFilters = { q?: string; institution?: string; domain?: string; page?: string | number };
export async function listDirectory(userId: string | null, filters: DirectoryFilters = {}) {
  await member(prisma, userId);
  const q = text(filters.q ?? "", "Search", 100);
  const institution = text(filters.institution ?? "", "Institution", 160);
  const domain = text(filters.domain ?? "", "Research domain", 80);
  if (domain && !RESEARCH_DOMAINS.includes(domain as typeof RESEARCH_DOMAINS[number])) throw new NetworkError("Choose a listed research domain.");
  const rawPage = String(filters.page ?? "1");
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) throw new NetworkError("Invalid directory page.");
  const where: Prisma.UserWhereInput = { membershipStatus: "approved", directoryVisible: true, ...(institution ? { current_institution: institution } : {}), ...(domain ? { research_domain: domain } : {}), ...(q ? { OR: [{ name: { contains: q } }, { current_institution: { contains: q } }, { research_domain: { contains: q } }, { methodological_expertise: { contains: q } }] } : {}) };
  const pageSize = 12;
  const total = await prisma.user.count({ where });
  const page = Math.min(Number(rawPage), Math.max(1, Math.ceil(total / pageSize)));
  const [members, institutions] = await Promise.all([
    prisma.user.findMany({ where, select: directorySelect, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.findMany({ where: { membershipStatus: "approved", directoryVisible: true, current_institution: { not: null } }, select: { current_institution: true }, distinct: ["current_institution"], orderBy: { current_institution: "asc" } }),
  ]);
  return { members, total, page, pageSize, institutions: institutions.map(i => i.current_institution).filter((i): i is string => !!i) };
}

export async function requestContact(userId: string | null, input: { recipientId: string; message: string; replyEmail: string }) {
  const message = text(input.message, "Message", 800, 20);
  const replyEmail = parseEmail(input.replyEmail);
  return prisma.$transaction(async db => {
    const sender = await member(db, userId);
    if (!sender.directoryVisible || !sender.open_to_chat) throw new NetworkError("Enable your directory profile and Open to Chat before requesting contact.", 403);
    const recipient = await db.user.findFirst({ where: { id: input.recipientId, membershipStatus: "approved", directoryVisible: true, open_to_chat: true } });
    if (!recipient || recipient.id === sender.id) throw new NetworkError("This member is not available for contact.", 404);
    const existing = await db.contactRequest.findFirst({ where: { senderId: sender.id, recipientId: recipient.id, status: { in: ["pending", "accepted"] } } });
    if (existing) throw new NetworkError("You already have an active contact request for this member.", 409);
    if (await db.contactRequest.count({ where: { senderId: sender.id, createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= 5) throw new NetworkError("You can send up to five contact requests per day.", 429);
    return db.contactRequest.create({ data: { senderId: sender.id, recipientId: recipient.id, message, replyEmail } });
  });
}

export async function respondContact(userId: string | null, input: { requestId: string; status: string }) {
  if (!["accepted", "declined", "cancelled"].includes(input.status)) throw new NetworkError("Invalid contact decision.");
  return prisma.$transaction(async db => {
    const user = await member(db, userId);
    const request = await db.contactRequest.findUnique({ where: { id: input.requestId }, include: { sender: true, recipient: true } });
    if (!request) throw new NetworkError("Contact request not found.", 404);
    const owns = input.status === "cancelled" ? request.senderId === user.id : request.recipientId === user.id;
    if (!owns) throw new NetworkError("You cannot change this contact request.", 403);
    if (input.status === "accepted" && (request.status !== "pending" || [request.sender, request.recipient].some(u => u.membershipStatus !== "approved" || !u.directoryVisible || !u.open_to_chat))) throw new NetworkError("This request is no longer available.", 409);
    if (!["pending", "accepted"].includes(request.status)) throw new NetworkError("This request is already closed.", 409);
    return db.contactRequest.update({ where: { id: request.id }, data: { status: input.status, ...(input.status !== "accepted" ? { replyEmail: null, message: "Contact request closed." } : {}) } });
  });
}

export async function listContacts(userId: string | null) {
  const user = await member(prisma, userId);
  const rows = await prisma.contactRequest.findMany({ where: { OR: [{ senderId: user.id }, { recipientId: user.id }] }, include: { sender: { select: { id: true, name: true, membershipStatus: true, directoryVisible: true, open_to_chat: true } }, recipient: { select: { id: true, name: true, membershipStatus: true, directoryVisible: true, open_to_chat: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const safe = rows.map(row => {
    const available = [row.sender, row.recipient].every(u => u.membershipStatus === "approved" && u.directoryVisible && u.open_to_chat);
    return { id: row.id, status: available ? row.status : "cancelled", message: available ? row.message : "Contact request withdrawn.", replyEmail: available && (row.senderId === user.id || row.status === "accepted") ? row.replyEmail : null, createdAt: row.createdAt, sender: { id: row.sender.id, name: available ? row.sender.name : "Unavailable member" }, recipient: { id: row.recipient.id, name: available ? row.recipient.name : "Unavailable member" } };
  });
  return { incoming: safe.filter(r => r.recipient.id === user.id), outgoing: safe.filter(r => r.sender.id === user.id) };
}

export async function setAttendance(userId: string | null, conferenceId: string, attending: boolean) {
  if (typeof attending !== "boolean") throw new NetworkError("Invalid RSVP intent.");
  return prisma.$transaction(async db => {
    const user = await member(db, userId);
    const conf = await db.conference.findUnique({ where: { id: conferenceId } });
    if (!conf) throw new NetworkError("Conference not found.", 404);
    if (attending && conf.publicationState !== "published") {
      throw new NetworkError("Only published conferences accept RSVPs.", 403);
    }
    if (attending) return db.conferenceAttendee.upsert({ where: { userId_conferenceId: { userId: user.id, conferenceId } }, create: { userId: user.id, conferenceId, status: "attending" }, update: { status: "attending" } });
    await db.conferenceAttendee.deleteMany({ where: { userId: user.id, conferenceId } });
  });
}

export async function getOwnAttendance(userId: string | null, conferenceId: string) {
  const user = await member(prisma, userId);
  return prisma.conferenceAttendee.findUnique({ where: { userId_conferenceId: { userId: user.id, conferenceId } }, select: { status: true } });
}

export async function getRoster(userId: string | null, conferenceId: string) {
  const caller = await member(prisma, userId);
  const conf = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conf) throw new NetworkError("Conference not found.", 404);
  if (conf.publicationState !== "published" && caller.role !== "curator" && caller.role !== "admin") {
    throw new NetworkError("Conference not found.", 404);
  }
  return prisma.conferenceAttendee.findMany({ where: { conferenceId, user: { membershipStatus: "approved", directoryVisible: true } }, select: { userId: true, status: true, user: { select: directorySelect } }, orderBy: { createdAt: "asc" } });
}
