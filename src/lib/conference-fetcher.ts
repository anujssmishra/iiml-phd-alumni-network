import { parseConference, NetworkError } from "./validation";

export interface ExtractedConference {
  name: string;
  acronym: string | null;
  startDate: Date;
  endDate: Date;
  timezone: string;
  cfpDeadline: Date | null;
  location: string;
  description: string | null;
  url: string;
  sourceUrl: string;
  confidenceScore: number;
  rawMetadata: {
    jsonLdFound: boolean;
    openGraphFound: boolean;
    microdataFound: boolean;
    microformatsFound: boolean;
  };
}

// Map common academic conference locations to IANA timezones
const LOCATION_TIMEZONE_MAP: Record<string, string> = {
  boston: "America/New_York",
  "new york": "America/New_York",
  chicago: "America/Chicago",
  "san francisco": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  amsterdam: "Europe/Amsterdam",
  stockholm: "Europe/Stockholm",
  tokyo: "Asia/Tokyo",
  singapore: "Asia/Singapore",
  "hong kong": "Asia/Hong_Kong",
  sydney: "Australia/Sydney",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  lucknow: "Asia/Kolkata",
};

export function inferTimezone(location: string): string {
  const lower = location.toLowerCase();
  for (const [key, tz] of Object.entries(LOCATION_TIMEZONE_MAP)) {
    if (lower.includes(key)) {
      return tz;
    }
  }
  return "UTC";
}

export function extractAcronym(text: string): string | null {
  // Pattern matching for conference acronyms like "AOM 2027", "ICIS 2026", "ECIS '27", "AMA-2027"
  const match = text.match(/\b([A-Z]{2,10}(?:[-_ ]\d{2,4})?)\b/);
  if (match) {
    const acronym = match[1].trim();
    // Exclude common false positives like "IEEE", "ACM", "ISSN", "HTTP", "HTML", "CFP" unless followed by a year
    if (!/^(HTTP|HTTPS|HTML|ISSN|ISBN|PDF|CFP)$/i.test(acronym)) {
      return acronym;
    }
  }
  return null;
}

export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanedStr = dateStr.replace(/(\d+)(st|nd|rd|th)/i, "$1").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanedStr)) {
    return new Date(`${cleanedStr}T12:00:00.000Z`);
  }

  const timestamp = Date.parse(cleanedStr);
  if (!isNaN(timestamp)) {
    const parsed = new Date(timestamp);
    // Use UTC midday to prevent timezone boundary date shifts
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
  }
  return null;
}

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Strip common tracking parameters
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("ref");
    return parsed.href;
  } catch {
    return rawUrl;
  }
}

export async function fetchConferenceFromUrl(urlInput: string): Promise<ExtractedConference> {
  const sourceUrl = canonicalizeUrl(urlInput.trim());
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new NetworkError("Invalid URL protocol. Must start with http:// or https://");
  }

  let htmlText = "";
  let finalUrl = sourceUrl;

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "IIML-Academic-Network-Fetcher/1.0 (+https://iiml.ac.in)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new NetworkError(`Failed to fetch conference web page. Server returned status ${response.status}.`, 502);
    }

    finalUrl = canonicalizeUrl(response.url || sourceUrl);
    htmlText = await response.text();
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError(`Unable to connect to conference URL: ${err instanceof Error ? err.message : String(err)}`, 502);
  }

  return parseConferenceHtml(htmlText, finalUrl);
}

export function parseConferenceHtml(htmlText: string, sourceUrl: string): ExtractedConference {
  let jsonLdFound = false;
  let openGraphFound = false;
  let microdataFound = false;
  let microformatsFound = false;

  let name = "";
  let acronym: string | null = null;
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let cfpDeadline: Date | null = null;
  let location = "";
  let description: string | null = null;
  let url = sourceUrl;
  let confidenceScore = 0.3;

  // Strategy 1: JSON-LD (Schema.org Event / ConferenceEvent)
  const jsonLdMatches = htmlText.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      const jsonContent = tag.replace(/<script\b[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      try {
        const parsed = JSON.parse(jsonContent);
        const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];

        for (const item of items) {
          if (
            item &&
            typeof item === "object" &&
            item["@type"] &&
            /^(Event|ConferenceEvent|EducationEvent|BusinessEvent)$/i.test(String(item["@type"]))
          ) {
            jsonLdFound = true;
            confidenceScore += 0.4;

            if (item.name) name = String(item.name).trim();
            if (item.startDate) startDate = parseFlexibleDate(String(item.startDate));
            if (item.endDate) endDate = parseFlexibleDate(String(item.endDate));
            if (item.description) description = String(item.description).trim();
            if (item.url) url = canonicalizeUrl(String(item.url));

            if (item.location) {
              if (typeof item.location === "string") {
                location = item.location.trim();
              } else if (typeof item.location === "object") {
                const locObj = item.location as Record<string, unknown>;
                const locName = locObj.name ? String(locObj.name) : "";
                const addressObj = locObj.address;
                let addressStr = "";
                if (typeof addressObj === "string") {
                  addressStr = addressObj;
                } else if (addressObj && typeof addressObj === "object") {
                  const addr = addressObj as Record<string, unknown>;
                  addressStr = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
                }
                location = [locName, addressStr].filter(Boolean).join(", ").trim();
              }
            }

            if (item.offers && typeof item.offers === "object") {
              const offers = item.offers as Record<string, unknown>;
              if (offers.validThrough) {
                cfpDeadline = parseFlexibleDate(String(offers.validThrough));
              }
            }
            break;
          }
        }
      } catch {
        // Skip invalid JSON-LD blocks
      }
    }
  }

  // Strategy 2: Open Graph & Meta tags
  const ogTitleMatch = htmlText.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    openGraphFound = true;
    if (!name) name = ogTitleMatch[1].trim();
  }

  const ogDescMatch = htmlText.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDescMatch && !description) {
    openGraphFound = true;
    description = ogDescMatch[1].trim();
  }

  const ogUrlMatch = htmlText.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  if (ogUrlMatch && url === sourceUrl) {
    url = canonicalizeUrl(ogUrlMatch[1].trim());
  }

  // Strategy 3: Microdata / Microformats Regex
  if (htmlText.includes("itemtype=\"http://schema.org/Event\"") || htmlText.includes("itemtype=\"https://schema.org/Event\"")) {
    microdataFound = true;
  }
  if (htmlText.includes("h-event") || htmlText.includes("vevent")) {
    microformatsFound = true;
  }

  // Strategy 4: HTML Fallbacks & Keyword Regex Extraction
  if (!name) {
    const titleMatch = htmlText.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      name = titleMatch[1].replace(/\s+/g, " ").trim();
    }
  }

  if (!description) {
    const metaDescMatch = htmlText.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDescMatch) {
      description = metaDescMatch[1].trim();
    }
  }

  // Extract acronym from title or name
  acronym = extractAcronym(name);

  // Fallback date scan if dates not extracted from JSON-LD
  if (!startDate) {
    const timeMatch = htmlText.match(/<time\b[^>]*datetime=["']([^"']+)["']/i);
    if (timeMatch) {
      startDate = parseFlexibleDate(timeMatch[1]);
    }
  }

  // Fallback CFP Deadline extraction via regex
  if (!cfpDeadline) {
    const cfpMatch = htmlText.match(/(?:call\s+for\s+papers|cfp|paper\s+submission)\s+(?:deadline|due)[:\s]+([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (cfpMatch) {
      cfpDeadline = parseFlexibleDate(cfpMatch[1]);
    }
  }

  // Defaults if parsing is incomplete
  if (!name) {
    name = "Untitled Academic Conference";
  }

  if (!startDate) {
    // Default to 6 months in future if not detected
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    startDate = future;
  }

  if (!endDate) {
    // Default end date to 3 days after start date
    const end = new Date(startDate.getTime());
    end.setDate(end.getDate() + 3);
    endDate = end;
  }

  if (endDate < startDate) {
    endDate = new Date(startDate.getTime());
  }

  if (!location) {
    location = "Virtual / To Be Announced";
  }

  const timezone = inferTimezone(location);

  // Validate parsed data against parseConference validator constraints
  const validated = parseConference({
    name,
    acronym: acronym ?? undefined,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    timezone,
    cfpDeadline: cfpDeadline ? cfpDeadline.toISOString().split("T")[0] : undefined,
    location,
    description: description ? description.slice(0, 1900) : undefined,
    url,
    sourceUrl,
    publicationState: "draft",
  });

  return {
    name: validated.name,
    acronym: validated.acronym ?? null,
    startDate: validated.startDate,
    endDate: validated.endDate,
    timezone: validated.timezone,
    cfpDeadline: validated.cfpDeadline ?? null,
    location: validated.location,
    description: validated.description ?? null,
    url: validated.url ?? sourceUrl,
    sourceUrl,
    confidenceScore: Math.min(1.0, confidenceScore),
    rawMetadata: {
      jsonLdFound,
      openGraphFound,
      microdataFound,
      microformatsFound,
    },
  };
}
