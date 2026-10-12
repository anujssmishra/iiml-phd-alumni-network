import Link from "next/link";
import { listPublicConferences } from "@/lib/conference-service";
import { getCurrentUser } from "@/lib/session";
import {
  Calendar,
  MapPin,
  Search,
  ArrowRight,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

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

function inferDomain(acronym?: string | null, name?: string): { label: string; badgeClass: string } {
  const text = `${acronym ?? ""} ${name ?? ""}`.toUpperCase();
  if (/ICIS|ECIS|PACIS|AMCIS|HICSS|SYSTEM SCIENCES|INFORMATION SYSTEMS|AIS/.test(text)) {
    return { label: "Information Systems", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (/AFA|WFA|EFA|IFC|AAA|FINANCE|ACCOUNTING|ASSA/.test(text)) {
    return { label: "Finance & Accounting", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (/AMA|MKTG|MARKETING|ACR|EMAC|CONSUMER/.test(text)) {
    return { label: "Marketing", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (/INFORMS|POMS|MSOM|DSI|OPERATIONS|DECISION|ANALYTICS/.test(text)) {
    return { label: "Operations & Analytics", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  if (/AIB|BCERC|BABSON|INTERNATIONAL BUSINESS|ENTREPRENEURSHIP/.test(text)) {
    return { label: "Entrepreneurship & IB", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { label: "Strategy & Management", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
}

export default async function ConferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; timeframe?: "upcoming" | "past" | "all"; page?: string }>;
}) {
  const query = await searchParams;
  const timeframe = query.timeframe === "past" || query.timeframe === "all" ? query.timeframe : "upcoming";
  const search = query.q ?? "";

  const { conferences, total, page, pageSize } = await listPublicConferences({
    q: search,
    timeframe,
    page: query.page,
  });

  const totalPages = Math.ceil(total / pageSize);
  const user = await getCurrentUser();
  const isApproved = user?.membershipStatus === "approved";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-200 mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Tier-1 Academic Conference Radar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Global Conference Calendar
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Curated international and Indian management conferences across AOM, AIS, INFORMS, and pan-IIM circuits. Coordinate travel, meetups, and accommodations with fellow scholars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={isApproved ? "/conferences/suggest" : user ? "/membership" : "/signin"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Suggest Conference</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-700/60 flex flex-wrap gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">{total}</span>
            <span className="text-slate-400">Total Conferences</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Verified Sources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Deadlines Monitored 24/7</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Timeframe Pills */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <Link
              href={`/conferences?timeframe=upcoming${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-md px-3.5 py-1.5 transition-all ${
                timeframe === "upcoming"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upcoming Events
            </Link>
            <Link
              href={`/conferences?timeframe=past${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-md px-3.5 py-1.5 transition-all ${
                timeframe === "past"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Past
            </Link>
            <Link
              href={`/conferences?timeframe=all${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-md px-3.5 py-1.5 transition-all ${
                timeframe === "all"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </Link>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-md">
            <input type="hidden" name="timeframe" value={timeframe} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Filter by title, acronym (e.g. AOM, ECIS), or city..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-20 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Conference Grid */}
      {conferences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No conferences match your filter</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords, switching from upcoming to all events, or suggesting a new conference.
          </p>
          <div className="mt-4">
            <Link
              href="/conferences"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conferences.map((conf) => {
            const dateStr = formatDateRange(conf.startDate, conf.endDate, conf.timezone);
            const isCfpOpen = conf.cfpDeadline && new Date(conf.cfpDeadline) > new Date();
            const domain = inferDomain(conf.acronym, conf.name);

            return (
              <Link
                key={conf.id}
                href={`/conferences/${conf.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              >
                <div>
                  {/* Top Header: Acronym & CFP / Domain Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-white tracking-tight shadow-2xs">
                      {conf.acronym || "CONF"}
                    </span>
                    {isCfpOpen ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        CFP Open
                      </span>
                    ) : (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${domain.badgeClass}`}>
                        {domain.label}
                      </span>
                    )}
                  </div>

                  {/* Conference Title - Fully Visible, No Truncation */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                    {conf.name}
                  </h3>

                  {/* Details Strip */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{conf.location}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono" title={conf.timezone}>
                    {conf.timezone}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform text-xs">
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
          <p>
            Showing page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span> ({total} total conferences)
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/conferences?timeframe=${timeframe}&page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/conferences?timeframe=${timeframe}&page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
