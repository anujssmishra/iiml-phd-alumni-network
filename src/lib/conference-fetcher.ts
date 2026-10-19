import dns from "node:dns/promises";
import net from "node:net";
import { parseConference, NetworkError } from "./validation";
import { denyPilotIngestion } from "./conference-ingestion-policy";

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

export function isPrivateOrRestrictedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [a, b, c, d] = parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata e.g. 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;
    // 192.88.99.0/24 (6to4 Relay Anycast)
    if (a === 192 && b === 88 && c === 99) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 loopback
    if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
    // :: unspecified
    if (normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0000") return true;
    // ::ffff:127.0.0.1 etc IPv4-mapped
    if (normalized.startsWith("::ffff:") || normalized.startsWith("0000:0000:0000:0000:0000:ffff:")) {
      const ipv4Part = normalized.substring(normalized.lastIndexOf(":") + 1);
      if (net.isIPv4(ipv4Part)) {
        return isPrivateOrRestrictedIp(ipv4Part);
      }
    }
    // fc00::/7 (Unique Local Address)
    if (/^[fF][cCdD]/.test(normalized)) return true;
    // fe80::/10 (Link-Local)
    if (/^[fF][eE][89aAbB]/.test(normalized)) return true;
    // fec0::/10 (Site-Local)
    if (/^[fF][eE][c-fC-F]/.test(normalized)) return true;
    // ff00::/8 (Multicast)
    if (/^[fF][fF]/.test(normalized)) return true;

    return false;
  }

  return false;
}

export async function validateTargetUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new NetworkError("Invalid URL format.", 400);
  }

  // Reject unsafe schemes: only http: and https: allowed
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new NetworkError("Invalid URL protocol. Only http:// and https:// destinations are allowed.", 400);
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    throw new NetworkError("URLs with embedded credentials are not allowed.", 400);
  }

  // Reject non-standard/sensitive service ports
  if (parsed.port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
    throw new NetworkError("Restricted port. Only standard HTTP/HTTPS ports are allowed.", 400);
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) {
    throw new NetworkError("URL hostname is required.", 400);
  }

  // Prohibit loopback/internal domain names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".arpa")
  ) {
    throw new NetworkError("Access to local and internal destinations is prohibited.", 400);
  }

  // Check if hostname is an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateOrRestrictedIp(hostname)) {
      throw new NetworkError("Destination resolves to a private or restricted network address.", 400);
    }
  } else {
    // Resolve DNS to verify no private/loopback IP resolution
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        throw new NetworkError("Destination hostname could not be resolved.", 400);
      }
      for (const addr of addresses) {
        if (isPrivateOrRestrictedIp(addr.address)) {
          throw new NetworkError("Destination hostname resolves to a private or restricted network address.", 400);
        }
      }
    } catch (dnsErr) {
      if (dnsErr instanceof NetworkError) throw dnsErr;
      throw new NetworkError("Unable to resolve destination hostname.", 400);
    }
  }

  return parsed;
}

export async function fetchConferenceFromUrl(urlInput: string): Promise<ExtractedConference> {
  void urlInput;
  return denyPilotIngestion();
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

            // Offer expiry is not a CFP deadline.
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

  // Missing source facts require human review; never invent event dates,
  // durations, a virtual venue, or a deadline from a ticket offer.
  if (!name || !startDate || !endDate) throw new NetworkError("Source metadata is incomplete. Enter the actual event dates manually for review.");
  if (endDate < startDate) throw new NetworkError("Source end date precedes its start date.");
  if (!location) location = "Location not provided";

  const timezone = inferTimezone(location);

  // Validate parsed data against parseConference validator constraints
  const validated = parseConference({
    name,
    acronym: acronym ?? undefined,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    timezone,
    cfpDeadline: null,
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
