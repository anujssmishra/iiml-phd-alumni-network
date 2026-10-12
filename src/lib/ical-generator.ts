export interface ICalEventInput {
  id: string;
  name: string;
  acronym?: string | null;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  location: string;
  description?: string | null;
  url?: string | null;
  cfpDeadline?: Date | null;
}

function escapeICalText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatDateToICalDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatDateToICalDateTime(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function generateConferenceICal(conf: ICalEventInput): string {
  const now = new Date();
  const dtstamp = formatDateToICalDateTime(now);

  // Conference all-day date range:
  // In iCalendar, DTEND is exclusive for DATE values, so add 1 day to end date
  const startStr = formatDateToICalDate(conf.startDate);
  const nextDay = new Date(conf.endDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endStr = formatDateToICalDate(nextDay);

  const title = conf.acronym ? `${conf.acronym} - ${conf.name}` : conf.name;
  const safeTitle = escapeICalText(title);
  const safeLoc = escapeICalText(conf.location);
  const safeDesc = escapeICalText(conf.description || `Academic conference: ${conf.name}`);
  const eventUrl = conf.url ? escapeICalText(conf.url) : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IIM PhD & FPM Alumni Network//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:conf-${conf.id}@iiml-phd-network`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${startStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${safeTitle}`,
    `LOCATION:${safeLoc}`,
    `DESCRIPTION:${safeDesc}`,
    ...(eventUrl ? [`URL:${eventUrl}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];

  // Optional CFP Deadline event
  if (conf.cfpDeadline) {
    const cfpDate = new Date(conf.cfpDeadline);
    const cfpStart = formatDateToICalDateTime(cfpDate);
    // End 1 hour later
    const cfpEndDate = new Date(cfpDate.getTime() + 60 * 60 * 1000);
    const cfpEnd = formatDateToICalDateTime(cfpEndDate);
    const cfpTitle = escapeICalText(`CFP Deadline: ${conf.acronym || conf.name}`);
    const cfpDesc = escapeICalText(`Call for Papers submission deadline for ${conf.name}`);

    lines.push(
      "BEGIN:VEVENT",
      `UID:cfp-${conf.id}@iiml-phd-network`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${cfpStart}`,
      `DTEND:${cfpEnd}`,
      `SUMMARY:${cfpTitle}`,
      `DESCRIPTION:${cfpDesc}`,
      ...(eventUrl ? [`URL:${eventUrl}`] : []),
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Conference CFP Deadline Reminder",
      "TRIGGER:-P7D",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
