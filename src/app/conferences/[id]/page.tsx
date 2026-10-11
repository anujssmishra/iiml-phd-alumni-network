import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getSessionUserId } from "@/lib/session";
import { getRoster, getOwnAttendance, NetworkError, setAttendance } from "@/lib/member-service";
import { getConferenceDetail } from "@/lib/conference-service";

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

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/conferences" className="text-blue-800 underline">
        &larr; Back to conferences
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {conference.acronym && (
          <span className="rounded bg-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-800">
            {conference.acronym}
          </span>
        )}
        {conference.publicationState !== "published" && (
          <span className="rounded bg-amber-200 px-2.5 py-1 text-sm font-semibold text-amber-900">
            {conference.publicationState.toUpperCase()} (Curator Preview)
          </span>
        )}
      </div>

      <h1 className="mt-2 text-3xl font-bold">{conference.name}</h1>

      <div className="mt-3 text-slate-600">
        <p className="font-semibold text-slate-800">{dateStr}</p>
        <p className="mt-1">{conference.location} &middot; <span className="text-slate-500">Timezone: {conference.timezone}</span></p>
      </div>

      {conference.cfpDeadline && (
        <div className={`my-6 rounded-xl border p-4 ${isCfpOpen ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
          <h2 className="font-semibold text-slate-900">Call For Papers (CFP) Deadline</h2>
          <p className="mt-1 text-sm text-slate-700">
            {new Date(conference.cfpDeadline).toLocaleString("en-IN", { timeZone: conference.timezone, dateStyle: "full", timeStyle: "short" })} ({conference.timezone})
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isCfpOpen ? "Submissions are currently open." : "Submissions closed for this cycle."}
          </p>
        </div>
      )}

      {conference.description && (
        <div className="my-6 text-slate-800 leading-relaxed whitespace-pre-wrap">
          {conference.description}
        </div>
      )}

      {safeUrl && (
        <div className="my-6 rounded-xl border bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Verified Organizer Source:</p>
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-800 font-medium underline">
            {safeUrl}
          </a>
          {conference.sourceCheckedAt && (
            <p className="mt-1 text-xs text-slate-500">
              Verified by curator on {new Date(conference.sourceCheckedAt).toLocaleDateString("en-IN", { timeZone: "UTC", dateStyle: "medium" })}
            </p>
          )}
        </div>
      )}

      {query.error && (
        <p role="alert" className="my-4 rounded border border-red-300 bg-red-50 p-4 text-red-900">
          {query.error.slice(0, 200)}
        </p>
      )}
      {query.saved && (
        <p role="status" className="my-4 rounded border border-green-300 bg-green-50 p-4 text-green-900">
          Attendance updated.
        </p>
      )}

      {approved ? (
        <section aria-labelledby="attendance" className="mt-8 rounded-xl border bg-white p-6 shadow-xs">
          <h2 id="attendance" className="text-xl font-semibold">Your attendance</h2>
          <p className="my-3 text-sm text-slate-600">
            Your attendance is visible to approved members only while your directory profile is visible. Withdraw visibility in your profile at any time.
          </p>
          <form action={rsvpAction}>
            <input type="hidden" name="conferenceId" value={id} />
            <input type="hidden" name="intent" value={attendance ? "cancel" : "attend"} />
            <button
              className={`rounded-lg px-5 py-3 font-medium text-white transition ${
                attendance ? "bg-slate-700 hover:bg-slate-800" : "bg-blue-800 hover:bg-blue-900"
              }`}
              type="submit"
            >
              {attendance ? "Cancel RSVP" : "Count me in"}
            </button>
          </form>

          <h3 className="mb-3 mt-8 text-lg font-semibold">Members sharing attendance</h3>
          {roster.length === 0 ? (
            <p className="text-slate-600 text-sm">No members are sharing attendance yet.</p>
          ) : (
            <ul className="space-y-3">
              {roster.map((row) => (
                <li key={row.userId} className="rounded-lg border p-4">
                  <strong className="text-slate-900">{row.user.name}</strong>
                  <p className="text-sm text-slate-700">{row.user.current_institution}</p>
                  <p className="text-sm text-slate-500">{row.user.research_domain}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Private member coordination</h2>
          <p className="my-3 text-slate-600">Approved members can RSVP and view consented attendee profiles.</p>
          <Link className="text-blue-800 underline font-medium" href={user ? "/membership" : "/signin"}>
            {user ? "View membership status" : "Sign in to apply"}
          </Link>
        </section>
      )}
    </div>
  );
}
