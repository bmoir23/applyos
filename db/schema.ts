import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  varchar,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "discovered",
  "saved",
  "skipped",
  "archived",
]);

export const applicationStatusEnum = pgEnum("application_status", [
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

export const remotePreferenceEnum = pgEnum("remote_preference", [
  "remote",
  "hybrid",
  "onsite",
  "any",
]);

export const matchPriorityEnum = pgEnum("match_priority", [
  "high",
  "medium",
  "low",
  "skip",
]);

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const agentEventTypeEnum = pgEnum("agent_event_type", [
  "crawl_source",
  "score_job",
  "generate_resume",
  "generate_cover_letter",
  "classify_email_status",
  "create_agent_event",
  "workflow_run",
  "user_action",
  "profile_ingest",
  "embed_job",
  "embed_profile",
  "prepare_application",
  "send_email",
  "create_calendar_event",
  "tribe_unlock",
  "milestone_generate",
]);

export const kanbanStageEnum = pgEnum("kanban_stage", [
  "applied",
  "follow_up_needed",
  "waiting_to_hear_back",
  "interview_scheduled",
  "interview_completed",
  "waiting_for_offer",
  "offer_pending",
  "rejected_closed",
  "hired",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled",
]);

export const approvalActionTypeEnum = pgEnum("approval_action_type", [
  "external_submit",
  "send_email",
  "create_calendar_event",
  "apply_email_status",
  "publish_document",
]);

export const emailDirectionEnum = pgEnum("email_direction", [
  "inbound",
  "outbound",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/** App user mirrored from Clerk (`clerkUserId`). */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("first_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }),
  imageUrl: text("image_url"),
  emailSubdomain: varchar("email_subdomain", { length: 120 }),
  hiredAt: timestamp("hired_at", { withTimezone: true }),
  communityUnlockedAt: timestamp("community_unlocked_at", {
    withTimezone: true,
  }),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_email_subdomain_unique").on(table.emailSubdomain),
]);

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  targetRoles: jsonb("target_roles").$type<string[]>().default([]).notNull(),
  targetLocations: jsonb("target_locations")
    .$type<string[]>()
    .default([])
    .notNull(),
  remotePreference: remotePreferenceEnum("remote_preference")
    .default("any")
    .notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 8 }).default("USD"),
  skills: jsonb("skills").$type<string[]>().default([]).notNull(),
  workAuthorizationNotes: text("work_authorization_notes"),
  experienceSummary: text("experience_summary"),
  applicationPreferences: text("application_preferences"),
  preferredCoverLetterTone: varchar("preferred_cover_letter_tone", {
    length: 64,
  }).default("professional"),
  baseResumeText: text("base_resume_text"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  linkedinUrl: text("linkedin_url"),
  nonNegotiables: jsonb("non_negotiables").$type<string[]>(),
  scorecardData: jsonb("scorecard_data").$type<Record<string, unknown>>(),
  profileEmbedding: vector("profile_embedding", { dimensions: 768 }),
  embeddingModel: varchar("embedding_model", { length: 120 }),
  embeddingPooling: varchar("embedding_pooling", { length: 64 }),
  embeddingContentHash: varchar("embedding_content_hash", { length: 128 }),
  embeddedAt: timestamp("embedded_at", { withTimezone: true }),
  onboardingStep: varchar("onboarding_step", { length: 64 }),
  ...timestamps,
});

export const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  ...timestamps,
}, (table) => [
  index("resumes_user_id_idx").on(table.userId),
]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: text("website_url"),
  careersUrl: text("careers_url"),
  linkedinUrl: text("linkedin_url"),
  description: text("description"),
  ...timestamps,
}, (table) => [
  uniqueIndex("companies_website_url_unique").on(table.websiteUrl),
]);

export const jobSources = pgTable("job_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  label: varchar("label", { length: 255 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("job_sources_user_url_unique").on(table.userId, table.sourceUrl),
  index("job_sources_user_active_idx").on(table.userId, table.isActive),
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  jobSourceId: uuid("job_source_id").references(() => jobSources.id, {
    onDelete: "set null",
  }),
  externalId: varchar("external_id", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  remoteType: varchar("remote_type", { length: 64 }),
  employmentType: varchar("employment_type", { length: 64 }),
  descriptionMarkdown: text("description_markdown"),
  descriptionRaw: text("description_raw"),
  requirementsMarkdown: text("requirements_markdown"),
  responsibilitiesMarkdown: text("responsibilities_markdown"),
  sourceUrl: text("source_url").notNull(),
  applyUrl: text("apply_url"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 8 }).default("USD"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  discoveredAt: timestamp("discovered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: jobStatusEnum("status").default("discovered").notNull(),
  // Match scoring (populated in Phase 4)
  matchScore: integer("match_score"),
  matchStrengths: jsonb("match_strengths").$type<string[]>(),
  matchGapsRequired: jsonb("match_gaps_required").$type<string[]>(),
  matchGapsPreferred: jsonb("match_gaps_preferred").$type<string[]>(),
  matchPriority: matchPriorityEnum("match_priority"),
  matchRationale: text("match_rationale"),
  suggestedResumeImprovements: jsonb("suggested_resume_improvements").$type<
    string[]
  >(),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
  jobEmbedding: vector("job_embedding", { dimensions: 768 }),
  embeddingModel: varchar("embedding_model", { length: 120 }),
  embeddingPooling: varchar("embedding_pooling", { length: 64 }),
  embeddingContentHash: varchar("embedding_content_hash", { length: 128 }),
  embeddedAt: timestamp("embedded_at", { withTimezone: true }),
  matchBadges: jsonb("match_badges").$type<string[]>(),
  semanticScore: integer("semantic_score"),
  cosineDistance: real("cosine_distance"),
  ...timestamps,
}, (table) => [
  uniqueIndex("jobs_user_source_url_unique").on(table.userId, table.sourceUrl),
  index("jobs_user_status_idx").on(table.userId, table.status),
  index("jobs_user_created_idx").on(table.userId, table.createdAt),
  index("jobs_source_id_idx").on(table.jobSourceId),
]);

export const resumeVersions = pgTable("resume_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  resumeId: uuid("resume_id")
    .notNull()
    .references(() => resumes.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  versionLabel: varchar("version_label", { length: 120 }).notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  changeSummary: text("change_summary"),
  source: varchar("source", { length: 64 }).default("manual").notNull(),
  userApprovedAt: timestamp("user_approved_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("resume_versions_resume_id_idx").on(table.resumeId),
  index("resume_versions_job_id_idx").on(table.jobId),
]);

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  resumeVersionId: uuid("resume_version_id").references(
    () => resumeVersions.id,
    { onDelete: "set null" },
  ),
  status: applicationStatusEnum("status").default("interested").notNull(),
  notes: text("notes"),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  // External submission requires explicit user approval (never auto-submit)
  userApprovedExternalSubmit: boolean("user_approved_external_submit")
    .default(false)
    .notNull(),
  kanbanStage: kanbanStageEnum("kanban_stage").default("applied").notNull(),
  hiredAt: timestamp("hired_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("applications_user_job_unique").on(table.userId, table.jobId),
  index("applications_user_status_idx").on(table.userId, table.status),
  index("applications_follow_up_idx").on(table.userId, table.followUpAt),
  index("applications_user_kanban_stage_idx").on(
    table.userId,
    table.kanbanStage,
  ),
]);

export const coverLetters = pgTable("cover_letters", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  changeSummary: text("change_summary"),
  tone: varchar("tone", { length: 64 }).default("professional"),
  userApprovedAt: timestamp("user_approved_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("cover_letters_user_id_idx").on(table.userId),
  index("cover_letters_job_id_idx").on(table.jobId),
  index("cover_letters_application_id_idx").on(table.applicationId),
]);

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actionType: approvalActionTypeEnum("action_type").notNull(),
  status: approvalStatusEnum("status").default("pending").notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  rationale: text("rationale"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("approval_requests_user_status_idx").on(table.userId, table.status),
  index("approval_requests_resource_idx").on(
    table.resourceType,
    table.resourceId,
  ),
]);

export const emailIdentities = pgTable("email_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  subdomain: varchar("subdomain", { length: 120 }).notNull(),
  displayAddress: varchar("display_address", { length: 320 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("email_identities_subdomain_unique").on(table.subdomain),
]);

export const emailThreads = pgTable("email_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  subject: varchar("subject", { length: 500 }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("email_threads_user_id_idx").on(table.userId),
  index("email_threads_application_id_idx").on(table.applicationId),
  index("email_threads_user_last_message_idx").on(
    table.userId,
    table.lastMessageAt,
  ),
]);

export const emailMessages = pgTable("email_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  subject: varchar("subject", { length: 500 }),
  fromAddress: varchar("from_address", { length: 320 }),
  toAddress: varchar("to_address", { length: 320 }),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  classifiedStatus: applicationStatusEnum("classified_status"),
  classificationConfidence: integer("classification_confidence"),
  statusSuggestionAppliedAt: timestamp("status_suggestion_applied_at", {
    withTimezone: true,
  }),
  threadId: uuid("thread_id").references(() => emailThreads.id, {
    onDelete: "set null",
  }),
  messageId: varchar("message_id", { length: 512 }),
  direction: emailDirectionEnum("direction"),
  draftBodyText: text("draft_body_text"),
  draftSubject: varchar("draft_subject", { length: 500 }),
  sendApprovedAt: timestamp("send_approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  providerMessageId: varchar("provider_message_id", { length: 512 }),
  attachmentMeta: jsonb("attachment_meta").$type<
    Array<{
      filename: string;
      contentType?: string;
      sizeBytes?: number;
      url?: string;
    }>
  >(),
  ...timestamps,
}, (table) => [
  index("email_messages_user_id_idx").on(table.userId),
  index("email_messages_application_id_idx").on(table.applicationId),
  index("email_messages_thread_id_idx").on(table.threadId),
  uniqueIndex("email_messages_message_id_unique").on(table.messageId),
]);

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"),
  icsContent: text("ics_content"),
  approvalRequestId: uuid("approval_request_id").references(
    () => approvalRequests.id,
    { onDelete: "set null" },
  ),
  externalEventId: varchar("external_event_id", { length: 255 }),
  ...timestamps,
}, (table) => [
  index("calendar_events_user_id_idx").on(table.userId),
  index("calendar_events_application_id_idx").on(table.applicationId),
  index("calendar_events_starts_at_idx").on(table.userId, table.startsAt),
]);

export const applicationPackets = pgTable("application_packets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  resumeVersionId: uuid("resume_version_id").references(
    () => resumeVersions.id,
    { onDelete: "set null" },
  ),
  coverLetterId: uuid("cover_letter_id").references(() => coverLetters.id, {
    onDelete: "set null",
  }),
  promptInstructions: text("prompt_instructions"),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  ...timestamps,
}, (table) => [
  index("application_packets_user_id_idx").on(table.userId),
  index("application_packets_job_id_idx").on(table.jobId),
  index("application_packets_application_id_idx").on(table.applicationId),
]);

export const tribes = pgTable("tribes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ...timestamps,
}, (table) => [
  uniqueIndex("tribes_slug_unique").on(table.slug),
]);

export const tribeMemberships = pgTable("tribe_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  tribeId: uuid("tribe_id")
    .notNull()
    .references(() => tribes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 64 }).default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("tribe_memberships_tribe_user_unique").on(
    table.tribeId,
    table.userId,
  ),
  index("tribe_memberships_user_id_idx").on(table.userId),
]);

export const tribePosts = pgTable("tribe_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tribeId: uuid("tribe_id")
    .notNull()
    .references(() => tribes.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  ...timestamps,
}, (table) => [
  index("tribe_posts_tribe_id_idx").on(table.tribeId),
  index("tribe_posts_author_user_id_idx").on(table.authorUserId),
  index("tribe_posts_tribe_created_idx").on(table.tribeId, table.createdAt),
]);

export const tribePostReplies = pgTable("tribe_post_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => tribePosts.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bodyMarkdown: text("body_markdown").notNull(),
  ...timestamps,
}, (table) => [
  index("tribe_post_replies_post_id_idx").on(table.postId),
  index("tribe_post_replies_author_user_id_idx").on(table.authorUserId),
]);

export const careerMilestones = pgTable("career_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planType: varchar("plan_type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  approvalRequestId: uuid("approval_request_id").references(
    () => approvalRequests.id,
    { onDelete: "set null" },
  ),
  ...timestamps,
}, (table) => [
  index("career_milestones_user_id_idx").on(table.userId),
  index("career_milestones_user_plan_type_idx").on(table.userId, table.planType),
]);

export const careerAchievements = pgTable("career_achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  evidenceUrl: text("evidence_url"),
  ...timestamps,
}, (table) => [
  index("career_achievements_user_id_idx").on(table.userId),
]);

export const compensationEntries = pgTable("compensation_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }),
  notes: text("notes"),
  ...timestamps,
}, (table) => [
  index("compensation_entries_user_id_idx").on(table.userId),
]);

export const mentorshipOffers = pgTable("mentorship_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tribeId: uuid("tribe_id").references(() => tribes.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [
  index("mentorship_offers_user_id_idx").on(table.userId),
  index("mentorship_offers_tribe_id_idx").on(table.tribeId),
]);

export const referralRequests = pgTable("referral_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterUserId: uuid("requester_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  helperUserId: uuid("helper_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  roleTitle: varchar("role_title", { length: 255 }).notNull(),
  status: varchar("status", { length: 64 }).default("pending").notNull(),
  notes: text("notes"),
  ...timestamps,
}, (table) => [
  index("referral_requests_requester_user_id_idx").on(table.requesterUserId),
  index("referral_requests_helper_user_id_idx").on(table.helperUserId),
]);

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  source: varchar("source", { length: 64 }).default("n8n").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  status: workflowRunStatusEnum("status").default("pending").notNull(),
  inputPayload: jsonb("input_payload").$type<Record<string, unknown>>(),
  outputPayload: jsonb("output_payload").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("workflow_runs_idempotency_unique").on(table.idempotencyKey),
  index("workflow_runs_user_status_idx").on(table.userId, table.status),
]);

export const agentEvents = pgTable("agent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, {
    onDelete: "set null",
  }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  eventType: agentEventTypeEnum("event_type").notNull(),
  summary: text("summary").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ...timestamps,
}, (table) => [
  index("agent_events_user_created_idx").on(table.userId, table.createdAt),
  index("agent_events_job_id_idx").on(table.jobId),
  index("agent_events_application_id_idx").on(table.applicationId),
]);

// --- Relations ---

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  resumes: many(resumes),
  jobSources: many(jobSources),
  jobs: many(jobs),
  applications: many(applications),
  coverLetters: many(coverLetters),
  emailMessages: many(emailMessages),
  agentEvents: many(agentEvents),
  emailIdentity: one(emailIdentities, {
    fields: [users.id],
    references: [emailIdentities.userId],
  }),
  approvalRequests: many(approvalRequests),
  approvalDecisions: many(approvalRequests, {
    relationName: "approvalDecidedBy",
  }),
  emailThreads: many(emailThreads),
  calendarEvents: many(calendarEvents),
  applicationPackets: many(applicationPackets),
  tribeMemberships: many(tribeMemberships),
  tribePosts: many(tribePosts),
  tribePostReplies: many(tribePostReplies),
  careerMilestones: many(careerMilestones),
  careerAchievements: many(careerAchievements),
  compensationEntries: many(compensationEntries),
  mentorshipOffers: many(mentorshipOffers),
  referralRequestsSent: many(referralRequests, {
    relationName: "referralRequester",
  }),
  referralRequestsReceived: many(referralRequests, {
    relationName: "referralHelper",
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  versions: many(resumeVersions),
}));

export const resumeVersionsRelations = relations(
  resumeVersions,
  ({ one, many }) => ({
    resume: one(resumes, {
      fields: [resumeVersions.resumeId],
      references: [resumes.id],
    }),
    job: one(jobs, {
      fields: [resumeVersions.jobId],
      references: [jobs.id],
    }),
    applications: many(applications),
    applicationPackets: many(applicationPackets),
  }),
);

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
  jobSources: many(jobSources),
}));

export const jobSourcesRelations = relations(jobSources, ({ one, many }) => ({
  user: one(users, {
    fields: [jobSources.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [jobSources.companyId],
    references: [companies.id],
  }),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  jobSource: one(jobSources, {
    fields: [jobs.jobSourceId],
    references: [jobSources.id],
  }),
  applications: many(applications),
  coverLetters: many(coverLetters),
  resumeVersions: many(resumeVersions),
  applicationPackets: many(applicationPackets),
}));

export const applicationsRelations = relations(
  applications,
  ({ one, many }) => ({
    user: one(users, {
      fields: [applications.userId],
      references: [users.id],
    }),
    job: one(jobs, {
      fields: [applications.jobId],
      references: [jobs.id],
    }),
    resumeVersion: one(resumeVersions, {
      fields: [applications.resumeVersionId],
      references: [resumeVersions.id],
    }),
    coverLetters: many(coverLetters),
    emailMessages: many(emailMessages),
    agentEvents: many(agentEvents),
    emailThreads: many(emailThreads),
    calendarEvents: many(calendarEvents),
    applicationPackets: many(applicationPackets),
  }),
);

export const coverLettersRelations = relations(coverLetters, ({ one, many }) => ({
  user: one(users, {
    fields: [coverLetters.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [coverLetters.jobId],
    references: [jobs.id],
  }),
  application: one(applications, {
    fields: [coverLetters.applicationId],
    references: [applications.id],
  }),
  applicationPackets: many(applicationPackets),
}));

export const approvalRequestsRelations = relations(
  approvalRequests,
  ({ one, many }) => ({
    user: one(users, {
      fields: [approvalRequests.userId],
      references: [users.id],
    }),
    decidedBy: one(users, {
      fields: [approvalRequests.decidedByUserId],
      references: [users.id],
      relationName: "approvalDecidedBy",
    }),
    calendarEvents: many(calendarEvents),
    careerMilestones: many(careerMilestones),
  }),
);

export const emailIdentitiesRelations = relations(emailIdentities, ({ one }) => ({
  user: one(users, {
    fields: [emailIdentities.userId],
    references: [users.id],
  }),
}));

export const emailThreadsRelations = relations(
  emailThreads,
  ({ one, many }) => ({
    user: one(users, {
      fields: [emailThreads.userId],
      references: [users.id],
    }),
    application: one(applications, {
      fields: [emailThreads.applicationId],
      references: [applications.id],
    }),
    messages: many(emailMessages),
  }),
);

export const emailMessagesRelations = relations(emailMessages, ({ one }) => ({
  user: one(users, {
    fields: [emailMessages.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [emailMessages.applicationId],
    references: [applications.id],
  }),
  thread: one(emailThreads, {
    fields: [emailMessages.threadId],
    references: [emailThreads.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [calendarEvents.applicationId],
    references: [applications.id],
  }),
  approvalRequest: one(approvalRequests, {
    fields: [calendarEvents.approvalRequestId],
    references: [approvalRequests.id],
  }),
}));

export const applicationPacketsRelations = relations(
  applicationPackets,
  ({ one }) => ({
    user: one(users, {
      fields: [applicationPackets.userId],
      references: [users.id],
    }),
    job: one(jobs, {
      fields: [applicationPackets.jobId],
      references: [jobs.id],
    }),
    application: one(applications, {
      fields: [applicationPackets.applicationId],
      references: [applications.id],
    }),
    resumeVersion: one(resumeVersions, {
      fields: [applicationPackets.resumeVersionId],
      references: [resumeVersions.id],
    }),
    coverLetter: one(coverLetters, {
      fields: [applicationPackets.coverLetterId],
      references: [coverLetters.id],
    }),
  }),
);

export const tribesRelations = relations(tribes, ({ many }) => ({
  memberships: many(tribeMemberships),
  posts: many(tribePosts),
  mentorshipOffers: many(mentorshipOffers),
}));

export const tribeMembershipsRelations = relations(
  tribeMemberships,
  ({ one }) => ({
    tribe: one(tribes, {
      fields: [tribeMemberships.tribeId],
      references: [tribes.id],
    }),
    user: one(users, {
      fields: [tribeMemberships.userId],
      references: [users.id],
    }),
  }),
);

export const tribePostsRelations = relations(tribePosts, ({ one, many }) => ({
  tribe: one(tribes, {
    fields: [tribePosts.tribeId],
    references: [tribes.id],
  }),
  author: one(users, {
    fields: [tribePosts.authorUserId],
    references: [users.id],
  }),
  replies: many(tribePostReplies),
}));

export const tribePostRepliesRelations = relations(
  tribePostReplies,
  ({ one }) => ({
    post: one(tribePosts, {
      fields: [tribePostReplies.postId],
      references: [tribePosts.id],
    }),
    author: one(users, {
      fields: [tribePostReplies.authorUserId],
      references: [users.id],
    }),
  }),
);

export const careerMilestonesRelations = relations(
  careerMilestones,
  ({ one }) => ({
    user: one(users, {
      fields: [careerMilestones.userId],
      references: [users.id],
    }),
    approvalRequest: one(approvalRequests, {
      fields: [careerMilestones.approvalRequestId],
      references: [approvalRequests.id],
    }),
  }),
);

export const careerAchievementsRelations = relations(
  careerAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [careerAchievements.userId],
      references: [users.id],
    }),
  }),
);

export const compensationEntriesRelations = relations(
  compensationEntries,
  ({ one }) => ({
    user: one(users, {
      fields: [compensationEntries.userId],
      references: [users.id],
    }),
  }),
);

export const mentorshipOffersRelations = relations(
  mentorshipOffers,
  ({ one }) => ({
    user: one(users, {
      fields: [mentorshipOffers.userId],
      references: [users.id],
    }),
    tribe: one(tribes, {
      fields: [mentorshipOffers.tribeId],
      references: [tribes.id],
    }),
  }),
);

export const referralRequestsRelations = relations(
  referralRequests,
  ({ one }) => ({
    requester: one(users, {
      fields: [referralRequests.requesterUserId],
      references: [users.id],
      relationName: "referralRequester",
    }),
    helper: one(users, {
      fields: [referralRequests.helperUserId],
      references: [users.id],
      relationName: "referralHelper",
    }),
  }),
);

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  user: one(users, {
    fields: [workflowRuns.userId],
    references: [users.id],
  }),
  agentEvents: many(agentEvents),
}));

export const agentEventsRelations = relations(agentEvents, ({ one }) => ({
  user: one(users, {
    fields: [agentEvents.userId],
    references: [users.id],
  }),
  workflowRun: one(workflowRuns, {
    fields: [agentEvents.workflowRunId],
    references: [workflowRuns.id],
  }),
  job: one(jobs, {
    fields: [agentEvents.jobId],
    references: [jobs.id],
  }),
  application: one(applications, {
    fields: [agentEvents.applicationId],
    references: [applications.id],
  }),
}));
