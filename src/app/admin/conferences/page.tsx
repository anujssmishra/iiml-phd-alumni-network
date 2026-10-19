import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import {
  listAllConferencesForCurator,
  listPendingSuggestions,
} from "@/lib/conference-service";
import { NetworkError } from "@/lib/validation";
import {
  createConferenceAction,
  setPublicationStateAction,
  deleteConferenceAction,
  reviewSuggestionAction,
} from "./actions";
import { ConferenceReviewFields } from "@/components/conference-review-fields";
import { formatConferenceDay } from "@/lib/conference-dates";
import { EditConferenceModal } from "./edit-conference-modal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Curator Workspace | IIM PhD & FPM Network" };

export default async function CuratorConferencesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    reviewed?: string;
    synced?: string;
    page?: string;
    suggestionsPage?: string;
  }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/signin?callbackUrl=/admin/conferences");

  const query = await searchParams;

  let conferences;
  let suggestions;
  try {
    [conferences, suggestions] = await Promise.all([
      listAllConferencesForCurator(userId, query.page),
      listPendingSuggestions(userId, query.suggestionsPage),
    ]);
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    return (
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-bold">Curator workspace</h1>
        <p role="alert" className="my-4 rounded border border-red-300 bg-red-50 p-4 text-red-900">
          {error.message}
        </p>
        <Link href="/membership" className="text-blue-800 underline">
          Return to membership status
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 space-y-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Curator Workspace</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Conference Catalogue & Curation</h1>
        <p className="mt-2 text-slate-600">
          Review edition-specific sources, record corrections, and manage publication state.
        </p>
      </div>

      {query.error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-900">
          {query.error.slice(0, 200)}
        </p>
      )}
      {(query.created || query.updated || query.deleted || query.reviewed || query.synced) && (
        <p role="status" className="rounded border border-green-300 bg-green-50 p-4 text-green-900">
          Action completed successfully.
        </p>
      )}

      {/* Automated Ingestion Tool */}
      <p className="rounded border p-4">URL fetching and automatic publication are disabled during the pilot. Enter source facts manually and record your review.</p>

      {/* Section 1: Pending Member Suggestions */}
      <section className="rounded-xl border bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Pending Member Suggestions ({suggestions.total})</h2>
        <nav aria-label="Pending suggestion pages">Page {suggestions.page} of {suggestions.pages} · {suggestions.page > 1 && <Link href={`?page=${conferences.page}&suggestionsPage=${suggestions.page - 1}`}>Previous suggestions</Link>} {suggestions.page < suggestions.pages && <Link href={`?page=${conferences.page}&suggestionsPage=${suggestions.page + 1}`}>Next suggestions</Link>}</nav>
        {suggestions.rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No pending conference suggestions to review.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {suggestions.rows.map((sug) => (
              <div key={sug.id} className="rounded-lg border p-4 bg-slate-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">
                      {sug.name} {sug.acronym ? `(${sug.acronym})` : ""}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Submitted by {sug.submitter.name ?? "Member"} ({sug.submitter.current_institution ?? "Institution not set"}) &middot; {sug.submitter.email}
                    </p>
                  </div>
                  <a
                    href={sug.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-800 underline font-medium"
                  >
                    Visit Source URL &rarr;
                  </a>
                </div>

                <div className="text-sm text-slate-700 grid gap-2 sm:grid-cols-2">
                  <p><strong>Dates:</strong> {formatConferenceDay(sug.startDate)} &ndash; {formatConferenceDay(sug.endDate)}</p>
                  <p><strong>Location:</strong> {sug.location}</p>
                  <p>Timezone: {sug.timezone}</p>
                  <p>CFP: {sug.cfpDeadline ? sug.cfpDeadline.toLocaleString("en-IN", { timeZone: sug.timezone }) : "Not provided"}</p>
                </div>

                {sug.description && <p className="text-sm text-slate-600">{sug.description}</p>}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <form action={reviewSuggestionAction} className="inline">
                    <input type="hidden" name="suggestionId" value={sug.id} />
                    <input type="hidden" name="decision" value="approve_draft" />
                    <button type="submit" className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                      Approve as Draft
                    </button>
                  </form>

                  <form action={reviewSuggestionAction} className="inline">
                    <input type="hidden" name="suggestionId" value={sug.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button type="submit" className="rounded bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Create New Conference */}
      <section className="rounded-xl border bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Create New Conference Entry</h2>
        <form action={createConferenceAction} className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-slate-800">
                Conference Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="acronym" className="block text-sm font-semibold text-slate-800">
                Acronym
              </label>
              <input
                type="text"
                id="acronym"
                name="acronym"
                placeholder="e.g. AOM 2027"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="startDate" className="block text-sm font-semibold text-slate-800">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-semibold text-slate-800">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-semibold text-slate-800">
                Timezone *
              </label>
              <input
                type="text"
                id="timezone"
                name="timezone"
                defaultValue="UTC"
                placeholder="e.g. America/New_York or Asia/Kolkata"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="cfpDeadline" className="block text-sm font-semibold text-slate-800">
                CFP Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                id="cfpDeadline"
                name="cfpDeadline"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-slate-800">
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                placeholder="City, Country"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="publicationState" className="block text-sm font-semibold text-slate-800">
                Publication State *
              </label>
              <select
                id="publicationState"
                name="publicationState"
                defaultValue="draft"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="draft">Draft (Curators only)</option>
                <option value="published">Published (Public)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-slate-800">
              Organizer URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-800">
              Description / Scope
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <p className="text-sm">CFP times use the selected conference timezone.</p>
          <label>CFP UTC offset (optional, for a repeated clock hour)<input name="cfpUtcOffset" placeholder="-04:00" pattern="[+-][0-9]{2}:[0-9]{2}" className="ml-2 rounded border p-2" /></label>
          <ConferenceReviewFields prefix="create" />

          <button
            type="submit"
            className="rounded-lg bg-blue-800 px-6 py-2.5 font-medium text-white hover:bg-blue-900"
          >
            Create Conference
          </button>
        </form>
      </section>

      {/* Section 3: Catalogue Management */}
      <section className="rounded-xl border bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Manage Catalogue ({conferences.total})</h2>
        <nav aria-label="Catalogue pages">Page {conferences.page} of {conferences.pages} · {conferences.page > 1 && <Link href={`?page=${conferences.page - 1}&suggestionsPage=${suggestions.page}`}>Previous conferences</Link>} {conferences.page < conferences.pages && <Link href={`?page=${conferences.page + 1}&suggestionsPage=${suggestions.page}`}>Next conferences</Link>}</nav>

        {conferences.rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No conferences listed in database.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {conferences.rows.map((conf) => (
              <div key={conf.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        conf.publicationState === "published"
                          ? "bg-green-100 text-green-800"
                          : conf.publicationState === "archived"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {conf.publicationState.toUpperCase()}
                    </span>
                    {conf.acronym && <span className="font-semibold text-xs text-slate-700">{conf.acronym}</span>}
                    <span className="text-xs text-slate-500">({conf._count.attendees} attendees)</span>
                  </div>

                  <h3 className="mt-1 font-semibold text-slate-900">
                    <Link href={`/conferences/${conf.id}`} className="hover:underline text-blue-800">
                      {conf.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatConferenceDay(conf.startDate)} &ndash; {formatConferenceDay(conf.endDate)} &middot; {conf.location}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <EditConferenceModal key={`${conf.id}-${conf.updatedAt.toISOString()}`} conference={conf} />
                  <Link href={`/admin/conferences/${encodeURIComponent(conf.id)}/history`} className="text-sm text-blue-800 underline">History / restore</Link>
                  {!conf.reviewedAt && <span className="text-xs">Source review required in Edit</span>}

                  {conf.publicationState !== "published" && conf.reviewedAt && (
                    <form action={setPublicationStateAction} className="inline">
                      <input type="hidden" name="conferenceId" value={conf.id} />
                      <input type="hidden" name="state" value="published" />
                      <button
                        type="submit"
                        className="rounded border border-green-600 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
                      >
                        Publish
                      </button>
                    </form>
                  )}

                  {conf.publicationState !== "draft" && (
                    <form action={setPublicationStateAction} className="inline">
                      <input type="hidden" name="conferenceId" value={conf.id} />
                      <input type="hidden" name="state" value="draft" />
                      <button
                        type="submit"
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {conf.publicationState === "archived" ? "Restore to Draft" : "Unpublish to Draft"}
                      </button>
                    </form>
                  )}

                  {conf.publicationState !== "archived" && (
                    <form action={setPublicationStateAction} className="inline">
                      <input type="hidden" name="conferenceId" value={conf.id} />
                      <input type="hidden" name="state" value="archived" />
                      <button
                        type="submit"
                        className="rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Archive
                      </button>
                    </form>
                  )}

                  {conf.publicationState === "draft" && conf._count.attendees === 0 && conf._count.revisions === 0 && <form action={deleteConferenceAction} className="inline">
                    <input type="hidden" name="conferenceId" value={conf.id} />
                    <button
                      type="submit"
                      className="rounded bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-900 transition-colors"
                    >
                      Delete
                    </button>
                  </form>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
