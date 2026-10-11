"use server";

import { revalidatePath } from "next/cache";
import type { MemberActionState } from "@/components/member-action-form";
import { getSessionUserId } from "@/lib/session";
import { NetworkError, requestContact, respondContact } from "@/lib/member-service";

export async function requestContactAction(_previous: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: "Please sign in again before sending a request." };
    if (formData.get("shareReplyEmail") !== "on") return { error: "Confirm that your reply email may be shared after this request is accepted." };
    await requestContact(userId, {
      recipientId: String(formData.get("recipientId") ?? ""),
      message: String(formData.get("message") ?? ""),
      replyEmail: String(formData.get("replyEmail") ?? ""),
    });
    revalidatePath("/contacts");
    return { success: "Request sent. Your reply email will be shared with this member only if they accept." };
  } catch (error) {
    return { error: error instanceof NetworkError ? error.message : "We could not send your request. Please try again." };
  }
}

export async function respondContactAction(_previous: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: "Please sign in again before changing a request." };
    const status = String(formData.get("status") ?? "");
    if (status !== "accepted" && status !== "declined" && status !== "cancelled") return { error: "Choose a valid contact-request response." };
    await respondContact(userId, { requestId: String(formData.get("requestId") ?? ""), status });
    revalidatePath("/contacts");
    return { success: status === "accepted" ? "Request accepted. You can now see the sender’s reply email." : "Request closed. The reply email is no longer shared here." };
  } catch (error) {
    return { error: error instanceof NetworkError ? error.message : "We could not update your request. Please try again." };
  }
}
