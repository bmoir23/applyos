# ApplyOS Architecture Decisions

## Non-negotiables

1. **HITL required** — Every application submission handoff, outbound email,
   calendar creation, and email-derived stage change requires an explicit
   approval record before execution.
2. **Next.js is the write boundary** — Authorization, Zod validation, and all
   Neon writes happen in ApplyOS. n8n orchestrates only signed machine APIs.
3. **Neon pgvector is the vector source of truth** — Embeddings are generated
   with Cloudflare Workers AI `@cf/baai/bge-base-en-v1.5` (768 dims, `cls`
   pooling) and stored in Neon. Cloudflare KV is best-effort only.
4. **Netlify hosts Next.js** — Cloudflare handles DNS, Email Routing, Workers
   AI / AI Gateway, and the inbound email Worker.
5. **Consented scraping only** — Firecrawl runs against user-approved public
   URLs. ApplyOS does not bypass LinkedIn authentication or anti-bot controls.

## Schema divergence from the PRD sketch

The PRD includes a denormalized `applications` table with inline company and
document fields. ApplyOS keeps the normalized model:

- `companies` + `jobs` + `applications`
- `resumes` / `resume_versions` + `cover_letters`
- `approval_requests` for HITL
- `email_identities` / `email_threads` / `email_messages`
- `tribes` / memberships / posts / milestones

This preserves referential integrity, versioning, and auditability.

## Orchestration model

```
User / Schedule / Email Worker
        │
        ▼
       n8n  ──signed HMAC──▶  ApplyOS machine APIs
                                    │
                                    ▼
                              Neon Postgres
```

n8n never receives a Neon connection string. Long workflows return `202` with a
`workflowRunId` and persist progress in `workflow_runs`.

## Embedding contract

| Field | Value |
|---|---|
| Model | `@cf/baai/bge-base-en-v1.5` |
| Dimensions | 768 |
| Pooling | `cls` (fixed; never mix with `mean`) |
| Distance | Cosine (`<=>` / Drizzle `cosineDistance`) |
| Index | HNSW `vector_cosine_ops` after backfill |

## Email domains

| Purpose | Hostname |
|---|---|
| Inbound (Cloudflare Email Routing) | `inbound.applyos.me` |
| Outbound (Resend) | `mail.applyos.me` |
| User display | `{subdomain}@inbound.applyos.me` |
