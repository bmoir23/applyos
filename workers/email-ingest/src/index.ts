/**
 * ApplyOS inbound email worker (Cloudflare Email Routing).
 *
 * Deploy this worker on your inbound domain (EMAIL_INBOUND_DOMAIN). Cloudflare
 * Email Routing should forward messages to this worker, which POSTs a JSON
 * payload to APPLYOS_EMAIL_WEBHOOK_URL (the Next.js inbound webhook) with HMAC
 * headers signed using EMAIL_WORKER_HMAC_SECRET.
 *
 * Required secrets (wrangler secret put):
 * - EMAIL_WORKER_HMAC_SECRET — shared with ApplyOS app env
 * - APPLYOS_EMAIL_WEBHOOK_URL — e.g. https://app.applyos.me/api/webhooks/email/inbound
 */

export interface Env {
  EMAIL_WORKER_HMAC_SECRET: string;
  APPLYOS_EMAIL_WEBHOOK_URL: string;
}

type InboundEmailMessage = {
  from: string;
  to: string;
  headers: Headers;
  raw?: ArrayBuffer;
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

export default {
  async email(message: InboundEmailMessage, env: Env): Promise<void> {
    const timestamp = Date.now().toString();
    const bodyText = message.raw
      ? new TextDecoder().decode(message.raw)
      : message.headers.get("subject") ?? "";

    const payload = JSON.stringify({
      recipient: extractAddress(message.to),
      subject: message.headers.get("subject") ?? undefined,
      from: extractAddress(message.from),
      to: extractAddress(message.to),
      bodyText,
      messageId: message.headers.get("message-id") ?? undefined,
    });

    const signature = await hmacSha256Hex(
      env.EMAIL_WORKER_HMAC_SECRET,
      `${timestamp}.${payload}`,
    );

    const response = await fetch(env.APPLYOS_EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-applyos-timestamp": timestamp,
        "x-applyos-signature": signature,
      },
      body: payload,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `ApplyOS inbound webhook failed (${response.status}): ${detail}`,
      );
    }
  },
};
