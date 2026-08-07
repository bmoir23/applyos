import "server-only";

import { and, asc, cosineDistance, eq, isNotNull, sql } from "drizzle-orm";

import { jobs, userProfiles, type jobs as jobsTable } from "@/db/schema";
import {
  embedTexts,
  hashEmbeddingSource,
} from "@/lib/ai/embeddings";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedJob } from "@/lib/services/jobs";
import {
  computeBadges,
  MATCH_BADGE_RULE_VERSION,
} from "@/lib/services/matchingBadges";
import { getProfile } from "@/lib/services/users";

export { computeBadges, MATCH_BADGE_RULE_VERSION };

function normalizeEmbeddingVector(
  value: number[] | string | null | undefined,
): number[] {
  if (!value) {
    throw new Error("Embedding vector is missing");
  }

  if (Array.isArray(value)) {
    return value;
  }

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "number")) {
    throw new Error("Embedding vector has an invalid format");
  }

  return parsed;
}

function buildProfileEmbeddingContent(profile: {
  targetRoles: string[];
  skills: string[];
  experienceSummary: string | null;
  baseResumeText: string | null;
}): string {
  const sections = [
    profile.targetRoles.length > 0
      ? `Target roles: ${profile.targetRoles.join(", ")}`
      : null,
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(", ")}` : null,
    profile.experienceSummary ? `Summary: ${profile.experienceSummary}` : null,
    profile.baseResumeText ? `Resume:\n${profile.baseResumeText}` : null,
  ].filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    throw new Error("Profile does not contain enough content to embed");
  }

  return sections.join("\n\n");
}

function buildJobEmbeddingContent(job: {
  title: string;
  descriptionMarkdown: string | null;
  requirementsMarkdown: string | null;
  responsibilitiesMarkdown: string | null;
  company?: { name: string } | null;
}): string {
  const sections = [
    `Title: ${job.title}`,
    job.company?.name ? `Company: ${job.company.name}` : null,
    job.descriptionMarkdown ? `Description:\n${job.descriptionMarkdown}` : null,
    job.requirementsMarkdown
      ? `Requirements:\n${job.requirementsMarkdown}`
      : null,
    job.responsibilitiesMarkdown
      ? `Responsibilities:\n${job.responsibilitiesMarkdown}`
      : null,
  ].filter((section): section is string => Boolean(section));

  if (sections.length <= 1) {
    throw new Error("Job does not contain enough content to embed");
  }

  return sections.join("\n\n");
}

export async function embedAndStoreProfile(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) {
    throw new Error("Profile not found");
  }

  const content = buildProfileEmbeddingContent(profile);
  const contentHash = hashEmbeddingSource(content);

  if (
    profile.embeddingContentHash === contentHash &&
    profile.profileEmbedding
  ) {
    return profile;
  }

  const [embedding] = await embedTexts([content]);
  if (!embedding) {
    throw new Error("Embedding provider returned no vector");
  }

  const [updated] = await db
    .update(userProfiles)
    .set({
      profileEmbedding: embedding,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingPooling: env.EMBEDDING_POOLING,
      embeddingContentHash: contentHash,
      embeddedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning();

  if (!updated) {
    throw new Error("Unable to store profile embedding");
  }

  await createAgentEvent({
    userId,
    eventType: "embed_profile",
    summary: "Stored a fresh profile embedding for semantic matching.",
    details: {
      contentHash,
      badgeRuleVersion: MATCH_BADGE_RULE_VERSION,
    },
  });

  return updated;
}

export async function embedAndStoreJob(userId: string, jobId: string) {
  const job = await getOwnedJob(userId, jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const content = buildJobEmbeddingContent(job);
  const contentHash = hashEmbeddingSource(content);

  if (job.embeddingContentHash === contentHash && job.jobEmbedding) {
    return job;
  }

  const [embedding] = await embedTexts([content]);
  if (!embedding) {
    throw new Error("Embedding provider returned no vector");
  }

  const [updated] = await db
    .update(jobs)
    .set({
      jobEmbedding: embedding,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingPooling: env.EMBEDDING_POOLING,
      embeddingContentHash: contentHash,
      embeddedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Unable to store job embedding");
  }

  await createAgentEvent({
    userId,
    jobId,
    eventType: "embed_job",
    summary: `Stored a fresh embedding for ${job.title}.`,
    details: {
      contentHash,
      badgeRuleVersion: MATCH_BADGE_RULE_VERSION,
    },
  });

  return updated;
}

type RankedJob = typeof jobsTable.$inferSelect & {
  semanticScore: number;
  cosineDistance: number;
  matchBadges: string[];
};

export async function rankJobsForUser(
  userId: string,
  limit = 50,
): Promise<RankedJob[]> {
  const profile = await getProfile(userId);
  if (!profile?.profileEmbedding) {
    throw new Error("Profile embedding not found. Embed your profile first.");
  }

  const profileVector = normalizeEmbeddingVector(profile.profileEmbedding);
  const distanceExpr = cosineDistance(jobs.jobEmbedding, profileVector);

  const rows = await db
    .select({
      job: jobs,
      distance: sql<number>`${distanceExpr}`.as("distance"),
    })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), isNotNull(jobs.jobEmbedding)))
    .orderBy(asc(distanceExpr))
    .limit(limit);

  const rankedJobs: RankedJob[] = [];

  for (const row of rows) {
    const semanticScore = Math.round((1 - row.distance) * 100);
    const matchBadges = computeBadges({
      semanticScore,
      matchScore: row.job.matchScore,
      requiredGapCount: row.job.matchGapsRequired?.length ?? 0,
      preferredGapCount: row.job.matchGapsPreferred?.length ?? 0,
      priority: row.job.matchPriority,
    });

    const [updated] = await db
      .update(jobs)
      .set({
        semanticScore,
        cosineDistance: row.distance,
        matchBadges,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, row.job.id), eq(jobs.userId, userId)))
      .returning();

    if (updated) {
      rankedJobs.push({
        ...updated,
        semanticScore,
        cosineDistance: row.distance,
        matchBadges,
      });
    }
  }

  return rankedJobs;
}
