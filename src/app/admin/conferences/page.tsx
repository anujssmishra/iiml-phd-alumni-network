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
import { QuickFetchTool } from "./quick-fetch-tool";

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
  }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/signin?callbackUrl=/admin/conferences");

  const query = await searchParams;

  let conferences;
  let suggestions;
  try {
    [conferences, suggestions] = await Promise.all([
      listAllConferencesForCurator(userId),
      listPendingSuggestions(userId),
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
          Review member suggestions, add tier-1 conferences, and manage publication state.
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
      <QuickFetchTool />

      {/* Section 1: Pending Member Suggestions */}
      <section className="rounded-xl border bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Pending Member Suggestions ({suggestions.length})</h2>
        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No pending conference suggestions to review.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {suggestions.map((sug) => (
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
                  <p><strong>Dates:</strong> {new Date(sug.startDate).toLocaleDateString()} &ndash; {new Date(sug.endDate).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {sug.location}</p>
                </div>

                {sug.description && <p className="text-sm text-slate-600">{sug.description}</p>}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <form action={reviewSuggestionAction} className="inline">
                    <input type="hidden" name="suggestionId" value={sug.id} />
                    <input type="hidden" name="decision" value="approve_published" />
                    <button type="submit" className="rounded bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900">
                      Approve & Publish Immediately
                    </button>
                  </form>

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
                defaultValue="published"
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
        <h2 className="text-xl font-bold text-slate-900">Manage Catalogue ({conferences.length})</h2>

        {conferences.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No conferences listed in database.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {conferences.map((conf) => (
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
                    {new Date(conf.startDate).toLocaleDateString()} &ndash; {new Date(conf.endDate).toLocaleDateString()} &middot; {conf.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <form action={setPublicationStateAction} className="inline">
                    <input type="hidden" name="conferenceId" value={conf.id} />
                    <input
                      type="hidden"
                      name="state"
                      value={conf.publicationState === "published" ? "draft" : "published"}
                    />
                    <button
                      type="submit"
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {conf.publicationState === "published" ? "Unpublish to Draft" : "Publish"}
                    </button>
                  </form>

                  <form action={deleteConferenceAction} className="inline">
                    <input type="hidden" name="conferenceId" value={conf.id} />
                    <button
                      type="submit"
                      className="rounded bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
