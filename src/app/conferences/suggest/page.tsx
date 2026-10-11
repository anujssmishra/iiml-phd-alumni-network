import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listOwnSuggestions } from "@/lib/conference-service";
import { suggestConferenceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suggest a Conference | IIM PhD & FPM Network" };

export default async function SuggestConferencePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.membershipStatus !== "approved") {
    redirect("/signin?callbackUrl=/conferences/suggest");
  }

  const query = await searchParams;
  const ownSuggestions = await listOwnSuggestions(user.id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/conferences" className="text-blue-800 underline">
        &larr; Back to conferences
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Suggest a Conference</h1>
      <p className="mt-2 text-slate-600">
        Know of an upcoming academic conference relevant to IIM PhD/FPM scholars? Submit its details and official URL for curator review.
      </p>

      {query.error && (
        <p role="alert" className="my-4 rounded border border-red-300 bg-red-50 p-4 text-red-900">
          {query.error.slice(0, 200)}
        </p>
      )}
      {query.saved && (
        <p role="status" className="my-4 rounded border border-green-300 bg-green-50 p-4 text-green-900">
          Thank you! Your conference suggestion has been submitted for curator review.
        </p>
      )}

      <form action={suggestConferenceAction} className="mt-8 space-y-6 rounded-xl border bg-white p-6 shadow-xs">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-800">
            Conference Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g. 87th Annual Meeting of the Academy of Management"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="acronym" className="block text-sm font-semibold text-slate-800">
              Acronym / Short Name
            </label>
            <input
              type="text"
              id="acronym"
              name="acronym"
              placeholder="e.g. AOM 2027"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-slate-800">
              Official Organizer URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              placeholder="https://aom.org/events/annual-meeting"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
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
            placeholder="e.g. Boston, Massachusetts, USA or Virtual"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-slate-800">
            Overview / Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Brief description of scope, tracks, or significance..."
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-800 px-6 py-3 font-medium text-white hover:bg-blue-900"
        >
          Submit Suggestion
        </button>
      </form>

      {/* User's Previously Submitted Suggestions */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-slate-900">Your Submitted Suggestions</h2>
        {ownSuggestions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">You haven&apos;t submitted any conference suggestions yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {ownSuggestions.map((sug) => (
              <div key={sug.id} className="rounded-xl border bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {sug.name} {sug.acronym ? `(${sug.acronym})` : ""}
                  </h3>
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                      sug.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : sug.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {sug.status.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{sug.location}</p>
                <a href={sug.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-blue-800 underline">
                  {sug.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
