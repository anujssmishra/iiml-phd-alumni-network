export const RESEARCH_DOMAINS = ["Information Systems", "Strategy", "Marketing", "Finance", "Economics", "Organizational Behaviour", "Human Resources", "Operations", "Decision Sciences", "Public Policy"] as const;
export const METHODS = ["Qualitative interviews", "Case studies", "Surveys", "Experiments", "Econometrics", "Causal inference", "SEM", "fsQCA", "Machine learning", "Text analysis", "Mixed methods"] as const;

import { normalizeEmail } from "./auth-policy";
import { localDeadlineToInstant } from "./conference-dates";

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
  try {
    const url = new URL(str);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /\s/.test(str)) throw new Error();
    return str;
  } catch { throw new NetworkError(`${label} must be a valid HTTP or HTTPS URL without credentials.`); }
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

export function parseConferenceDay(value: unknown, label: string): Date {
  const day = value instanceof Date ? parseDate(value, label).toISOString().slice(0, 10) : value;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(day)) throw new NetworkError(`${label} must be a calendar date.`);
  if (day.includes("T")) parseDate(day, label);
  const dateOnly = day.slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly) throw new NetworkError(`${label} must be a valid calendar date.`);
  return date;
}

export function parseConferenceDeadline(value: unknown, timezone: string): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return parseDate(value, "CFP deadline");
  if (typeof value !== "string") throw new NetworkError("CFP deadline must include a date and time.");
  try {
    parseConferenceDay(value.slice(0, 10), "CFP deadline");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return parseDate(value, "CFP deadline");
    return localDeadlineToInstant(value, timezone);
  } catch (error) { throw new NetworkError(error instanceof Error ? error.message : "Invalid CFP deadline."); }
}

export const CONFERENCE_REVIEW_FIELDS = ["name", "acronym", "startDate", "endDate", "timezone", "cfpDeadline", "location", "description", "url", "sourceUrl"] as const;

export function parseConferenceReview(input: unknown, publicationState: string, sourceUrl: string | null, requireReason = false) {
  const p = record(input);
  const reason = p.changeReason ? text(p.changeReason, "Change reason", 500, 10) : requireReason ? text("", "Change reason", 500, 10) : publicationState === "published" ? "Created a source-reviewed conference." : "Created a curator draft for review.";
  const confirmed = p.reviewConfirmed === true;
  if (publicationState === "published" && (!confirmed || !sourceUrl)) throw new NetworkError("Publication requires an edition-specific source and confirmation that every displayed field was checked.");
  if (confirmed && !sourceUrl) throw new NetworkError("Review requires an edition-specific source URL.");
  return { reason, confirmed };
}

export function parseConference(input: unknown) {
  const p = record(input);
  const startDate = parseConferenceDay(p.startDate ?? p.date, "Start date");
  const endDate = parseConferenceDay(p.endDate ?? p.date, "End date");
  if (endDate.getTime() < startDate.getTime()) throw new NetworkError("End date must be on or after start date.");
  const acronym = p.acronym ? text(p.acronym, "Acronym", 30) : null;
  const publicationState = p.publicationState ?? "draft";
  if (typeof publicationState !== "string" || !["draft", "published", "archived"].includes(publicationState)) throw new NetworkError("Invalid publication state.");
  const timezone = parseTimezone(p.timezone);
  return {
    name: text(p.name, "Conference name", 200, 2),
    acronym,
    date: startDate,
    startDate,
    endDate,
    timezone,
    cfpDeadline: parseConferenceDeadline(p.cfpDeadline, timezone),
    location: text(p.location, "Location", 200, 2),
    description: p.description ? text(p.description, "Description", 2000) : null,
    url: parseUrl(p.url, "Organizer URL"),
    sourceUrl: parseUrl(p.sourceUrl ?? p.url, "Source URL"),
    publicationState,
    isDemo: false,
  };
}

export function parseConferenceSuggestion(input: unknown) {
  const p = record(input);
  const startDate = parseConferenceDay(p.startDate, "Start date");
  const endDate = parseConferenceDay(p.endDate, "End date");
  if (endDate.getTime() < startDate.getTime()) throw new NetworkError("End date must be on or after start date.");
  const url = parseUrl(p.url, "Organizer URL", true);
  if (!url) throw new NetworkError("Organizer URL is required.");
  return {
    name: text(p.name, "Conference name", 200, 2),
    acronym: p.acronym ? text(p.acronym, "Acronym", 30) : null,
    startDate,
    endDate,
    timezone: parseTimezone(p.timezone),
    cfpDeadline: parseConferenceDeadline(p.cfpDeadline, parseTimezone(p.timezone)),
    location: text(p.location, "Location", 200, 2),
    description: p.description ? text(p.description, "Description", 2000) : null,
    url,
  };
}

export const ATTENDEE_ROLES = [
  { value: "attendee", label: "General Attendee" },
  { value: "presenter", label: "Paper Presentation" },
  { value: "doctoral_consortium", label: "Doctoral Consortium / Colloquium" },
  { value: "chair_discussant", label: "Session Chair / Discussant" },
] as const;

export type AttendeeRoleValue = typeof ATTENDEE_ROLES[number]["value"];

export function parseAttendanceDetails(input: unknown): { role: AttendeeRoleValue; paperTitle: string | null } {
  if (!input || typeof input !== "object") {
    return { role: "attendee", paperTitle: null };
  }

  let rawRole: unknown;
  let rawPaperTitle: unknown;

  if (typeof (input as FormData).get === "function") {
    const fd = input as FormData;
    rawRole = fd.get("role");
    rawPaperTitle = fd.get("paperTitle");
  } else {
    const obj = input as Record<string, unknown>;
    rawRole = obj.role;
    rawPaperTitle = obj.paperTitle;
  }

  const strRole = typeof rawRole === "string" ? rawRole : "attendee";
  if (rawRole != null && typeof rawRole !== "string") throw new NetworkError("Choose a listed participation role.");
  if (!ATTENDEE_ROLES.some(r => r.value === strRole)) throw new NetworkError("Choose a listed participation role.");
  const validRole = strRole as AttendeeRoleValue;

  let paperTitle: string | null = null;
  if (rawPaperTitle != null && typeof rawPaperTitle !== "string") throw new NetworkError("Paper / Presentation Title must be text.");
  if (typeof rawPaperTitle === "string" && rawPaperTitle.trim()) {
    paperTitle = text(rawPaperTitle, "Paper / Presentation Title", 300);
  }
  return { role: validRole, paperTitle };
}

