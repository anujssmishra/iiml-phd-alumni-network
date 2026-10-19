// Conference days are calendar dates stored at UTC midnight. A venue timezone
// applies only to timed deadlines, never to rendering all-day date values.
export function conferenceDay(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function formatConferenceDay(value: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function zonedDateTimeInput(value: Date | string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function localDeadlineToInstant(value: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a deadline date and time.");
  const nominal = new Date(`${value}:00Z`);
  if (Number.isNaN(nominal.getTime()) || nominal.toISOString().slice(0, 16) !== value) throw new Error("Invalid deadline date or time.");
  const candidates = new Set<number>();
  // Sample both sides of transitions to reject nonexistent and repeated local
  // times rather than silently choosing a different deadline.
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = new Date(nominal.getTime() + hours * 3_600_000);
    const rendered = new Date(`${zonedDateTimeInput(sample, timeZone)}:00Z`);
    const offset = rendered.getTime() - sample.getTime();
    const candidate = nominal.getTime() - offset;
    if (zonedDateTimeInput(new Date(candidate), timeZone) === value) candidates.add(candidate);
  }
  if (candidates.size !== 1) throw new Error("This local deadline is ambiguous or does not exist at a timezone transition. Supply a timestamp with an explicit UTC offset.");
  return new Date([...candidates][0]);
}
