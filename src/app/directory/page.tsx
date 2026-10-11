import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberActionForm } from "@/components/member-action-form";
import { getCurrentUser } from "@/lib/session";
import { listDirectory, NetworkError } from "@/lib/member-service";
import { RESEARCH_DOMAINS } from "@/lib/validation";
import { requestContactAction } from "../contacts/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private member directory", robots: { index: false, follow: false } };

type Query = { q?: string | string[]; institution?: string | string[]; domain?: string | string[]; page?: string | string[] };
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.membershipStatus !== "approved") redirect("/membership");
  const query = await searchParams;
  const q = single(query.q);
  const institution = single(query.institution);
  const domain = single(query.domain);
  const requestedPage = single(query.page) || "1";
  let result;
  try {
    result = await listDirectory(user.id, { q, institution, domain, page: requestedPage });
  } catch (error) {
    return (
      <div className="network-shell page-space stack">
        <h1>Private member directory</h1>
        <p role="alert" className="notice notice-error">{error instanceof NetworkError ? error.message : "The directory is temporarily unavailable. Please try again."}</p>
        <Link href="/directory" className="text-link">Reset directory search</Link>
      </div>
    );
  }
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  function pageLink(page: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (institution) params.set("institution", institution);
    if (domain) params.set("domain", domain);
    params.set("page", String(page));
    return `/directory?${params.toString()}`;
  }

  return (
    <div className="network-shell page-space stack">
      <header className="page-heading">
        <p className="eyebrow">Approved members only</p>
        <h1>Private member directory</h1>
        <p className="muted">Discover colleagues who have chosen to share their profiles. Membership is reviewed; affiliations and research details are self-reported.</p>
      </header>
      <form action="/directory" method="get" className="panel stack" role="search" aria-label="Member directory">
        <div className="directory-filters">
          <label className="field">Search members
            <input name="q" type="search" maxLength={100} defaultValue={q} placeholder="Name, institution, or research method" />
          </label>
          <div className="field">
            <label htmlFor="directory-institution">Institution</label>
            <select id="directory-institution" name="institution" defaultValue={institution}>
              <option value="">All institutions</option>
              {result.institutions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="directory-domain">Research domain</label>
            <select id="directory-domain" name="domain" defaultValue={domain}>
              <option value="">All research domains</option>
              {RESEARCH_DOMAINS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="button-row"><button className="button" type="submit">Search directory</button><Link href="/directory" className="text-link">Clear filters</Link></div>
      </form>

      <div className="section-heading">
        <p aria-live="polite">{result.total} {result.total === 1 ? "member" : "members"} found</p>
        <Link className="text-link" href="/profile">Manage my visibility</Link>
      </div>
      {(!user.directoryVisible || !user.open_to_chat) && <p className="notice">To send and receive contact requests, enable directory visibility and Open to Chat in <Link href="/profile" className="text-link">My profile</Link>.</p>}
      {result.members.length === 0 ? (
        <div className="panel empty-state">
          <h2>No profiles match this search</h2>
          <p className="muted">Try another name or remove a filter. Only approved members who have explicitly shared their profiles appear here.</p>
        </div>
      ) : (
        <div className="member-grid">
          {result.members.map((member) => (
            <article className="panel member-card stack" key={member.id}>
              <div>
                <p className="eyebrow">Approved member</p>
                <h2>{member.name || "Network member"}</h2>
                <p className="member-affiliation">{[member.current_title, member.current_institution].filter(Boolean).join(" · ") || "Current affiliation not supplied"}</p>
              </div>
              <dl className="profile-details">
                <div><dt>Doctoral background</dt><dd>{[member.programme, member.doctoralInstitution, member.batchYear].filter(Boolean).join(" · ") || "Not supplied"}</dd></div>
                <div><dt>Research domain</dt><dd>{member.research_domain || "Not supplied"}</dd></div>
                <div><dt>Methods</dt><dd>{member.methodological_expertise?.split(",").join(" · ") || "Not supplied"}</dd></div>
                <div><dt>Last confirmed by member</dt><dd>{member.profileConfirmedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(member.profileConfirmedAt) : "Not yet confirmed"}</dd></div>
              </dl>
              {member.id === user.id ? (
                <Link href="/profile" className="text-link">Edit my profile</Link>
              ) : member.open_to_chat ? (
                <details className="contact-disclosure">
                  <summary>Request contact with {member.name || "this member"}</summary>
                  <div className="contact-form-area">
                    <MemberActionForm action={requestContactAction} label="Send contact request" pendingLabel="Sending request…">
                      <input type="hidden" name="recipientId" value={member.id} />
                      <p className="muted">Introduce yourself in 20–800 characters. This member can accept or decline before seeing your reply email. Your own directory visibility and Open to Chat must also be enabled.</p>
                      <label className="field">Introduction
                        <textarea name="message" required minLength={20} maxLength={800} rows={4} placeholder="What would you like to discuss?" />
                      </label>
                      <label className="field">Reply email to share on acceptance
                        <input name="replyEmail" type="email" required maxLength={254} autoComplete="email" />
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" name="shareReplyEmail" required />
                        <span>I agree to share this reply email with this member if they accept my request.</span>
                      </label>
                      <p className="muted">Avoid putting contact details in your introduction. You can cancel from Contact requests.</p>
                    </MemberActionForm>
                  </div>
                </details>
              ) : <p className="muted">Not currently accepting contact requests.</p>}
            </article>
          ))}
        </div>
      )}
      <nav className="pagination" aria-label="Directory pages">
        {result.page > 1 ? <Link className="button button-secondary" href={pageLink(result.page - 1)}>Previous page</Link> : <span />}
        <span>Page {result.page} of {totalPages}</span>
        {result.page < totalPages ? <Link className="button button-secondary" href={pageLink(result.page + 1)}>Next page</Link> : <span />}
      </nav>
      <p className="muted">Profile information stays inside the approved-member directory. Contact requests are an opt-in introduction mechanism; this service does not offer private messaging.</p>
    </div>
  );
}
