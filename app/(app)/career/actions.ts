"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import {
  createAchievement,
  createCompensationEntry,
  generate306090Plan,
} from "@/lib/services/milestones";

export type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const achievementSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  evidenceUrl: z.string().url().optional(),
});

const compensationSchema = z.object({
  title: z.string().min(1).max(255),
  amountCents: z.coerce.number().int().positive(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
});

function actionError<T = undefined>(error: unknown): ActionResult<T> {
  if (error instanceof z.ZodError) {
    return { success: false, error: "Invalid input" };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Something went wrong" };
}

export async function generate306090PlanAction(): Promise<
  ActionResult<{ milestoneId: string }>
> {
  try {
    const appUser = await requireAppUser();
    const milestone = await generate306090Plan(appUser.id);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "career_plan_generated",
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/career");
    return { success: true, data: { milestoneId: milestone.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function createAchievementAction(
  input: unknown,
): Promise<ActionResult<{ achievementId: string }>> {
  try {
    const values = achievementSchema.parse(input);
    const appUser = await requireAppUser();
    const achievement = await createAchievement(appUser.id, values);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "achievement_created",
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/career");
    return { success: true, data: { achievementId: achievement.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function createCompensationAction(
  input: unknown,
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const values = compensationSchema.parse(input);
    const appUser = await requireAppUser();
    const entry = await createCompensationEntry(appUser.id, values);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "compensation_entry_created",
      properties: { currency: values.currency ?? "USD" },
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/career");
    return { success: true, data: { entryId: entry.id } };
  } catch (error) {
    return actionError(error);
  }
}
