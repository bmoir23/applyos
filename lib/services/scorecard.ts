import "server-only";

import { eq } from "drizzle-orm";

import { userProfiles } from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import { scorecardMessages } from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getProfile } from "@/lib/services/users";
import {
  scorecardDataSchema,
  type ScorecardData,
} from "@/lib/validators";

export async function generateScorecard(userId: string): Promise<ScorecardData> {
  const profile = await getProfile(userId);
  if (!profile?.baseResumeText) {
    throw new Error("Add your base resume before generating a scorecard");
  }

  const generated = await generateStructured(
    scorecardDataSchema.omit({ generatedAt: true }),
    scorecardMessages({
      targetRoles: profile.targetRoles,
      targetLocations: profile.targetLocations,
      remotePreference: profile.remotePreference,
      skills: profile.skills,
      experienceSummary: profile.experienceSummary,
      workAuthorizationNotes: profile.workAuthorizationNotes,
      baseResumeText: profile.baseResumeText,
      nonNegotiables: profile.nonNegotiables ?? [],
      applicationPreferences: profile.applicationPreferences,
      linkedinUrl: profile.linkedinUrl,
    }),
  );

  const scorecard: ScorecardData = {
    ...generated,
    generatedAt: new Date().toISOString(),
  };

  const [updated] = await db
    .update(userProfiles)
    .set({
      scorecardData: scorecard,
      nonNegotiables: generated.nonNegotiables,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning();

  if (!updated) {
    throw new Error("Unable to store scorecard");
  }

  await createAgentEvent({
    userId,
    eventType: "profile_ingest",
    summary: `Generated career scorecard with ${generated.competencies.length} competencies.`,
    details: {
      action: "generate_scorecard",
      matchThreshold: generated.matchThreshold,
      confidence: generated.confidence,
      skillGapCount: generated.skillGaps.length,
    },
  });

  return scorecard;
}
