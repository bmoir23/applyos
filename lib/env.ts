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

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),

  FIRECRAWL_API_KEY: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  N8N_HMAC_SECRET: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().url().optional(),

  AI_PROVIDER: z
    .enum(["openai-compatible", "cloudflare", "gateway"])
    .default("openai-compatible"),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_GATEWAY_ID: z.string().optional(),

  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("@cf/baai/bge-base-en-v1.5"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  EMBEDDING_POOLING: z.enum(["cls", "mean"]).default("cls"),

  EMAIL_INBOUND_DOMAIN: z.string().default("inbound.applyos.me"),
  EMAIL_OUTBOUND_DOMAIN: z.string().default("mail.applyos.me"),
  EMAIL_WORKER_HMAC_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  FEATURE_FLAGS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data;
}

let cachedEnv: ServerEnv | null = null;

export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    if (!cachedEnv) {
      cachedEnv = getServerEnv();
    }
    return cachedEnv[prop as keyof ServerEnv];
  },
});

export type FeatureFlag =
  | "semantic_matching"
  | "kanban"
  | "inbox"
  | "tribes"
  | "hitl_workspace"
  | "profile_ingestion";

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const raw = env.FEATURE_FLAGS;
  if (!raw || raw.trim() === "") {
    return env.NODE_ENV === "development" || env.NODE_ENV === "test";
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .includes(flag);
}
