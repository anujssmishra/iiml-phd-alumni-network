"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { deleteAccount, NetworkError, saveProfile, withdrawProfile } from "@/lib/member-service";
import type { MemberActionState } from "@/components/member-action-form";

function refreshMemberPages() {
  revalidatePath("/profile");
  revalidatePath("/directory");
  revalidatePath("/contacts");
  revalidatePath("/conferences");
  revalidatePath("/conferences/[id]", "page");
}

function failure(error: unknown): MemberActionState {
  return { error: error instanceof NetworkError ? error.message : "We could not save this change. Please try again." };
}

export async function saveProfileAction(_previous: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: "Please sign in again before saving your profile." };
    const batch = formData.get("batchYear");
    await saveProfile(userId, {
      name: String(formData.get("name") ?? ""),
      currentInstitution: String(formData.get("currentInstitution") ?? ""),
      currentTitle: String(formData.get("currentTitle") ?? ""),
      doctoralInstitution: String(formData.get("doctoralInstitution") ?? ""),
      programme: String(formData.get("programme") ?? ""),
      batchYear: batch ? Number(batch) : null,
      researchDomain: String(formData.get("researchDomain") ?? ""),
      methods: formData.getAll("methods").map(String),
      directoryVisible: formData.get("directoryVisible") === "on",
      openToChat: formData.get("openToChat") === "on",
    });
    refreshMemberPages();
  } catch (error) {
    return failure(error);
  }
  redirect("/profile?saved=1");
}

export async function withdrawProfileAction(): Promise<MemberActionState> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: "Please sign in again before changing your profile." };
    await withdrawProfile(userId);
    refreshMemberPages();
  } catch (error) {
    return failure(error);
  }
  redirect("/profile?hidden=1");
}

export async function deleteAccountAction(_previous: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: "Please sign in again before deleting your account." };
    await deleteAccount(userId, String(formData.get("confirmation") ?? ""));
    refreshMemberPages();
    revalidatePath("/", "layout");
  } catch (error) {
    return failure(error);
  }
  redirect("/signin?deleted=1");
}
