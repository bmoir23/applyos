# ApplyOS

AI-powered career navigator: discover jobs, score resume fit, generate tailored documents, and track applications — with explicit user approval before any external action.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Clerk authentication
- Neon Postgres + Drizzle ORM
- Firecrawl structured extraction with deterministic local fallback
- OpenAI-compatible AI provider abstraction (including Cloudflare AI Gateway)
- Authenticated n8n webhook dispatch

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

## MVP status

- Clerk users are provisioned into Neon on first authenticated access.
- Onboarding stores career preferences and immutable base-resume versions.
- Users can approve a public career URL and ingest up to 50 jobs. If
  `FIRECRAWL_API_KEY` is absent, the flow returns one clearly labeled mock job.
- Configured AI providers can score fit and create truthful, editable resume and
  cover-letter drafts. Editing revokes approval until the user reviews again.
- Applications are tracked manually with status, notes, follow-ups, approved
  documents, and an audit trail. No external submission is performed.
- `POST /api/webhooks/n8n` accepts idempotent, event-specific payloads when the
  `x-n8n-webhook-secret` header matches `N8N_WEBHOOK_SECRET`.
- Email classifications remain suggestions until the user approves a status
  change.

## AI configuration

Set an OpenAI-compatible base URL ending before `/chat/completions`. For the
current Cloudflare unified REST API, use the account AI base URL and optionally
set `AI_GATEWAY_ID`; ApplyOS sends it as `cf-aig-gateway-id`.

## Safety boundary

ApplyOS never invents resume facts, automatically submits applications, or
changes an application from an email classification without explicit approval.
