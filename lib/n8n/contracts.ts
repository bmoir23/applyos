import { z } from "zod";

import {
  agentEventTypeSchema,
  classifyEmailInputSchema,
  crawlJobInputSchema,
  scoreJobInputSchema,
} from "@/lib/validators";

const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1);

const automationBaseSchema = z.object({
  idempotencyKey: nonEmptyString.max(255),
  userId: z.uuid(),
  correlationId: trimmedString.max(255).optional(),
});

export const profileIngestPayloadSchema = z.object({
  linkedinUrl: z.url().optional(),
  resumeId: z.uuid().optional(),
  source: z
    .enum(["questionnaire", "linkedin", "resume_upload"])
    .default("questionnaire"),
});

export const embedJobPayloadSchema = z.object({
  jobId: z.uuid(),
});

export const prepareApplicationPayloadSchema = z.object({
  jobId: z.uuid(),
  applicationId: z.uuid().optional(),
  resumeVersionId: z.uuid().optional(),
  coverLetterId: z.uuid().optional(),
  promptInstructions: trimmedString.max(5_000).optional(),
});

export const sendEmailPayloadSchema = z.object({
  applicationId: z.uuid(),
  subject: nonEmptyString.max(500),
  bodyText: nonEmptyString.max(100_000),
  toAddress: z.email(),
  threadId: z.uuid().optional(),
});

export const createCalendarEventPayloadSchema = z
  .object({
    applicationId: z.uuid(),
    title: nonEmptyString.max(255),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    location: trimmedString.max(500).optional(),
    description: trimmedString.max(2_000).optional(),
  })
  .refine((value) => new Date(value.endsAt) >= new Date(value.startsAt), {
    message: "endsAt must be on or after startsAt",
    path: ["endsAt"],
  });

export const createAgentEventPayloadSchema = z.object({
  eventType: agentEventTypeSchema,
  summary: nonEmptyString.max(1_000),
  jobId: z.uuid().optional(),
  applicationId: z.uuid().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const automationEventSchema = z.discriminatedUnion("event", [
  automationBaseSchema.extend({
    event: z.literal("profile_ingest"),
    payload: profileIngestPayloadSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("crawl_source"),
    payload: crawlJobInputSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("embed_job"),
    payload: embedJobPayloadSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("score_job"),
    payload: scoreJobInputSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("prepare_application"),
    payload: prepareApplicationPayloadSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("classify_email_status"),
    payload: classifyEmailInputSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("send_email"),
    payload: sendEmailPayloadSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("create_calendar_event"),
    payload: createCalendarEventPayloadSchema,
  }),
  automationBaseSchema.extend({
    event: z.literal("create_agent_event"),
    payload: createAgentEventPayloadSchema,
  }),
]);

export type AutomationEvent = z.infer<typeof automationEventSchema>;
export type AutomationEventType = AutomationEvent["event"];
export type ProfileIngestPayload = z.infer<typeof profileIngestPayloadSchema>;
export type EmbedJobPayload = z.infer<typeof embedJobPayloadSchema>;
export type PrepareApplicationPayload = z.infer<
  typeof prepareApplicationPayloadSchema
>;
export type SendEmailPayload = z.infer<typeof sendEmailPayloadSchema>;
export type CreateCalendarEventPayload = z.infer<
  typeof createCalendarEventPayloadSchema
>;
export type CreateAgentEventPayload = z.infer<
  typeof createAgentEventPayloadSchema
>;
