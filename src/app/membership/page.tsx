import Link from "next/link";
import { redirect } from "next/navigation";
import { hasExactAcademicDomain } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/session";
import { ApplicationForm } from "./application-form";

export const dynamic = "force-dynamic";

const statusCopy: Record<string, { title: string; message: string }> = {
  pending: { title: "Membership pending", message: "Submit your doctoral affiliation for review. Signing in verifies your mailbox; a membership administrator separately verifies eligibility for this community." },
  approved: { title: "Membership approved", message: "You can use member features. Your profile stays private until you choose to appear in the directory." },
  rejected: { title: "Application not approved", message: "You may correct your details and resubmit your application with information a reviewer can verify." },
  suspended: { title: "Membership suspended", message: "Member access is currently suspended and your directory profile is hidden. A membership administrator must review any reinstatement. You can still manage privacy and delete your account." },
};

export default async function MembershipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/membership");
  const status = statusCopy[user.membershipStatus] ?? { title: "Membership unavailable", message: "Please ask the site operator to review your membership status." };
  const academicMailbox = hasExactAcademicDomain(user.email, (process.env.ACADEMIC_EMAIL_DOMAINS ?? "").split(","));
  return <div className="network-shell stack">
    <div className="page-heading"><p className="eyebrow">Your account</p><h1>{status.title}</h1><p>{status.message}</p></div>
    <section className="panel stack" aria-labelledby="identity-heading">
      <h2 id="identity-heading">Signed-in identity</h2>
      <p>{user.name ?? "Member"} · {user.email}</p>
      <p className="muted">{academicMailbox ? "Your mailbox matches a configured institutional domain. This is affiliation evidence, not proof of doctoral membership." : "A personal or other mailbox can be used for sign-in. Membership is verified through your application evidence."}</p>
      {user.applicationSubmittedAt && <p>Application last submitted: <time dateTime={user.applicationSubmittedAt.toISOString()}>{user.applicationSubmittedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</time></p>}
      {user.reviewedAt && <p>Last membership review: <time dateTime={user.reviewedAt.toISOString()}>{user.reviewedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</time></p>}
      <div className="flex flex-wrap gap-3">
        <Link href="/profile" className="button-secondary">Manage profile and privacy</Link>
        {user.membershipStatus === "approved" && <Link href="/directory" className="button">Explore the directory</Link>}
        {user.membershipStatus === "approved" && user.role === "admin" && <Link href="/admin/members" className="button-secondary">Review memberships</Link>}
      </div>
    </section>
    {["pending", "rejected"].includes(user.membershipStatus) && <section className="panel stack" aria-labelledby="application-heading">
      <h2 id="application-heading">Doctoral membership application</h2>
      <ApplicationForm initial={{ doctoralInstitution: user.doctoralInstitution, programme: user.programme, batchYear: user.batchYear, membershipEvidence: user.membershipEvidence }} />
    </section>}
  </div>;
}
