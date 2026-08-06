"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  approveExternalSubmission,
  attachCoverLetter,
  createApplication,
  updateApplication,
} from "@/lib/services/applications";
import { applyEmailStatusSuggestion } from "@/lib/services/emailMessages";
import {
  applicationInputSchema,
  applicationUpdateSchema,
  applyEmailSuggestionSchema,
} from "@/lib/validators";

export type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const values = applicationInputSchema.parse(input);
    const appUser = await requireAppUser();
    const application = await createApplication(appUser.id, values);
    revalidatePath("/applications");
    revalidatePath(`/jobs/${application.jobId}`);
    return { success: true, data: { applicationId: application.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateApplicationAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const values = applicationUpdateSchema.parse(input);
    const appUser = await requireAppUser();
    const application = await updateApplication(appUser.id, values);
    revalidatePath("/applications");
    revalidatePath(`/applications/${application.id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

const applicationIdSchema = z.object({ applicationId: z.uuid() });

export async function approveExternalSubmissionAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { applicationId } = applicationIdSchema.parse(input);
    const appUser = await requireAppUser();
    await approveExternalSubmission(appUser.id, applicationId);
    revalidatePath(`/applications/${applicationId}`);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

const attachCoverLetterSchema = z.object({
  applicationId: z.uuid(),
  coverLetterId: z.uuid(),
});

export async function attachCoverLetterAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const values = attachCoverLetterSchema.parse(input);
    const appUser = await requireAppUser();
    await attachCoverLetter(
      appUser.id,
      values.applicationId,
      values.coverLetterId,
    );
    revalidatePath(`/applications/${values.applicationId}`);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function applyEmailSuggestionAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { emailMessageId } = applyEmailSuggestionSchema.parse(input);
    const appUser = await requireAppUser();
    const application = await applyEmailStatusSuggestion(
      appUser.id,
      emailMessageId,
    );
    revalidatePath(`/applications/${application.id}`);
    revalidatePath("/applications");
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

function actionError<T = undefined>(error: unknown): ActionResult<T> {
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
