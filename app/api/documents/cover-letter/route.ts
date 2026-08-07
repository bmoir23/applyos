import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { generateCoverLetter } from "@/lib/services/documents";
import { generateCoverLetterInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, tone } = generateCoverLetterInputSchema.parse(
      await request.json(),
    );
    const appUser = await requireAppUser();
    const coverLetter = await generateCoverLetter(appUser.id, jobId, tone);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "cover_letter_generated",
      properties: { tone },
      sessionId: getPostHogSessionId(request.headers),
    });
    return Response.json(coverLetter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate cover letter",
      },
      { status: 500 },
    );
  }
}
