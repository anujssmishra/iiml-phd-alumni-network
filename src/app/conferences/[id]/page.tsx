import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MapPin, Calendar, ExternalLink, Users } from "lucide-react";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";

// We'll mock the session user ID for now since we haven't wired up the frontend NextAuth provider yet.
const MOCK_USER_ID = "cm21jksd0000008l41234abcd"; 

async function toggleRsvp(conferenceId: string, formData: FormData) {
  "use server";
  
  const existingRsvp = await prisma.conferenceAttendee.findUnique({
    where: {
      userId_conferenceId: {
        userId: MOCK_USER_ID,
        conferenceId: conferenceId,
      }
    }
  });

  if (existingRsvp) {
    // Leave conference
    await prisma.conferenceAttendee.delete({
      where: { id: existingRsvp.id }
    });
  } else {
    // Join conference
    await prisma.user.upsert({
      where: { id: MOCK_USER_ID },
      update: {},
      create: {
        id: MOCK_USER_ID,
        name: "Test Scholar",
        email: "scholar@iiml.ac.in",
        current_institution: "IIM Lucknow",
      }
    });

    await prisma.conferenceAttendee.create({
      data: {
        userId: MOCK_USER_ID,
        conferenceId: conferenceId,
        status: "attending",
      }
    });
  }

  revalidatePath(`/conferences/${conferenceId}`);
}

async function ConferenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conference = await prisma.conference.findUnique({
    where: { id },
    include: {
      attendees: {
        include: { user: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!conference) notFound();

  const isAttending = conference.attendees.some(a => a.userId === MOCK_USER_ID);
  const toggleRsvpAction = toggleRsvp.bind(null, conference.id);

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white pt-20 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <Link href="/conferences" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium">
            &larr; Back to all conferences
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">{conference.name}</h1>
              <div className="flex flex-wrap gap-4 text-slate-300">
                <div className="flex items-center bg-slate-800/50 rounded-full px-4 py-2 backdrop-blur-sm border border-slate-700/50">
                  <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                  <span className="font-medium">{new Date(conference.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex items-center bg-slate-800/50 rounded-full px-4 py-2 backdrop-blur-sm border border-slate-700/50">
                  <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                  <span className="font-medium">{conference.location}</span>
                </div>
              </div>
            </div>
            {conference.url && (
              <a href={conference.url} target="_blank" rel="noopener noreferrer" className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-900/20 flex items-center">
                Official Website <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Column: Description */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About this event</h2>
              <div className="prose prose-slate max-w-none prose-lg text-slate-600 leading-relaxed">
                {conference.description ? (
                  <p>{conference.description}</p>
                ) : (
                  <p className="italic text-slate-400">No description provided for this conference.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: RSVP Panel */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 sticky top-24">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-900">{conference.attendees.length}</h3>
                <p className="text-slate-500 font-medium mt-1 uppercase tracking-wide text-sm">Scholars Attending</p>
              </div>

              <form action={toggleRsvpAction} className="mt-8">
                <button 
                  type="submit"
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-sm ${
                    isAttending 
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200" 
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                  }`}
                >
                  {isAttending ? "Cancel RSVP" : "Count Me In"}
                </button>
              </form>
              {!isAttending && (
                <p className="text-center text-xs text-slate-400 mt-4">RSVP to unlock private messaging and coordination features.</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendee Roster Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Attendee Roster</h2>
            <div className="h-px bg-slate-200 flex-grow ml-6"></div>
          </div>

          {conference.attendees.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">No scholars have RSVP'd yet.</p>
              <p className="text-slate-400 mt-1">Be the first to say you're going!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conference.attendees.map((attendee) => (
                <div key={attendee.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    {attendee.user.name?.charAt(0) || "S"}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{attendee.user.name || "Anonymous Scholar"}</h3>
                    <p className="text-sm text-slate-500 truncate mt-0.5">{attendee.user.current_institution || "Institution not listed"}</p>
                    {attendee.user.research_domain && (
                      <span className="inline-block mt-3 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                        {attendee.user.research_domain}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const conferences = await prisma.conference.findMany({ select: { id: true } });
  return conferences.map((conf) => ({ id: conf.id }));
}

export default function ConferenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <Suspense fallback={<div className="py-20 text-center text-gray-500 animate-pulse">Loading conference details...</div>}>
        <ConferenceDetail params={params} />
      </Suspense>
    </div>
  );
}
