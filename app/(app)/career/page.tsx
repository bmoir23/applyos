import type { Metadata } from "next";
import { Award, DollarSign, Target } from "lucide-react";

import {
  AchievementForm,
  CompensationForm,
  GeneratePlanButton,
} from "@/components/career/career-forms";
import { FeatureGate } from "@/components/feature-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import {
  listAchievements,
  listCompensation,
  listMilestones,
} from "@/lib/services/milestones";

export const metadata: Metadata = {
  title: "Career",
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function CareerPage() {
  const { appUser } = await requireOnboardedAppUser();
  const [milestones, achievements, compensation] = await Promise.all([
    listMilestones(appUser.id),
    listAchievements(appUser.id),
    listCompensation(appUser.id),
  ]);

  return (
    <FeatureGate
      flag="tribes"
      title="Career timeline disabled"
      description="Post-hire career tools ship with the tribes rollout flag."
    >
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track milestones, achievements, and compensation after you land a role.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" />
              Milestones
            </CardTitle>
            <CardDescription>
              30/60/90 plans and other career checkpoints.
            </CardDescription>
          </div>
          <GeneratePlanButton />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No milestones yet. Generate a 30/60/90 plan to get started.
            </p>
          ) : (
            milestones.map((milestone) => (
              <article key={milestone.id} className="rounded-lg border p-4">
                <h2 className="font-medium">{milestone.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {milestone.planType} · {milestone.status} ·{" "}
                  {milestone.createdAt.toLocaleDateString()}
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-sm font-sans">
                  {milestone.contentMarkdown}
                </pre>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4" />
              Achievements
            </CardTitle>
            <CardDescription>
              Wins, certifications, and portfolio highlights.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {achievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No achievements recorded yet.
              </p>
            ) : (
              achievements.map((achievement) => (
                <article key={achievement.id} className="rounded-lg border p-3">
                  <h3 className="font-medium">{achievement.title}</h3>
                  {achievement.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {achievement.achievedAt?.toLocaleDateString() ?? "Undated"}
                  </p>
                </article>
              ))
            )}
            <AchievementForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4" />
              Compensation
            </CardTitle>
            <CardDescription>
              Private log of offers, raises, and total comp changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {compensation.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No compensation entries yet.
              </p>
            ) : (
              compensation.map((entry) => (
                <article key={entry.id} className="rounded-lg border p-3">
                  <h3 className="font-medium">{entry.title}</h3>
                  <p className="mt-1 text-sm">
                    {formatCurrency(entry.amountCents, entry.currency)}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.notes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {entry.effectiveAt?.toLocaleDateString() ?? "Undated"}
                  </p>
                </article>
              ))
            )}
            <CompensationForm />
          </CardContent>
        </Card>
      </div>
    </div>
    </FeatureGate>
  );
}
