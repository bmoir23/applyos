import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(
  secret: string,
  timestamp: string,
  body: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

type VerifySignatureInput = {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
  maxSkewMs?: number;
};

export function verifySignature({
  secret,
  timestamp,
  body,
  signature,
  maxSkewMs = 300_000,
}: VerifySignatureInput): boolean {
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return false;
  }

  const skewMs = Math.abs(Date.now() - timestampMs);
  if (skewMs > maxSkewMs) {
    return false;
  }

  const expected = signPayload(secret, timestamp, body);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
