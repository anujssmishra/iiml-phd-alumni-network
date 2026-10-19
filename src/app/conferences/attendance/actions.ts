"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { setAttendance } from "@/lib/member-service";
import { NetworkError, text } from "@/lib/validation";

export async function cancelOwnAttendanceAction(form: FormData) {
  let error: string | null = null;
  let id = "";
  try {
    id = text(form.get("conferenceId"), "Conference ID", 100, 1);
    await setAttendance(await getSessionUserId(), id, false);
  } catch (e) { error = e instanceof NetworkError ? e.message : "Unable to cancel your RSVP. Please try again."; }
  revalidatePath("/conferences/attendance");
  revalidatePath("/conferences");
  if (id) revalidatePath(`/conferences/${encodeURIComponent(id)}`);
  redirect(`/conferences/attendance?${error ? `error=${encodeURIComponent(error)}` : "saved=1"}`);
}
