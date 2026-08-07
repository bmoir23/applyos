-- ApplyOS PRD expansion: pgvector, HITL, Kanban, email, tribes, career
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TYPE "public"."kanban_stage" AS ENUM('applied', 'follow_up_needed', 'waiting_to_hear_back', 'interview_scheduled', 'interview_completed', 'waiting_for_offer', 'offer_pending', 'rejected_closed', 'hired');
--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."approval_action_type" AS ENUM('external_submit', 'send_email', 'create_calendar_event', 'apply_email_status', 'publish_document');
--> statement-breakpoint
CREATE TYPE "public"."email_direction" AS ENUM('inbound', 'outbound');
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'profile_ingest';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'embed_job';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'embed_profile';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'prepare_application';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'send_email';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'create_calendar_event';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'tribe_unlock';
--> statement-breakpoint
ALTER TYPE "public"."agent_event_type" ADD VALUE IF NOT EXISTS 'milestone_generate';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_subdomain" varchar(120);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hired_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "community_unlocked_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_subdomain_unique" ON "users" USING btree ("email_subdomain");
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "linkedin_url" text;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "non_negotiables" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "scorecard_data" jsonb;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "profile_embedding" vector(768);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "embedding_model" varchar(120);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "embedding_pooling" varchar(16);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "embedding_content_hash" varchar(128);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "embedded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "onboarding_step" varchar(64);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "job_embedding" vector(768);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "embedding_model" varchar(120);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "embedding_pooling" varchar(16);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "embedding_content_hash" varchar(128);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "embedded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "match_badges" jsonb;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "semantic_score" integer;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "cosine_distance" real;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "kanban_stage" "kanban_stage" DEFAULT 'applied' NOT NULL;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "hired_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "applications" SET "kanban_stage" = CASE "status"
  WHEN 'interviewing' THEN 'interview_scheduled'::"kanban_stage"
  WHEN 'assessment' THEN 'interview_completed'::"kanban_stage"
  WHEN 'offer' THEN 'offer_pending'::"kanban_stage"
  WHEN 'rejected' THEN 'rejected_closed'::"kanban_stage"
  WHEN 'withdrawn' THEN 'rejected_closed'::"kanban_stage"
  WHEN 'archived' THEN 'rejected_closed'::"kanban_stage"
  ELSE 'applied'::"kanban_stage"
END;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "thread_id" uuid;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "message_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "direction" "email_direction" DEFAULT 'inbound';
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "draft_body_text" text;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "draft_subject" varchar(500);
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "send_approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "provider_message_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "attachment_meta" jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "action_type" "approval_action_type" NOT NULL,
  "status" "approval_status" DEFAULT 'pending' NOT NULL,
  "resource_type" varchar(64) NOT NULL,
  "resource_id" uuid NOT NULL,
  "payload" jsonb,
  "rationale" text,
  "decided_at" timestamp with time zone,
  "decided_by_user_id" uuid,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "subdomain" varchar(120) NOT NULL,
  "display_address" varchar(320) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "application_id" uuid,
  "subject" varchar(500),
  "last_message_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "location" varchar(500),
  "ics_content" text,
  "approval_request_id" uuid,
  "external_event_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_packets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "application_id" uuid,
  "resume_version_id" uuid,
  "cover_letter_id" uuid,
  "prompt_instructions" text,
  "status" varchar(64) DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tribes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(120) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tribe_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tribe_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(64) DEFAULT 'member' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tribe_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tribe_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "body_markdown" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tribe_post_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL,
  "body_markdown" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "plan_type" varchar(64) DEFAULT '30_60_90' NOT NULL,
  "title" varchar(255) NOT NULL,
  "content_markdown" text NOT NULL,
  "status" varchar(64) DEFAULT 'draft' NOT NULL,
  "approval_request_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_achievements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "achieved_at" timestamp with time zone,
  "evidence_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compensation_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" varchar(8) DEFAULT 'USD' NOT NULL,
  "effective_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorship_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "tribe_id" uuid,
  "title" varchar(255) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_user_id" uuid NOT NULL,
  "helper_user_id" uuid,
  "company_name" varchar(255) NOT NULL,
  "role_title" varchar(255) NOT NULL,
  "status" varchar(64) DEFAULT 'open' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_identities" ADD CONSTRAINT "email_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_identities_user_id_unique" ON "email_identities" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_identities_subdomain_unique" ON "email_identities" USING btree ("subdomain");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tribes_slug_unique" ON "tribes" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tribe_memberships_tribe_user_unique" ON "tribe_memberships" USING btree ("tribe_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_user_status_idx" ON "approval_requests" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_user_kanban_idx" ON "applications" USING btree ("user_id","kanban_stage");
--> statement-breakpoint
INSERT INTO "tribes" ("slug", "name", "description")
VALUES
  ('not-my-ops-but-my-devops', 'Not My Ops But My DevOps', 'DevOps and infrastructure professionals'),
  ('fully-stacked-warriors', 'Fully Stacked Warriors', 'Full-stack engineers'),
  ('coffee-is-for-closers', 'Coffee is for Closers', 'Sales and account executives'),
  ('head-in-the-clouds', 'Head in the Clouds #cloudlyfe', 'Cloud architects'),
  ('remote-heroes-nomads', 'Remote Heroes & Nomads', 'Location-independent professionals')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- HNSW indexes should be created AFTER embedding backfill in production:
-- CREATE INDEX CONCURRENTLY jobs_embedding_hnsw ON jobs USING hnsw (job_embedding vector_cosine_ops);
-- CREATE INDEX CONCURRENTLY profiles_embedding_hnsw ON user_profiles USING hnsw (profile_embedding vector_cosine_ops);
