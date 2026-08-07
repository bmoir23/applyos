"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { decideApproval } from "@/lib/services/approvals";
import type { ActionResult } from "@/app/(app)/applications/actions";

const decideApprovalSchema = z.object({
  approvalId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  rationale: z.string().max(2_000).optional(),
});

export async function decideApprovalAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const values = decideApprovalSchema.parse(input);
    const appUser = await requireAppUser();
    await decideApproval({
      userId: appUser.id,
      approvalId: values.approvalId,
      decision: values.decision,
      rationale: values.rationale,
    });
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "approval_decided",
      properties: { decision: values.decision },
      sessionId: getPostHogSessionId(await headers()),
    });
    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

function actionError(error: unknown): ActionResult {
  return {
    success: false,
    error:
      error instanceof z.ZodError
        ? z.prettifyError(error)
        : error instanceof Error
          ? error.message
          : "Unable to complete action",
  };
}
