import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { companies, jobs, jobSources } from "@/db/schema";
import { db } from "@/lib/db";
import {
  assertSafePublicUrl,
  extractJobsFromCareerPage,
} from "@/lib/firecrawl";
import { createAgentEvent } from "@/lib/services/agentEvents";
import {
  completeWorkflowRun,
  failWorkflowRun,
  startWorkflowRun,
} from "@/lib/services/workflows";
import {
  jobSourceInputSchema,
  type JobSourceInput,
} from "@/lib/validators";

export async function createJobSource(
  userId: string,
  input: JobSourceInput,
) {
  const values = jobSourceInputSchema.parse(input);
  await assertSafePublicUrl(values.sourceUrl);

  const [source] = await db
    .insert(jobSources)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [jobSources.userId, jobSources.sourceUrl],
      set: {
        label: values.label,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!source) {
    throw new Error("Unable to save job source");
  }
  return source;
}

export async function listJobSources(userId: string) {
  return db.query.jobSources.findMany({
    where: eq(jobSources.userId, userId),
    orderBy: [desc(jobSources.createdAt)],
  });
}

export async function listJobs(userId: string) {
  return db.query.jobs.findMany({
    where: eq(jobs.userId, userId),
    orderBy: [desc(jobs.discoveredAt)],
    with: { company: true },
    limit: 100,
  });
}

export async function getOwnedJob(userId: string, jobId: string) {
  return db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)),
    with: {
      company: true,
      jobSource: true,
      resumeVersions: {
        orderBy: (versions, { desc: orderDesc }) => [
          orderDesc(versions.createdAt),
        ],
      },
      coverLetters: {
        orderBy: (letters, { desc: orderDesc }) => [
          orderDesc(letters.createdAt),
        ],
      },
      applications: true,
    },
  });
}

type CrawlOptions = {
  workflowRunId?: string;
  workflowSource?: string;
};

export async function crawlJobSource(
  userId: string,
  jobSourceId: string,
  options: CrawlOptions = {},
) {
  const source = await db.query.jobSources.findFirst({
    where: and(
      eq(jobSources.id, jobSourceId),
      eq(jobSources.userId, userId),
    ),
  });
  if (!source) {
    throw new Error("Job source not found");
  }

  const workflowRunId =
    options.workflowRunId ??
    (
      await startWorkflowRun({
        userId,
        source: options.workflowSource ?? "app",
        eventType: "crawl_source",
        inputPayload: { jobSourceId },
      })
    ).run.id;

  try {
    const extraction = await extractJobsFromCareerPage(source.sourceUrl);
    const jobIds: string[] = [];

    for (const extracted of extraction.jobs.slice(0, 50)) {
      const companyUrl = new URL(extracted.sourceUrl).origin;
      const [company] = await db
        .insert(companies)
        .values({
          name: extracted.companyName,
          websiteUrl: companyUrl,
        })
        .onConflictDoUpdate({
          target: companies.websiteUrl,
          set: {
            name: extracted.companyName,
            updatedAt: new Date(),
          },
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          userId,
          companyId: company?.id,
          jobSourceId,
          externalId: extracted.externalId,
          title: extracted.title,
          location: extracted.location,
          remoteType: extracted.remoteType,
          employmentType: extracted.employmentType,
          descriptionMarkdown: extracted.descriptionMarkdown,
          requirementsMarkdown: extracted.requirementsMarkdown,
          responsibilitiesMarkdown: extracted.responsibilitiesMarkdown,
          sourceUrl: extracted.sourceUrl,
          applyUrl: extracted.applyUrl,
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          salaryCurrency: extracted.salaryCurrency ?? "USD",
          postedAt: parseOptionalDate(extracted.postedAt),
        })
        .onConflictDoUpdate({
          target: [jobs.userId, jobs.sourceUrl],
          set: {
            companyId: company?.id,
            jobSourceId,
            externalId: extracted.externalId,
            title: extracted.title,
            location: extracted.location,
            remoteType: extracted.remoteType,
            employmentType: extracted.employmentType,
            descriptionMarkdown: extracted.descriptionMarkdown,
            requirementsMarkdown: extracted.requirementsMarkdown,
            responsibilitiesMarkdown: extracted.responsibilitiesMarkdown,
            applyUrl: extracted.applyUrl,
            salaryMin: extracted.salaryMin,
            salaryMax: extracted.salaryMax,
            salaryCurrency: extracted.salaryCurrency ?? "USD",
            postedAt: parseOptionalDate(extracted.postedAt),
            updatedAt: new Date(),
          },
        })
        .returning();

      if (job) {
        jobIds.push(job.id);
      }
    }

    await db
      .update(jobSources)
      .set({ lastCrawledAt: new Date(), updatedAt: new Date() })
      .where(eq(jobSources.id, source.id));

    await createAgentEvent({
      userId,
      workflowRunId,
      eventType: "crawl_source",
      summary: `Crawled ${source.label} and stored ${jobIds.length} jobs.`,
      details: {
        mode: extraction.mode,
        sourceUrl: source.sourceUrl,
        jobCount: jobIds.length,
      },
    });
    await completeWorkflowRun(workflowRunId, {
      jobIds,
      mode: extraction.mode,
    });

    return { jobIds, mode: extraction.mode };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Job crawl failed";
    await failWorkflowRun(workflowRunId, message);
    throw new Error(message);
  }
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}
