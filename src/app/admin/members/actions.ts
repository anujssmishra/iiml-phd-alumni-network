"use server";

import { revalidatePath } from "next/cache";
import { NetworkError, reviewMembership } from "@/lib/member-service";
import { getSessionUserId } from "@/lib/session";

export type ReviewState = { error?: string; success?: string };

export async function reviewMember(_previous: ReviewState, formData: FormData): Promise<ReviewState> {
  try {
    await reviewMembership(await getSessionUserId(), {
      targetId: String(formData.get("targetId") ?? ""), status: String(formData.get("status") ?? ""),
      role: String(formData.get("role") ?? ""), reason: String(formData.get("reason") ?? ""),
      verificationMethod: String(formData.get("verificationMethod") ?? ""),
    });
    revalidatePath("/", "layout");
    return { success: "Membership decision saved. Access and directory visibility now follow the updated membership status." };
  } catch (error) {
    return { error: error instanceof NetworkError ? error.message : "The decision could not be saved. Please try again." };
  }
}
