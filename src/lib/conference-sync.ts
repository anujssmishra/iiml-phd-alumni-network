import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireCurator, publicConferenceSelect } from "./conference-service";
export { publicConferenceSelect };
import { ExtractedConference } from "./conference-fetcher";
import { NetworkError } from "./validation";

export interface ConferenceDiffItem {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface ConferenceDiffResult {
  hasChanges: boolean;
  cfpDeadlineChanged: boolean;
  datesShifted: boolean;
  locationChanged: boolean;
  items: ConferenceDiffItem[];
}

export async function findExistingConferenceMatch(extracted: ExtractedConference) {
  // 1. Match by sourceUrl or url
  if (extracted.sourceUrl) {
    const matchBySource = await prisma.conference.findFirst({
      where: {
        OR: [{ sourceUrl: extracted.sourceUrl }, { url: extracted.sourceUrl }, { url: extracted.url }],
      },
      select: publicConferenceSelect,
    });
    if (matchBySource) {
      return { matchType: "exact_url" as const, conference: matchBySource };
    }
  }

  // 2. Match by acronym (e.g., "AOM 2027", "ICIS 2026")
  if (extracted.acronym && extracted.acronym.length >= 3) {
    const matchByAcronym = await prisma.conference.findFirst({
      where: {
        acronym: { equals: extracted.acronym },
      },
      select: publicConferenceSelect,
    });
    if (matchByAcronym) {
      return { matchType: "acronym" as const, conference: matchByAcronym };
    }
  }

  // 3. Match by normalized name and start year
  const startYear = extracted.startDate.getFullYear();
  const nameQuery = extracted.name.trim().toLowerCase();

  const candidates = await prisma.conference.findMany({
    where: {
      startDate: {
        gte: new Date(`${startYear}-01-01`),
        lte: new Date(`${startYear}-12-31`),
      },
    },
    select: publicConferenceSelect,
  });

  for (const candidate of candidates) {
    const candName = candidate.name.trim().toLowerCase();
    if (candName === nameQuery || candName.includes(nameQuery) || nameQuery.includes(candName)) {
      return { matchType: "name_year" as const, conference: candidate };
    }
  }

  return null;
}

export function computeConferenceDiff(
  existing: Prisma.ConferenceGetPayload<{ select: typeof publicConferenceSelect }>,
  extracted: ExtractedConference
): ConferenceDiffResult {
  const items: ConferenceDiffItem[] = [];

  const fmtDate = (d: Date | null) => (d ? new Date(d).toISOString().split("T")[0] : null);

  const existingStart = fmtDate(existing.startDate);
  const extractedStart = fmtDate(extracted.startDate);
  if (existingStart !== extractedStart) {
    items.push({
      field: "startDate",
      label: "Start Date",
      oldValue: existingStart,
      newValue: extractedStart,
    });
  }

  const existingEnd = fmtDate(existing.endDate);
  const extractedEnd = fmtDate(extracted.endDate);
  if (existingEnd !== extractedEnd) {
    items.push({
      field: "endDate",
      label: "End Date",
      oldValue: existingEnd,
      newValue: extractedEnd,
    });
  }

  const existingCfp = fmtDate(existing.cfpDeadline);
  const extractedCfp = fmtDate(extracted.cfpDeadline);
  if (existingCfp !== extractedCfp) {
    items.push({
      field: "cfpDeadline",
      label: "CFP Deadline",
      oldValue: existingCfp,
      newValue: extractedCfp,
    });
  }

  if (existing.location !== extracted.location) {
    items.push({
      field: "location",
      label: "Location",
      oldValue: existing.location,
      newValue: extracted.location,
    });
  }

  if (existing.name !== extracted.name) {
    items.push({
      field: "name",
      label: "Name",
      oldValue: existing.name,
      newValue: extracted.name,
    });
  }

  if (extracted.acronym && existing.acronym !== extracted.acronym) {
    items.push({
      field: "acronym",
      label: "Acronym",
      oldValue: existing.acronym,
      newValue: extracted.acronym,
    });
  }

  const cfpDeadlineChanged = existingCfp !== extractedCfp;
  const datesShifted = existingStart !== extractedStart || existingEnd !== extractedEnd;
  const locationChanged = existing.location !== extracted.location;

  return {
    hasChanges: items.length > 0,
    cfpDeadlineChanged,
    datesShifted,
    locationChanged,
    items,
  };
}

export type ReconcileAction = "create_draft" | "create_published" | "update_existing";

export async function reconcileConferenceSync(
  userId: string | null,
  action: ReconcileAction,
  extracted: ExtractedConference,
  targetConferenceId?: string
) {
  const curator = await requireCurator(userId);

  if (action === "update_existing") {
    if (!targetConferenceId) {
      throw new NetworkError("Target conference ID is required for updating an existing record.");
    }

    const existing = await prisma.conference.findUnique({ where: { id: targetConferenceId } });
    if (!existing) {
      throw new NetworkError("Target conference not found.", 404);
    }

    return prisma.conference.update({
      where: { id: targetConferenceId },
      data: {
        name: extracted.name,
        acronym: extracted.acronym ?? existing.acronym,
        date: extracted.startDate,
        startDate: extracted.startDate,
        endDate: extracted.endDate,
        timezone: extracted.timezone,
        cfpDeadline: extracted.cfpDeadline,
        location: extracted.location,
        description: extracted.description ?? existing.description,
        url: extracted.url,
        sourceUrl: extracted.sourceUrl,
        sourceCheckedAt: new Date(),
        curatorId: curator.id,
      },
    });
  }

  const publicationState = action === "create_published" ? "published" : "draft";

  return prisma.conference.create({
    data: {
      name: extracted.name,
      acronym: extracted.acronym,
      date: extracted.startDate,
      startDate: extracted.startDate,
      endDate: extracted.endDate,
      timezone: extracted.timezone,
      cfpDeadline: extracted.cfpDeadline,
      location: extracted.location,
      description: extracted.description,
      url: extracted.url,
      sourceUrl: extracted.sourceUrl,
      sourceCheckedAt: new Date(),
      curatorId: curator.id,
      publicationState,
    },
  });
}
