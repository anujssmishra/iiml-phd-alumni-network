"use client";

import { useActionState, useState } from "react";
import type { MemberAction } from "./member-action-form";

type Profile = {
  name: string | null;
  current_institution: string | null;
  current_title: string | null;
  doctoralInstitution: string | null;
  programme: string | null;
  batchYear: number | null;
  research_domain: string | null;
  methodological_expertise: string | null;
  directoryVisible: boolean;
  open_to_chat: boolean;
};

export function ProfileForm({ profile, action, domains, methods }: {
  profile: Profile;
  action: MemberAction;
  domains: readonly string[];
  methods: readonly string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [visible, setVisible] = useState(profile.directoryVisible);
  const [openToChat, setOpenToChat] = useState(profile.open_to_chat);
  const selectedMethods = profile.methodological_expertise?.split(",").map((method) => method.trim()) ?? [];

  return (
    <form action={formAction} className="stack">
      <div className="form-grid">
        <label className="field">Display name
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={profile.name ?? ""} />
        </label>
        <label className="field">Current institution
          <input name="currentInstitution" required minLength={2} maxLength={160} autoComplete="organization" defaultValue={profile.current_institution ?? ""} />
        </label>
        <label className="field">Current title
          <input name="currentTitle" maxLength={100} autoComplete="organization-title" defaultValue={profile.current_title ?? ""} />
        </label>
        <label className="field">Doctoral institution
          <input name="doctoralInstitution" required minLength={2} maxLength={160} defaultValue={profile.doctoralInstitution ?? ""} />
        </label>
        <div className="field">
          <label htmlFor="profile-programme">Doctoral programme</label>
          <select id="profile-programme" name="programme" defaultValue={profile.programme ?? ""}>
            <option value="">Not supplied</option>
            <option value="PhD">PhD</option>
            <option value="FPM">FPM</option>
          </select>
        </div>
        <label className="field">Batch year (optional)
          <input name="batchYear" type="number" min={1960} max={new Date().getFullYear() + 1} defaultValue={profile.batchYear ?? ""} />
        </label>
        <div className="field">
          <label htmlFor="profile-domain">Research domain</label>
          <select id="profile-domain" name="researchDomain" defaultValue={profile.research_domain ?? ""}>
            <option value="">Not supplied</option>
            {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="stack">
        <legend className="field-label">Research methods (optional)</legend>
        <p className="muted">Choose up to six methods you would like other approved members to see.</p>
        <div className="checkbox-grid">
          {methods.map((method) => (
            <label className="checkbox-label" key={method}>
              <input type="checkbox" name="methods" value={method} defaultChecked={selectedMethods.includes(method)} />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="consent-box stack">
        <legend className="field-label">Your visibility and contact choices</legend>
        <label className="checkbox-label">
          <input type="checkbox" name="directoryVisible" checked={visible} onChange={(event) => {
            setVisible(event.target.checked);
            if (!event.target.checked) setOpenToChat(false);
          }} />
          <span>I agree to show these profile fields to approved network members.</span>
        </label>
        <p className="muted">Your profile is private by default. Your sign-in email and membership evidence are never shown in the directory.</p>
        <label className="checkbox-label">
          <input type="checkbox" name="openToChat" checked={openToChat} disabled={!visible} onChange={(event) => setOpenToChat(event.target.checked)} />
          <span>I am open to receiving contact requests from approved members.</span>
        </label>
        <p className="muted">Each request requires your acceptance. Contact requests do not reveal your email address. Turning off either option cancels existing requests and removes shared reply addresses from them.</p>
      </fieldset>

      {state.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {state.success && <p className="notice notice-success" role="status">{state.success}</p>}
      <p className="muted">Saving confirms that these self-reported details are current. You can correct them or withdraw visibility at any time.</p>
      <div><button type="submit" className="button" disabled={pending}>{pending ? "Saving profile…" : "Save profile"}</button></div>
    </form>
  );
}
