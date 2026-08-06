import "server-only";

import { and, eq } from "drizzle-orm";

import { coverLetters, resumeVersions } from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import {
  coverLetterMessages,
  tailoredResumeMessages,
} from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedJob } from "@/lib/services/jobs";
import { getPrimaryResume } from "@/lib/services/resumes";
import { getProfile } from "@/lib/services/users";
import { generatedDocumentSchema } from "@/lib/validators";

async function getGenerationContext(userId: string, jobId: string) {
  const [profile, job] = await Promise.all([
    getProfile(userId),
    getOwnedJob(userId, jobId),
  ]);
  if (!profile?.baseResumeText) {
    throw new Error("Complete your profile and base resume first");
  }
  if (!job) throw new Error("Job not found");

  return {
    profile: {
      targetRoles: profile.targetRoles,
      targetLocations: profile.targetLocations,
      remotePreference: profile.remotePreference,
      skills: profile.skills,
      experienceSummary: profile.experienceSummary,
      workAuthorizationNotes: profile.workAuthorizationNotes,
      baseResumeText: profile.baseResumeText,
    },
    job: {
      title: job.title,
      companyName: job.company?.name ?? "Unknown company",
      location: job.location,
      remoteType: job.remoteType,
      description: job.descriptionMarkdown,
      requirements: job.requirementsMarkdown,
      responsibilities: job.responsibilitiesMarkdown,
    },
  };
}

export async function generateTailoredResume(userId: string, jobId: string) {
  const [context, primaryResume] = await Promise.all([
    getGenerationContext(userId, jobId),
    getPrimaryResume(userId),
  ]);
  if (!primaryResume) throw new Error("Base resume not found");

  const result = await generateStructured(
    generatedDocumentSchema,
    tailoredResumeMessages(context.profile, context.job),
  );
  const [version] = await db
    .insert(resumeVersions)
    .values({
      resumeId: primaryResume.id,
      jobId,
      versionLabel: `${context.job.title} tailored draft`,
      contentMarkdown: result.markdown,
      changeSummary: result.changeSummary,
      source: "ai_tailored",
    })
    .returning();
  if (!version) throw new Error("Unable to store tailored resume");

  await createAgentEvent({
    userId,
    jobId,
    eventType: "generate_resume",
    summary: `Generated an unapproved tailored resume for ${context.job.title}.`,
    details: { resumeVersionId: version.id },
  });
  return version;
}

export async function generateCoverLetter(
  userId: string,
  jobId: string,
  tone: string,
) {
  const context = await getGenerationContext(userId, jobId);
  const result = await generateStructured(
    generatedDocumentSchema,
    coverLetterMessages(context.profile, context.job, tone),
  );
  const [letter] = await db
    .insert(coverLetters)
    .values({
      userId,
      jobId,
      title: `${context.job.title} cover letter`,
      tone,
      contentMarkdown: result.markdown,
      changeSummary: result.changeSummary,
    })
    .returning();
  if (!letter) throw new Error("Unable to store cover letter");

  await createAgentEvent({
    userId,
    jobId,
    eventType: "generate_cover_letter",
    summary: `Generated an unapproved cover letter for ${context.job.title}.`,
    details: { coverLetterId: letter.id, tone },
  });
  return letter;
}

export async function approveResumeVersion(
  userId: string,
  resumeVersionId: string,
) {
  const version = await db.query.resumeVersions.findFirst({
    where: eq(resumeVersions.id, resumeVersionId),
    with: { resume: true },
  });
  if (!version || version.resume.userId !== userId) {
    throw new Error("Resume version not found");
  }

  const [approved] = await db
    .update(resumeVersions)
    .set({ userApprovedAt: new Date(), updatedAt: new Date() })
    .where(eq(resumeVersions.id, resumeVersionId))
    .returning();
  if (!approved) throw new Error("Unable to approve resume");
  return approved;
}

export async function approveCoverLetter(
  userId: string,
  coverLetterId: string,
) {
  const [approved] = await db
    .update(coverLetters)
    .set({ userApprovedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(coverLetters.id, coverLetterId),
        eq(coverLetters.userId, userId),
      ),
    )
    .returning();
  if (!approved) throw new Error("Cover letter not found");
  return approved;
}

export async function updateResumeDraft(
  userId: string,
  resumeVersionId: string,
  markdown: string,
) {
  const version = await db.query.resumeVersions.findFirst({
    where: eq(resumeVersions.id, resumeVersionId),
    with: { resume: true },
  });
  if (!version || version.resume.userId !== userId) {
    throw new Error("Resume version not found");
  }

  const [updated] = await db
    .update(resumeVersions)
    .set({
      contentMarkdown: markdown,
      userApprovedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(resumeVersions.id, resumeVersionId))
    .returning();
  if (!updated) throw new Error("Unable to update resume draft");
  return updated;
}

export async function updateCoverLetterDraft(
  userId: string,
  coverLetterId: string,
  markdown: string,
) {
  const [updated] = await db
    .update(coverLetters)
    .set({
      contentMarkdown: markdown,
      userApprovedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(coverLetters.id, coverLetterId),
        eq(coverLetters.userId, userId),
      ),
    )
    .returning();
  if (!updated) throw new Error("Cover letter not found");
  return updated;
}
