# ApplyOS Product Requirements (Expanded)

ApplyOS is an AI-powered career navigator with explicit human-in-the-loop
approval before any external action.

## Core capabilities

1. **Profile ingestion** — Questionnaire, consented public LinkedIn URL scrape,
   and PDF/DOCX resume upload → Job-Hunt Scorecard.
2. **Job discovery** — User-approved career-page crawl via Firecrawl (mock when
   no API key) plus semantic ranking with Neon pgvector.
3. **Asset preparation** — Truthful resume/cover-letter drafts with split-screen
   HITL review, versioning, and PDF/text export.
4. **Kanban tracking** — Canonical stages from Applied through Hired.
5. **Isolated inbox** — Per-user inbound address, classification suggestions,
   approved outbound replies via Resend.
6. **Post-hire Tribes** — Role-based communities unlocked on Hired.

## Safety

- Never invent resume facts.
- Never auto-submit applications.
- Never change application status from email without user approval.
- Never send email or create calendar events without approval.
