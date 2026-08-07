import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import {
  approveCoverLetter,
  approveResumeVersion,
} from "@/lib/services/documents";
import { approveDocumentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = approveDocumentSchema.parse(await request.json());
    const appUser = await requireAppUser();
    const document =
      input.documentType === "resume"
        ? await approveResumeVersion(appUser.id, input.documentId)
        : await approveCoverLetter(appUser.id, input.documentId);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "document_approved",
      properties: { document_type: input.documentType },
      sessionId: getPostHogSessionId(request.headers),
    });
    return Response.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to approve document",
      },
      { status: 500 },
    );
  }
}
