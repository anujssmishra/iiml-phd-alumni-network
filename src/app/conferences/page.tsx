import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MapPin, Calendar, Users, ArrowRight, Globe } from "lucide-react";
import { Suspense } from "react";

export const metadata = {
  title: "Conference Tracker | IIM PhD Alumni Network",
};

// Extracted data-fetching component
async function ConferenceList() {
  const conferences = await prisma.conference.findMany({
    orderBy: { date: "asc" },
    include: { _count: { select: { attendees: true } } },
  });

  if (conferences.length === 0) {
    return (
      <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">No upcoming conferences</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">Check back later for new academic events, or suggest a conference to the community.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {conferences.map((conf) => (
        <Link key={conf.id} href={`/conferences/${conf.id}`} className="block group h-full">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            {/* Top right gradient accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
            
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6 w-max border border-blue-100">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(conf.date).toLocaleString("en-US", { month: "short", year: "numeric" })}</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-4 line-clamp-2 leading-snug">
              {conf.name}
            </h2>
            
            <div className="space-y-3 flex-grow">
              <div className="flex items-start text-slate-600 text-sm">
                <MapPin className="w-4 h-4 mr-2.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{conf.location}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center text-slate-500 text-sm font-medium">
                <Users className="w-4 h-4 mr-2" />
                {conf._count.attendees} {conf._count.attendees === 1 ? 'Scholar' : 'Scholars'}
              </div>
              <div className="flex items-center text-blue-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                Details <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ConferencesPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Conference Tracker</h1>
              <p className="text-sm text-slate-500">IIM PhD Alumni Network</p>
            </div>
          </div>
          <button className="hidden sm:inline-flex bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm">
            Suggest Event
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upcoming Events</h2>
          <p className="text-slate-500 mt-2 text-lg">Discover where scholars are gathering and plan your next meetup.</p>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-80 bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse flex flex-col p-8">
                <div className="w-24 h-6 bg-slate-100 rounded-full mb-6" />
                <div className="w-3/4 h-8 bg-slate-100 rounded-lg mb-4" />
                <div className="w-1/2 h-8 bg-slate-100 rounded-lg mb-8" />
                <div className="w-2/3 h-4 bg-slate-100 rounded mt-auto" />
              </div>
            ))}
          </div>
        }>
          <ConferenceList />
        </Suspense>
      </div>
    </div>
  );
}
