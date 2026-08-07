# Staged rollout

Roll out behind `FEATURE_FLAGS` in this order:

1. Schema + read compatibility (`pnpm db:migrate` on Neon branch)
2. `profile_ingestion`
3. `semantic_matching`
4. n8n workflows (import JSON from `n8n/workflows`)
5. `hitl_workspace`
6. `kanban`
7. `inbox`
8. `tribes`

At each gate:

- Run `pnpm check`
- Deploy Netlify preview
- Verify migration on Neon branch
- Confirm HITL still blocks outbound actions
- Note rollback: unset feature flag; schema remains additive

## Observability

- Agent events are written for ingest, score, embed, approvals, stage moves, hire unlock
- Workflow runs store input/output for n8n correlation IDs
- PostHog identifies signed-in users in the app shell

## Preview validation checklist

1. Neon branch migrated with `0002_prd_expansion`
2. Netlify preview env includes Clerk, Neon, and `FEATURE_FLAGS=profile_ingestion,semantic_matching,kanban,inbox,tribes,hitl_workspace`
3. `pnpm check` and production build pass in CI
4. Manual smoke: onboard → scorecard → match → prepare/approve → Kanban → inbox draft → Hired → Tribes
5. Confirm no outbound email/calendar/send without an approval row
6. Rollback = unset the relevant feature flag; additive schema stays in place
