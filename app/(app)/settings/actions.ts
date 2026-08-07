"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { saveBaseResume } from "@/lib/services/resumes";
import { saveProfile } from "@/lib/services/users";
import { profileFormSchema } from "@/lib/validators";

export type SaveProfileResult = {
  success: boolean;
  error?: string;
};

export async function saveProfileAction(
  input: unknown,
): Promise<SaveProfileResult> {
  try {
    const values = profileFormSchema.parse(input);
    const appUser = await requireAppUser();

    await saveProfile(appUser.id, values);
    await saveBaseResume(appUser.id, values.baseResumeText);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "profile_saved",
      sessionId: getPostHogSessionId(await headers()),
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/resumes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save profile",
    };
  }
}
