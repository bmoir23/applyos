import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { resumeVersions, resumes } from "@/db/schema";
import { db } from "@/lib/db";

export async function getPrimaryResume(userId: string) {
  return db.query.resumes.findFirst({
    where: and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)),
    with: {
      versions: {
        orderBy: [desc(resumeVersions.createdAt)],
      },
    },
  });
}

export async function saveBaseResume(userId: string, contentMarkdown: string) {
  const content = contentMarkdown.trim();
  if (content.length < 100) {
    throw new Error("Base resume must contain at least 100 characters");
  }

  let resume = await db.query.resumes.findFirst({
    where: and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)),
  });

  if (!resume) {
    const [created] = await db
      .insert(resumes)
      .values({
        userId,
        title: "Base resume",
        isPrimary: true,
      })
      .returning();
    resume = created;
  }

  if (!resume) {
    throw new Error("Unable to create base resume");
  }

  const latestVersion = await db.query.resumeVersions.findFirst({
    where: eq(resumeVersions.resumeId, resume.id),
    orderBy: [desc(resumeVersions.createdAt)],
  });

  if (latestVersion?.contentMarkdown === content) {
    return latestVersion;
  }

  const [version] = await db
    .insert(resumeVersions)
    .values({
      resumeId: resume.id,
      versionLabel: latestVersion
        ? `Base resume v${await countResumeVersions(resume.id) + 1}`
        : "Base resume v1",
      contentMarkdown: content,
      changeSummary: latestVersion
        ? "Updated from profile settings."
        : "Initial resume imported during onboarding.",
      source: "manual",
      userApprovedAt: new Date(),
    })
    .returning();

  if (!version) {
    throw new Error("Unable to save resume version");
  }

  return version;
}

async function countResumeVersions(resumeId: string) {
  const versions = await db.query.resumeVersions.findMany({
    where: eq(resumeVersions.resumeId, resumeId),
    columns: { id: true },
  });
  return versions.length;
}
