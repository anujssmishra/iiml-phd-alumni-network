"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import {
  createConference,
  updateConference,
  deleteConference,
  setPublicationState,
  reviewConferenceSuggestion,
  requireCurator,
} from "@/lib/conference-service";
import { NetworkError } from "@/lib/validation";
import { denyPilotIngestion } from "@/lib/conference-ingestion-policy";

function refreshConferencePages() {
  revalidatePath("/conferences");
  revalidatePath("/conferences/[id]", "page");
  revalidatePath("/conferences/attendance");
  revalidatePath("/admin/conferences");
}


export async function createConferenceAction(form: FormData) {
  const userId = await getSessionUserId();
  let error: string | null = null;

  try {
    const name = String(form.get("name") ?? "");
    const acronym = String(form.get("acronym") ?? "");
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const timezone = String(form.get("timezone") ?? "UTC");
    const cfpDeadline = String(form.get("cfpDeadline") ?? "") + String(form.get("cfpUtcOffset") ?? "");
    const location = String(form.get("location") ?? "");
    const description = String(form.get("description") ?? "");
    const url = String(form.get("url") ?? "");
    const sourceUrl = String(form.get("sourceUrl") ?? url);
    const publicationState = String(form.get("publicationState") ?? "draft");

    await createConference(userId, {
      name,
      acronym,
      startDate,
      endDate,
      timezone,
      cfpDeadline,
      location,
      description,
      url,
      sourceUrl,
      publicationState,
      changeReason: String(form.get("changeReason") ?? ""),
      reviewConfirmed: form.get("reviewConfirmed") === "on",
    });
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to create conference.";
  }

  refreshConferencePages();
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "created=1"}`);
}

export async function updateConferenceAction(form: FormData) {
  const userId = await getSessionUserId();
  const id = String(form.get("conferenceId") ?? "");
  let error: string | null = null;

  try {
    const name = String(form.get("name") ?? "");
    const acronym = String(form.get("acronym") ?? "");
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const timezone = String(form.get("timezone") ?? "UTC");
    const cfpDeadline = String(form.get("cfpDeadline") ?? "") + String(form.get("cfpUtcOffset") ?? "");
    const location = String(form.get("location") ?? "");
    const description = String(form.get("description") ?? "");
    const url = String(form.get("url") ?? "");
    const sourceUrl = String(form.get("sourceUrl") ?? url);
    const publicationState = String(form.get("publicationState") ?? "draft");

    await updateConference(userId, id, {
      name,
      acronym,
      startDate,
      endDate,
      timezone,
      cfpDeadline,
      location,
      description,
      url,
      sourceUrl,
      publicationState,
      changeReason: String(form.get("changeReason") ?? ""),
      reviewConfirmed: form.get("reviewConfirmed") === "on",
      expectedUpdatedAt: String(form.get("expectedUpdatedAt") ?? ""),
    });
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to update conference.";
  }

  refreshConferencePages();
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "updated=1"}`);
}

export async function setPublicationStateAction(form: FormData) {
  const userId = await getSessionUserId();
  const id = String(form.get("conferenceId") ?? "");
  const state = String(form.get("state") ?? "");

  let error: string | null = null;
  try {
    await setPublicationState(userId, id, state);
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to update publication state.";
  }

  refreshConferencePages();
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "updated=1"}`);
}

export async function deleteConferenceAction(form: FormData) {
  const userId = await getSessionUserId();
  const id = String(form.get("conferenceId") ?? "");

  let error: string | null = null;
  try {
    await deleteConference(userId, id);
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to delete conference.";
  }

  refreshConferencePages();
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "deleted=1"}`);
}

export async function reviewSuggestionAction(form: FormData) {
  const userId = await getSessionUserId();
  const suggestionId = String(form.get("suggestionId") ?? "");
  const decision = String(form.get("decision") ?? "");

  let error: string | null = null;
  try {
    if (decision === "approve_published") {
      await reviewConferenceSuggestion(userId, suggestionId, {
        status: "approved",
        publicationState: "published",
      });
    } else if (decision === "approve_draft") {
      await reviewConferenceSuggestion(userId, suggestionId, {
        status: "approved",
        publicationState: "draft",
      });
    } else if (decision === "reject") {
      await reviewConferenceSuggestion(userId, suggestionId, {
        status: "rejected",
      });
    } else {
      throw new NetworkError("Invalid decision choice.");
    }
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to review suggestion.";
  }

  refreshConferencePages();
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "reviewed=1"}`);
}

export async function quickFetchConferenceAction(urlInput: string) {
  void urlInput;
  try { await requireCurator(await getSessionUserId()); denyPilotIngestion(); }
  catch (error) { return { success: false, error: error instanceof NetworkError ? error.message : "Conference fetching is unavailable." }; }
}

export async function applyQuickFetchAction(form: FormData) {
  void form;
  let error = "Conference ingestion is unavailable.";
  try { await requireCurator(await getSessionUserId()); denyPilotIngestion(); }
  catch (e) { if (e instanceof NetworkError) error = e.message; }
  redirect(`/admin/conferences?error=${encodeURIComponent(error)}`);
}
