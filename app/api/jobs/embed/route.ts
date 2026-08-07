import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/env";
import { embedAndStoreJob } from "@/lib/services/matching";
import { scoreJobInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFeatureEnabled("semantic_matching")) {
    return Response.json(
      { error: "semantic_matching feature is disabled" },
      { status: 403 },
    );
  }

  try {
    const { jobId } = scoreJobInputSchema.parse(await request.json());
    const appUser = await requireAppUser();
    await embedAndStoreJob(appUser.id, jobId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid embed request", issues: error.issues },
        { status: 400 },
      );
    }
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to embed job",
      },
      { status: 500 },
    );
  }
}
