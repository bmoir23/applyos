import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import {
  capturePostHogEvent,
  getPostHogSessionId,
} from "@/lib/posthog-server";
import { generateTailoredResume } from "@/lib/services/documents";
import { generateResumeInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = generateResumeInputSchema.parse(await request.json());
    const appUser = await requireAppUser();
    const resume = await generateTailoredResume(appUser.id, jobId);
    await capturePostHogEvent({
      distinctId: appUser.clerkUserId,
      event: "resume_generated",
      sessionId: getPostHogSessionId(request.headers),
    });
    return Response.json(resume);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate resume",
      },
      { status: 500 },
    );
  }
}
