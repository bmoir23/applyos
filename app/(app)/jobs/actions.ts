"use server";

import { revalidatePath } from "next/cache";

import { requireAppUser } from "@/lib/auth";
import { createJobSource } from "@/lib/services/jobs";
import { jobSourceInputSchema } from "@/lib/validators";

export async function createJobSourceAction(input: unknown) {
  try {
    const values = jobSourceInputSchema.parse(input);
    const appUser = await requireAppUser();
    const source = await createJobSource(appUser.id, values);
    revalidatePath("/jobs");
    return { success: true as const, jobSourceId: source.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to add source",
    };
  }
}
