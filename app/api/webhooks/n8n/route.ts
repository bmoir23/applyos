import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { users, workflowRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { classifyApplicationEmail } from "@/lib/services/emailMessages";
import { crawlJobSource } from "@/lib/services/jobs";
import { scoreJob } from "@/lib/services/scoring";
import {
  completeWorkflowRun,
  failWorkflowRun,
  startWorkflowRun,
} from "@/lib/services/workflows";
import { n8nWebhookSchema } from "@/lib/validators";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  if (!env.N8N_WEBHOOK_SECRET) {
    return Response.json(
      { error: "n8n webhook is not configured" },
      { status: 503 },
    );
  }
  if (
    !secretMatches(
      request.headers.get("x-n8n-webhook-secret"),
      env.N8N_WEBHOOK_SECRET,
    )
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workflowRunId: string | undefined;
  try {
    const input = n8nWebhookSchema.parse(await request.json());
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.idempotencyKey, input.idempotencyKey),
    });
    if (existing) {
      return Response.json({
        duplicate: true,
        workflowRunId: existing.id,
        status: existing.status,
        output: existing.outputPayload,
      });
    }

    const { run: workflow } = await startWorkflowRun({
      userId: user.id,
      source: "n8n",
      eventType: input.event,
      idempotencyKey: input.idempotencyKey,
      inputPayload: input.payload,
    });
    workflowRunId = workflow.id;

    let output: Record<string, unknown>;
    switch (input.event) {
      case "crawl_source": {
        const result = await crawlJobSource(
          user.id,
          input.payload.jobSourceId,
          { workflowRunId: workflow.id, workflowSource: "n8n" },
        );
        output = { mode: result.mode, jobsStored: result.jobIds.length };
        break;
      }
      case "score_job": {
        const result = await scoreJob(user.id, input.payload.jobId);
        output = result;
        break;
      }
      case "classify_email_status": {
        const result = await classifyApplicationEmail(user.id, input.payload);
        output = {
          emailMessageId: result.message.id,
          classification: result.classification,
        };
        break;
      }
      case "create_agent_event": {
        const event = await createAgentEvent({
          userId: user.id,
          workflowRunId: workflow.id,
          ...input.payload,
        });
        output = { agentEventId: event.id };
        break;
      }
      default: {
        const exhaustive: never = input;
        throw new Error(`Unsupported event: ${String(exhaustive)}`);
      }
    }

    await completeWorkflowRun(workflow.id, output);
    return Response.json({ workflowRunId: workflow.id, output });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid webhook payload"
        : error instanceof Error
          ? error.message
          : "Workflow failed";
    if (workflowRunId) {
      await failWorkflowRun(workflowRunId, message);
    }
    return Response.json(
      {
        error: message,
        ...(error instanceof z.ZodError ? { issues: error.issues } : {}),
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
