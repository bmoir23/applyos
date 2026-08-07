# ApplyOS n8n Hybrid Orchestration

ApplyOS uses [n8n](https://n8n.io) for scheduled and webhook-driven automation. Workflows call the internal automation API, which executes domain logic in the Next.js app and records every run in `workflow_runs`.

## Architecture

```
n8n workflow → POST /api/internal/automation → ApplyOS services → workflow_runs
```

A legacy endpoint remains at `POST /api/webhooks/n8n` for backward-compatible shared-secret calls with a smaller event set.

## Workflows

| File | Name | Trigger | Events |
|------|------|---------|--------|
| `workflows/wf1-profile-extraction.json` | Profile Extraction | Daily schedule | `profile_ingest` |
| `workflows/wf2-discovery-match.json` | Discovery & Match | 6-hour schedule | `crawl_source` → `embed_job` → `score_job` |
| `workflows/wf3-asset-customization.json` | Asset Customization | Webhook | `prepare_application` |
| `workflows/wf4-inbound-email.json` | Inbound Email | Webhook | `classify_email_status` |
| `workflows/wf-error-handler.json` | Error Handler | Error trigger | `create_agent_event` |

### Placeholders

Before activating workflows, replace these placeholder values in HTTP Request node bodies (or wire them from upstream nodes):

- **`USER_UUID`** — ApplyOS user id (`users.id`)
- **`JOB_SOURCE_UUID`** — configured job source id for crawling (`job_sources.id`)

WF2 assumes a downstream node provides `jobId` after crawl; adjust the Embed/Score nodes once your crawl response shape is finalized.

## Environment Variables

Set these in **both** ApplyOS and n8n:

| Variable | Where | Purpose |
|----------|-------|---------|
| `APPLYOS_BASE_URL` | n8n | Base URL for API calls (e.g. `https://applyos.me`) |
| `N8N_WEBHOOK_SECRET` | ApplyOS + n8n | Legacy shared-secret header auth |
| `N8N_HMAC_SECRET` | ApplyOS + n8n | HMAC signing secret (recommended for production) |
| `N8N_WEBHOOK_URL` | ApplyOS (optional) | Outbound webhook target if ApplyOS calls n8n |

ApplyOS reads secrets from `.env.local` / deployment env. In n8n, add the same values under **Settings → Variables** or instance env.

## Authentication

The automation API accepts **either** method:

### 1. Legacy shared secret (simple)

```http
POST /api/internal/automation
x-n8n-webhook-secret: <N8N_WEBHOOK_SECRET>
Content-Type: application/json
```

Workflow stubs use this method via `$env.N8N_WEBHOOK_SECRET`.

### 2. HMAC signatures (recommended)

Sign the raw request body with `N8N_HMAC_SECRET`:

```
signature = HMAC-SHA256(secret, "<timestamp>.<rawBody>")
```

```http
POST /api/internal/automation
x-applyos-timestamp: 1722988800000
x-applyos-signature: <hex digest>
Content-Type: application/json
```

Timestamps must be within **5 minutes** of server time. Use the same raw JSON string for signing and sending.

Example (Node.js):

```ts
import { createHmac } from "node:crypto";

const timestamp = String(Date.now());
const body = JSON.stringify(payload);
const signature = createHmac("sha256", process.env.N8N_HMAC_SECRET!)
  .update(`${timestamp}.${body}`)
  .digest("hex");
```

ApplyOS implements the same algorithm in `lib/n8n/hmac.ts`.

## Import Steps

1. Deploy ApplyOS with `N8N_WEBHOOK_SECRET` and/or `N8N_HMAC_SECRET` configured.
2. In n8n, set `APPLYOS_BASE_URL`, `N8N_WEBHOOK_SECRET`, and optionally `N8N_HMAC_SECRET`.
3. Import workflows from `n8n/workflows/` (**Workflows → Import from File**).
4. Open each workflow and replace `USER_UUID` / `JOB_SOURCE_UUID` placeholders.
5. Import `wf-error-handler.json` first, then assign it as the **Error Workflow** on WF1–WF4 (**Workflow Settings → Error Workflow**).
6. Test with workflows **inactive**, using **Execute Workflow**, then activate.

## Idempotency

Every request requires an `idempotencyKey`. Duplicate keys return:

```json
{
  "duplicate": true,
  "workflowRunId": "...",
  "status": "succeeded",
  "output": { }
}
```

Use execution-scoped keys in n8n expressions, e.g. `'crawl-' + $execution.id`.

## Human-in-the-loop

`send_email` and `create_calendar_event` **do not execute immediately**. They create a pending `approval_requests` row and return `{ approvalId, status: "pending" }`. Users approve actions in the ApplyOS HITL workspace.

## Error Workflow

`wf-error-handler.json` listens for failed executions via n8n's **Error Trigger** node and posts a `create_agent_event` with `eventType: "system_error"`. Assign it as the error workflow on all production workflows so failures surface in the agent timeline.

## Event Reference

See [`docs/N8N_CONTRACTS.md`](../docs/N8N_CONTRACTS.md) for the full event catalog and example payloads.

## Local Development

```bash
# ApplyOS
N8N_WEBHOOK_SECRET=dev-secret N8N_HMAC_SECRET=dev-hmac-secret npm run dev

# n8n (Docker example)
docker run -it --rm \
  -e APPLYOS_BASE_URL=http://host.docker.internal:3000 \
  -e N8N_WEBHOOK_SECRET=dev-secret \
  -p 5678:5678 \
  n8nio/n8n
```

Test the endpoint:

```bash
curl -X POST http://localhost:3000/api/internal/automation \
  -H "Content-Type: application/json" \
  -H "x-n8n-webhook-secret: dev-secret" \
  -d '{"event":"create_agent_event","userId":"<uuid>","idempotencyKey":"test-1","payload":{"eventType":"system_error","summary":"smoke test"}}'
```
