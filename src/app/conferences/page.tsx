import Link from "next/link";
import { listPublicConferences } from "@/lib/conference-service";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conferences | IIM PhD & FPM Network" };

function formatDateRange(start: Date, end: Date, timeZone = "UTC"): string {
  const sDay = start.toLocaleDateString("en-IN", { timeZone, day: "numeric" });
  const sMonth = start.toLocaleDateString("en-IN", { timeZone, month: "short" });
  const sYear = start.toLocaleDateString("en-IN", { timeZone, year: "numeric" });

  const eDay = end.toLocaleDateString("en-IN", { timeZone, day: "numeric" });
  const eMonth = end.toLocaleDateString("en-IN", { timeZone, month: "short" });
  const eYear = end.toLocaleDateString("en-IN", { timeZone, year: "numeric" });

  if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
    return `${sDay} ${sMonth} ${sYear}`;
  }
  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth} ${sYear}`;
  }
  if (sYear === eYear) {
    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
  }
  return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
}

export default async function ConferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; timeframe?: "upcoming" | "past" | "all"; page?: string }>;
}) {
  const query = await searchParams;
  const timeframe = query.timeframe === "past" || query.timeframe === "all" ? query.timeframe : "upcoming";
  const search = query.q ?? "";

  const { conferences, total } = await listPublicConferences({
    q: search,
    timeframe,
    page: query.page,
  });

  const user = await getCurrentUser();
  const isApproved = user?.membershipStatus === "approved";

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conference catalogue</h1>
          <p className="mt-2 text-slate-600">
            Curated tier-1 academic conferences ({total} total). Event facts are public; attendance coordination is reserved for approved members.
          </p>
        </div>
        <div>
          <Link
            href={isApproved ? "/conferences/suggest" : user ? "/membership" : "/signin"}
            className="inline-block rounded-lg bg-blue-800 px-5 py-2.5 font-medium text-white hover:bg-blue-900"
          >
            Suggest a Conference
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form method="get" className="my-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-white p-4">
        <div className="flex gap-2">
          <Link
            href={`/conferences?timeframe=upcoming${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeframe === "upcoming" ? "bg-blue-100 text-blue-900 font-semibold" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Upcoming
          </Link>
          <Link
            href={`/conferences?timeframe=past${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeframe === "past" ? "bg-blue-100 text-blue-900 font-semibold" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Past
          </Link>
          <Link
            href={`/conferences?timeframe=all${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeframe === "all" ? "bg-blue-100 text-blue-900 font-semibold" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Events
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <input type="hidden" name="timeframe" value={timeframe} />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search conferences or location..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Search
          </button>
        </div>
      </form>

      {conferences.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-600">
          No conferences found for this search or filter.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {conferences.map((conf) => {
            const dateStr = formatDateRange(conf.startDate, conf.endDate, conf.timezone);
            const isCfpOpen = conf.cfpDeadline && new Date(conf.cfpDeadline) > new Date();

            return (
              <article key={conf.id} className="flex flex-col justify-between rounded-xl border bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    {conf.acronym && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                        {conf.acronym}
                      </span>
                    )}
                    {isCfpOpen && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        CFP Open
                      </span>
                    )}
                  </div>

                  <h2 className="my-3 text-xl font-semibold">
                    <Link className="text-blue-800 hover:underline" href={`/conferences/${conf.id}`}>
                      {conf.name}
                    </Link>
                  </h2>

                  <p className="text-sm font-medium text-slate-700">{dateStr}</p>
                  <p className="text-sm text-slate-500 mt-1">{conf.location}</p>

                  {conf.description && <p className="mt-3 text-sm text-slate-600 line-clamp-3">{conf.description}</p>}
                </div>

                <div className="mt-6 pt-4 border-t text-xs text-slate-500 flex justify-between items-center">
                  <span>Timezone: {conf.timezone}</span>
                  <Link href={`/conferences/${conf.id}`} className="font-semibold text-blue-800 hover:underline">
                    View details &rarr;
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
