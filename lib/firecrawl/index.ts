import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { Firecrawl } from "firecrawl";
import { z } from "zod";

import { env } from "@/lib/env";
import { isBlockedHostname, isPrivateAddress } from "@/lib/url-safety";

const extractedJobSchema = z.object({
  companyName: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().optional(),
  remoteType: z.string().trim().optional(),
  employmentType: z.string().trim().optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().trim().length(3).optional(),
  descriptionMarkdown: z.string().trim().optional(),
  requirementsMarkdown: z.string().trim().optional(),
  responsibilitiesMarkdown: z.string().trim().optional(),
  sourceUrl: z.url(),
  applyUrl: z.url().optional(),
  externalId: z.string().trim().optional(),
  postedAt: z.string().trim().optional(),
});

const extractionSchema = z.object({
  jobs: z.array(extractedJobSchema).max(50),
});

export type ExtractedJob = z.infer<typeof extractedJobSchema>;

export async function extractJobsFromCareerPage(
  sourceUrl: string,
): Promise<{ jobs: ExtractedJob[]; mode: "live" | "mock" }> {
  await assertSafePublicUrl(sourceUrl);

  if (!env.FIRECRAWL_API_KEY) {
    return {
      mode: "mock",
      jobs: [createMockJob(sourceUrl)],
    };
  }

  const firecrawl = new Firecrawl({
    apiKey: env.FIRECRAWL_API_KEY,
    timeoutMs: 30_000,
    maxRetries: 2,
  });
  const document = await firecrawl.scrape(sourceUrl, {
    onlyMainContent: true,
    timeout: 25_000,
    formats: [
      "markdown",
      {
        type: "json",
        schema: extractionSchema,
        prompt:
          "Extract only real job postings visible on this career page. Return no more than 50 jobs. Preserve source and application URLs. Do not invent salary, requirements, responsibilities, or dates.",
      },
    ],
  });

  const parsed = extractionSchema.safeParse(document.json);
  if (!parsed.success) {
    throw new Error("Firecrawl returned an invalid job extraction");
  }

  return { jobs: parsed.data.jobs, mode: "live" };
}

export async function assertSafePublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }
  if (
    url.username ||
    url.password ||
    isBlockedHostname(url.hostname)
  ) {
    throw new Error("Private or authenticated URLs are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const directIp = isIP(hostname) ? [hostname] : [];
  const resolved = directIp.length
    ? directIp
    : (await lookup(hostname, { all: true })).map((entry) => entry.address);

  if (resolved.length === 0 || resolved.some(isPrivateAddress)) {
    throw new Error("The URL must resolve to a public internet address");
  }
}

function createMockJob(sourceUrl: string): ExtractedJob {
  const url = new URL(sourceUrl);
  return {
    companyName: hostnameToCompany(url.hostname),
    title: "Example role from mock extraction",
    location: "Remote",
    remoteType: "remote",
    employmentType: "full-time",
    descriptionMarkdown:
      "Mock job generated because `FIRECRAWL_API_KEY` is not configured.",
    requirementsMarkdown:
      "- Review this mock record before enabling live crawling.",
    responsibilitiesMarkdown:
      "- Demonstrate the complete ingestion and tracking workflow.",
    sourceUrl: `${url.origin}${url.pathname}#applyos-mock-job`,
    applyUrl: sourceUrl,
    externalId: "applyos-mock-job",
  };
}

function hostnameToCompany(hostname: string) {
  const segment = hostname.replace(/^www\./, "").split(".")[0] ?? "Company";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
