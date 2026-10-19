import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getConferenceDetail } from "@/lib/conference-service";
import { generateConferenceICal } from "@/lib/ical-generator";
import { NetworkError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getSessionUserId();

  let conference;
  try {
    conference = await getConferenceDetail(userId, id);
  } catch (error) {
    if (error instanceof NetworkError && error.status === 404) {
      return new Response("Conference not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    return new Response("Internal Server Error", { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }

  const ics = generateConferenceICal({
    id: conference.id,
    name: conference.name,
    acronym: conference.acronym,
    startDate: conference.startDate,
    endDate: conference.endDate,
    timezone: conference.timezone,
    location: conference.location,
    description: conference.description,
    url: conference.url || conference.sourceUrl,
    cfpDeadline: conference.cfpDeadline,
  });

  const slug = (conference.acronym || conference.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug || "conference"}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
