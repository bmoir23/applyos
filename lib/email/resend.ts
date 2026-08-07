import "server-only";

import { env } from "@/lib/env";

type SendApprovedEmailInput = {
  to: string;
  from: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

type SendApprovedEmailResult = {
  id: string;
  mocked?: boolean;
};

const resendResponseSchema = {
  parse(data: unknown): { id: string } {
    if (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      typeof (data as { id: unknown }).id === "string"
    ) {
      return { id: (data as { id: string }).id };
    }
    throw new Error("Resend returned an unexpected response");
  },
};

export async function sendApprovedEmail(
  input: SendApprovedEmailInput,
): Promise<SendApprovedEmailResult> {
  if (!env.RESEND_API_KEY) {
    return {
      id: `mock_${input.idempotencyKey.slice(0, 24)}`,
      mocked: true,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${detail}`);
  }

  const payload = resendResponseSchema.parse(await response.json());
  return { id: payload.id };
}
