import "server-only";

import { and, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import { scoringMessages } from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedJob } from "@/lib/services/jobs";
import { getProfile } from "@/lib/services/users";
import { scoringResultSchema } from "@/lib/validators";

export async function scoreJob(userId: string, jobId: string) {
  const [profile, job] = await Promise.all([
    getProfile(userId),
    getOwnedJob(userId, jobId),
  ]);
  if (!profile?.baseResumeText) {
    throw new Error("Complete your profile and base resume before scoring");
  }
  if (!job) throw new Error("Job not found");

  const result = await generateStructured(
    scoringResultSchema,
    scoringMessages(
      {
        targetRoles: profile.targetRoles,
        targetLocations: profile.targetLocations,
        remotePreference: profile.remotePreference,
        skills: profile.skills,
        experienceSummary: profile.experienceSummary,
        workAuthorizationNotes: profile.workAuthorizationNotes,
        baseResumeText: profile.baseResumeText,
      },
      {
        title: job.title,
        companyName: job.company?.name ?? "Unknown company",
        location: job.location,
        remoteType: job.remoteType,
        description: job.descriptionMarkdown,
        requirements: job.requirementsMarkdown,
        responsibilities: job.responsibilitiesMarkdown,
      },
    ),
  );

  const [updated] = await db
    .update(jobs)
    .set({
      matchScore: result.score,
      matchStrengths: result.strengths,
      matchGapsRequired: result.requiredSkillGaps,
      matchGapsPreferred: result.preferredSkillGaps,
      matchPriority: result.priority,
      matchRationale: result.rationale,
      suggestedResumeImprovements: result.suggestedResumeImprovements,
      scoredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .returning();
  if (!updated) throw new Error("Unable to store match score");

  await createAgentEvent({
    userId,
    jobId,
    eventType: "score_job",
    summary: `Scored ${job.title} at ${result.score}/100 (${result.priority}).`,
    details: {
      score: result.score,
      priority: result.priority,
      requiredGapCount: result.requiredSkillGaps.length,
      preferredGapCount: result.preferredSkillGaps.length,
    },
  });

  return result;
}
