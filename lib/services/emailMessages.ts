import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import {
  applications,
  emailMessages,
  emailThreads,
} from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import { emailClassificationMessages } from "@/lib/ai/prompts";
import { sendApprovedEmail } from "@/lib/email/resend";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedApplication } from "@/lib/services/applications";
import { createApprovalRequest, getOwnedApproval } from "@/lib/services/approvals";
import { getEmailIdentity } from "@/lib/services/email-identity";
import {
  classifyEmailInputSchema,
  emailClassificationSchema,
} from "@/lib/validators";

type ClassifyEmailInput = {
  applicationId: string;
  subject?: string;
  fromAddress?: string;
  toAddress?: string;
  bodyText: string;
  receivedAt?: string;
};

export async function classifyApplicationEmail(
  userId: string,
  input: ClassifyEmailInput,
) {
  const values = classifyEmailInputSchema.parse(input);
  const application = await getOwnedApplication(userId, values.applicationId);
  if (!application) throw new Error("Application not found");

  const classification = await generateStructured(
    emailClassificationSchema,
    emailClassificationMessages(
      application.status,
      values.subject,
      values.bodyText,
    ),
  );
  const [message] = await db
    .insert(emailMessages)
    .values({
      userId,
      applicationId: application.id,
      subject: values.subject,
      fromAddress: values.fromAddress,
      toAddress: values.toAddress,
      bodyText: values.bodyText,
      receivedAt: values.receivedAt
        ? new Date(values.receivedAt)
        : new Date(),
      classifiedStatus: classification.suggestedStatus,
      classificationConfidence: classification.confidence,
    })
    .returning();
  if (!message) throw new Error("Unable to store email classification");

  await createAgentEvent({
    userId,
    jobId: application.jobId,
    applicationId: application.id,
    eventType: "classify_email_status",
    summary: `Suggested ${classification.suggestedStatus} from an email; user approval required.`,
    details: {
      emailMessageId: message.id,
      confidence: classification.confidence,
      rationale: classification.rationale,
    },
  });
  return { message, classification };
}

export async function applyEmailStatusSuggestion(
  userId: string,
  emailMessageId: string,
) {
  const message = await db.query.emailMessages.findFirst({
    where: and(
      eq(emailMessages.id, emailMessageId),
      eq(emailMessages.userId, userId),
    ),
    with: { application: true },
  });
  if (
    !message?.application ||
    !message.classifiedStatus ||
    message.statusSuggestionAppliedAt
  ) {
    throw new Error("Status suggestion is unavailable");
  }

  const [application] = await db
    .update(applications)
    .set({
      status: message.classifiedStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applications.id, message.application.id),
        eq(applications.userId, userId),
      ),
    )
    .returning();
  if (!application) throw new Error("Application not found");

  await db
    .update(emailMessages)
    .set({
      statusSuggestionAppliedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailMessages.id, message.id));

  await createAgentEvent({
    userId,
    jobId: application.jobId,
    applicationId: application.id,
    eventType: "user_action",
    summary: `User approved email status suggestion: ${application.status}.`,
    details: { emailMessageId: message.id },
  });
  return application;
}

type InboundEmailInput = {
  subject?: string;
  fromAddress?: string;
  toAddress?: string;
  bodyText: string;
  messageId?: string;
  applicationId?: string;
  receivedAt?: Date;
};

export async function ingestInboundEmail(
  userId: string,
  input: InboundEmailInput,
) {
  let threadId: string | undefined;
  if (input.subject) {
    const existingThread = await db.query.emailThreads.findFirst({
      where: and(
        eq(emailThreads.userId, userId),
        eq(emailThreads.subject, input.subject),
      ),
    });
    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const [thread] = await db
        .insert(emailThreads)
        .values({
          userId,
          applicationId: input.applicationId,
          subject: input.subject,
          lastMessageAt: input.receivedAt ?? new Date(),
        })
        .returning();
      threadId = thread?.id;
    }
  }

  const receivedAt = input.receivedAt ?? new Date();
  const [message] = await db
    .insert(emailMessages)
    .values({
      userId,
      applicationId: input.applicationId,
      threadId,
      subject: input.subject,
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      bodyText: input.bodyText,
      messageId: input.messageId,
      direction: "inbound",
      receivedAt,
    })
    .returning();

  if (!message) {
    throw new Error("Unable to store inbound email");
  }

  if (threadId) {
    await db
      .update(emailThreads)
      .set({ lastMessageAt: receivedAt, updatedAt: new Date() })
      .where(eq(emailThreads.id, threadId));
  }

  if (input.applicationId) {
    const application = await getOwnedApplication(userId, input.applicationId);
    if (application) {
      const classification = await generateStructured(
        emailClassificationSchema,
        emailClassificationMessages(
          application.status,
          input.subject,
          input.bodyText,
        ),
      );
      await db
        .update(emailMessages)
        .set({
          classifiedStatus: classification.suggestedStatus,
          classificationConfidence: classification.confidence,
          updatedAt: new Date(),
        })
        .where(eq(emailMessages.id, message.id));

      await createAgentEvent({
        userId,
        jobId: application.jobId,
        applicationId: application.id,
        eventType: "classify_email_status",
        summary: `Inbound email classified as ${classification.suggestedStatus}.`,
        details: {
          emailMessageId: message.id,
          confidence: classification.confidence,
          rationale: classification.rationale,
        },
      });
    }
  }

  return message;
}

export async function listInbox(userId: string) {
  const [messages, pendingDrafts] = await Promise.all([
    db.query.emailMessages.findMany({
      where: and(
        eq(emailMessages.userId, userId),
        eq(emailMessages.direction, "inbound"),
      ),
      orderBy: [desc(emailMessages.receivedAt)],
      with: { thread: true, application: true },
    }),
    db.query.emailMessages.findMany({
      where: and(
        eq(emailMessages.userId, userId),
        eq(emailMessages.direction, "outbound"),
        isNull(emailMessages.sentAt),
      ),
      orderBy: [desc(emailMessages.createdAt)],
      with: { thread: true, application: true },
    }),
  ]);

  return { messages, pendingDrafts };
}

type OutboundDraftInput = {
  applicationId?: string;
  subject: string;
  bodyText: string;
  toAddress: string;
};

export async function createOutboundDraft(
  userId: string,
  input: OutboundDraftInput,
) {
  const identity = await getEmailIdentity(userId);
  if (!identity) {
    throw new Error("Provision an email identity before drafting messages");
  }

  if (input.applicationId) {
    const application = await getOwnedApplication(userId, input.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }
  }

  const [message] = await db
    .insert(emailMessages)
    .values({
      userId,
      applicationId: input.applicationId,
      subject: input.subject,
      fromAddress: `${identity.subdomain}@${env.EMAIL_OUTBOUND_DOMAIN}`,
      toAddress: input.toAddress,
      draftSubject: input.subject,
      draftBodyText: input.bodyText,
      direction: "outbound",
    })
    .returning();

  if (!message) {
    throw new Error("Unable to create outbound draft");
  }

  const approval = await createApprovalRequest({
    userId,
    actionType: "send_email",
    resourceType: "email_message",
    resourceId: message.id,
    payload: {
      to: input.toAddress,
      subject: input.subject,
      bodyText: input.bodyText,
    },
    rationale: "Review this email before ApplyOS sends it on your behalf.",
  });

  return { message, approval };
}

export async function executeApprovedSend(userId: string, approvalId: string) {
  const approval = await getOwnedApproval(userId, approvalId);
  if (!approval || approval.status !== "approved") {
    throw new Error("Approved send_email request is required");
  }
  if (approval.actionType !== "send_email") {
    throw new Error("Approval is not a send_email action");
  }

  const message = await db.query.emailMessages.findFirst({
    where: and(
      eq(emailMessages.id, approval.resourceId),
      eq(emailMessages.userId, userId),
    ),
  });
  if (!message || message.sentAt) {
    throw new Error("Outbound draft not found or already sent");
  }

  const subject = message.draftSubject ?? message.subject;
  const bodyText = message.draftBodyText ?? message.bodyText;
  const toAddress = message.toAddress;
  const fromAddress = message.fromAddress;
  if (!subject || !bodyText || !toAddress || !fromAddress) {
    throw new Error("Draft is missing required send fields");
  }

  const result = await sendApprovedEmail({
    to: toAddress,
    from: fromAddress,
    subject,
    text: bodyText,
    idempotencyKey: approval.id,
  });

  const sentAt = new Date();
  const [updated] = await db
    .update(emailMessages)
    .set({
      subject,
      bodyText,
      sentAt,
      sendApprovedAt: approval.decidedAt ?? sentAt,
      providerMessageId: result.id,
      updatedAt: sentAt,
    })
    .where(eq(emailMessages.id, message.id))
    .returning();

  if (!updated) {
    throw new Error("Unable to mark email as sent");
  }

  await createAgentEvent({
    userId,
    applicationId: message.applicationId ?? undefined,
    eventType: "send_email",
    summary: result.mocked
      ? "Email send simulated (Resend not configured)."
      : "Email sent after user approval.",
    details: {
      emailMessageId: message.id,
      providerMessageId: result.id,
      mocked: result.mocked ?? false,
    },
  });

  return updated;
}
