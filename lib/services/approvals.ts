import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { approvalRequests } from "@/db/schema";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type ApprovalActionType =
  | "external_submit"
  | "send_email"
  | "create_calendar_event"
  | "apply_email_status"
  | "publish_document";

type CreateApprovalRequestInput = {
  userId: string;
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  rationale?: string;
  expiresAt?: Date;
};

type DecideApprovalInput = {
  userId: string;
  approvalId: string;
  decision: "approved" | "rejected";
  rationale?: string;
};

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  if (!input.resourceId) {
    throw new Error("resourceId is required for approval requests");
  }

  const [approval] = await db
    .insert(approvalRequests)
    .values({
      userId: input.userId,
      actionType: input.actionType,
      status: "pending",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payload: input.payload,
      rationale: input.rationale,
      expiresAt: input.expiresAt,
    })
    .returning();

  if (!approval) {
    throw new Error("Unable to create approval request");
  }

  return approval;
}

export async function listPendingApprovals(userId: string) {
  return db.query.approvalRequests.findMany({
    where: and(
      eq(approvalRequests.userId, userId),
      eq(approvalRequests.status, "pending"),
    ),
    orderBy: [desc(approvalRequests.createdAt)],
  });
}

export async function getOwnedApproval(userId: string, approvalId: string) {
  return db.query.approvalRequests.findFirst({
    where: and(
      eq(approvalRequests.id, approvalId),
      eq(approvalRequests.userId, userId),
    ),
  });
}

export async function decideApproval(input: DecideApprovalInput) {
  const approval = await getOwnedApproval(input.userId, input.approvalId);
  if (!approval) {
    throw new Error("Approval request not found");
  }
  if (approval.status !== "pending") {
    throw new Error(`Approval request is already ${approval.status}`);
  }

  const decidedAt = new Date();
  const [updated] = await db
    .update(approvalRequests)
    .set({
      status: input.decision,
      rationale: input.rationale ?? approval.rationale,
      decidedAt,
      decidedByUserId: input.userId,
      updatedAt: decidedAt,
    })
    .where(
      and(
        eq(approvalRequests.id, input.approvalId),
        eq(approvalRequests.userId, input.userId),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error("Unable to update approval request");
  }

  const decisionLabel = input.decision === "approved" ? "Approved" : "Rejected";
  await createAgentEvent({
    userId: input.userId,
    eventType: "user_action",
    summary: `${decisionLabel} ${approval.actionType.replaceAll("_", " ")} for ${approval.resourceType}.`,
    details: {
      approvalRequestId: updated.id,
      actionType: approval.actionType,
      resourceType: approval.resourceType,
      resourceId: approval.resourceId,
      decision: input.decision,
      rationale: input.rationale,
    },
  });

  return updated;
}
