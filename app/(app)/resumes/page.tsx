import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import { getPrimaryResume } from "@/lib/services/resumes";

export const metadata: Metadata = {
  title: "Resumes",
};

export default async function ResumesPage() {
  const appUser = await requireAppUser();
  const resume = await getPrimaryResume(appUser.id);
  const latest = resume?.versions[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your approved base resume and tailored role-specific versions.
          </p>
        </div>
        <Button render={<Link href="/settings" />} variant="outline">
          Edit source profile
        </Button>
      </div>

      {!latest ? (
        <Card>
          <CardHeader>
            <CardTitle>Add your base resume</CardTitle>
            <CardDescription>
              Complete your profile before generating tailored documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/onboarding" />}>
              Complete onboarding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card>
            <CardHeader>
              <CardTitle>{latest.versionLabel}</CardTitle>
              <CardDescription>{latest.changeSummary}</CardDescription>
            </CardHeader>
            <CardContent>
              <article className="prose prose-neutral max-w-none text-sm leading-7 dark:prose-invert">
                <ReactMarkdown>{latest.contentMarkdown}</ReactMarkdown>
              </article>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Version history</CardTitle>
              <CardDescription>
                New edits and tailored drafts remain separate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {resume?.versions.map((version) => (
                  <li key={version.id} className="text-sm">
                    <p className="font-medium">{version.versionLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {version.createdAt.toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
