"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { submitConferenceSuggestion } from "@/lib/conference-service";
import { NetworkError } from "@/lib/validation";

export async function suggestConferenceAction(form: FormData) {
  const userId = await getSessionUserId();
  let error: string | null = null;

  try {
    const name = String(form.get("name") ?? "");
    const acronym = String(form.get("acronym") ?? "");
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const location = String(form.get("location") ?? "");
    const description = String(form.get("description") ?? "");
    const url = String(form.get("url") ?? "");

    await submitConferenceSuggestion(userId, {
      name,
      acronym,
      startDate,
      endDate,
      location,
      description,
      url,
      timezone: String(form.get("timezone") ?? "UTC"),
      cfpDeadline: String(form.get("cfpDeadline") ?? "") + String(form.get("cfpUtcOffset") ?? ""),
    });
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Unable to submit suggestion. Please check your inputs.";
  }

  revalidatePath("/conferences");
  revalidatePath("/conferences/suggest");
  redirect(`/conferences/suggest?${error ? "error=" + encodeURIComponent(error) : "saved=1"}`);
}
