import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";

export type AiMessage = {
  role: "system" | "user";
  content: string;
};

export interface AiProvider {
  generateJson<T>(
    messages: AiMessage[],
    schema: z.ZodType<T>,
  ): Promise<T>;
}

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly gatewayId?: string,
  ) {}

  async generateJson<T>(
    messages: AiMessage[],
    schema: z.ZodType<T>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (this.gatewayId) headers["cf-aig-gateway-id"] = this.gatewayId;

    const response = await fetch(chatCompletionsUrl(this.baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed (${response.status})`);
    }

    const completion = chatCompletionSchema.parse(await response.json());
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("AI provider returned an empty response");

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      throw new Error("AI provider did not return valid JSON");
    }
    return schema.parse(json);
  }
}

export function createAiProvider(): AiProvider {
  if (!env.AI_API_KEY || !env.AI_BASE_URL || !env.AI_MODEL) {
    throw new Error(
      "AI is not configured. Set AI_API_KEY, AI_BASE_URL, and AI_MODEL.",
    );
  }

  return new OpenAiCompatibleProvider(
    env.AI_BASE_URL,
    env.AI_API_KEY,
    env.AI_MODEL,
    env.AI_GATEWAY_ID,
  );
}
