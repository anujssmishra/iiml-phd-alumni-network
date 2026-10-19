import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireMember, getActor } from "./member-service";
import {
  NetworkError,
  parseConference,
  parseConferenceSuggestion,
  text,
  parseConferenceReview,
  CONFERENCE_REVIEW_FIELDS,
} from "./validation";

export async function requireCurator(userId: string | null) {
  const user = await requireMember(userId);
  if (user.role !== "curator" && user.role !== "admin") {
    throw new NetworkError("Curator or administrator access is required.", 403);
  }
  return user;
}

export type ConferenceFilters = {
  q?: string;
  timeframe?: "upcoming" | "past" | "all";
  page?: string | number;
};

export const publicConferenceSelect = {
  id: true,
  name: true,
  acronym: true,
  date: true,
  startDate: true,
  endDate: true,
  timezone: true,
  cfpDeadline: true,
  location: true,
  description: true,
  url: true,
  sourceUrl: true,
  sourceCheckedAt: true,
  reviewedAt: true,
  publicationState: true,
  isDemo: true,
} satisfies Prisma.ConferenceSelect;

export async function listPublicConferences(filters: ConferenceFilters = {}) {
  const q = text(filters.q ?? "", "Search query", 100);
  const timeframe = filters.timeframe === "past" || filters.timeframe === "all" ? filters.timeframe : "upcoming";
  const rawPage = String(filters.page ?? "1");
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) throw new NetworkError("Invalid conference page.");

  const now = new Date(new Date().toISOString().slice(0, 10));
  const timeframeCondition: Prisma.ConferenceWhereInput =
    timeframe === "upcoming"
      ? { endDate: { gte: now } }
      : timeframe === "past"
      ? { endDate: { lt: now } }
      : {};

  const searchCondition: Prisma.ConferenceWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { acronym: { contains: q } },
          { location: { contains: q } },
          { description: { contains: q } },
        ],
      }
    : {};

  const where: Prisma.ConferenceWhereInput = {
    publicationState: "published",
    ...timeframeCondition,
    ...searchCondition,
  };

  const orderBy: Prisma.ConferenceOrderByWithRelationInput =
    timeframe === "upcoming" ? { startDate: "asc" } : { startDate: "desc" };

  const pageSize = 24;
  const total = await prisma.conference.count({ where });
  const page = Math.min(Number(rawPage), Math.max(1, Math.ceil(total / pageSize)));

  const conferences = await prisma.conference.findMany({
    where,
    select: publicConferenceSelect,
    orderBy: [orderBy, { id: "asc" }],
    skip: total > 0 ? (page - 1) * pageSize : 0,
    take: pageSize,
  });

  return { conferences, total, page, pageSize, timeframe };
}

export async function getConferenceDetail(userId: string | null, conferenceId: string) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: {
      ...publicConferenceSelect,
    },
  });

  if (!conference) throw new NetworkError("Conference not found.", 404);

  if (conference.publicationState !== "published") {
    let isAuthorized = false;
    if (userId) {
      try {
        const actor = await getActor(userId);
        if (actor.membershipStatus === "approved" && (actor.role === "curator" || actor.role === "admin")) {
          isAuthorized = true;
        }
      } catch {
        isAuthorized = false;
      }
    }
    if (!isAuthorized) {
      throw new NetworkError("Conference not found.", 404);
    }
  }

  return conference;
}

export async function createConference(userId: string | null, input: unknown) {
  const curator = await requireCurator(userId);
  const data = parseConference(input);
  const review = parseConferenceReview(input, data.publicationState, data.sourceUrl);
  return prisma.$transaction(async db => {
    const created = await db.conference.create({ data: { ...data, curatorId: curator.id, ...reviewMetadata(curator.id, review.confirmed) } });
    await recordRevision(db, created.id, curator.id, review.reason, null, created);
    return created;
  });
}

export async function updateConference(userId: string | null, conferenceId: string, input: unknown) {
  const curator = await requireCurator(userId);
  const data = parseConference(input);
  const review = parseConferenceReview(input, data.publicationState, data.sourceUrl, true);
  return prisma.$transaction(async db => {
    const existing = await db.conference.findUnique({ where: { id: conferenceId } });
    if (!existing) throw new NetworkError("Conference not found.", 404);
    const expected = (input as { expectedUpdatedAt?: string }).expectedUpdatedAt;
    if (expected && expected !== existing.updatedAt.toISOString()) throw new NetworkError("This conference changed while you were editing. Reopen it before saving.", 409);
    const updated = await db.conference.update({
      where: { id: conferenceId, updatedAt: existing.updatedAt },
      data: { ...data, curatorId: curator.id, ...reviewMetadata(curator.id, review.confirmed) },
    });
    await recordRevision(db, conferenceId, curator.id, review.reason, existing, updated);
    return updated;
  });
}

function reviewMetadata(curatorId: string, confirmed: boolean) {
  const reviewedAt = confirmed ? new Date() : null;
  return { reviewedAt, sourceCheckedAt: reviewedAt, reviewedById: confirmed ? curatorId : null, reviewedFields: confirmed ? JSON.stringify(CONFERENCE_REVIEW_FIELDS) : null };
}

async function recordRevision(db: Prisma.TransactionClient, conferenceId: string, actorId: string, reason: string, before: unknown, after: { sourceUrl: string | null }) {
  await db.conferenceRevision.create({ data: { conferenceId, actorId, reason, sourceUrl: after.sourceUrl, beforeJson: before ? JSON.stringify(before) : null, afterJson: JSON.stringify(after) } });
}

export async function setPublicationState(userId: string | null, conferenceId: string, state: string) {
  const curator = await requireCurator(userId);
  if (!["draft", "published", "archived"].includes(state)) {
    throw new NetworkError("Invalid publication state.");
  }

  return prisma.$transaction(async db => {
    const existing = await db.conference.findUnique({ where: { id: conferenceId } });
    if (!existing) throw new NetworkError("Conference not found.", 404);
    if (state === "published" && (!existing.reviewedAt || !existing.sourceUrl || existing.reviewedFields !== JSON.stringify(CONFERENCE_REVIEW_FIELDS))) throw new NetworkError("Review every field against the edition-specific source in Edit before publishing.");
    const updated = await db.conference.update({ where: { id: conferenceId, updatedAt: existing.updatedAt }, data: { publicationState: state } });
    await recordRevision(db, conferenceId, curator.id, `Publication changed from ${existing.publicationState} to ${state}.`, existing, updated);
    return updated;
  });
}

export async function listConferenceRevisions(userId: string | null, conferenceId: string, pageInput: string | number = 1) {
  await requireCurator(userId);
  const paging = queuePage(pageInput, await prisma.conferenceRevision.count({ where: { conferenceId } }));
  const rows = await prisma.conferenceRevision.findMany({ where: { conferenceId }, include: { actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: paging.skip, take: paging.pageSize });
  return { ...paging, rows };
}

export async function restoreConferenceRevision(userId: string | null, conferenceId: string, revisionId: string, reason: string) {
  await requireCurator(userId);
  const revision = await prisma.conferenceRevision.findFirst({ where: { id: revisionId, conferenceId } });
  if (!revision) throw new NetworkError("Conference version not found.", 404);
  return updateConference(userId, conferenceId, { ...JSON.parse(revision.afterJson), publicationState: "draft", reviewConfirmed: false, changeReason: reason });
}

export async function deleteConference(userId: string | null, conferenceId: string) {
  await requireCurator(userId);
  return prisma.$transaction(async db => {
    const existing = await db.conference.findUnique({ where: { id: conferenceId }, include: { _count: { select: { attendees: true, revisions: true } } } });
    if (!existing) throw new NetworkError("Conference not found.", 404);
    if (existing.publicationState !== "draft" || existing._count.attendees || existing._count.revisions) throw new NetworkError("Archive this conference to preserve its attendance and review history.", 409);
    return db.conference.delete({ where: { id: conferenceId, updatedAt: existing.updatedAt } });
  });
}

export async function listAllConferencesForCurator(userId: string | null, pageInput: string | number = 1) {
  await requireCurator(userId);
  const paging = await queuePage(pageInput, await prisma.conference.count());
  const rows = await prisma.conference.findMany({
    select: {
      ...publicConferenceSelect,
      curator: { select: { id: true, name: true } },
      _count: { select: { attendees: true, revisions: true } },
      updatedAt: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.pageSize,
  });
  return { ...paging, rows };
}

function queuePage(pageInput: string | number, total: number) {
  const value = String(pageInput);
  if (!/^[1-9]\d{0,5}$/.test(value)) throw new NetworkError("Invalid queue page.");
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Number(value), pages);
  return { total, page, pages, pageSize, skip: (page - 1) * pageSize };
}

export async function submitConferenceSuggestion(userId: string | null, input: unknown) {
  const user = await requireMember(userId);
  const data = parseConferenceSuggestion(input);

  return prisma.conferenceSuggestion.create({
    data: {
      ...data,
      submitterId: user.id,
      status: "pending",
    },
  });
}

export async function listOwnSuggestions(userId: string | null, pageInput: string | number = 1) {
  const user = await requireMember(userId);
  const paging = queuePage(pageInput, await prisma.conferenceSuggestion.count({ where: { submitterId: user.id } }));
  const rows = await prisma.conferenceSuggestion.findMany({
    where: { submitterId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.pageSize,
  });
  return { ...paging, rows };
}

export async function listPendingSuggestions(userId: string | null, pageInput: string | number = 1) {
  await requireCurator(userId);
  const paging = queuePage(pageInput, await prisma.conferenceSuggestion.count({ where: { status: "pending" } }));
  const rows = await prisma.conferenceSuggestion.findMany({
    where: { status: "pending" },
    include: {
      submitter: {
        select: {
          id: true,
          name: true,
          email: true,
          current_institution: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.pageSize,
  });
  return { ...paging, rows };
}

export async function reviewConferenceSuggestion(
  userId: string | null,
  suggestionId: string,
  decision: { status: "approved" | "rejected"; publicationState?: "draft" | "published" }
) {
  const curator = await requireCurator(userId);
  if (!["approved", "rejected"].includes(decision.status)) {
    throw new NetworkError("Invalid decision status.");
  }
  if (decision.publicationState === "published") throw new NetworkError("Suggestions must become drafts and receive an explicit source review before publication.");

  return prisma.$transaction(async (db) => {
    const suggestion = await db.conferenceSuggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) throw new NetworkError("Suggestion not found.", 404);
    if (suggestion.status !== "pending") throw new NetworkError("Suggestion is already closed.", 409);

    const updatedSuggestion = await db.conferenceSuggestion.update({
      where: { id: suggestionId },
      data: { status: decision.status },
    });

    let createdConference = null;
    if (decision.status === "approved") {
      createdConference = await db.conference.create({
        data: {
          name: suggestion.name,
          acronym: suggestion.acronym,
          date: suggestion.startDate,
          startDate: suggestion.startDate,
          endDate: suggestion.endDate,
          timezone: suggestion.timezone,
          cfpDeadline: suggestion.cfpDeadline,
          location: suggestion.location,
          description: suggestion.description,
          url: suggestion.url,
          sourceUrl: suggestion.url,
          curatorId: curator.id,
          publicationState: "draft",
        },
      });
      await recordRevision(db, createdConference.id, curator.id, "Accepted a member suggestion as an unreviewed draft.", null, createdConference);
    }

    return { suggestion: updatedSuggestion, conference: createdConference };
  });
}
