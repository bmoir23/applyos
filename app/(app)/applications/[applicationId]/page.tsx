import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { ApplicationEditor } from "@/components/applications/application-editor";
import { HiredCelebration } from "@/components/applications/hired-celebration";
import { EmailSuggestion } from "@/components/applications/email-suggestion";
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
import { KANBAN_STAGE_LABELS } from "@/lib/kanban/stages";
import { getOwnedApplication } from "@/lib/services/applications";

export const metadata: Metadata = {
  title: "Application detail",
};

type ApplicationDetailPageProps = {
  params: Promise<{ applicationId: string }>;
};

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { applicationId } = await params;
  const { appUser } = await requireOnboardedAppUser();
  const application = await getOwnedApplication(appUser.id, applicationId);
  if (!application) notFound();

  return (
    <div className="flex flex-col gap-6">
      {application.kanbanStage === "hired" && (
        <HiredCelebration
          jobTitle={application.job.title}
          companyName={application.job.company?.name ?? "Unknown company"}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{application.status}</Badge>
            <Badge variant="outline">
              {KANBAN_STAGE_LABELS[application.kanbanStage]}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {application.job.title}
          </h1>
          <p className="text-muted-foreground">
            {application.job.company?.name ?? "Unknown company"}
          </p>
        </div>
        <Button
          render={<Link href={`/jobs/${application.jobId}`} />}
          variant="outline"
        >
          View job
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          {application.resumeVersion && (
            <DocumentCard
              title={application.resumeVersion.versionLabel}
              description="Resume selected for this application"
              markdown={application.resumeVersion.contentMarkdown}
            />
          )}
          {application.coverLetters.map((letter) => (
            <DocumentCard
              key={letter.id}
              title={letter.title}
              description="Cover letter selected for this application"
              markdown={letter.contentMarkdown}
            />
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Correspondence</CardTitle>
              <CardDescription>
                AI classifications are suggestions until you approve them.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {application.emailMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No email messages have been linked.
                </p>
              ) : (
                application.emailMessages.map((message) => (
                  <div
                    key={message.id}
                    className="flex flex-col gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {message.subject ?? "No subject"}
                      </p>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {message.bodyText}
                      </p>
                    </div>
                    {message.classifiedStatus && (
                      <EmailSuggestion
                        emailMessageId={message.id}
                        suggestedStatus={message.classifiedStatus}
                        confidence={message.classificationConfidence}
                        applied={Boolean(message.statusSuggestionAppliedAt)}
                      />
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Transparent record of AI, workflow, and user actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {application.agentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded.
                </p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {application.agentEvents.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p>{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.createdAt.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Track application</CardTitle>
            <CardDescription>
              Changes are manual and always attributed to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationEditor
              applicationId={application.id}
              initialStatus={application.status}
              initialNotes={application.notes ?? ""}
              initialFollowUpAt={toLocalInputValue(application.followUpAt)}
              externalSubmissionApproved={
                application.userApprovedExternalSubmit
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function toLocalInputValue(value: Date | null): string {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function DocumentCard({
  title,
  description,
  markdown,
}: {
  title: string;
  description: string;
  markdown: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <article className="text-sm leading-7">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </CardContent>
    </Card>
  );
}
