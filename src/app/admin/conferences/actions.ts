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
} from "@/lib/conference-service";
import { fetchConferenceFromUrl } from "@/lib/conference-fetcher";
import {
  findExistingConferenceMatch,
  computeConferenceDiff,
  reconcileConferenceSync,
  ReconcileAction,
} from "@/lib/conference-sync";
import { NetworkError } from "@/lib/validation";

export async function createConferenceAction(form: FormData) {
  const userId = await getSessionUserId();
  let error: string | null = null;

  try {
    const name = String(form.get("name") ?? "");
    const acronym = String(form.get("acronym") ?? "");
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const timezone = String(form.get("timezone") ?? "UTC");
    const cfpDeadline = String(form.get("cfpDeadline") ?? "");
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
    });
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to create conference.";
  }

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
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
    const cfpDeadline = String(form.get("cfpDeadline") ?? "");
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
    });
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to update conference.";
  }

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
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

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
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

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
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

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "reviewed=1"}`);
}

export async function quickFetchConferenceAction(urlInput: string) {
  try {
    const extracted = await fetchConferenceFromUrl(urlInput);
    const match = await findExistingConferenceMatch(extracted);
    const diff = match ? computeConferenceDiff(match.conference, extracted) : null;

    return {
      success: true,
      extracted,
      match: match ? { matchType: match.matchType, conference: match.conference } : null,
      diff,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to fetch conference from URL.",
    };
  }
}

export async function applyQuickFetchAction(form: FormData) {
  const userId = await getSessionUserId();
  const action = String(form.get("reconcileAction") ?? "create_draft") as ReconcileAction;
  const targetConferenceId = form.get("targetConferenceId") ? String(form.get("targetConferenceId")) : undefined;

  const rawExtracted = String(form.get("extractedPayload") ?? "");
  let error: string | null = null;

  try {
    if (!rawExtracted) throw new NetworkError("Missing extracted conference payload.");
    const payload = JSON.parse(rawExtracted);

    const extracted = {
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      cfpDeadline: payload.cfpDeadline ? new Date(payload.cfpDeadline) : null,
    };

    await reconcileConferenceSync(userId, action, extracted, targetConferenceId);
  } catch (e) {
    error = e instanceof NetworkError ? e.message : "Failed to reconcile quick fetch.";
  }

  revalidatePath("/conferences");
  revalidatePath("/admin/conferences");
  redirect(`/admin/conferences?${error ? "error=" + encodeURIComponent(error) : "synced=1"}`);
}
