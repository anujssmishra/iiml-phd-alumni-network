"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { restoreConferenceRevision } from "@/lib/conference-service";
import { NetworkError, text } from "@/lib/validation";

export async function restoreConferenceRevisionAction(form: FormData) {
  const id = text(form.get("conferenceId"), "Conference ID", 100, 1);
  let error: string | null = null;
  try { await restoreConferenceRevision(await getSessionUserId(), id, text(form.get("revisionId"), "Version ID", 150, 1), text(form.get("changeReason"), "Change reason", 500, 10)); }
  catch (e) { error = e instanceof NetworkError ? e.message : "Unable to restore this version."; }
  revalidatePath("/admin/conferences"); revalidatePath("/conferences");
  revalidatePath(`/conferences/${encodeURIComponent(id)}`);
  revalidatePath(`/admin/conferences/${encodeURIComponent(id)}/history`);
  redirect(`/admin/conferences/${encodeURIComponent(id)}/history?${error ? `error=${encodeURIComponent(error)}` : "saved=1"}`);
}
