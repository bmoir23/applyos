import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
  ...timestamps,
});

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
  ...timestamps,
}, (table) => [
  uniqueIndex("applications_user_job_unique").on(table.userId, table.jobId),
  index("applications_user_status_idx").on(table.userId, table.status),
  index("applications_follow_up_idx").on(table.userId, table.followUpAt),
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
  ...timestamps,
}, (table) => [
  index("email_messages_user_id_idx").on(table.userId),
  index("email_messages_application_id_idx").on(table.applicationId),
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

export const resumeVersionsRelations = relations(resumeVersions, ({ one, many }) => ({
  resume: one(resumes, {
    fields: [resumeVersions.resumeId],
    references: [resumes.id],
  }),
  job: one(jobs, {
    fields: [resumeVersions.jobId],
    references: [jobs.id],
  }),
  applications: many(applications),
}));

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
  }),
);

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
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
}));

export const emailMessagesRelations = relations(emailMessages, ({ one }) => ({
  user: one(users, {
    fields: [emailMessages.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [emailMessages.applicationId],
    references: [applications.id],
  }),
}));

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
