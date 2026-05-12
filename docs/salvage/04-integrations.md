# Phase 0 Salvage — Integration Discoveries

> Source: `src/lib/*/` directories + `.env.example`

> **CORRUPTED — Doctrine v2 (2026-05-12).** The operator marked
> the integration + workflow layers as corrupted. Use this doc
> **only** as a reference for WHICH external systems were
> attempted (so Phase 1 doesn't miss a domain dependency). Do
> **not** assume any specific integration code is reusable. Phase
> 1 designs all integrations + workflows fresh against ADRs.

What was actually wired (or attempted) in the ERP repo for external
services. Phase 1 should consult this before designing the equivalent
integrations — some of these saved weeks of research that shouldn't
be redone.

## Database

| Service | Status | Where | Carry into Phase 1? |
|---|---|---|---|
| **Postgres 15+** (per-tenant data) | Working | `src/lib/prisma.ts` | Yes — confirmed compatible with Prisma + RLS (Track B2.3) |
| **SQLite master DB** (tenant directory) | Working but dormant | `src/lib/tenant/master-db.ts` + `prisma/master.prisma` | Phase 1 kernel chooses schema-per-tenant from scratch per ADR-0002; master-DB shape (`Tenant`, `TenantUser`, `TenantInvite`) is reusable |
| **Redis** | Configured, lightly used | `REDIS_URL` env | Phase 1 should plan for: rate limiting, session/cache, BullMQ job queue |

## Auth + identity

| Service | Status | Where |
|---|---|---|
| **NextAuth (Credentials provider)** | Working | `src/lib/auth/auth-options.ts` |
| **bcryptjs** for password hashing | Working | `hashSync(password, 10)` |
| **MFA scaffolding** | Built but unverified | `src/lib/auth/mfa.ts` |
| **Session management** | Custom in `session-manager.ts` | Worth review for Phase 1 lessons |

Phase-0 finding: the Credentials authorize() callback creates a new
`PrismaClient` per call. That's a connection leak. Phase 1 should
keep a single client.

## Egyptian tax authority (ETA) — e-invoicing

| Service | Status | Where |
|---|---|---|
| **ETA client** | Working code, broken routes | `src/lib/einvoice/eta-client.ts` |
| **`EInvoice` / `EtaSettings` Prisma models** | **Missing** | Routes were calling models that don't exist (Phase 0 found this; routes deleted) |

The eta-client library is preserved. Phase 1 should add `EInvoice`
and `EtaSettings` Prisma models to the schema and wire the client
to them.

## AI / LLM

| Provider | Status | Notes |
|---|---|---|
| **Anthropic Claude** | Configured | `ANTHROPIC_API_KEY` env |
| **OpenAI** | Configured | `OPENAI_API_KEY` env |
| **Ollama** (local) | Configured | `OLLAMA_URL`, `OLLAMA_MODEL` (llama3.2 default) |

The provider abstraction in `src/lib/ai/provider.ts` routes between
the three. Modules built on top:

- `src/lib/ai/agent.ts` — generic agentic loop
- `src/lib/ai/analytics.ts` — AI-driven analytics
- `src/lib/ai/document-ai.ts` — document processing
- `src/lib/ai/insights-engine.ts` — domain insights
- `src/lib/ai/recommendation-engine.ts` — recommendations
- `src/lib/ai/scoring.ts` — model-based scoring

**Carry into Phase 1:** the provider-abstraction pattern. The
specific implementations were untested.

## Email / SMTP

| Component | Status | Where |
|---|---|---|
| Generic SMTP via `nodemailer` | Working | `src/lib/email/email-service.ts` |
| Email queue | Built | `src/lib/email/email-queue.ts` |
| Scheduled reports | Scaffolded | `src/lib/email/scheduled-reports.ts` |
| Templates | Folder exists | `src/lib/email/templates/` |

Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## Storage

| Service | Status | Notes |
|---|---|---|
| **S3** | Env configured, not exercised | `S3_BUCKET`, `S3_REGION`, AWS keys |
| File upload service | Built | `src/lib/uploads/upload-service.ts` |
| Receipt OCR | Built | `src/lib/uploads/receipt-scanner.ts` (likely AI-backed) |

## Payments

| Service | Status |
|---|---|
| **Stripe** | Env configured, no obvious code path |

Phase 1 should decide whether payments are in scope or deferred.

## Banking

| Component | Status | Where |
|---|---|---|
| Bank-account reconciliation client | Built | `src/lib/banking/bank-client.ts` |

Specifics unknown without a deeper read.

## Observability (added in Track A1)

| Service | Status |
|---|---|
| Sentry (`@sentry/nextjs`) | Installed, no-op until DSN configured |
| OpenTelemetry (`@vercel/otel`) | Installed |
| Pino-style structured logger | Hand-rolled in `src/lib/logger.ts` |

Env: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL`.

## Security

| Component | Where |
|---|---|
| Field-level encryption | `src/lib/security/encryption.ts` (uses `ENCRYPTION_MASTER_KEY` env) |
| Digital signatures | `src/lib/security/e-signature.ts` (21 CFR Part 11 prep) |

Phase 1 should preserve both — the e-signature work is non-trivial
and required for pharma compliance.

## Integration framework

`src/lib/integrations/` contains:
- `connector-base.ts` — abstract connector
- `connector-registry.ts` — registry pattern
- `connectors/` — concrete adapters
- `webhook-delivery.ts` — outbound webhook dispatch

The pattern is sound; specific connectors should be audited
case-by-case before salvage.

## Search

`src/lib/search/` — in-memory search index. Not production-grade. Phase
1 should use Postgres FTS or Meilisearch/Typesense, not this.

## Forecasting

`src/lib/forecasting/forecast-engine.ts` — likely simple stats. Verify
before salvage; could be replaced with a proper time-series library.

## Compliance + retention

`src/lib/compliance/` — data-retention policies, audit-trail builders.
Worth a careful read; pharma audit requirements are strict (21 CFR
Part 11, EU GMP, UAE PDPL, HIPAA roadmap per ADR-0009).
