export interface ICalEventInput {
  id: string; name: string; acronym?: string | null; startDate: Date; endDate: Date;
  timezone?: string; location: string; description?: string | null; url?: string | null; cfpDeadline?: Date | null;
}

function escapeText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldLine(value: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let line = "", bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { lines.push(line); line = " "; bytes = 1; }
    line += character; bytes += size;
  }
  lines.push(line);
  return lines.join("\r\n");
}

function dateValue(date: Date): string { return date.toISOString().slice(0, 10).replaceAll("-", ""); }
function instant(date: Date): string { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }

export function generateConferenceICal(conf: ICalEventInput): string {
  const nextDay = new Date(conf.endDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const stamp = instant(new Date());
  const uid = encodeURIComponent(conf.id);
  let url: string | null = null;
  if (conf.url && !/[\r\n\u0000-\u0020]/.test(conf.url)) {
    try { const parsed = new URL(conf.url); if (["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed.href; } catch { /* omit unsafe URI */ }
  }
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IIM PhD & FPM Alumni Network//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:conf-${uid}@iiml-phd-network`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateValue(conf.startDate)}`, `DTEND;VALUE=DATE:${dateValue(nextDay)}`,
    `SUMMARY:${escapeText(conf.acronym ? conf.acronym + " - " + conf.name : conf.name)}`,
    `LOCATION:${escapeText(conf.location)}`, `DESCRIPTION:${escapeText(conf.description || "Academic conference: " + conf.name)}`,
    ...(url ? [`URL:${url}`] : []), "STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT",
  ];
  if (conf.cfpDeadline) lines.push(
    "BEGIN:VEVENT", `UID:cfp-${uid}@iiml-phd-network`, `DTSTAMP:${stamp}`,
    `DTSTART:${instant(conf.cfpDeadline)}`, `DTEND:${instant(new Date(conf.cfpDeadline.getTime() + 3_600_000))}`,
    `SUMMARY:${escapeText("CFP Deadline: " + (conf.acronym || conf.name))}`,
    `DESCRIPTION:${escapeText("Call for Papers submission deadline for " + conf.name)}`,
    ...(url ? [`URL:${url}`] : []), "STATUS:CONFIRMED", "TRANSP:TRANSPARENT",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Conference CFP Deadline Reminder", "TRIGGER:-P7D", "END:VALARM", "END:VEVENT",
  );
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
