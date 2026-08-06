import { describe, expect, it } from "vitest";

import {
  applicationUpdateSchema,
  emailClassificationSchema,
  jobSourceInputSchema,
  n8nWebhookSchema,
  profileFormSchema,
  scoringResultSchema,
} from "@/lib/validators";

describe("profileFormSchema", () => {
  it("accepts a complete truthful profile", () => {
    const result = profileFormSchema.safeParse({
      targetRoles: ["Product Engineer"],
      targetLocations: ["Remote"],
      remotePreference: "remote",
      salaryMin: 120000,
      salaryMax: 160000,
      salaryCurrency: "USD",
      skills: ["TypeScript"],
      workAuthorizationNotes: "Authorized to work in the United States.",
      experienceSummary:
        "Full-stack engineer building reliable web applications and workflows.",
      applicationPreferences: "Prefer product-focused teams.",
      preferredCoverLetterTone: "professional",
      baseResumeText: "A".repeat(100),
    });

    expect(result.success).toBe(true);
  });

  it("rejects an inverted salary range", () => {
    const result = profileFormSchema.safeParse({
      targetRoles: ["Engineer"],
      targetLocations: ["Remote"],
      remotePreference: "any",
      salaryMin: 180000,
      salaryMax: 120000,
      salaryCurrency: "USD",
      skills: ["TypeScript"],
      experienceSummary: "A sufficiently detailed experience summary.",
      preferredCoverLetterTone: "professional",
      baseResumeText: "A".repeat(100),
    });

    expect(result.success).toBe(false);
  });
});

describe("jobSourceInputSchema", () => {
  it("accepts public HTTPS URLs", () => {
    expect(
      jobSourceInputSchema.safeParse({
        label: "Example careers",
        sourceUrl: "https://example.com/careers",
      }).success,
    ).toBe(true);
  });

  it("rejects non-HTTP protocols", () => {
    expect(
      jobSourceInputSchema.safeParse({
        label: "Local file",
        sourceUrl: "file:///tmp/jobs",
      }).success,
    ).toBe(false);
  });
});

describe("scoringResultSchema", () => {
  it("supports the skip recommendation", () => {
    const result = scoringResultSchema.safeParse({
      score: 20,
      strengths: [],
      requiredSkillGaps: ["Required certification"],
      preferredSkillGaps: [],
      rationale: "The required certification is not present in the resume.",
      suggestedResumeImprovements: [],
      priority: "skip",
    });

    expect(result.success).toBe(true);
  });
});

describe("applicationUpdateSchema", () => {
  it("accepts an explicit follow-up removal", () => {
    expect(
      applicationUpdateSchema.safeParse({
        applicationId: "8c063f65-9f3e-4c8e-a5eb-386775681c49",
        status: "interviewing",
        followUpAt: null,
      }).success,
    ).toBe(true);
  });
});

describe("emailClassificationSchema", () => {
  it("rejects confidence outside the documented range", () => {
    expect(
      emailClassificationSchema.safeParse({
        suggestedStatus: "offer",
        confidence: 101,
        rationale: "Explicit offer language.",
      }).success,
    ).toBe(false);
  });
});

describe("n8nWebhookSchema", () => {
  it("enforces event-specific payloads", () => {
    expect(
      n8nWebhookSchema.safeParse({
        event: "score_job",
        idempotencyKey: "score-1",
        userId: "8c063f65-9f3e-4c8e-a5eb-386775681c49",
        payload: { applicationId: "wrong-shape" },
      }).success,
    ).toBe(false);
  });
});
