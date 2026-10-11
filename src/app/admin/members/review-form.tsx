"use client";

import { useActionState } from "react";
import { reviewMember } from "./actions";

export function ReviewForm({ targetId, status, role }: { targetId: string; status: string; role: string }) {
  const [state, action, pending] = useActionState(reviewMember, {});
  return <form action={action} className="stack">
    <input type="hidden" name="targetId" value={targetId} />
    <div className="form-grid">
      <div className="field">
        <label htmlFor={`decision-${targetId}`}>Membership decision</label>
        <select id={`decision-${targetId}`} name="status" defaultValue={status} required>
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`role-${targetId}`}>Role</label>
        <select id={`role-${targetId}`} name="role" defaultValue={role} required><option value="member">Member</option><option value="curator">Curator</option><option value="admin">Administrator</option></select>
      </div>
      <div className="field">
        <label htmlFor={`method-${targetId}`}>Verification method</label>
        <select id={`method-${targetId}`} name="verificationMethod" defaultValue="" required>
          <option value="" disabled>Choose method</option><option value="institutional_record">Institutional record</option><option value="alumni_reference">Alumni reference</option><option value="manual_review">Manual review</option>
        </select>
      </div>
    </div>
    <label className="field">Reason for this decision
      <textarea name="reason" required minLength={10} maxLength={500} rows={3} placeholder="Record what was checked and why this decision is appropriate." />
    </label>
    <p className="muted">Keep review notes minimal; do not copy identity documents. Administrator access permits membership review and access to private application evidence.</p>
    {state.error && <p role="alert" className="notice notice-error">{state.error}</p>}
    {state.success && <p role="status" className="notice notice-success">{state.success}</p>}
    <div><button type="submit" disabled={pending} className="button">{pending ? "Saving…" : "Save membership decision"}</button></div>
  </form>;
}
