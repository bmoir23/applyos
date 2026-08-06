import "server-only";

import { z } from "zod";

import { createAiProvider, type AiMessage } from "@/lib/ai/providers";

export async function generateStructured<T>(
  schema: z.ZodType<T>,
  messages: AiMessage[],
): Promise<T> {
  return createAiProvider().generateJson(messages, schema);
}
