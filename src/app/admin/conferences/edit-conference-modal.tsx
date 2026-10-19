"use client";

import { useEffect, useRef, useState } from "react";
import { updateConferenceAction } from "./actions";
import { Edit2, X } from "lucide-react";
import { zonedDateTimeInput } from "@/lib/conference-dates";
import { ConferenceReviewFields } from "@/components/conference-review-fields";

interface EditConferenceModalProps {
  conference: {
    id: string;
    name: string;
    acronym: string | null;
    startDate: Date | string;
    endDate: Date | string;
    timezone: string;
    cfpDeadline: Date | string | null;
    location: string;
    description: string | null;
    url: string | null;
    sourceUrl: string | null;
    publicationState: string;
    updatedAt: Date | string;
  };
}

export function EditConferenceModal({ conference }: EditConferenceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = trigger.current;
    dialog.current?.showModal();
    return () => { previousFocus?.focus(); };
  }, [isOpen]);

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const dateObj = new Date(d);
    return !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : "";
  };

  const fmtDatetime = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const dateObj = new Date(d);
    return !isNaN(dateObj.getTime()) ? zonedDateTimeInput(dateObj, conference.timezone) : "";
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
        <span>Edit</span>
      </button>

      {isOpen && (
        <dialog ref={dialog} onCancel={() => setIsOpen(false)} aria-label="Edit Conference Details" className="m-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/60">
          <div className="relative p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Conference Details</h3>
                <p className="text-xs text-slate-500">ID: {conference.id}</p>
              </div>
              <button
                type="button"
                aria-label="Close editor"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={updateConferenceAction}
              className="mt-5 space-y-4 text-xs"
            >
              <input type="hidden" name="conferenceId" value={conference.id} />
              <input type="hidden" name="expectedUpdatedAt" value={new Date(conference.updatedAt).toISOString()} />

              <div>
                <label htmlFor={`edit-name-${conference.id}`} className="block font-semibold text-slate-800">
                  Conference Name *
                </label>
                <input
                  type="text"
                  id={`edit-name-${conference.id}`}
                  name="name"
                  defaultValue={conference.name}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`edit-acronym-${conference.id}`} className="block font-semibold text-slate-800">
                    Acronym
                  </label>
                  <input
                    type="text"
                    id={`edit-acronym-${conference.id}`}
                    name="acronym"
                    defaultValue={conference.acronym ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={`edit-state-${conference.id}`} className="block font-semibold text-slate-800">
                    Publication State *
                  </label>
                  <select
                    id={`edit-state-${conference.id}`}
                    name="publicationState"
                    defaultValue={conference.publicationState}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="draft">Draft (Curator only)</option>
                    <option value="published">Published (Public)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor={`edit-start-${conference.id}`} className="block font-semibold text-slate-800">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id={`edit-start-${conference.id}`}
                    name="startDate"
                    defaultValue={fmtDate(conference.startDate)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={`edit-end-${conference.id}`} className="block font-semibold text-slate-800">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id={`edit-end-${conference.id}`}
                    name="endDate"
                    defaultValue={fmtDate(conference.endDate)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={`edit-tz-${conference.id}`} className="block font-semibold text-slate-800">
                    Timezone *
                  </label>
                  <input
                    type="text"
                    id={`edit-tz-${conference.id}`}
                    name="timezone"
                    defaultValue={conference.timezone}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`edit-cfp-${conference.id}`} className="block font-semibold text-slate-800">
                    CFP Deadline
                  </label>
                  <input
                    type="datetime-local"
                    id={`edit-cfp-${conference.id}`}
                    name="cfpDeadline"
                    defaultValue={fmtDatetime(conference.cfpDeadline)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={`edit-loc-${conference.id}`} className="block font-semibold text-slate-800">
                    Location *
                  </label>
                  <input
                    type="text"
                    id={`edit-loc-${conference.id}`}
                    name="location"
                    defaultValue={conference.location}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`edit-url-${conference.id}`} className="block font-semibold text-slate-800">
                  Organizer URL
                </label>
                <input
                  type="url"
                  id={`edit-url-${conference.id}`}
                  name="url"
                  defaultValue={conference.url ?? ""}
                  placeholder="https://example.org"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label htmlFor={`edit-desc-${conference.id}`} className="block font-semibold text-slate-800">
                  Description / Tracks / Logistics
                </label>
                <textarea
                  id={`edit-desc-${conference.id}`}
                  name="description"
                  rows={5}
                  defaultValue={conference.description ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <p>CFP time uses the conference timezone. During a repeated clock hour, specify its UTC offset below.</p>
              <label>CFP UTC offset (optional)<input name="cfpUtcOffset" placeholder="-04:00" pattern="[+-][0-9]{2}:[0-9]{2}" className="ml-2 rounded border p-2" /></label>
              <ConferenceReviewFields prefix={`edit-${conference.id}`} sourceUrl={conference.sourceUrl} />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-800 px-5 py-2 font-semibold text-white hover:bg-blue-900 shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </>
  );
}
