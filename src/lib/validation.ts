export const RESEARCH_DOMAINS = ["Information Systems", "Strategy", "Marketing", "Finance", "Economics", "Organizational Behaviour", "Human Resources", "Operations", "Decision Sciences", "Public Policy"] as const;
export const METHODS = ["Qualitative interviews", "Case studies", "Surveys", "Experiments", "Econometrics", "Causal inference", "SEM", "fsQCA", "Machine learning", "Text analysis", "Mixed methods"] as const;

import { normalizeEmail } from "./auth-policy";

export class NetworkError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); this.name = "NetworkError"; }
}

export function text(value: unknown, label: string, max: number, min = 0): string {
  if (typeof value !== "string") throw new NetworkError(`${label} must be text.`);
  const result = value.trim();
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new NetworkError(`${label} must contain ${min}–${max} characters.`);
  return result;
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new NetworkError("Invalid form submission.");
  return input as Record<string, unknown>;
}

function programme(value: unknown) {
  if (value === "" || value == null) return null;
  if (value !== "PhD" && value !== "FPM") throw new NetworkError("Choose PhD or FPM.");
  return value;
}

function batchYear(value: unknown) {
  if (value === "" || value == null) return null;
  if ((typeof value !== "number" && typeof value !== "string") || !/^\d{4}$/.test(String(value))) throw new NetworkError("Enter a four-digit batch year.");
  const year = Number(value);
  if (year < 1960 || year > new Date().getFullYear() + 1) throw new NetworkError("Batch year is outside the allowed range.");
  return year;
}

function bool(value: unknown) {
  if (typeof value !== "boolean") throw new NetworkError("Invalid consent selection.");
  return value;
}

export function parseProfile(input: unknown) {
  const p = record(input);
  const researchDomain = text(p.researchDomain, "Research domain", 80);
  if (researchDomain && !RESEARCH_DOMAINS.includes(researchDomain as typeof RESEARCH_DOMAINS[number])) throw new NetworkError("Choose a listed research domain.");
  if (!Array.isArray(p.methods) || p.methods.length > 6 || p.methods.some(m => typeof m !== "string" || !METHODS.includes(m as typeof METHODS[number]))) throw new NetworkError("Choose up to six listed methods.");
  const directoryVisible = bool(p.directoryVisible);
  const openToChat = bool(p.openToChat);
  if (openToChat && !directoryVisible) throw new NetworkError("Enable directory visibility before accepting contact requests.");
  return {
    name: text(p.name, "Name", 100, 2),
    current_institution: text(p.currentInstitution, "Current institution", 160, 2),
    current_title: text(p.currentTitle, "Current title", 100),
    doctoralInstitution: text(p.doctoralInstitution, "Doctoral institution", 160, 2),
    programme: programme(p.programme), batchYear: batchYear(p.batchYear),
    research_domain: researchDomain || null,
    methodological_expertise: [...new Set(p.methods as string[])].join(", ") || null,
    directoryVisible, open_to_chat: openToChat, profileConfirmedAt: new Date(),
  };
}

export function parseApplication(input: unknown) {
  const p = record(input);
  const degree = programme(p.programme);
  if (!degree) throw new NetworkError("Choose PhD or FPM.");
  return { doctoralInstitution: text(p.doctoralInstitution, "Doctoral institution", 160, 2), programme: degree, batchYear: batchYear(p.batchYear), membershipEvidence: text(p.evidence, "Membership evidence", 1000, 20) };
}

export function parseEmail(value: unknown) {
  const email = normalizeEmail(text(value, "Reply email", 254, 3));
  if (!email) throw new NetworkError("Enter a valid reply email.");
  return email;
}

export function parseDate(value: unknown, label: string): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") throw new NetworkError(`${label} must be a valid date.`);
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new NetworkError(`${label} must be a valid date.`);
  return date;
}

export function parseOptionalDate(value: unknown, label: string): Date | null {
  if (value === "" || value == null) return null;
  return parseDate(value, label);
}

export function parseUrl(value: unknown, label: string, required = false): string | null {
  if (!required && (value === "" || value == null)) return null;
  const str = text(value, label, 500, required ? 10 : 0);
  if (!str) return null;
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(str)) throw new NetworkError(`${label} must be a valid HTTP or HTTPS URL.`);
  return str;
}

export function parseTimezone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "UTC";
  const tz = value.trim();
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    throw new NetworkError("Invalid timezone identifier.");
  }
}

export function parseConference(input: unknown) {
  const p = record(input);
  const startDate = parseDate(p.startDate ?? p.date, "Start date");
  const endDate = parseDate(p.endDate ?? p.date, "End date");
  if (endDate.getTime() < startDate.getTime()) throw new NetworkError("End date must be on or after start date.");
  const acronym = p.acronym ? text(p.acronym, "Acronym", 30) : null;
  const publicationState = typeof p.publicationState === "string" && ["draft", "published", "archived"].includes(p.publicationState) ? p.publicationState : "draft";
  return {
    name: text(p.name, "Conference name", 200, 2),
    acronym,
    date: startDate,
    startDate,
    endDate,
    timezone: parseTimezone(p.timezone),
    cfpDeadline: parseOptionalDate(p.cfpDeadline, "CFP deadline"),
    location: text(p.location, "Location", 200, 2),
    description: p.description ? text(p.description, "Description", 2000) : null,
    url: parseUrl(p.url, "Organizer URL"),
    sourceUrl: parseUrl(p.sourceUrl, "Source URL"),
    publicationState,
    isDemo: Boolean(p.isDemo),
  };
}

export function parseConferenceSuggestion(input: unknown) {
  const p = record(input);
  const startDate = parseDate(p.startDate, "Start date");
  const endDate = parseDate(p.endDate, "End date");
  if (endDate.getTime() < startDate.getTime()) throw new NetworkError("End date must be on or after start date.");
  const url = parseUrl(p.url, "Organizer URL", true);
  if (!url) throw new NetworkError("Organizer URL is required.");
  return {
    name: text(p.name, "Conference name", 200, 2),
    acronym: p.acronym ? text(p.acronym, "Acronym", 30) : null,
    startDate,
    endDate,
    location: text(p.location, "Location", 200, 2),
    description: p.description ? text(p.description, "Description", 2000) : null,
    url,
  };
}
