ALTER TYPE "public"."match_priority" ADD VALUE 'skip';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_version_id" uuid;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "tone" varchar(64) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "user_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "status_suggestion_applied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "requirements_markdown" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "responsibilities_markdown" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "source_url" text;--> statement-breakpoint
UPDATE "jobs"
SET "source_url" = COALESCE(
  "apply_url",
  'https://legacy.invalid/jobs/' || "id"::text
)
WHERE "source_url" IS NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" varchar(8) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "discovered_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD COLUMN "user_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "work_authorization_notes" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "experience_summary" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "application_preferences" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "preferred_cover_letter_tone" varchar(64) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "idempotency_key" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_events_user_created_idx" ON "agent_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_events_job_id_idx" ON "agent_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "agent_events_application_id_idx" ON "agent_events" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_job_unique" ON "applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "applications_follow_up_idx" ON "applications" USING btree ("user_id","follow_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_website_url_unique" ON "companies" USING btree ("website_url");--> statement-breakpoint
CREATE INDEX "cover_letters_user_id_idx" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cover_letters_job_id_idx" ON "cover_letters" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "cover_letters_application_id_idx" ON "cover_letters" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "email_messages_user_id_idx" ON "email_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_messages_application_id_idx" ON "email_messages" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_sources_user_url_unique" ON "job_sources" USING btree ("user_id","source_url");--> statement-breakpoint
CREATE INDEX "job_sources_user_active_idx" ON "job_sources" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_user_source_url_unique" ON "jobs" USING btree ("user_id","source_url");--> statement-breakpoint
CREATE INDEX "jobs_user_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "jobs_user_created_idx" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_source_id_idx" ON "jobs" USING btree ("job_source_id");--> statement-breakpoint
CREATE INDEX "resume_versions_resume_id_idx" ON "resume_versions" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_versions_job_id_idx" ON "resume_versions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_idempotency_unique" ON "workflow_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "workflow_runs_user_status_idx" ON "workflow_runs" USING btree ("user_id","status");