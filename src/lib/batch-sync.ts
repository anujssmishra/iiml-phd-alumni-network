import { prisma } from "./prisma";
import { fetchConferenceFromUrl } from "./conference-fetcher";
import { findExistingConferenceMatch, computeConferenceDiff } from "./conference-sync";

export interface Tier1Source {
  key: string;
  name: string;
  acronym: string;
  url: string;
  domain: string;
}

export const TIER1_CONFERENCE_SOURCES: Tier1Source[] = [
  {
    key: "aom",
    name: "Academy of Management Annual Meeting",
    acronym: "AOM 2027",
    url: "https://aom.org/events/annual-meeting",
    domain: "Management / Strategy / OB",
  },
  {
    key: "icis",
    name: "International Conference on Information Systems",
    acronym: "ICIS 2026",
    url: "https://icis2026.aisnet.org",
    domain: "Information Systems",
  },
  {
    key: "ecis",
    name: "European Conference on Information Systems",
    acronym: "ECIS 2027",
    url: "https://ecis2027.uni.lu",
    domain: "Information Systems",
  },
  {
    key: "ama",
    name: "American Marketing Association Academic Conference",
    acronym: "AMA 2027",
    url: "https://www.ama.org/events/",
    domain: "Marketing",
  },
  {
    key: "euram",
    name: "European Academy of Management Conference",
    acronym: "EURAM 2027",
    url: "https://euram.academy/",
    domain: "Management",
  },
  {
    key: "egos",
    name: "European Group for Organizational Studies Colloquium",
    acronym: "EGOS 2027",
    url: "https://www.egos.org/",
    domain: "Organizational Studies",
  },
  {
    key: "sms",
    name: "Strategic Management Society Annual Conference",
    acronym: "SMS 2027",
    url: "https://www.strategicmanagement.net/",
    domain: "Strategy / Entrepreneurship",
  },
  {
    key: "ieee",
    name: "IEEE Computer Society Conference Calendar",
    acronym: "IEEE 2026",
    url: "https://www.computer.org/conferences/calendar",
    domain: "Computer Science / Information Systems",
  },
  {
    key: "wikicfp",
    name: "WikiCFP Management & Information Systems Calls",
    acronym: "WikiCFP",
    url: "http://www.wikicfp.com/cfp/",
    domain: "Academic Calls for Papers",
  },
];

export interface BatchSyncSummaryDetail {
  sourceKey: string;
  name: string;
  status: "created" | "updated" | "unchanged" | "error";
  message?: string;
}

export interface BatchSyncSummary {
  totalSources: number;
  checked: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  details: BatchSyncSummaryDetail[];
}

export async function syncAllConferencesBatch(): Promise<BatchSyncSummary> {
  console.log(`[batch-sync] Starting batch conference ingestion across ${TIER1_CONFERENCE_SOURCES.length} tier-1 sources...`);

  let checked = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  const details: BatchSyncSummaryDetail[] = [];

  for (const source of TIER1_CONFERENCE_SOURCES) {
    try {
      console.log(`[batch-sync] Fetching ${source.name} (${source.url})...`);
      const extracted = await fetchConferenceFromUrl(source.url);

      // Prefer extracted acronym if found, fallback to curated source acronym
      const finalAcronym = extracted.acronym || source.acronym;

      const match = await findExistingConferenceMatch({
        ...extracted,
        acronym: finalAcronym,
      });

      checked++;

      if (match) {
        const diff = computeConferenceDiff(match.conference, extracted);
        if (diff.hasChanges) {
          await prisma.conference.update({
            where: { id: match.conference.id },
            data: {
              name: extracted.name || source.name,
              acronym: finalAcronym,
              date: extracted.startDate,
              startDate: extracted.startDate,
              endDate: extracted.endDate,
              timezone: extracted.timezone,
              cfpDeadline: extracted.cfpDeadline,
              location: extracted.location,
              description: extracted.description || match.conference.description,
              url: extracted.url || source.url,
              sourceUrl: source.url,
              sourceCheckedAt: new Date(),
              publicationState: "published",
            },
          });
          updated++;
          details.push({
            sourceKey: source.key,
            name: source.name,
            status: "updated",
            message: `Updated diffs: ${diff.items.map((i) => i.label).join(", ")}`,
          });
        } else {
          await prisma.conference.update({
            where: { id: match.conference.id },
            data: {
              sourceCheckedAt: new Date(),
              publicationState: "published",
            },
          });
          unchanged++;
          details.push({
            sourceKey: source.key,
            name: source.name,
            status: "unchanged",
            message: "Record matched and up-to-date.",
          });
        }
      } else {
        await prisma.conference.create({
          data: {
            name: extracted.name || source.name,
            acronym: finalAcronym,
            date: extracted.startDate,
            startDate: extracted.startDate,
            endDate: extracted.endDate,
            timezone: extracted.timezone,
            cfpDeadline: extracted.cfpDeadline,
            location: extracted.location,
            description: extracted.description || `${source.name} (${source.domain})`,
            url: extracted.url || source.url,
            sourceUrl: source.url,
            sourceCheckedAt: new Date(),
            publicationState: "published",
          },
        });
        created++;
        details.push({
          sourceKey: source.key,
          name: source.name,
          status: "created",
          message: "New conference auto-created and published.",
        });
      }
    } catch (err) {
      errors++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[batch-sync] Error processing ${source.key}:`, errorMessage);
      details.push({
        sourceKey: source.key,
        name: source.name,
        status: "error",
        message: errorMessage,
      });
    }

    // Rate-limiting delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    totalSources: TIER1_CONFERENCE_SOURCES.length,
    checked,
    created,
    updated,
    unchanged,
    errors,
    details,
  };
}
