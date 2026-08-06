import "server-only";

import { and, eq } from "drizzle-orm";

import { applications, emailMessages } from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import { emailClassificationMessages } from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getOwnedApplication } from "@/lib/services/applications";
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
