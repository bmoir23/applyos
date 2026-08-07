import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { emailIdentities, users } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifySignature } from "@/lib/n8n/hmac";
import {
  getEmailIdentityByAddress,
} from "@/lib/services/email-identity";
import { ingestInboundEmail } from "@/lib/services/emailMessages";

const inboundEmailSchema = z.object({
  userId: z.string().uuid().optional(),
  recipient: z.string().email().optional(),
  subject: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  bodyText: z.string().min(1),
  messageId: z.string().optional(),
  applicationId: z.string().uuid().optional(),
});

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function authenticateInboundRequest(
  request: Request,
  rawBody: string,
): Response | null {
  const webhookSecret = env.N8N_WEBHOOK_SECRET;
  const hmacSecret = env.EMAIL_WORKER_HMAC_SECRET;

  if (!webhookSecret && !hmacSecret) {
    return Response.json(
      { error: "Email webhook is not configured" },
      { status: 503 },
    );
  }

  const legacyHeader = request.headers.get("x-n8n-webhook-secret");
  if (webhookSecret && secretMatches(legacyHeader, webhookSecret)) {
    return null;
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
      return null;
    }
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

async function resolveUserId(input: z.infer<typeof inboundEmailSchema>) {
  if (input.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (user) return user.id;
  }

  const recipient = input.recipient ?? input.to;
  if (!recipient) {
    return null;
  }

  const identity = await getEmailIdentityByAddress(recipient.toLowerCase());
  if (identity) {
    return identity.userId;
  }

  const bySubdomain = recipient.split("@")[0]?.toLowerCase();
  if (!bySubdomain) {
    return null;
  }

  const identityBySubdomain = await db.query.emailIdentities.findFirst({
    where: eq(emailIdentities.subdomain, bySubdomain),
  });
  return identityBySubdomain?.userId ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const authError = authenticateInboundRequest(request, rawBody);
  if (authError) {
    return authError;
  }

  try {
    const input = inboundEmailSchema.parse(JSON.parse(rawBody));
    const userId = await resolveUserId(input);
    if (!userId) {
      return Response.json({ error: "User not found for recipient" }, { status: 404 });
    }

    const message = await ingestInboundEmail(userId, {
      subject: input.subject,
      fromAddress: input.from,
      toAddress: input.recipient ?? input.to,
      bodyText: input.bodyText,
      messageId: input.messageId,
      applicationId: input.applicationId,
    });

    return Response.json({ emailMessageId: message.id });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid inbound email payload"
        : error instanceof Error
          ? error.message
          : "Inbound email failed";
    return Response.json(
      {
        error: message,
        ...(error instanceof z.ZodError ? { issues: error.issues } : {}),
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
