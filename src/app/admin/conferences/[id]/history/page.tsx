import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { listConferenceRevisions } from "@/lib/conference-service";
import { NetworkError } from "@/lib/validation";
import { CONFERENCE_REVIEW_FIELDS } from "@/lib/validation";
import { restoreConferenceRevisionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConferenceHistory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; error?: string; saved?: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/signin");
  const { id } = await params, query = await searchParams;
  let result;
  try { result = await listConferenceRevisions(userId, id, query.page); }
  catch (error) { if (!(error instanceof NetworkError)) throw error; return <div className="network-shell"><h1>Conference history</h1><p role="alert">{error.message}</p></div>; }
  return <div className="network-shell stack">
    <h1>Conference history</h1><p>Restoring a version creates an unreviewed draft and records the reason. Attendance is preserved.</p>
    {query.saved && <p role="status">Version restored as a draft. Review the source before publishing.</p>}
    {query.error && <p role="alert">{query.error.slice(0, 200)}</p>}
    {!result.total && <p>No recorded versions for this conference.</p>}
    {result.rows.map(row => { const before = row.beforeJson ? JSON.parse(row.beforeJson) : {}, after = JSON.parse(row.afterJson); return <section key={row.id} className="panel stack">
      <h2>{row.createdAt.toISOString()}</h2><p>{row.reason}</p><p>Recorded by: {row.actor?.name ?? "Former curator or system"}</p><p>Source: {row.sourceUrl ?? "Not recorded"}</p>
      <details><summary>Before and after</summary><div className="overflow-auto"><table><thead><tr><th>Field</th><th>Before</th><th>This version</th></tr></thead><tbody>{[...CONFERENCE_REVIEW_FIELDS, "publicationState", "reviewedAt"].map(field => <tr key={field}><th>{field}</th><td>{String(before[field] ?? "Not recorded")}</td><td>{String(after[field] ?? "Not recorded")}</td></tr>)}</tbody></table></div></details>
      {typeof after.name === "string" && <form action={restoreConferenceRevisionAction} className="stack">
        <input type="hidden" name="conferenceId" value={id} /><input type="hidden" name="revisionId" value={row.id} />
        <label>Restore reason<input name="changeReason" required minLength={10} maxLength={500} className="w-full rounded border p-2" /></label>
        <button type="submit" className="button-secondary">Restore this version as draft</button>
      </form>}
    </section>; })}
    <nav aria-label="History pages">Page {result.page} of {result.pages} · {result.page > 1 && <Link href={`?page=${result.page - 1}`}>Previous</Link>} {result.page < result.pages && <Link href={`?page=${result.page + 1}`}>Next</Link>}</nav>
    <Link href="/admin/conferences">Back to curator workspace</Link>
  </div>;
}
