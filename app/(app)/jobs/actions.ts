"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { createJobSource } from "@/lib/services/jobs";
import { jobSourceInputSchema } from "@/lib/validators";

export async function createJobSourceAction(input: unknown) {
  try {
    const values = jobSourceInputSchema.parse(input);
    const appUser = await requireAppUser();
    const source = await createJobSource(appUser.id, values);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "job_source_created",
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/jobs");
    return { success: true as const, jobSourceId: source.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to add source",
    };
  }
}
