import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/env";
import {
  ingestLinkedInProfile,
  ingestResumeText,
  summarizeProfile,
} from "@/lib/services/profile-ingestion";
import { getProfile } from "@/lib/services/users";
import { profileIngestInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFeatureEnabled("profile_ingestion")) {
    return Response.json(
      { error: "profile_ingestion feature is disabled" },
      { status: 403 },
    );
  }

  try {
    const body = profileIngestInputSchema.parse(await request.json());
    const appUser = await requireAppUser();

    if (body.source === "linkedin") {
      const { profile, extracted } = await ingestLinkedInProfile(
        appUser.id,
        body.linkedinUrl!,
      );
      return Response.json({
        profile: summarizeProfile(profile),
        ingestion: {
          source: body.source,
          mode: extracted.mode,
          fullName: extracted.fullName,
          skillCount: extracted.skills.length,
        },
      });
    }

    if (body.source === "resume_upload") {
      const profile = await ingestResumeText(appUser.id, body.resumeText!);
      return Response.json({
        profile: summarizeProfile(profile),
        ingestion: {
          source: body.source,
          characterCount: body.resumeText!.length,
        },
      });
    }

    const profile = await getProfile(appUser.id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return Response.json({
      profile: summarizeProfile(profile),
      ingestion: { source: body.source },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid profile ingest request", issues: error.issues },
        { status: 400 },
      );
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to ingest profile",
      },
      { status: 500 },
    );
  }
}
