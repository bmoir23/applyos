import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { env } from "@/lib/env";

const embeddingResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    data: z.array(z.array(z.number())),
    shape: z.array(z.number()).optional(),
    pooling: z.string().optional(),
  }),
  errors: z
    .array(
      z.object({
        message: z.string().optional(),
      }),
    )
    .optional(),
});

function assertEmbeddingConfigured(): {
  accountId: string;
  apiToken: string;
  model: string;
} {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "Embeddings are not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    );
  }

  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    model: env.EMBEDDING_MODEL,
  };
}

export function hashEmbeddingSource(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

export function chunkForEmbedding(text: string, maxChars = 2000): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}

function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

export function validateEmbedding(vector: number[]): void {
  if (vector.length !== env.EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, received ${vector.length}`,
    );
  }

  if (!vector.every((value) => Number.isFinite(value))) {
    throw new Error("Embedding contains non-finite values");
  }

  if (vectorNorm(vector) === 0) {
    throw new Error("Embedding has zero norm");
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const { accountId, apiToken, model } = assertEmbeddingConfigured();
  const chunkedTexts = texts.map((text) => chunkForEmbedding(text));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
  if (env.AI_GATEWAY_ID) {
    headers["cf-aig-gateway-id"] = env.AI_GATEWAY_ID;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: chunkedTexts.length === 1 ? chunkedTexts[0] : chunkedTexts,
        pooling: env.EMBEDDING_POOLING,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Embedding request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const parsed = embeddingResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Embedding provider returned an invalid response shape");
  }

  if (!parsed.data.success) {
    const message =
      parsed.data.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
      "Embedding provider request failed";
    throw new Error(message);
  }

  const vectors = parsed.data.result.data;
  if (vectors.length !== chunkedTexts.length) {
    throw new Error(
      `Embedding provider returned ${vectors.length} vectors for ${chunkedTexts.length} inputs`,
    );
  }

  for (const vector of vectors) {
    validateEmbedding(vector);
  }

  return vectors;
}
