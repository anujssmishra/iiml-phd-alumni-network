import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireMember, getActor } from "./member-service";
import {
  NetworkError,
  parseConference,
  parseConferenceSuggestion,
  text,
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
  publicationState: true,
  isDemo: true,
} satisfies Prisma.ConferenceSelect;

export async function listPublicConferences(filters: ConferenceFilters = {}) {
  const q = text(filters.q ?? "", "Search query", 100);
  const timeframe = filters.timeframe === "past" || filters.timeframe === "all" ? filters.timeframe : "upcoming";
  const rawPage = String(filters.page ?? "1");
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) throw new NetworkError("Invalid conference page.");

  const now = new Date();
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

  const pageSize = 12;
  const total = await prisma.conference.count({ where });
  const page = Math.min(Number(rawPage), Math.max(1, Math.ceil(total / pageSize)));

  const conferences = await prisma.conference.findMany({
    where,
    select: publicConferenceSelect,
    orderBy,
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
      curator: {
        select: {
          id: true,
          name: true,
          current_institution: true,
        },
      },
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

  return prisma.conference.create({
    data: {
      ...data,
      curatorId: curator.id,
      sourceCheckedAt: new Date(),
    },
  });
}

export async function updateConference(userId: string | null, conferenceId: string, input: unknown) {
  const curator = await requireCurator(userId);
  const data = parseConference(input);

  const existing = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!existing) throw new NetworkError("Conference not found.", 404);

  return prisma.conference.update({
    where: { id: conferenceId },
    data: {
      ...data,
      curatorId: curator.id,
      sourceCheckedAt: new Date(),
    },
  });
}

export async function setPublicationState(userId: string | null, conferenceId: string, state: string) {
  await requireCurator(userId);
  if (!["draft", "published", "archived"].includes(state)) {
    throw new NetworkError("Invalid publication state.");
  }

  const existing = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!existing) throw new NetworkError("Conference not found.", 404);

  return prisma.conference.update({
    where: { id: conferenceId },
    data: { publicationState: state },
  });
}

export async function deleteConference(userId: string | null, conferenceId: string) {
  await requireCurator(userId);
  const existing = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!existing) throw new NetworkError("Conference not found.", 404);

  return prisma.conference.delete({ where: { id: conferenceId } });
}

export async function listAllConferencesForCurator(userId: string | null) {
  await requireCurator(userId);
  return prisma.conference.findMany({
    select: {
      ...publicConferenceSelect,
      curator: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
    orderBy: { startDate: "desc" },
    take: 200,
  });
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

export async function listOwnSuggestions(userId: string | null) {
  const user = await requireMember(userId);
  return prisma.conferenceSuggestion.findMany({
    where: { submitterId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listPendingSuggestions(userId: string | null) {
  await requireCurator(userId);
  return prisma.conferenceSuggestion.findMany({
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
    orderBy: { createdAt: "asc" },
    take: 100,
  });
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
          location: suggestion.location,
          description: suggestion.description,
          url: suggestion.url,
          sourceUrl: suggestion.url,
          sourceCheckedAt: new Date(),
          curatorId: curator.id,
          publicationState: decision.publicationState ?? "draft",
        },
      });
    }

    return { suggestion: updatedSuggestion, conference: createdConference };
  });
}
