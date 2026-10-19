export function ConferenceReviewFields({ prefix, sourceUrl = "" }: { prefix: string; sourceUrl?: string | null }) {
  return <fieldset className="rounded-lg border border-slate-200 p-3 space-y-3">
    <legend className="font-semibold">Source review and change record</legend>
    <div><label htmlFor={`${prefix}-source`}>Edition-specific source URL</label><input id={`${prefix}-source`} type="url" name="sourceUrl" defaultValue={sourceUrl ?? ""} className="mt-1 w-full rounded border p-2" /></div>
    <div><label htmlFor={`${prefix}-reason`}>Change reason *</label><textarea id={`${prefix}-reason`} name="changeReason" required minLength={10} maxLength={500} className="mt-1 w-full rounded border p-2" /></div>
    <label className="flex gap-2 items-start"><input type="checkbox" name="reviewConfirmed" />I checked the edition, dates, timezone, deadlines (or their absence), venue, links and all displayed text against this source.</label>
    <p className="text-xs text-slate-600">Publication requires this review. Save an unconfirmed entry as a draft. Editing without confirmation removes its previous review.</p>
  </fieldset>;
}
