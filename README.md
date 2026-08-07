# ApplyOS

AI-powered career navigator: discover jobs, score resume fit, generate tailored
documents, track applications on a Kanban board, and grow post-hire in Tribes —
with explicit user approval before any external action.

## Stack

- Next.js App Router + TypeScript (hosted on Netlify)
- Tailwind CSS + shadcn/ui
- Clerk authentication
- Neon Postgres + Drizzle ORM + pgvector
- Firecrawl structured extraction with deterministic local fallback
- Cloudflare Workers AI embeddings + AI Gateway
- n8n orchestration calling signed ApplyOS machine APIs
- Cloudflare Email Routing (inbound) + Resend (outbound)

## Setup

1. Copy env template and fill in values:

```bash
cp .env.example .env.local
```

2. Install and run:

```bash
pnpm install
pnpm dev
```

3. Apply committed database migrations (requires `DATABASE_URL`):

```bash
pnpm db:migrate
```

4. Verify the application:

```bash
pnpm check
pnpm build
```

See [docs/deploy/netlify.md](docs/deploy/netlify.md) for Netlify deploys and
[docs/architecture/decisions.md](docs/architecture/decisions.md) for product
architecture decisions.

## Product status

- Clerk users are provisioned into Neon on first authenticated access.
- Multimodal onboarding: questionnaire, consented public profile URL, PDF/DOCX.
- Job-Hunt Scorecard synthesizes competencies, targets, and skill gaps.
- Users approve public career URLs; Firecrawl (or mock) ingests jobs.
- Neon pgvector ranks jobs; LLM scoring adds explanations and gaps.
- Prepare Application HITL workspace with edit/re-approve and PDF/text export.
- Kanban stages through Hired; email classifications remain suggestions until
  approved.
- Isolated inbound addresses (`*@inbound.applyos.me`); outbound via Resend after
  approval.
- Hired unlocks ApplyOS Tribes and post-hire milestones.
- n8n workflows call signed machine APIs; Next.js remains the Neon write
  boundary.

## AI configuration

**Chat** — Set an OpenAI-compatible base URL ending before `/chat/completions`.
Optionally set `AI_GATEWAY_ID` for Cloudflare AI Gateway.

**Embeddings** — Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Default
model is `@cf/baai/bge-base-en-v1.5` (768 dims, `cls` pooling).

## Safety boundary

ApplyOS never invents resume facts, automatically submits applications, sends
email, creates calendar events, or changes application status from an email
classification without explicit approval.
