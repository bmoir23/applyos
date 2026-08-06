import "server-only";

import { eq } from "drizzle-orm";

import { workflowRuns } from "@/db/schema";
import { db } from "@/lib/db";

type StartWorkflowInput = {
  userId?: string;
  source: string;
  eventType: string;
  idempotencyKey?: string;
  inputPayload?: Record<string, unknown>;
};

export async function startWorkflowRun(input: StartWorkflowInput) {
  if (input.idempotencyKey) {
    const existing = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.idempotencyKey, input.idempotencyKey),
    });
    if (existing) {
      return { run: existing, duplicate: true };
    }
  }

  const [run] = await db
    .insert(workflowRuns)
    .values({
      ...input,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  if (!run) {
    throw new Error("Unable to start workflow run");
  }

  return { run, duplicate: false };
}

export async function completeWorkflowRun(
  workflowRunId: string,
  outputPayload?: Record<string, unknown>,
) {
  await db
    .update(workflowRuns)
    .set({
      status: "succeeded",
      outputPayload,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));
}

export async function failWorkflowRun(
  workflowRunId: string,
  errorMessage: string,
) {
  await db
    .update(workflowRuns)
    .set({
      status: "failed",
      errorMessage,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));
}
