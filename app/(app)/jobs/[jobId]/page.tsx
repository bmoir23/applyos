import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { DocumentEditor } from "@/components/documents/document-editor";
import { ReviewWorkspace } from "@/components/hitl/review-workspace";
import { JobActions } from "@/components/jobs/job-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireOnboardedAppUser } from "@/lib/auth";
import { createOrGetPacket } from "@/lib/services/packets";
import { getOwnedJob } from "@/lib/services/jobs";
import { getPrimaryResume } from "@/lib/services/resumes";

export const metadata: Metadata = {
  title: "Job detail",
};

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { jobId } = await params;
  const { appUser } = await requireOnboardedAppUser();
  const [job, primaryResume] = await Promise.all([
    getOwnedJob(appUser.id, jobId),
    getPrimaryResume(appUser.id),
  ]);
  if (!job) notFound();

  const application = job.applications[0];
  const approvedResume =
    job.resumeVersions.find((version) => version.userApprovedAt) ??
    primaryResume?.versions.find((version) => version.userApprovedAt);

  const latestResume = job.resumeVersions[0];
  const latestCoverLetter = job.coverLetters[0];
  const hasDrafts = job.resumeVersions.length > 0 || job.coverLetters.length > 0;

  const packet =
    hasDrafts
      ? await createOrGetPacket(appUser.id, jobId, {
          resumeVersionId: latestResume?.id,
          coverLetterId: latestCoverLetter?.id,
        })
      : null;

  const jobMarkdown = [
    job.descriptionMarkdown,
    job.requirementsMarkdown &&
      `\n\n## Requirements\n\n${job.requirementsMarkdown}`,
    job.responsibilitiesMarkdown &&
      `\n\n## Responsibilities\n\n${job.responsibilitiesMarkdown}`,
  ]
    .filter(Boolean)
    .join("");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="outline">{job.status}</Badge>
            {job.remoteType && <Badge variant="secondary">{job.remoteType}</Badge>}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {job.company?.name ?? "Unknown company"}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/jobs" />} variant="outline">
            Back to jobs
          </Button>
          {job.applyUrl && (
            <Button
              render={
                <a href={job.applyUrl} target="_blank" rel="noreferrer" />
              }
            >
              Open application
            </Button>
          )}
        </div>
      </div>

      <JobActions
        jobId={job.id}
        applicationId={application?.id}
        approvedResumeVersionId={approvedResume?.id}
        resumeDrafts={job.resumeVersions.map((version) => ({
          id: version.id,
          label: version.versionLabel,
          approved: Boolean(version.userApprovedAt),
        }))}
        coverLetters={job.coverLetters.map((letter) => ({
          id: letter.id,
          label: letter.title,
          approved: Boolean(letter.userApprovedAt),
          attached: letter.applicationId === application?.id,
        }))}
      />

      {hasDrafts && (
        <ReviewWorkspace
          jobTitle={job.title}
          companyName={job.company?.name ?? "Unknown company"}
          jobMarkdown={jobMarkdown || "No job description available."}
          packetId={packet?.id}
          resume={
            latestResume
              ? {
                  documentType: "resume",
                  documentId: latestResume.id,
                  title: latestResume.versionLabel,
                  markdown: latestResume.contentMarkdown,
                  approved: Boolean(latestResume.userApprovedAt),
                  changeSummary: latestResume.changeSummary,
                }
              : undefined
          }
          coverLetter={
            latestCoverLetter
              ? {
                  documentType: "cover_letter",
                  documentId: latestCoverLetter.id,
                  title: latestCoverLetter.title,
                  markdown: latestCoverLetter.contentMarkdown,
                  approved: Boolean(latestCoverLetter.userApprovedAt),
                  changeSummary: latestCoverLetter.changeSummary,
                }
              : undefined
          }
        />
      )}

      {job.matchScore !== null ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Match analysis</CardTitle>
                <CardDescription>{job.matchRationale}</CardDescription>
              </div>
              <Badge>{job.matchPriority ?? "unranked"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Overall match</span>
                <strong>{job.matchScore}%</strong>
              </div>
              <Progress value={job.matchScore} />
            </div>
            <AnalysisList title="Strengths" values={job.matchStrengths} />
            <AnalysisList
              title="Required gaps"
              values={job.matchGapsRequired}
            />
            <AnalysisList
              title="Preferred gaps"
              values={job.matchGapsPreferred}
            />
            <AnalysisList
              title="Suggested improvements"
              values={job.suggestedResumeImprovements}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Not scored yet</CardTitle>
            <CardDescription>
              Score this job against your approved source profile and resume.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <MarkdownCard
          title="Job description"
          content={job.descriptionMarkdown}
        />
        <div className="flex flex-col gap-6">
          <MarkdownCard title="Requirements" content={job.requirementsMarkdown} />
          <MarkdownCard
            title="Responsibilities"
            content={job.responsibilitiesMarkdown}
          />
        </div>
      </div>

      {job.resumeVersions.map((version) => (
        <DocumentEditor
          key={version.id}
          documentType="resume"
          documentId={version.id}
          title={version.versionLabel}
          changeSummary={version.changeSummary}
          initialMarkdown={version.contentMarkdown}
          approved={Boolean(version.userApprovedAt)}
        />
      ))}
      {job.coverLetters.map((letter) => (
        <DocumentEditor
          key={letter.id}
          documentType="cover_letter"
          documentId={letter.id}
          title={letter.title}
          changeSummary={letter.changeSummary}
          initialMarkdown={letter.contentMarkdown}
          approved={Boolean(letter.userApprovedAt)}
        />
      ))}
    </div>
  );
}

function AnalysisList({
  title,
  values,
}: {
  title: string;
  values: string[] | null;
}) {
  if (!values?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function MarkdownCard({
  title,
  description,
  content,
}: {
  title: string;
  description?: string | null;
  content?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {content ? (
          <article className="text-sm leading-7">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">Not available.</p>
        )}
      </CardContent>
    </Card>
  );
}
