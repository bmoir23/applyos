# n8n Automation Event Contracts

ApplyOS automation events are validated by `automationEventSchema` in `lib/n8n/contracts.ts`. All requests are `POST`ed to `/api/internal/automation` (or the legacy `/api/webhooks/n8n` for a subset).

## Common Envelope

Every event shares these top-level fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | yes | Event discriminator (see below) |
| `userId` | UUID | yes | ApplyOS user id |
| `idempotencyKey` | string (1–255) | yes | Unique key; replays return `duplicate: true` |
| `correlationId` | string (≤255) | no | External trace id (e.g. n8n `$execution.id`) |
| `payload` | object | yes | Event-specific payload |

### Success Response

```json
{
  "workflowRunId": "550e8400-e29b-41d4-a716-446655440000",
  "output": { }
}
```

### Duplicate Response

```json
{
  "duplicate": true,
  "workflowRunId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "succeeded",
  "output": { }
}
```

---

## Events

### `profile_ingest`

Extract or refresh a user profile from questionnaire, LinkedIn, or resume upload.

**Status:** Returns `501` until `lib/services/profileIngestion` is deployed.

```json
{
  "event": "profile_ingest",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "profile-ingest-2026-08-06T12:00:00Z",
  "correlationId": "n8n-exec-abc123",
  "payload": {
    "source": "questionnaire",
    "linkedinUrl": "https://www.linkedin.com/in/example",
    "resumeId": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

| Payload field | Type | Required | Notes |
|---------------|------|----------|-------|
| `source` | `"questionnaire"` \| `"linkedin"` \| `"resume_upload"` | no (default `questionnaire`) | Ingestion channel |
| `linkedinUrl` | URL | no | LinkedIn profile URL |
| `resumeId` | UUID | no | Existing uploaded resume |

---

### `crawl_source`

Crawl a configured job source and store discovered jobs.

```json
{
  "event": "crawl_source",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "crawl-source-660e8400",
  "payload": {
    "jobSourceId": "660e8400-e29b-41d4-a716-446655440002"
  }
}
```

**Output example:**

```json
{
  "mode": "firecrawl",
  "jobsStored": 12
}
```

---

### `embed_job`

Generate and store a vector embedding for semantic job matching.

**Status:** Returns `501` until `lib/services/matching` exports `embedAndStoreJob`.

```json
{
  "event": "embed_job",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "embed-job-770e8400",
  "payload": {
    "jobId": "770e8400-e29b-41d4-a716-446655440003"
  }
}
```

---

### `score_job`

AI-score a job against the user's profile.

```json
{
  "event": "score_job",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "score-job-770e8400",
  "payload": {
    "jobId": "770e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Output example:**

```json
{
  "jobId": "770e8400-e29b-41d4-a716-446655440003",
  "score": 82,
  "priority": "high",
  "rationale": "Strong skill overlap with React and TypeScript requirements."
}
```

---

### `prepare_application`

Generate tailored resume and cover letter drafts for a job (stub uses document generation services).

```json
{
  "event": "prepare_application",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "prepare-770e8400-app-880e8400",
  "payload": {
    "jobId": "770e8400-e29b-41d4-a716-446655440003",
    "applicationId": "880e8400-e29b-41d4-a716-446655440004",
    "resumeVersionId": "990e8400-e29b-41d4-a716-446655440005",
    "coverLetterId": "aa0e8400-e29b-41d4-a716-446655440006",
    "promptInstructions": "Emphasize platform engineering experience."
  }
}
```

| Payload field | Type | Required | Notes |
|---------------|------|----------|-------|
| `jobId` | UUID | yes | Target job |
| `applicationId` | UUID | no | Link to existing application |
| `resumeVersionId` | UUID | no | Skip resume generation if provided |
| `coverLetterId` | UUID | no | Skip cover letter generation if provided |
| `promptInstructions` | string (≤5000) | no | Extra generation guidance |

**Output example:**

```json
{
  "jobId": "770e8400-e29b-41d4-a716-446655440003",
  "applicationId": "880e8400-e29b-41d4-a716-446655440004",
  "resumeVersionId": "990e8400-e29b-41d4-a716-446655440005",
  "coverLetterId": "aa0e8400-e29b-41d4-a716-446655440006"
}
```

---

### `classify_email_status`

Classify an inbound application email and suggest a pipeline status.

```json
{
  "event": "classify_email_status",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "email-msg-bb0e8400",
  "payload": {
    "applicationId": "880e8400-e29b-41d4-a716-446655440004",
    "subject": "Re: Senior Engineer — Interview availability",
    "fromAddress": "recruiter@company.com",
    "toAddress": "user@inbound.applyos.me",
    "bodyText": "Thanks for applying. Are you available next Tuesday at 2pm?",
    "receivedAt": "2026-08-06T16:30:00.000Z"
  }
}
```

**Output example:**

```json
{
  "emailMessageId": "cc0e8400-e29b-41d4-a716-446655440007",
  "classification": {
    "suggestedStatus": "interviewing",
    "confidence": 91,
    "rationale": "Recruiter proposes a specific interview time."
  }
}
```

---

### `send_email`

Queue an outbound email for human approval. **Does not send.**

```json
{
  "event": "send_email",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "send-email-880e8400-1",
  "payload": {
    "applicationId": "880e8400-e29b-41d4-a716-446655440004",
    "toAddress": "recruiter@company.com",
    "subject": "Following up on Senior Engineer application",
    "bodyText": "Hi — wanted to confirm my interest and availability this week.",
    "threadId": "dd0e8400-e29b-41d4-a716-446655440008"
  }
}
```

**Output example:**

```json
{
  "approvalId": "ee0e8400-e29b-41d4-a716-446655440009",
  "status": "pending"
}
```

---

### `create_calendar_event`

Queue a calendar event for human approval. **Does not create the event.**

```json
{
  "event": "create_calendar_event",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "cal-event-880e8400-1",
  "payload": {
    "applicationId": "880e8400-e29b-41d4-a716-446655440004",
    "title": "Interview — Senior Engineer @ Acme",
    "startsAt": "2026-08-12T18:00:00.000Z",
    "endsAt": "2026-08-12T19:00:00.000Z",
    "location": "Zoom",
    "description": "Technical interview with hiring manager"
  }
}
```

**Output example:**

```json
{
  "approvalId": "ff0e8400-e29b-41d4-a716-446655440010",
  "status": "pending"
}
```

---

### `create_agent_event`

Record an agent timeline event (used by error handler and observability workflows).

```json
{
  "event": "create_agent_event",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "agent-event-n8n-error-abc123",
  "payload": {
    "eventType": "system_error",
    "summary": "n8n workflow failed: Discovery & Match",
    "jobId": "770e8400-e29b-41d4-a716-446655440003",
    "applicationId": "880e8400-e29b-41d4-a716-446655440004",
    "details": {
      "executionId": "n8n-exec-abc123",
      "workflowId": "wf2-discovery-match",
      "error": "HTTP 503 from crawl endpoint"
    }
  }
}
```

**Output example:**

```json
{
  "agentEventId": "110e8400-e29b-41d4-a716-446655440011"
}
```

Allowed `eventType` values are defined in `agentEventTypeSchema` (`lib/validators.ts`).

---

## Legacy Webhook Subset

`POST /api/webhooks/n8n` accepts only:

- `crawl_source`
- `score_job`
- `classify_email_status`
- `create_agent_event`

It uses `x-n8n-webhook-secret` only (no HMAC). New integrations should prefer `/api/internal/automation`.

## Error Codes

| Status | Meaning |
|--------|---------|
| `400` | Invalid payload (Zod validation) |
| `401` | Authentication failed |
| `404` | User not found |
| `405` | Non-POST method |
| `501` | Event recognized but backing service not deployed |
| `503` | Neither `N8N_WEBHOOK_SECRET` nor `N8N_HMAC_SECRET` configured |
| `500` | Unhandled execution error (workflow run marked `failed`) |
