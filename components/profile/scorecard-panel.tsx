"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ScorecardData } from "@/lib/validators";

type ScorecardPanelProps = {
  scorecard: ScorecardData | null;
  showSettingsLink?: boolean;
};

export function ScorecardPanel({
  scorecard,
  showSettingsLink = false,
}: ScorecardPanelProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/profile/scorecard", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate scorecard");
      }
      toast.success("Scorecard updated");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate scorecard",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!scorecard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career scorecard</CardTitle>
          <CardDescription>
            Generate a scorecard from your profile to see competencies, gaps, and
            a recommended match threshold.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Complete your base resume first, then generate your scorecard.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate scorecard"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Career scorecard</CardTitle>
            <CardDescription>{scorecard.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Threshold {scorecard.matchThreshold}%
            </Badge>
            <Badge variant="outline">
              Confidence {scorecard.confidence}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ScorecardList
          title="Core competencies"
          description="Strengths ApplyOS will emphasize when ranking roles."
          items={scorecard.competencies}
        />
        <ScorecardList
          title="Target roles"
          description="Titles aligned with your current profile."
          items={scorecard.targetRoles}
        />
        <ScorecardList
          title="Skill gaps"
          description="Areas to strengthen or address in applications."
          items={scorecard.skillGaps}
          emptyLabel="No major gaps identified"
        />
        {scorecard.nonNegotiables.length > 0 ? (
          <ScorecardList
            title="Non-negotiables"
            description="Constraints that should filter opportunities."
            items={scorecard.nonNegotiables}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Regenerating…" : "Regenerate scorecard"}
          </Button>
          {showSettingsLink ? (
            <Button render={<Link href="/settings" />} variant="ghost" size="sm">
              Edit profile
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ScorecardList({
  title,
  description,
  items,
  emptyLabel = "None listed",
}: {
  title: string;
  description: string;
  items: string[];
  emptyLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
