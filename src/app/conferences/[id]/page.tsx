import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getSessionUserId } from "@/lib/session";
import { getRoster, getOwnAttendance, NetworkError, setAttendance } from "@/lib/member-service";
import { getConferenceDetail } from "@/lib/conference-service";
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Users,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Layers,
  Sparkles,
  ArrowLeft,
  Building2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conference details | IIM PhD & FPM Network" };

async function rsvpAction(form: FormData) {
  "use server";
  const id = String(form.get("conferenceId") ?? "");
  const intent = String(form.get("intent") ?? "");
  let error: string | null = null;
  try {
    if (!["attend", "cancel"].includes(intent)) throw new NetworkError("Invalid RSVP intent.");
    await setAttendance(await getSessionUserId(), id, intent === "attend");
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Unable to save attendance. Please try again.";
  }
  revalidatePath("/conferences");
  revalidatePath(`/conferences/${id}`);
  redirect(`/conferences/${encodeURIComponent(id)}?${error ? "error=" + encodeURIComponent(error) : "saved=1"}`);
}

function formatDateRange(start: Date, end: Date, timeZone = "UTC"): string {
  const sDay = start.toLocaleDateString("en-IN", { timeZone, day: "numeric" });
  const sMonth = start.toLocaleDateString("en-IN", { timeZone, month: "short" });
  const sYear = start.toLocaleDateString("en-IN", { timeZone, year: "numeric" });

  const eDay = end.toLocaleDateString("en-IN", { timeZone, day: "numeric" });
  const eMonth = end.toLocaleDateString("en-IN", { timeZone, month: "short" });
  const eYear = end.toLocaleDateString("en-IN", { timeZone, year: "numeric" });

  if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
    return `${sDay} ${sMonth} ${sYear}`;
  }
  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth} ${sYear}`;
  }
  if (sYear === eYear) {
    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
  }
  return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
}

function inferDomain(acronym?: string | null, name?: string): { label: string; badgeClass: string } {
  const text = `${acronym ?? ""} ${name ?? ""}`.toUpperCase();
  if (/ICIS|ECIS|PACIS|AMCIS|HICSS|SYSTEM SCIENCES|INFORMATION SYSTEMS|AIS/.test(text)) {
    return { label: "Information Systems", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (/AFA|WFA|EFA|IFC|AAA|FINANCE|ACCOUNTING|ASSA/.test(text)) {
    return { label: "Finance & Accounting", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (/AMA|MKTG|MARKETING|ACR|EMAC|CONSUMER/.test(text)) {
    return { label: "Marketing", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (/INFORMS|POMS|MSOM|DSI|OPERATIONS|DECISION|ANALYTICS/.test(text)) {
    return { label: "Operations & Analytics", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  if (/AIB|BCERC|BABSON|INTERNATIONAL BUSINESS|ENTREPRENEURSHIP/.test(text)) {
    return { label: "Entrepreneurship & IB", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { label: "Strategy & Management", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
}

function parseDescriptionSections(description: string | null): { title: string; content: string }[] {
  if (!description) return [];
  const parts = description.split(/\n(?=###\s+)/);
  return parts.map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith("### ")) {
      const firstLineEnd = trimmed.indexOf("\n");
      if (firstLineEnd !== -1) {
        return {
          title: trimmed.slice(4, firstLineEnd).trim(),
          content: trimmed.slice(firstLineEnd).trim(),
        };
      }
      return { title: trimmed.slice(4).trim(), content: "" };
    }
    return { title: "Overview", content: trimmed };
  });
}

function getSectionIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("theme") || lower.includes("overview")) return <BookOpen className="w-5 h-5 text-blue-600" />;
  if (lower.includes("track") || lower.includes("focus") || lower.includes("sub-theme")) return <Layers className="w-5 h-5 text-purple-600" />;
  if (lower.includes("doctoral") || lower.includes("consortium") || lower.includes("workshop") || lower.includes("colloquium")) return <GraduationCap className="w-5 h-5 text-amber-600" />;
  if (lower.includes("venue") || lower.includes("travel") || lower.includes("logistics")) return <MapPin className="w-5 h-5 text-teal-600" />;
  return <Sparkles className="w-5 h-5 text-slate-600" />;
}

function getDaysRemaining(deadline: Date | null | undefined): number | null {
  if (!deadline) return null;
  const target = new Date(deadline).getTime();
  const now = new Date().getTime();
  const diff = target - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function ConferenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();

  let conference;
  try {
    conference = await getConferenceDetail(user?.id ?? null, id);
  } catch (err) {
    if (err instanceof NetworkError && err.status === 404) notFound();
    throw err;
  }

  const approved = user?.membershipStatus === "approved";
  const roster = approved ? await getRoster(user.id, id) : [];
  const attendance = approved ? await getOwnAttendance(user.id, id) : null;

  const primaryUrl = conference.url || conference.sourceUrl;
  const safeUrl = primaryUrl && /^https?:\/\//i.test(primaryUrl) ? primaryUrl : null;
  const dateStr = formatDateRange(conference.startDate, conference.endDate, conference.timezone);

  const isCfpOpen = conference.cfpDeadline && new Date(conference.cfpDeadline) > new Date();
  const domain = inferDomain(conference.acronym, conference.name);
  const sections = parseDescriptionSections(conference.description);
  const daysRemaining = getDaysRemaining(conference.cfpDeadline);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Catalogue */}
      <div className="mb-6">
        <Link
          href="/conferences"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all conferences</span>
        </Link>
      </div>

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {conference.acronym && (
                <span className="rounded-md bg-white/10 border border-white/20 px-2.5 py-0.5 text-xs font-mono font-bold text-white shadow-2xs backdrop-blur-xs">
                  {conference.acronym}
                </span>
              )}
              <span className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${domain.badgeClass}`}>
                {domain.label}
              </span>
              {conference.publicationState !== "published" && (
                <span className="rounded-md bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                  {conference.publicationState.toUpperCase()} (Curator Preview)
                </span>
              )}
            </div>

            {/* Conference Full Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {conference.name}
            </h1>

            {/* Fast Facts Row */}
            <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-white">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{conference.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Timezone: {conference.timezone}</span>
              </div>
            </div>
          </div>

          {/* Header Action Button */}
          {safeUrl && (
            <div className="shrink-0 flex items-center">
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
              >
                <span>Official Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {query.error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p>{query.error.slice(0, 200)}</p>
        </div>
      )}
      {query.saved && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p>Your attendance has been updated successfully.</p>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Academic Scope, Tracks & Logistics (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* CFP Deadline Strip */}
          {conference.cfpDeadline && (
            <div className={`rounded-xl border p-5 shadow-2xs ${isCfpOpen ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/70"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isCfpOpen ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isCfpOpen ? "bg-amber-500 animate-pulse" : "bg-slate-500"}`} />
                      {isCfpOpen ? "Call for Papers Open" : "Submissions Closed"}
                    </span>
                    {isCfpOpen && daysRemaining !== null && (
                      <span className="text-xs font-semibold text-amber-900">
                        ({daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining)
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-sm font-bold text-slate-900">
                    Submission Deadline: {new Date(conference.cfpDeadline).toLocaleString("en-IN", {
                      timeZone: conference.timezone,
                      dateStyle: "full",
                      timeStyle: "short",
                    })} ({conference.timezone})
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    {isCfpOpen
                      ? "Full research papers, developmental papers, teaching cases, and symposium proposals currently being accepted."
                      : "The official deadline for this review cycle has passed. Inquiries can be sent to conference chairs."}
                  </p>
                </div>

                {safeUrl && isCfpOpen && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shrink-0 self-start sm:self-auto"
                  >
                    <span>Submit Paper</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Structured Content Cards */}
          {sections.length > 0 ? (
            sections.map((sec, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  {getSectionIcon(sec.title)}
                  <h2 className="text-base font-bold text-slate-900">{sec.title}</h2>
                </div>
                <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-2">
                  {sec.content}
                </div>
              </div>
            ))
          ) : (
            conference.description && (
              <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">About the Conference</h2>
                </div>
                <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {conference.description}
                </div>
              </div>
            )
          )}
        </div>

        {/* Right Column: Attendance, Roster & Verification (1 span) */}
        <div className="space-y-6">
          {/* Member Attendance & RSVP Box */}
          {approved ? (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">Your Attendance</h2>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  attendance ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                }`}>
                  {attendance ? "Attending" : "Not Registered"}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                RSVP to coordinate flight schedules, share airport cabs, split Airbnbs, and join the informal IIM doctoral scholar meetup on-site.
              </p>

              <form action={rsvpAction} className="mt-5">
                <input type="hidden" name="conferenceId" value={id} />
                <input type="hidden" name="intent" value={attendance ? "cancel" : "attend"} />
                <button
                  type="submit"
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-all shadow-xs ${
                    attendance
                      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                  }`}
                >
                  {attendance ? "Cancel My Attendance" : "Count Me In (RSVP)"}
                </button>
              </form>
              <p className="mt-2.5 text-center text-[11px] text-slate-400">
                Visible only to approved IIM scholars with an active directory profile.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Scholar Coordination</h2>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Verified IIM PhD/FPM scholars can RSVP to unlock the attendee roster and coordinate travel, accommodation, and co-authorship meetups.
              </p>
              <div className="mt-5">
                <Link
                  href={user ? "/membership" : "/signin"}
                  className="block w-full text-center rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  {user ? "View Membership Status" : "Sign In with Institutional Email"}
                </Link>
              </div>
            </div>
          )}

          {/* Attendee Roster Card */}
          {approved && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Attending Scholars ({roster.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Consented Profiles</span>
              </div>

              {roster.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p>No scholars have RSVP&apos;d yet.</p>
                  <p className="mt-1 font-medium text-slate-700">Be the first from the network to signal attendance!</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {roster.map((row) => (
                    <div key={row.userId} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">
                        {row.user.name?.charAt(0) || "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs font-bold text-slate-900 truncate">
                          {row.user.name || "Anonymous Scholar"}
                        </strong>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {row.user.current_institution || "Institution not listed"}
                        </p>
                        {row.user.research_domain && (
                          <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {row.user.research_domain}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Organizer Source & Provenance Card */}
          {safeUrl && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-900">Verified Organizer Source</h3>
              </div>
              <div className="mt-3">
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 hover:underline break-all block"
                >
                  {safeUrl}
                </a>
                {conference.sourceCheckedAt && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Last validated by conference curation team on{" "}
                    {new Date(conference.sourceCheckedAt).toLocaleDateString("en-IN", {
                      timeZone: "UTC",
                      dateStyle: "medium",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
