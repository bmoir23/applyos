import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileText, Send } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAppUserProfile, getCurrentUser } from "@/lib/auth";
import { listApplications } from "@/lib/services/applications";
import { listJobs } from "@/lib/services/jobs";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [user, { appUser, profile }] = await Promise.all([
    getCurrentUser(),
    getAppUserProfile(),
  ]);
  if (!profile.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  const [jobs, applications] = await Promise.all([
    listJobs(appUser.id),
    listApplications(appUser.id),
  ]);
  const firstName = user?.firstName ?? "there";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your career navigator hub. Review recommendations and keep your
          manual application pipeline current.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="size-4" />
              Jobs
            </CardTitle>
            <CardDescription>
              {jobs.length} discovered ·{" "}
              {
                jobs.filter((job) => job.matchPriority === "high").length
              }{" "}
              high priority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/jobs" />} variant="outline" size="sm">
              View jobs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4" />
              Applications
            </CardTitle>
            <CardDescription>
              {applications.length} tracked ·{" "}
              {
                applications.filter(
                  (application) => application.status === "interviewing",
                ).length
              }{" "}
              interviewing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/applications" />}
              variant="outline"
              size="sm"
            >
              View applications
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              Resumes
            </CardTitle>
            <CardDescription>
              Store your base resume, then generate tailored drafts later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/resumes" />}
              variant="outline"
              size="sm"
            >
              View resumes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
