import "server-only";

import { desc, eq } from "drizzle-orm";

import { agentEvents } from "@/db/schema";
import { db } from "@/lib/db";
import type { AgentEventType } from "@/lib/validators";

type CreateAgentEventInput = {
  userId: string;
  eventType: AgentEventType;
  summary: string;
  workflowRunId?: string;
  jobId?: string;
  applicationId?: string;
  details?: Record<string, unknown>;
};

export async function createAgentEvent(input: CreateAgentEventInput) {
  const [event] = await db.insert(agentEvents).values(input).returning();
  if (!event) {
    throw new Error("Unable to record agent event");
  }
  return event;
}

export async function listAgentEvents(userId: string, limit = 50) {
  return db.query.agentEvents.findMany({
    where: eq(agentEvents.userId, userId),
    orderBy: [desc(agentEvents.createdAt)],
    limit: Math.min(limit, 100),
  });
}
