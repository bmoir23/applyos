import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { verifySignature } from "@/lib/n8n/hmac";

export type AutomationAuthResult =
  | { ok: true }
  | { ok: false; response: Response };

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function unauthorized(message = "Unauthorized"): AutomationAuthResult {
  return {
    ok: false,
    response: Response.json({ error: message }, { status: 401 }),
  };
}

function notConfigured(): AutomationAuthResult {
  return {
    ok: false,
    response: Response.json(
      { error: "Automation authentication is not configured" },
      { status: 503 },
    ),
  };
}

export function authenticateAutomationRequest(
  request: Request,
  rawBody: string,
): AutomationAuthResult {
  const webhookSecret = env.N8N_WEBHOOK_SECRET;
  const hmacSecret = env.N8N_HMAC_SECRET;

  if (!webhookSecret && !hmacSecret) {
    return notConfigured();
  }

  const legacyHeader = request.headers.get("x-n8n-webhook-secret");
  if (webhookSecret && secretMatches(legacyHeader, webhookSecret)) {
    return { ok: true };
  }

  const timestamp = request.headers.get("x-applyos-timestamp");
  const signature = request.headers.get("x-applyos-signature");
  if (hmacSecret && timestamp && signature) {
    const valid = verifySignature({
      secret: hmacSecret,
      timestamp,
      body: rawBody,
      signature,
    });
    if (valid) {
      return { ok: true };
    }
    return unauthorized("Invalid signature");
  }

  return unauthorized();
}
