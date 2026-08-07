import "server-only";

import { and, desc, eq } from "drizzle-orm";

import {
  agentEvents,
  applications,
  coverLetters,
  resumeVersions,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedJob } from "@/lib/services/jobs";
import { KANBAN_STAGE_LABELS, type KanbanStage } from "@/lib/kanban/stages";
import { ensureHiredMembership } from "@/lib/services/tribes";
import {
  applicationInputSchema,
  applicationUpdateSchema,
  kanbanStageSchema,
  type ApplicationUpdate,
} from "@/lib/validators";

async function assertApprovedResumeVersion(userId: string, versionId: string) {
  const version = await db.query.resumeVersions.findFirst({
    where: eq(resumeVersions.id, versionId),
    with: { resume: true },
  });
  if (
    !version ||
    version.resume.userId !== userId ||
    !version.userApprovedAt
  ) {
    throw new Error("Select an approved resume version");
  }
  return version;
}

export async function createApplication(
  userId: string,
  input: { jobId: string; resumeVersionId?: string },
) {
  const values = applicationInputSchema.parse(input);
  const job = await getOwnedJob(userId, values.jobId);
  if (!job) throw new Error("Job not found");
  if (values.resumeVersionId) {
    await assertApprovedResumeVersion(userId, values.resumeVersionId);
  }

  const [application] = await db
    .insert(applications)
    .values({
      userId,
      jobId: values.jobId,
      resumeVersionId: values.resumeVersionId,
      status: "interested",
    })
    .onConflictDoUpdate({
      target: [applications.userId, applications.jobId],
      set: {
        resumeVersionId: values.resumeVersionId,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!application) throw new Error("Unable to create application");

  await createAgentEvent({
    userId,
    jobId: values.jobId,
    applicationId: application.id,
    eventType: "user_action",
    summary: `Added ${job.title} to the application pipeline.`,
  });
  return application;
}

export async function listApplications(userId: string) {
  return db.query.applications.findMany({
    where: eq(applications.userId, userId),
    orderBy: [desc(applications.updatedAt)],
    with: {
      job: { with: { company: true } },
      resumeVersion: true,
      coverLetters: true,
    },
  });
}

export async function getOwnedApplication(
  userId: string,
  applicationId: string,
) {
  return db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, userId),
    ),
    with: {
      job: { with: { company: true } },
      resumeVersion: true,
      coverLetters: true,
      emailMessages: true,
      agentEvents: { orderBy: [desc(agentEvents.createdAt)] },
    },
  });
}

export async function updateApplication(
  userId: string,
  input: ApplicationUpdate,
) {
  const values = applicationUpdateSchema.parse(input);
  if (values.resumeVersionId) {
    await assertApprovedResumeVersion(userId, values.resumeVersionId);
  }
  const current = await getOwnedApplication(userId, values.applicationId);
  if (!current) throw new Error("Application not found");

  const [application] = await db
    .update(applications)
    .set({
      status: values.status,
      notes: values.notes ?? current.notes,
      followUpAt:
        values.followUpAt === undefined
          ? undefined
          : values.followUpAt === null
            ? null
            : new Date(values.followUpAt),
      resumeVersionId:
        values.resumeVersionId === undefined
          ? current.resumeVersionId
          : values.resumeVersionId,
      appliedAt:
        values.status === "applied" && !current.appliedAt
          ? new Date()
          : current.appliedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applications.id, values.applicationId),
        eq(applications.userId, userId),
      ),
    )
    .returning();
  if (!application) throw new Error("Application not found");

  await createAgentEvent({
    userId,
    jobId: application.jobId,
    applicationId: application.id,
    eventType: "user_action",
    summary: `Application status changed from ${current.status} to ${application.status}.`,
  });
  return application;
}

export async function attachCoverLetter(
  userId: string,
  applicationId: string,
  coverLetterId: string,
) {
  const application = await getOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const existing = await db.query.coverLetters.findFirst({
    where: and(
      eq(coverLetters.id, coverLetterId),
      eq(coverLetters.userId, userId),
    ),
  });
  if (!existing?.userApprovedAt) {
    throw new Error("Select an approved cover letter");
  }

  const [letter] = await db
    .update(coverLetters)
    .set({ applicationId, updatedAt: new Date() })
    .where(
      and(
        eq(coverLetters.id, coverLetterId),
        eq(coverLetters.userId, userId),
      ),
    )
    .returning();
  if (!letter) throw new Error("Cover letter not found");
  return letter;
}

export async function approveExternalSubmission(
  userId: string,
  applicationId: string,
) {
  const [application] = await db
    .update(applications)
    .set({
      userApprovedExternalSubmit: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
      ),
    )
    .returning();
  if (!application) throw new Error("Application not found");

  await createAgentEvent({
    userId,
    jobId: application.jobId,
    applicationId: application.id,
    eventType: "user_action",
    summary:
      "User approved an external submission step. ApplyOS did not submit anything.",
  });
  return application;
}

/**
 * Called when a user reaches the hired kanban stage or unlocks community access.
 * Ensures default tribe membership and user-level hire timestamps.
 */
export async function onUserHired(userId: string) {
  await db
    .update(users)
    .set({
      hiredAt: new Date(),
      communityUnlockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return ensureHiredMembership(userId);
}

export async function updateKanbanStage(
  userId: string,
  applicationId: string,
  stage: KanbanStage,
) {
  const parsedStage = kanbanStageSchema.parse(stage);
  const current = await getOwnedApplication(userId, applicationId);
  if (!current) {
    throw new Error("Application not found");
  }
  if (current.kanbanStage === parsedStage) {
    return current;
  }

  const now = new Date();
  const [application] = await db
    .update(applications)
    .set({
      kanbanStage: parsedStage,
      hiredAt: parsedStage === "hired" ? now : current.hiredAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
      ),
    )
    .returning();

  if (!application) {
    throw new Error("Application not found");
  }

  await createAgentEvent({
    userId,
    jobId: application.jobId,
    applicationId: application.id,
    eventType: "user_action",
    summary: `Moved ${current.job.title} to ${KANBAN_STAGE_LABELS[parsedStage]}.`,
    details: { previousStage: current.kanbanStage, nextStage: parsedStage },
  });

  if (parsedStage === "hired") {
    await onUserHired(userId);
  }

  return application;
}
