import type { Metadata } from "next";
import Link from "next/link";

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
import { listApplications } from "@/lib/services/applications";
import type { ApplicationStatus } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Applications",
};

const activeStatuses: ApplicationStatus[] = [
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "assessment",
  "offer",
];

export default async function ApplicationsPage() {
  const { appUser } = await requireOnboardedAppUser();
  const applicationList = await listApplications(appUser.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual-first tracking from interest through outcome. ApplyOS never
          submits an application from this dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PipelineCount
          label="Active"
          value={
            applicationList.filter((item) =>
              activeStatuses.includes(item.status),
            ).length
          }
        />
        <PipelineCount
          label="Interviewing"
          value={
            applicationList.filter((item) => item.status === "interviewing")
              .length
          }
        />
        <PipelineCount
          label="Offers"
          value={
            applicationList.filter((item) => item.status === "offer").length
          }
        />
      </div>

      {applicationList.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No applications yet</CardTitle>
            <CardDescription>
              Review a job and add it to your pipeline when you are interested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/jobs" />}>Browse jobs</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applicationList.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{application.job.title}</CardTitle>
                    <CardDescription>
                      {application.job.company?.name ?? "Unknown company"}
                    </CardDescription>
                  </div>
                  <Badge>{application.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {application.followUpAt
                    ? `Follow up ${application.followUpAt.toLocaleString()}`
                    : "No follow-up scheduled"}
                </p>
                <Button
                  render={<Link href={`/applications/${application.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineCount({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
