"use client";

import { useActionState } from "react";
import { submitMembershipApplication } from "./actions";

export function ApplicationForm({ initial }: { initial: { doctoralInstitution: string | null; programme: string | null; batchYear: number | null; membershipEvidence: string | null } }) {
  const [state, action, pending] = useActionState(submitMembershipApplication, {});
  return <form action={action} className="stack">
    <div className="form-grid">
      <label className="field">Doctoral institution
        <input name="doctoralInstitution" required minLength={2} maxLength={160} defaultValue={initial.doctoralInstitution ?? ""} autoComplete="organization" />
      </label>
      <div className="field">
        <label htmlFor="application-programme">Programme</label>
        <select id="application-programme" name="programme" required defaultValue={initial.programme ?? ""}>
          <option value="" disabled>Choose programme</option><option value="PhD">PhD</option><option value="FPM">FPM</option>
        </select>
      </div>
      <label className="field">Entry batch year (optional)
        <input name="batchYear" type="number" min="1960" max={new Date().getFullYear() + 1} defaultValue={initial.batchYear ?? ""} inputMode="numeric" />
      </label>
    </div>
    <div className="field">
      <label htmlFor="membership-evidence">Membership evidence</label>
      <textarea id="membership-evidence" name="evidence" rows={5} required minLength={20} maxLength={1000} defaultValue={initial.membershipEvidence ?? ""} aria-describedby="evidence-help" />
    </div>
    <p id="evidence-help" className="muted">Describe a public institutional record or an alumni reference the reviewer can check. Keep it brief (20–1,000 characters); do not include identity-document numbers or sensitive attachments. Only membership administrators can read this evidence.</p>
    {state.error && <p role="alert" className="notice notice-error">{state.error}</p>}
    {state.success && <p role="status" className="notice notice-success">{state.success}</p>}
    <div><button type="submit" disabled={pending} className="button">{pending ? "Saving…" : "Save application for review"}</button></div>
  </form>;
}
