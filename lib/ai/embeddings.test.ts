import { describe, expect, it } from "vitest";

import {
  chunkForEmbedding,
  hashEmbeddingSource,
  validateEmbedding,
} from "@/lib/ai/embeddings";
import { computeBadges } from "@/lib/services/matchingBadges";

function sampleVector(dimension = 768, scale = 0.01): number[] {
  return Array.from({ length: dimension }, (_, index) => (index + 1) * scale);
}

describe("validateEmbedding", () => {
  it("accepts a valid non-zero vector", () => {
    expect(() => validateEmbedding(sampleVector())).not.toThrow();
  });

  it("rejects vectors with the wrong dimension", () => {
    expect(() => validateEmbedding([0.1, 0.2, 0.3])).toThrow(
      /dimension mismatch/i,
    );
  });

  it("rejects non-finite values", () => {
    const vector = sampleVector();
    vector[0] = Number.NaN;
    expect(() => validateEmbedding(vector)).toThrow(/non-finite/i);
  });

  it("rejects zero-norm vectors", () => {
    expect(() => validateEmbedding(Array.from({ length: 768 }, () => 0))).toThrow(
      /zero norm/i,
    );
  });
});

describe("hashEmbeddingSource", () => {
  it("returns a stable sha256 hex digest", () => {
    const first = hashEmbeddingSource("hello world");
    const second = hashEmbeddingSource("hello world");
    const third = hashEmbeddingSource("hello world!");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(third);
  });
});

describe("chunkForEmbedding", () => {
  it("returns trimmed text when under the limit", () => {
    expect(chunkForEmbedding("  short text  ")).toBe("short text");
  });

  it("truncates long text near a word boundary", () => {
    const words = Array.from({ length: 500 }, (_, index) => `word${index}`);
    const text = words.join(" ");
    const chunked = chunkForEmbedding(text, 2000);

    expect(chunked.length).toBeLessThanOrEqual(2000);
    expect(chunked.endsWith("word")).toBe(false);
  });
});

describe("computeBadges", () => {
  it("awards best_match for strong semantic or match scores", () => {
    expect(
      computeBadges({
        semanticScore: 82,
        matchScore: 50,
        requiredGapCount: 1,
        preferredGapCount: 3,
        priority: "medium",
      }),
    ).toContain("best_match");

    expect(
      computeBadges({
        semanticScore: 60,
        matchScore: 90,
        requiredGapCount: 1,
        preferredGapCount: 3,
        priority: "medium",
      }),
    ).toContain("best_match");
  });

  it("awards skills_aligned when required gaps are cleared", () => {
    expect(
      computeBadges({
        semanticScore: 65,
        matchScore: 70,
        requiredGapCount: 0,
        preferredGapCount: 2,
        priority: "medium",
      }),
    ).toContain("skills_aligned");
  });

  it("awards interview and career-fit badges for high-priority matches", () => {
    const badges = computeBadges({
      semanticScore: 72,
      matchScore: 70,
      requiredGapCount: 0,
      preferredGapCount: 1,
      priority: "high",
    });

    expect(badges).toContain("high_interview_probability");
    expect(badges).toContain("great_career_fit");
  });
});
