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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {conferences.map((conf) => {
            const dateStr = formatDateRange(conf.startDate, conf.endDate, conf.timezone);
            const isCfpOpen = conf.cfpDeadline && new Date(conf.cfpDeadline) > new Date();

            return (
              <Link
                key={conf.id}
                href={`/conferences/${conf.id}`}
                className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-500 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    {conf.acronym && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tracking-tight">
                        {conf.acronym}
                      </span>
                    )}
                    {isCfpOpen && (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        CFP Open
                      </span>
                    )}
                  </div>

                  <h2 className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                    {conf.name}
                  </h2>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <p className="font-medium text-slate-700 truncate" title={dateStr}>
                      📅 {dateStr}
                    </p>
                    <p className="text-slate-500 truncate" title={conf.location}>
                      📍 {conf.location}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{conf.timezone}</span>
                  <span className="font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform">
                    View &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
