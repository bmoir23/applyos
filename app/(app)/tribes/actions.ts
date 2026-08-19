"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { createTribePost } from "@/lib/services/tribes";

export type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const createPostSchema = z.object({
  tribeId: z.string().uuid(),
  tribeSlug: z.string().min(1),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
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

export async function createTribePostAction(
  input: unknown,
): Promise<ActionResult<{ postId: string }>> {
  try {
    const values = createPostSchema.parse(input);
    const appUser = await requireAppUser();
    const post = await createTribePost(
      appUser.id,
      values.tribeId,
      values.title,
      values.body,
    );
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "tribe_post_created",
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/tribes");
    revalidatePath(`/tribes/${values.tribeSlug}`);
    return { success: true, data: { postId: post.id } };
  } catch (error) {
    return actionError(error);
  }
}
