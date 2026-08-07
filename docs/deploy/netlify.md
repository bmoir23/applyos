# Netlify Deployment

## Prerequisites

- Netlify account linked via `npx netlify login`
- Neon `DATABASE_URL`
- Clerk keys
- Optional: Firecrawl, Workers AI, n8n, Resend secrets

## First-time link

```bash
pnpm install
npx netlify init
npx netlify env:import .env.local   # or set secrets in the Netlify UI
npx netlify deploy                 # preview
npx netlify deploy --prod          # production
```

## Build

`netlify.toml` uses `pnpm build`. Next.js App Router / API routes are handled
by the Netlify Next.js runtime automatically — no manual Functions required.

## Environment

Set all variables from `.env.example` in **Site settings → Environment
variables**. Never commit secrets. Client-visible values must use the
`NEXT_PUBLIC_` prefix.

## Migrations

Run migrations against Neon before (or during) deploy:

```bash
pnpm db:migrate
```

Prefer a Neon branch for preview validation.
