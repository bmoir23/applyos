import type { Metadata } from "next";
import Link from "next/link";

import { JobSourceForm } from "@/components/jobs/job-source-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import { listJobs, listJobSources } from "@/lib/services/jobs";

export const metadata: Metadata = {
  title: "Jobs",
};

export default async function JobsPage() {
  const { appUser } = await requireOnboardedAppUser();
  const [jobList, sources] = await Promise.all([
    listJobs(appUser.id),
    listJobSources(appUser.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles discovered from your approved sources. Review every posting
          before scoring or applying.
        </p>
      </div>

      <JobSourceForm />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active sources</CardDescription>
            <CardTitle>{sources.filter((source) => source.isActive).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Discovered roles</CardDescription>
            <CardTitle>{jobList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recommended</CardDescription>
            <CardTitle>
              {
                jobList.filter(
                  (job) =>
                    job.matchPriority === "high" ||
                    job.matchPriority === "medium",
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {jobList.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No jobs yet</CardTitle>
            <CardDescription>
              Add a public company career page above. Without a Firecrawl key,
              ApplyOS uses a clearly labeled deterministic mock result.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobList.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>
                      {job.company?.name ?? "Unknown company"}
                      {job.location ? ` · ${job.location}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{job.status}</Badge>
                    {job.matchScore !== null && (
                      <Badge>{job.matchScore}% match</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {job.descriptionMarkdown ?? "No description extracted."}
                </p>
                <Button
                  render={<Link href={`/jobs/${job.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
