import { z } from "zod";

export const jobStatusSchema = z.enum([
  "discovered",
  "saved",
  "skipped",
  "archived",
]);

export const applicationStatusSchema = z.enum([
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "assessment",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
]);

export const remotePreferenceSchema = z.enum([
  "remote",
  "hybrid",
  "onsite",
  "any",
]);

export const matchPrioritySchema = z.enum(["high", "medium", "low", "skip"]);

export const agentEventTypeSchema = z.enum([
  "crawl_source",
  "score_job",
  "generate_resume",
  "generate_cover_letter",
  "classify_email_status",
  "create_agent_event",
  "workflow_run",
  "user_action",
]);

export const workflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1);

export const profileFormSchema = z
  .object({
    targetRoles: z.array(nonEmptyString).min(1, "Add at least one target role"),
    targetLocations: z
      .array(nonEmptyString)
      .min(1, "Add at least one target location"),
    remotePreference: remotePreferenceSchema,
    salaryMin: z.number().int().nonnegative().optional(),
    salaryMax: z.number().int().positive().optional(),
    salaryCurrency: z.string().trim().length(3).default("USD"),
    skills: z.array(nonEmptyString).min(1, "Add at least one skill"),
    workAuthorizationNotes: trimmedString.max(2_000).optional(),
    experienceSummary: trimmedString.min(20).max(5_000),
    applicationPreferences: trimmedString.max(2_000).optional(),
    preferredCoverLetterTone: z
      .enum(["professional", "warm", "direct", "enthusiastic"])
      .default("professional"),
    baseResumeText: trimmedString.min(
      100,
      "Paste at least 100 characters from your resume",
    ),
  })
  .refine(
    (value) =>
      value.salaryMin === undefined ||
      value.salaryMax === undefined ||
      value.salaryMax >= value.salaryMin,
    {
      message: "Maximum salary must be greater than minimum salary",
      path: ["salaryMax"],
    },
  );

const optionalSalaryInput = z
  .union([
    z.literal(""),
    z.string().regex(/^\d+$/, "Enter a whole number"),
  ])
  .transform((value) => (value === "" ? undefined : Number(value)));

export const profileEditorSchema = z
  .object({
    targetRolesText: nonEmptyString,
    targetLocationsText: nonEmptyString,
    remotePreference: remotePreferenceSchema,
    salaryMin: optionalSalaryInput,
    salaryMax: optionalSalaryInput,
    salaryCurrency: z.string().trim().length(3).default("USD"),
    skillsText: nonEmptyString,
    workAuthorizationNotes: trimmedString.max(2_000).optional(),
    experienceSummary: trimmedString.min(20).max(5_000),
    applicationPreferences: trimmedString.max(2_000).optional(),
    preferredCoverLetterTone: z
      .enum(["professional", "warm", "direct", "enthusiastic"])
      .default("professional"),
    baseResumeText: trimmedString.min(
      100,
      "Paste at least 100 characters from your resume",
    ),
  })
  .refine(
    (value) =>
      value.salaryMin === undefined ||
      value.salaryMax === undefined ||
      value.salaryMax >= value.salaryMin,
    {
      message: "Maximum salary must be greater than minimum salary",
      path: ["salaryMax"],
    },
  )
  .transform((value) => ({
    targetRoles: splitList(value.targetRolesText),
    targetLocations: splitList(value.targetLocationsText),
    remotePreference: value.remotePreference,
    salaryMin: value.salaryMin,
    salaryMax: value.salaryMax,
    salaryCurrency: value.salaryCurrency,
    skills: splitList(value.skillsText),
    workAuthorizationNotes: value.workAuthorizationNotes,
    experienceSummary: value.experienceSummary,
    applicationPreferences: value.applicationPreferences,
    preferredCoverLetterTone: value.preferredCoverLetterTone,
    baseResumeText: value.baseResumeText,
  }));

function splitList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export const jobSourceInputSchema = z.object({
  label: nonEmptyString.max(255),
  sourceUrl: z
    .url("Enter a valid URL")
    .refine((url) => ["http:", "https:"].includes(new URL(url).protocol), {
      message: "Only HTTP and HTTPS URLs are supported",
    }),
});

export const crawlJobInputSchema = z.object({
  jobSourceId: z.uuid(),
});

export const scoreJobInputSchema = z.object({
  jobId: z.uuid(),
});

export const scoringResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(nonEmptyString).max(12),
  requiredSkillGaps: z.array(nonEmptyString).max(12),
  preferredSkillGaps: z.array(nonEmptyString).max(12),
  rationale: nonEmptyString.max(4_000),
  suggestedResumeImprovements: z.array(nonEmptyString).max(12),
  priority: matchPrioritySchema,
});

export const generateResumeInputSchema = z.object({
  jobId: z.uuid(),
});

export const generateCoverLetterInputSchema = z.object({
  jobId: z.uuid(),
  tone: z
    .enum(["professional", "warm", "direct", "enthusiastic"])
    .default("professional"),
});

export const generatedDocumentSchema = z.object({
  markdown: nonEmptyString,
  changeSummary: nonEmptyString.max(4_000),
});

export const applicationInputSchema = z.object({
  jobId: z.uuid(),
  resumeVersionId: z.uuid().optional(),
});

export const applicationUpdateSchema = z.object({
  applicationId: z.uuid(),
  status: applicationStatusSchema,
  notes: trimmedString.max(10_000).optional(),
  followUpAt: z.iso.datetime().nullable().optional(),
  resumeVersionId: z.uuid().nullable().optional(),
});

export const approveDocumentSchema = z.discriminatedUnion("documentType", [
  z.object({
    documentType: z.literal("resume"),
    documentId: z.uuid(),
  }),
  z.object({
    documentType: z.literal("cover_letter"),
    documentId: z.uuid(),
  }),
]);

export const updateDocumentSchema = z.discriminatedUnion("documentType", [
  z.object({
    documentType: z.literal("resume"),
    documentId: z.uuid(),
    markdown: nonEmptyString.max(100_000),
  }),
  z.object({
    documentType: z.literal("cover_letter"),
    documentId: z.uuid(),
    markdown: nonEmptyString.max(30_000),
  }),
]);

export const classifyEmailInputSchema = z.object({
  applicationId: z.uuid(),
  subject: trimmedString.max(500).optional(),
  fromAddress: z.email().optional(),
  toAddress: z.email().optional(),
  bodyText: nonEmptyString.max(100_000),
  receivedAt: z.iso.datetime().optional(),
});

export const emailClassificationSchema = z.object({
  suggestedStatus: applicationStatusSchema,
  confidence: z.number().int().min(0).max(100),
  rationale: nonEmptyString.max(2_000),
});

export const applyEmailSuggestionSchema = z.object({
  emailMessageId: z.uuid(),
});

const n8nBaseSchema = z.object({
  idempotencyKey: nonEmptyString.max(255),
  userId: z.uuid(),
});

export const n8nWebhookSchema = z.discriminatedUnion("event", [
  n8nBaseSchema.extend({
    event: z.literal("crawl_source"),
    payload: crawlJobInputSchema,
  }),
  n8nBaseSchema.extend({
    event: z.literal("score_job"),
    payload: scoreJobInputSchema,
  }),
  n8nBaseSchema.extend({
    event: z.literal("classify_email_status"),
    payload: classifyEmailInputSchema,
  }),
  n8nBaseSchema.extend({
    event: z.literal("create_agent_event"),
    payload: z.object({
      eventType: agentEventTypeSchema,
      summary: nonEmptyString.max(1_000),
      jobId: z.uuid().optional(),
      applicationId: z.uuid().optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type RemotePreference = z.infer<typeof remotePreferenceSchema>;
export type MatchPriority = z.infer<typeof matchPrioritySchema>;
export type AgentEventType = z.infer<typeof agentEventTypeSchema>;
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type ProfileEditorInput = z.input<typeof profileEditorSchema>;
export type JobSourceInput = z.infer<typeof jobSourceInputSchema>;
export type ScoringResult = z.infer<typeof scoringResultSchema>;
export type ApplicationUpdate = z.infer<typeof applicationUpdateSchema>;
