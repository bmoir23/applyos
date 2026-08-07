"use client";

import { PartyPopper } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type HiredCelebrationProps = {
  jobTitle: string;
  companyName: string;
};

export function HiredCelebration({ jobTitle, companyName }: HiredCelebrationProps) {
  return (
    <Card className="relative overflow-hidden border-emerald-500/30 bg-emerald-500/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-safe:block motion-reduce:hidden"
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="hitl-confetti-piece"
            style={{
              left: `${(index * 17) % 100}%`,
              animationDelay: `${(index % 6) * 0.12}s`,
              backgroundColor:
                index % 3 === 0
                  ? "var(--chart-1)"
                  : index % 3 === 1
                    ? "var(--chart-2)"
                    : "var(--chart-3)",
            }}
          />
        ))}
      </div>
      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <PartyPopper className="size-5 text-emerald-600" />
          <CardTitle>You got hired</CardTitle>
        </div>
        <CardDescription>
          Congratulations on {jobTitle} at {companyName}. Community features are
          now unlocked.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-sm text-muted-foreground">
          Keep this milestone in your career timeline and explore tribes when you
          are ready to share your journey.
        </p>
      </CardContent>
    </Card>
  );
}
