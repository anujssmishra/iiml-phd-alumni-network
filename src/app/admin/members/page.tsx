import Link from "next/link";
import { redirect } from "next/navigation";
import { listMemberships, NetworkError } from "@/lib/member-service";
import { getSessionUserId } from "@/lib/session";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

type Query = { status?: string | string[]; q?: string | string[]; page?: string | string[] };
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function MemberReviewPage({ searchParams }: { searchParams: Promise<Query> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/signin?callbackUrl=/admin/members");
  const query = await searchParams;
  let result;
  try { result = await listMemberships(userId, { status: single(query.status) || "all", q: single(query.q), page: single(query.page) || "1" }); }
  catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    return <div className="network-shell stack"><div className="page-heading"><h1>Membership review</h1></div><p role="alert" className="notice notice-error">{error.message}</p><Link href="/admin/members">Reset review filters</Link><Link href="/membership">Return to your membership</Link></div>;
  }
  const { members, total, page, pageSize, status, q } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  function pageLink(nextPage: number) {
    const params = new URLSearchParams({ status, page: String(nextPage) });
    if (q) params.set("q", q);
    return `/admin/members?${params.toString()}`;
  }
  return <div className="network-shell stack">
    <div className="page-heading"><p className="eyebrow">Administrator workspace</p><h1>Membership review</h1><p>Check evidence of doctoral membership before approving access. A verified mailbox, including an academic mailbox, is not sufficient on its own.</p></div>
    <p className="muted">Evidence is private to membership administrators. Each decision records its reviewer, method, reason, and date. Newest submitted applications appear first.</p>
    <form action="/admin/members" method="get" className="panel stack" role="search" aria-label="Membership review filters">
      <div className="form-grid">
        <div className="field"><label htmlFor="membership-status-filter">Filter by membership status</label>
          <select id="membership-status-filter" name="status" defaultValue={status}>
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="field"><label htmlFor="membership-search">Search by name or email</label>
          <input id="membership-search" name="q" type="search" maxLength={100} defaultValue={q} />
        </div>
      </div>
      <div className="button-row"><button className="button" type="submit">Filter memberships</button><Link href="/admin/members?status=pending" className="text-link">Review pending applications</Link><Link href="/admin/members" className="text-link">Clear filters</Link></div>
    </form>
    <p aria-live="polite">{total} {total === 1 ? "membership" : "memberships"} found</p>
    {members.length === 0 && <p className="notice">No memberships match these filters.</p>}
    {members.map(member => <section key={member.id} className="panel stack" aria-labelledby={`member-${member.id}`}>
      <div><h2 id={`member-${member.id}`}>{member.name ?? "Unnamed member"}</h2><p>{member.email} · {member.membershipStatus} · {member.role}</p></div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="muted">Doctoral institution</dt><dd>{member.doctoralInstitution || "Not supplied"}</dd></div>
        <div><dt className="muted">Programme and entry batch</dt><dd>{member.programme ?? "Not supplied"}{member.batchYear ? ` · ${member.batchYear}` : ""}</dd></div>
        <div><dt className="muted">Verified login mailbox</dt><dd>{member.emailVerified ? "Yes" : "No"}</dd></div>
        <div><dt className="muted">Application submitted</dt><dd>{member.applicationSubmittedAt?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "Not yet submitted"}</dd></div>
      </dl>
      <div><h3>Private application evidence</h3><p className="whitespace-pre-wrap break-words">{member.membershipEvidence ?? "No evidence supplied."}</p></div>
      {member.id === userId ? <p className="notice">Your own membership must be reviewed by another administrator.</p> : <ReviewForm targetId={member.id} status={member.membershipStatus} role={member.role} />}
    </section>)}
    <nav className="pagination" aria-label="Membership review pages">
      {page > 1 ? <Link className="button button-secondary" href={pageLink(page - 1)}>Previous page</Link> : <span />}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages ? <Link className="button button-secondary" href={pageLink(page + 1)}>Next page</Link> : <span />}
    </nav>
  </div>;
}
