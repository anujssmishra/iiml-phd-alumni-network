import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listOwnAttendance } from "@/lib/member-service";
import { NetworkError } from "@/lib/validation";
import { cancelOwnAttendanceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ page?: string; saved?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/conferences/attendance");
  if (user.membershipStatus !== "approved") redirect("/membership");
  const query = await searchParams;
  let result;
  try { result = await listOwnAttendance(user.id, query.page); }
  catch (error) { if (!(error instanceof NetworkError)) throw error; return <div className="network-shell"><h1>My RSVPs</h1><p role="alert">{error.message}</p><Link href="/conferences/attendance">Return to my RSVPs</Link></div>; }
  return <div className="network-shell stack">
    <h1>My RSVPs</h1>
    <p>Manage your own attendance, including cancellations after an event is archived.</p>
    {query.saved && <p role="status">Your RSVP has been cancelled.</p>}
    {query.error && <p role="alert">{query.error.slice(0, 200)}</p>}
    {!result.total && <p>You have no current RSVPs.</p>}
    {result.rows.map(row => <section key={row.conferenceId} className="panel stack">
      <h2>{row.published ? <Link href={`/conferences/${encodeURIComponent(row.conferenceId)}`}>{row.name}</Link> : row.name}</h2>
      {!row.published && <p>This event is no longer published. You can still cancel your RSVP.</p>}
      <p>Your role: {row.role.replaceAll("_", " ")}{row.paperTitle ? ` · ${row.paperTitle}` : ""}</p>
      <form action={cancelOwnAttendanceAction}><input type="hidden" name="conferenceId" value={row.conferenceId} /><button type="submit" className="button-secondary">Cancel RSVP</button></form>
    </section>)}
    <nav aria-label="RSVP pages">Page {result.page} of {result.pages} · {result.page > 1 && <Link href={`?page=${result.page - 1}`}>Previous</Link>} {result.page < result.pages && <Link href={`?page=${result.page + 1}`}>Next</Link>}</nav>
    <Link href="/conferences">Browse conferences</Link>
  </div>;
}
