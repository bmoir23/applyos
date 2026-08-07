import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { signPayload, verifySignature } from "@/lib/n8n/hmac";
import { automationEventSchema } from "@/lib/n8n/contracts";
import {
  legacyStatusToKanbanStage,
  isTerminalStage,
  KANBAN_STAGES,
} from "@/lib/kanban/stages";
import { computeBadges } from "@/lib/services/matchingBadges";
import { slugifyEmailSubdomain } from "@/lib/email/subdomain";

describe("n8n hmac", () => {
  it("signs and verifies a payload", () => {
    const secret = "test-secret";
    const timestamp = String(Date.now());
    const body = JSON.stringify({ hello: "world" });
    const signature = signPayload(secret, timestamp, body);
    expect(
      verifySignature({ secret, timestamp, body, signature }),
    ).toBe(true);
  });

  it("rejects skewed timestamps", () => {
    const secret = "test-secret";
    const timestamp = String(Date.now() - 600_000);
    const body = "{}";
    const signature = signPayload(secret, timestamp, body);
    expect(
      verifySignature({
        secret,
        timestamp,
        body,
        signature,
        maxSkewMs: 60_000,
      }),
    ).toBe(false);
  });

  it("rejects tampered signatures", () => {
    const secret = "test-secret";
    const timestamp = String(Date.now());
    const body = "{}";
    const bad = createHmac("sha256", secret).update("nope").digest("hex");
    expect(
      verifySignature({ secret, timestamp, body, signature: bad }),
    ).toBe(false);
  });
});

describe("automationEventSchema", () => {
  it("accepts crawl_source events", () => {
    const parsed = automationEventSchema.safeParse({
      event: "crawl_source",
      idempotencyKey: "crawl:1",
      userId: "11111111-1111-4111-8111-111111111111",
      payload: { jobSourceId: "22222222-2222-4222-8222-222222222222" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown events", () => {
    const parsed = automationEventSchema.safeParse({
      event: "delete_everything",
      idempotencyKey: "x",
      userId: "11111111-1111-4111-8111-111111111111",
      payload: {},
    });
    expect(parsed.success).toBe(false);
  });
});

describe("kanban stages", () => {
  it("maps legacy statuses", () => {
    expect(legacyStatusToKanbanStage("interviewing")).toBe(
      "interview_scheduled",
    );
    expect(legacyStatusToKanbanStage("offer")).toBe("offer_pending");
    expect(legacyStatusToKanbanStage("rejected")).toBe("rejected_closed");
  });

  it("marks terminal stages", () => {
    expect(isTerminalStage("hired")).toBe(true);
    expect(isTerminalStage("rejected_closed")).toBe(true);
    expect(isTerminalStage("applied")).toBe(false);
  });

  it("includes nine stages", () => {
    expect(KANBAN_STAGES).toHaveLength(9);
  });
});

describe("match badges", () => {
  it("awards best_match for high semantic scores", () => {
    const badges = computeBadges({
      semanticScore: 88,
      matchScore: 60,
      requiredGapCount: 1,
      preferredGapCount: 3,
      priority: "medium",
    });
    expect(badges).toContain("best_match");
  });

  it("awards skills_aligned when gaps are closed", () => {
    const badges = computeBadges({
      semanticScore: 70,
      matchScore: 70,
      requiredGapCount: 0,
      preferredGapCount: 1,
      priority: "medium",
    });
    expect(badges).toContain("skills_aligned");
  });

  it("awards interview and career badges for high priority matches", () => {
    const badges = computeBadges({
      semanticScore: 76,
      matchScore: 70,
      requiredGapCount: 2,
      preferredGapCount: 4,
      priority: "high",
    });
    expect(badges).toContain("high_interview_probability");
    expect(badges).toContain("great_career_fit");
  });
});

describe("email subdomain slugify", () => {
  it("normalizes names into safe subdomains", () => {
    expect(slugifyEmailSubdomain("Ada Lovelace")).toBe("ada-lovelace");
    expect(slugifyEmailSubdomain("!!!")).toBe("user");
    expect(slugifyEmailSubdomain("  Jane--Doe  ")).toBe("jane-doe");
  });
});
