import "server-only";

import { PostHog } from "posthog-node";

type CapturePostHogEventInput = {
  distinctId: string;
  event: string;
  properties?: Record<string, boolean | number | string | null | undefined>;
  sessionId?: string | null;
};

function getPostHogClient(): PostHog | null {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!projectToken || !host) {
    if (process.env.NODE_ENV === "development") {
      const missingVariable = !projectToken
        ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "NEXT_PUBLIC_POSTHOG_HOST";

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }
    return null;
  }

  return new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}

export async function capturePostHogEvent({
  distinctId,
  event,
  properties,
  sessionId,
}: CapturePostHogEventInput) {
  const posthog = getPostHogClient();
  if (!posthog) return;

  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      ...(sessionId ? { $session_id: sessionId } : {}),
    },
  });

  await posthog.shutdown();
}

export function getPostHogSessionId(headers: Headers): string | null {
  return headers.get("x-posthog-session-id");
}
