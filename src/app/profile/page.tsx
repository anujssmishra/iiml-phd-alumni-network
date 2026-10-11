import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { MemberActionForm } from "@/components/member-action-form";
import { getCurrentUser } from "@/lib/session";
import { getOwnProfile } from "@/lib/member-service";
import { METHODS, RESEARCH_DOMAINS } from "@/lib/validation";
import { deleteAccountAction, saveProfileAction, withdrawProfileAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My profile", robots: { index: false, follow: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; hidden?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const query = await searchParams;
  const profile = user.membershipStatus === "approved" ? await getOwnProfile(user.id) : null;

  return (
    <div className="network-shell stack page-space">
      <header className="page-heading">
        <p className="eyebrow">Your membership, your choices</p>
        <h1>My profile</h1>
        <p className="muted">Keep your academic details current and decide whether other approved members can discover you.</p>
      </header>
      {query.saved === "1" && profile && <p className="notice notice-success" role="status">Profile saved. Your visibility choices are now in effect.</p>}
      {query.hidden === "1" && !user.directoryVisible && <p className="notice notice-success" role="status">Your profile is hidden and contact requests have been withdrawn.</p>}
      {profile ? <section className="panel stack" aria-labelledby="profile-details">
        <div className="section-heading">
          <h2 id="profile-details">Profile details</h2>
          <span className="badge">{profile.directoryVisible ? "Visible to approved members" : "Private profile"}</span>
        </div>
        <p className="muted">Membership approval and profile details are different: affiliations and research interests shown here are self-reported.</p>
        <ProfileForm key={profile.updatedAt.toISOString()} profile={{
          name: profile.name,
          current_institution: profile.current_institution,
          current_title: profile.current_title,
          doctoralInstitution: profile.doctoralInstitution,
          programme: profile.programme,
          batchYear: profile.batchYear,
          research_domain: profile.research_domain,
          methodological_expertise: profile.methodological_expertise,
          directoryVisible: profile.directoryVisible,
          open_to_chat: profile.open_to_chat,
        }} action={saveProfileAction} domains={RESEARCH_DOMAINS} methods={METHODS} />
      </section> : <div className="notice stack">
        <p>Profile editing and directory access require approved membership. Your privacy controls remain available.</p>
        <Link href="/membership" className="text-link">Review membership status</Link>
      </div>}

      <section className="panel stack" aria-labelledby="visibility-controls">
        <h2 id="visibility-controls">Withdraw directory visibility</h2>
        <p>Hide your profile immediately, turn off contact requests, and cancel your existing requests. Your account and saved profile remain available to you.</p>
        <MemberActionForm action={withdrawProfileAction} label="Hide my profile" pendingLabel="Hiding profile…" tone="secondary" />
        <Link className="text-link" href="/contacts">Review my contact requests</Link>
      </section>

      <section className="panel stack danger-panel" aria-labelledby="delete-account">
        <h2 id="delete-account">Delete account and personal data</h2>
        <p>This permanently deletes your account, profile, membership details, attendance, and contact requests, and ends access through existing sessions. It cannot be undone.</p>
        <p className="muted">A recipient may already have copied an address shared after acceptance; deleting your account cannot remove copies held outside this service.</p>
        <MemberActionForm action={deleteAccountAction} label="Permanently delete my account" pendingLabel="Deleting account…" tone="danger">
          <label className="field narrow-field">Type DELETE to confirm
            <input name="confirmation" required pattern="DELETE" autoComplete="off" aria-describedby="delete-warning" />
          </label>
          <p className="muted" id="delete-warning">This confirmation applies only to your own signed-in account.</p>
        </MemberActionForm>
      </section>
    </div>
  );
}
