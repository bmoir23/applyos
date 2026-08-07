import type { Metadata } from "next";
import Link from "next/link";

import { FeatureGate } from "@/components/feature-gate";
import { KanbanBoard } from "@/components/kanban/board";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/env";
import { KANBAN_STAGE_LABELS } from "@/lib/kanban/stages";
import { listApplications } from "@/lib/services/applications";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const { appUser } = await requireOnboardedAppUser();
  const applicationList = await listApplications(appUser.id);
  const kanbanEnabled = isFeatureEnabled("kanban");

  const kanbanApplications = applicationList.map((application) => ({
    id: application.id,
    title: application.job.title,
    companyName: application.job.company?.name ?? "Unknown company",
    kanbanStage: application.kanbanStage,
    followUpAt: application.followUpAt?.toISOString() ?? null,
  }));

  const activeCount = applicationList.filter(
    (application) =>
      application.kanbanStage !== "rejected_closed" &&
      application.kanbanStage !== "hired",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {kanbanEnabled
              ? "Kanban pipeline from application through outcome. ApplyOS never submits on your behalf from this board."
              : "Track applications in list view while the Kanban flag is off."}
          </p>
        </div>
        <Button render={<Link href="/jobs" />} variant="outline">
          Browse jobs
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PipelineCount label="Active" value={activeCount} />
        <PipelineCount
          label="Interviewing"
          value={
            applicationList.filter(
              (application) =>
                application.kanbanStage === "interview_scheduled" ||
                application.kanbanStage === "interview_completed",
            ).length
          }
        />
        <PipelineCount
          label="Hired"
          value={
            applicationList.filter(
              (application) => application.kanbanStage === "hired",
            ).length
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
        <>
          {kanbanEnabled ? (
            <FeatureGate
              flag="kanban"
              title="Kanban unavailable"
              description="Enable the kanban feature flag to use the board."
            >
              <KanbanBoard applications={kanbanApplications} />
            </FeatureGate>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>List view</CardTitle>
              <CardDescription>
                Open any application for documents, correspondence, and notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {applicationList.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{application.job.title}</p>
                    <p className="text-muted-foreground">
                      {application.job.company?.name ?? "Unknown company"} ·{" "}
                      {KANBAN_STAGE_LABELS[application.kanbanStage]}
                    </p>
                  </div>
                  <Button
                    render={
                      <Link href={`/applications/${application.id}`} />
                    }
                    variant="outline"
                    size="sm"
                  >
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
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
