export const MATCH_BADGE_RULE_VERSION = "v1";

type MatchPriority = "high" | "medium" | "low" | "skip";

type ComputeBadgesInput = {
  semanticScore?: number | null;
  matchScore?: number | null;
  requiredGapCount: number;
  preferredGapCount?: number | null;
  priority?: MatchPriority | null;
};

export function computeBadges(input: ComputeBadgesInput): string[] {
  const badges: string[] = [];
  const semanticScore = input.semanticScore ?? 0;
  const matchScore = input.matchScore ?? 0;
  const preferredGapCount = input.preferredGapCount ?? 0;

  if (semanticScore >= 80 || matchScore >= 85) {
    badges.push("best_match");
  }

  if (input.requiredGapCount === 0 && preferredGapCount <= 2) {
    badges.push("skills_aligned");
  }

  if (input.priority === "high" && semanticScore >= 70) {
    badges.push("high_interview_probability");
  }

  if (input.priority === "high" || semanticScore >= 75) {
    badges.push("great_career_fit");
  }

  return badges;
}
