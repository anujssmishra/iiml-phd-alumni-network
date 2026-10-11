"use server";

import { revalidatePath } from "next/cache";
import { NetworkError, submitApplication } from "@/lib/member-service";
import { getSessionUserId } from "@/lib/session";

export type ApplicationState = { error?: string; success?: string };

export async function submitMembershipApplication(_previous: ApplicationState, formData: FormData): Promise<ApplicationState> {
  try {
    await submitApplication(await getSessionUserId(), {
      doctoralInstitution: formData.get("doctoralInstitution"),
      programme: formData.get("programme"),
      batchYear: formData.get("batchYear"),
      evidence: formData.get("evidence"),
    });
    revalidatePath("/membership");
    revalidatePath("/admin/members");
    return { success: "Application saved. A membership reviewer will check the information you supplied." };
  } catch (error) {
    return { error: error instanceof NetworkError ? error.message : "Your application could not be saved. Please try again." };
  }
}
