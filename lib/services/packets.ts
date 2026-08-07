import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { applicationPackets } from "@/db/schema";
import { db } from "@/lib/db";
import { getOwnedJob } from "@/lib/services/jobs";

type CreatePacketOptions = {
  resumeVersionId?: string;
  coverLetterId?: string;
  promptInstructions?: string;
};

export async function createOrGetPacket(
  userId: string,
  jobId: string,
  options: CreatePacketOptions = {},
) {
  const job = await getOwnedJob(userId, jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const existing = await db.query.applicationPackets.findFirst({
    where: and(
      eq(applicationPackets.userId, userId),
      eq(applicationPackets.jobId, jobId),
    ),
    orderBy: [desc(applicationPackets.updatedAt)],
  });

  if (existing) {
    const hasUpdates =
      options.resumeVersionId !== undefined ||
      options.coverLetterId !== undefined ||
      options.promptInstructions !== undefined;

    if (!hasUpdates) {
      return existing;
    }

    const [updated] = await db
      .update(applicationPackets)
      .set({
        resumeVersionId:
          options.resumeVersionId ?? existing.resumeVersionId,
        coverLetterId: options.coverLetterId ?? existing.coverLetterId,
        promptInstructions:
          options.promptInstructions ?? existing.promptInstructions,
        updatedAt: new Date(),
      })
      .where(eq(applicationPackets.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error("Unable to update application packet");
    }
    return updated;
  }

  const [packet] = await db
    .insert(applicationPackets)
    .values({
      userId,
      jobId,
      resumeVersionId: options.resumeVersionId,
      coverLetterId: options.coverLetterId,
      promptInstructions: options.promptInstructions,
      status: "draft",
    })
    .returning();

  if (!packet) {
    throw new Error("Unable to create application packet");
  }
  return packet;
}

export async function getOwnedPacket(userId: string, packetId: string) {
  return db.query.applicationPackets.findFirst({
    where: and(
      eq(applicationPackets.id, packetId),
      eq(applicationPackets.userId, userId),
    ),
    with: {
      job: { with: { company: true } },
      resumeVersion: true,
      coverLetter: true,
      application: true,
    },
  });
}

export async function listPacketsForJob(userId: string, jobId: string) {
  const job = await getOwnedJob(userId, jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  return db.query.applicationPackets.findMany({
    where: and(
      eq(applicationPackets.userId, userId),
      eq(applicationPackets.jobId, jobId),
    ),
    orderBy: [desc(applicationPackets.updatedAt)],
    with: {
      resumeVersion: true,
      coverLetter: true,
      application: true,
    },
  });
}
