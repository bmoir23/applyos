# Email routing

ApplyOS uses **separate domains** for inbound and outbound email. This keeps Cloudflare Email Routing (receive) and Resend (send) isolated and easier to reason about.

## Domains

| Direction | Env var | Default | Provider |
|-----------|---------|---------|----------|
| Inbound | `EMAIL_INBOUND_DOMAIN` | `inbound.applyos.me` | Cloudflare Email Routing + Email Worker |
| Outbound | `EMAIL_OUTBOUND_DOMAIN` | `mail.applyos.me` | Resend |

Each user gets a subdomain identity, e.g. `jane.doe@inbound.applyos.me` for receiving and `jane.doe@mail.applyos.me` for sending (stored on `email_identities` and provisioned via `provisionEmailIdentity`).

## Inbound flow

1. **DNS** — Point `EMAIL_INBOUND_DOMAIN` MX records to Cloudflare Email Routing.
2. **Email Worker** — Deploy `workers/email-ingest` and bind it to the inbound zone.
3. **Secrets** — Set on the worker:
   - `EMAIL_WORKER_HMAC_SECRET` (same value as the Next.js app)
   - `APPLYOS_EMAIL_WEBHOOK_URL` — production URL, e.g. `https://your-app.vercel.app/api/webhooks/email/inbound`
4. **Worker behavior** — Parses the incoming message and POSTs JSON to the webhook with HMAC headers (`x-applyos-timestamp`, `x-applyos-signature`).
5. **Webhook auth** — The app accepts either:
   - HMAC headers verified with `EMAIL_WORKER_HMAC_SECRET`, or
   - Legacy `x-n8n-webhook-secret` matching `N8N_WEBHOOK_SECRET` (for n8n or manual testing).
6. **Storage** — Messages are stored in `email_messages` with `direction = inbound`. If `applicationId` is included in the payload, ApplyOS runs email status classification.

### Inbound webhook payload

```json
{
  "userId": "optional-uuid",
  "recipient": "jane.doe@inbound.applyos.me",
  "subject": "Interview invite",
  "from": "recruiter@company.com",
  "to": "jane.doe@inbound.applyos.me",
  "bodyText": "Plain text body",
  "messageId": "<message-id@mail>",
  "applicationId": "optional-uuid"
}
```

Resolve the user by `userId` or by matching `recipient` / `to` to an `email_identities.display_address`.

## Outbound flow

1. **Resend** — Verify `EMAIL_OUTBOUND_DOMAIN` in Resend and set `RESEND_API_KEY` in the app.
2. **Draft** — `createOutboundDraft` stores an outbound draft and creates an approval request (`send_email`).
3. **Approval** — User approves in the HITL workspace (or via your approval UI).
4. **Send** — `executeApprovedSend` calls Resend with an `Idempotency-Key` header. Without `RESEND_API_KEY`, sends are mocked (`mock_...` ids) for local development.

Outbound `from` addresses use `subdomain@EMAIL_OUTBOUND_DOMAIN`.

## Local development

- Omit `RESEND_API_KEY` to mock outbound sends.
- Test inbound webhooks with curl and `x-n8n-webhook-secret` if `N8N_WEBHOOK_SECRET` is set:

```bash
curl -X POST http://localhost:3000/api/webhooks/email/inbound \
  -H "Content-Type: application/json" \
  -H "x-n8n-webhook-secret: $N8N_WEBHOOK_SECRET" \
  -d '{"recipient":"you@inbound.applyos.me","subject":"Test","from":"a@b.com","bodyText":"Hello"}'
```

## Related code

- Identity: `lib/services/email-identity.ts`
- Inbox: `lib/services/emailMessages.ts`, `app/(app)/inbox/page.tsx`
- Resend: `lib/email/resend.ts`
- Worker: `workers/email-ingest/src/index.ts`
