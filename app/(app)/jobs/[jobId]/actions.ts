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
  updateCoverLetterDraft,
  updateResumeDraft,
} from "@/lib/services/documents";
import { updateDocumentSchema } from "@/lib/validators";

export async function updateDocumentAction(input: unknown): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const values = updateDocumentSchema.parse(input);
    const appUser = await requireAppUser();
    const document =
      values.documentType === "resume"
        ? await updateResumeDraft(
            appUser.id,
            values.documentId,
            values.markdown,
          )
        : await updateCoverLetterDraft(
            appUser.id,
            values.documentId,
            values.markdown,
          );
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "document_draft_updated",
      properties: { document_type: values.documentType },
      sessionId: getPostHogSessionId(await headers()),
    });
    if (document.jobId) revalidatePath(`/jobs/${document.jobId}`);
    revalidatePath("/resumes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? z.prettifyError(error)
          : error instanceof Error
            ? error.message
            : "Unable to update document",
    };
  }
}
