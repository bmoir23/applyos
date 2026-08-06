import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { scoreJob } from "@/lib/services/scoring";
import { scoreJobInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = scoreJobInputSchema.parse(await request.json());
    const appUser = await requireAppUser();
    return Response.json(await scoreJob(appUser.id, jobId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid scoring request", issues: error.issues },
        { status: 400 },
      );
    }
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to score job",
      },
      { status: 500 },
    );
  }
}
