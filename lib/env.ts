import "server-only";

import { z } from "zod";

/**
 * Server-side environment validation.
 * Secrets must never be imported into client components.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),

  // Phase 3+ (optional until used)
  FIRECRAWL_API_KEY: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  // AI provider abstraction (Phase 4+)
  AI_PROVIDER: z
    .enum(["openai-compatible", "cloudflare", "gateway"])
    .default("openai-compatible"),

  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_GATEWAY_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

/**
 * Validates and returns server env.
 * Call from server-only modules (route handlers, server actions, lib/db).
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data;
}

/**
 * Lazy proxy so importing this module does not crash during build
 * when env vars are not yet configured. Access throws if invalid.
 */
let cachedEnv: ServerEnv | null = null;

export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    if (!cachedEnv) {
      cachedEnv = getServerEnv();
    }
    return cachedEnv[prop as keyof ServerEnv];
  },
});
