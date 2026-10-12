import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireCurator, publicConferenceSelect } from "./conference-service";
export { publicConferenceSelect };
import { ExtractedConference } from "./conference-fetcher";
import { NetworkError, parseConference } from "./validation";

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

export const conferenceSyncSelect = {
  ...publicConferenceSelect,
  curatorId: true,
} satisfies Prisma.ConferenceSelect;

export function extractBaseAcronym(acronym: string | null | undefined): string | null {
  if (!acronym) return null;
  const cleaned = acronym.replace(/['’]?\d{2,4}/g, "").replace(/[-_]/g, "").trim().toUpperCase();
  return cleaned.length >= 2 ? cleaned : null;
}

export function isSameEdition(
  existing: { name: string; acronym?: string | null; startDate: Date },
  incoming: { name: string; acronym?: string | null; startDate: Date }
): boolean {
  const existingYear = new Date(existing.startDate).getUTCFullYear();
  const incomingYear = new Date(incoming.startDate).getUTCFullYear();

  // Distinct start years indicate distinct editions
  if (existingYear !== incomingYear) {
    return false;
  }

  const existingBase = extractBaseAcronym(existing.acronym);
  const incomingBase = extractBaseAcronym(incoming.acronym);

  // If both have base acronyms and they differ (e.g. PACIS vs AMCIS sharing aisnet.org), they are different conferences
  if (existingBase && incomingBase && existingBase !== incomingBase) {
    return false;
  }

  // If base acronyms match and years match, they are the same edition
  if (existingBase && incomingBase && existingBase === incomingBase) {
    return true;
  }

  // Fallback to normalized name comparison
  const normA = existing.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = incoming.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normA && normB && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  return false;
}

export async function findExistingConferenceMatch(extracted: ExtractedConference) {
  // 1. Candidate match by sourceUrl or url
  if (extracted.sourceUrl) {
    const candidatesByUrl = await prisma.conference.findMany({
      where: {
        OR: [{ sourceUrl: extracted.sourceUrl }, { url: extracted.sourceUrl }, { url: extracted.url }],
      },
      select: conferenceSyncSelect,
    });
    for (const candidate of candidatesByUrl) {
      if (isSameEdition(candidate, extracted)) {
        return { matchType: "exact_url" as const, conference: candidate };
      }
    }
  }

  // 2. Candidate match by acronym (e.g., "AOM 2027", "ICIS 2026")
  if (extracted.acronym && extracted.acronym.length >= 3) {
    const candidateByAcronym = await prisma.conference.findFirst({
      where: {
        acronym: { equals: extracted.acronym },
      },
      select: conferenceSyncSelect,
    });
    if (candidateByAcronym && isSameEdition(candidateByAcronym, extracted)) {
      return { matchType: "acronym" as const, conference: candidateByAcronym };
    }
  }

  // 3. Candidate match by normalized name and start year
  const startYear = extracted.startDate.getUTCFullYear();
  const nameQuery = extracted.name.trim().toLowerCase();

  const candidates = await prisma.conference.findMany({
    where: {
      startDate: {
        gte: new Date(Date.UTC(startYear, 0, 1)),
        lte: new Date(Date.UTC(startYear, 11, 31, 23, 59, 59)),
      },
    },
    select: conferenceSyncSelect,
  });

  for (const candidate of candidates) {
    if (isSameEdition(candidate, extracted)) {
      const candName = candidate.name.trim().toLowerCase();
      if (candName === nameQuery || candName.includes(nameQuery) || nameQuery.includes(candName)) {
        return { matchType: "name_year" as const, conference: candidate };
      }
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

  const allowedActions: ReconcileAction[] = ["create_draft", "create_published", "update_existing"];
  if (!allowedActions.includes(action)) {
    throw new NetworkError("Invalid reconciliation action choice.", 400);
  }

  // Strictly validate incoming extracted payload against parseConference schema
  const validated = parseConference({
    name: extracted.name,
    acronym: extracted.acronym ?? undefined,
    startDate: extracted.startDate instanceof Date ? extracted.startDate.toISOString().split("T")[0] : String(extracted.startDate),
    endDate: extracted.endDate instanceof Date ? extracted.endDate.toISOString().split("T")[0] : String(extracted.endDate),
    timezone: extracted.timezone || "UTC",
    cfpDeadline: extracted.cfpDeadline
      ? (extracted.cfpDeadline instanceof Date ? extracted.cfpDeadline.toISOString().split("T")[0] : String(extracted.cfpDeadline))
      : undefined,
    location: extracted.location,
    description: extracted.description ?? undefined,
    url: extracted.url,
    sourceUrl: extracted.sourceUrl,
    publicationState: action === "create_published" ? "published" : "draft",
  });

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
        name: validated.name,
        acronym: validated.acronym ?? existing.acronym,
        date: validated.startDate,
        startDate: validated.startDate,
        endDate: validated.endDate,
        timezone: validated.timezone,
        cfpDeadline: validated.cfpDeadline,
        location: validated.location,
        description: validated.description ?? existing.description,
        url: validated.url,
        sourceUrl: validated.sourceUrl,
        sourceCheckedAt: new Date(),
        curatorId: curator.id,
      },
    });
  }

  const publicationState = action === "create_published" ? "published" : "draft";

  return prisma.conference.create({
    data: {
      name: validated.name,
      acronym: validated.acronym,
      date: validated.startDate,
      startDate: validated.startDate,
      endDate: validated.endDate,
      timezone: validated.timezone,
      cfpDeadline: validated.cfpDeadline,
      location: validated.location,
      description: validated.description,
      url: validated.url,
      sourceUrl: validated.sourceUrl,
      sourceCheckedAt: new Date(),
      curatorId: curator.id,
      publicationState,
    },
  });
}
