import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberActionForm } from "@/components/member-action-form";
import { listContacts } from "@/lib/member-service";
import { getCurrentUser } from "@/lib/session";
import { respondContactAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact requests", robots: { index: false, follow: false } };

type Contact = Awaited<ReturnType<typeof listContacts>>["incoming"][number];

function ContactCard({ request, incoming }: { request: Contact; incoming: boolean }) {
  const other = incoming ? request.sender : request.recipient;
  return (
    <article className="panel stack">
      <div className="section-heading">
        <h3>{incoming ? "From" : "To"} {other.name || "Network member"}</h3>
        <span className="badge">{request.status}</span>
      </div>
      <p className="muted">Requested {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(request.createdAt)}</p>
      <p className="contact-message">{request.message}</p>
      {request.replyEmail ? (
        <div className="notice">
          <p>{incoming ? "Shared reply email" : "Your provided reply email"}: <a className="text-link break-anywhere" href={`mailto:${encodeURIComponent(request.replyEmail)}`}>{request.replyEmail}</a></p>
          {!incoming && request.status === "pending" && <p className="muted">This is visible only to you until the recipient accepts.</p>}
        </div>
      ) : request.status === "pending" && <p className="muted">Accept to see the sender’s reply email. Your own email will not be shared.</p>}
      {incoming && request.status === "pending" && (
        <div className="button-row">
          <MemberActionForm action={respondContactAction} label="Accept request" pendingLabel="Accepting…">
            <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="status" value="accepted" />
          </MemberActionForm>
          <MemberActionForm action={respondContactAction} label="Decline request" pendingLabel="Declining…" tone="secondary">
            <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="status" value="declined" />
          </MemberActionForm>
        </div>
      )}
      {incoming && request.status === "accepted" && (
        <MemberActionForm action={respondContactAction} label="Close request and remove reply email" pendingLabel="Closing…" tone="secondary">
          <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="status" value="declined" />
        </MemberActionForm>
      )}
      {!incoming && (request.status === "pending" || request.status === "accepted") && (
        <MemberActionForm action={respondContactAction} label="Cancel request and remove reply email" pendingLabel="Cancelling…" tone="secondary">
          <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="status" value="cancelled" />
        </MemberActionForm>
      )}
    </article>
  );
}

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.membershipStatus !== "approved") redirect("/membership");
  const { incoming, outgoing } = await listContacts(user.id);

  return (
    <div className="network-shell page-space stack">
      <header className="page-heading">
        <p className="eyebrow">Introductions with consent</p>
        <h1>Contact requests</h1>
        <p className="muted">You choose which introductions to accept. Accepting reveals the sender’s provided reply email to you and never reveals your own account email.</p>
      </header>
      <div className="notice stack">
        <p>Only the two people in a request can view it. Use <Link className="text-link" href="/profile">My profile</Link> to stop receiving requests or hide your directory profile.</p>
        <p className="muted">Cancelling a request or withdrawing profile visibility removes shared addresses here. It cannot erase details someone has already copied elsewhere.</p>
      </div>
      <div className="contact-columns">
        <section className="stack" aria-labelledby="received-requests">
          <h2 id="received-requests">Received ({incoming.length})</h2>
          {incoming.length ? incoming.map((request) => <ContactCard key={request.id} request={request} incoming />) : <p className="panel muted">No contact requests received.</p>}
        </section>
        <section className="stack" aria-labelledby="sent-requests">
          <h2 id="sent-requests">Sent ({outgoing.length})</h2>
          {outgoing.length ? outgoing.map((request) => <ContactCard key={request.id} request={request} incoming={false} />) : <div className="panel stack"><p className="muted">You have not sent any contact requests.</p><Link href="/directory" className="text-link">Find a colleague</Link></div>}
        </section>
      </div>
    </div>
  );
}
