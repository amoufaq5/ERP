# Phase 0 Salvage — Module / Domain-Area List

> Source: `src/lib/*` library directories + `src/app/api/v1/*` +
> `src/app/api/*` route groupings.

> **VISION RESHAPED — Doctrine v2 (2026-05-12).** The old API
> surface was pharma-vertical-heavy. Phase 1 is **multi-industry**:
> a kernel + horizontal core + pluggable verticals layout (see the
> v2 decomposition section at the bottom of this file). Treat the
> inventory below as one possible vertical's footprint, not the
> Phase 1 baseline.

## Library layer — 37 lib directories

`src/lib/` is the domain logic + integration layer. One folder per
concern. Most map 1:1 to an API surface.

| Lib | Purpose | Phase 1 disposition |
|---|---|---|
| `activity` | CRM activity stream (calls, emails, meetings) | Rebuild on Phase 1 audit log |
| `ai` | AI provider abstraction + agents + scoring + recommendations | Carry provider pattern; rebuild agents |
| `api` | Helpers, validations, RBAC, route factory | **Largely carried** via salvage patterns |
| `auth` | NextAuth + bcrypt + MFA + sessions | Rebuild on Phase 1 kernel auth |
| `banking` | Bank reconciliation client | Re-audit before salvage |
| `cache` | Redis caching layer | Rebuild on Phase 1 kernel |
| `compliance` | Data retention + compliance services | High-priority salvage (regulatory) |
| `dashboard` | Dashboard / analytics aggregation | Rebuild UI; salvage aggregation logic |
| `db` | DB config + master DB | Rebuild on Phase 1 kernel |
| `einvoice` | ETA (Egyptian Tax Authority) client | **Salvage** — domain-specific; routes deleted but client preserved |
| `email` | SMTP + queue + templates + scheduled reports | Salvage email-queue + scheduling patterns |
| `engine` | Workflow / rule engine | Re-audit |
| `expiry` | Product expiry tracking | Pharma-specific; salvage logic |
| `export` | CSV / Excel / PDF export | Rebuild |
| `finance` | Finance-specific helpers (ledger, invoicing) | Re-audit before salvage |
| `forecasting` | Forecast engine | Replace with proper time-series lib |
| `graphql` | GraphQL surface | Phase 1 may not use GraphQL — re-decide |
| `hooks` | React hooks | UI rebuild |
| `i18n` | Internationalization (Arabic + English) | Salvage Arabic translations |
| `import` | Bulk import (CSV → Prisma) | Rebuild |
| `integrations` | Webhook delivery + connector framework | Salvage connector base pattern |
| `jobs` | Background jobs (likely BullMQ) | Re-audit |
| `manufacturing` | Pharma manufacturing helpers | Re-audit; pharma-domain code |
| `notifications` | In-app + push notifications | Rebuild |
| `operations` | Cross-cutting ops helpers | Re-audit |
| `platform` | Module registry (matches ADR-0001 monorepo + module shape) | **High-value salvage** |
| `pwa` | Offline / installable | Phase 1 decision needed |
| `quality` | QA/QC state stores (capa, cleaning, document-control, etc.) | UI-state; rebuild |
| `search` | In-memory search index | Replace with Postgres FTS / Meilisearch |
| `security` | Encryption (field-level) + e-signature (21 CFR Part 11) | **High-value salvage** |
| `stores` | Zustand stores | UI-state; rebuild |
| `tenant` | Tenant resolution + master DB | Rebuild on Phase 1 kernel |
| `theme` | Dark/light theming | Rebuild with new design system |
| `traceability` | Batch traceability (pharma) | Salvage domain logic |
| `uploads` | File upload + receipt OCR | Carry receipt-scanner pattern |
| `validation` | (Likely overlaps with `api/validations.ts`) | Re-audit |
| `webhooks` | Inbound webhook handlers | Rebuild |
| `workflow` | Workflow engine (matches `Workflow` Prisma model) | High-priority audit before salvage |

## API surface — domain areas grouped

### Finance & accounting (8 endpoints)
- `gl-accounts`, `journal-entries`, `invoices`, `payments`,
  `bills` (under `/api/v1/finance/bills`), `budgets`, `cost-centers`,
  `taxes` (implied by `TaxType` enum)

### Procurement (4)
- `suppliers`, `purchase-orders`, `rfq`, `goods-receipts` (implied
  by enum)

### Inventory & warehouse (6)
- `products`, `stock-movements`, `warehouses`, warehouse `zones`,
  `shipments`, `traceability`

### Sales & CRM (10)
- `accounts` (customers), `contacts`, `leads`, `opportunities`,
  `campaigns`, `tickets`, `territories`, `business-units`,
  `sales-orders`, `crm/deals`

### Pharma CRM (4)
- `doctors`, `visits`, `weekly-plans`, `market-requests`

### HR & people (8)
- `employees`, `departments`, `leave-requests`, `payroll`,
  `attendance`, `onboarding`, `time-entries`, `kpis`

### ATS — Applicant Tracking (4)
- `jobs`, `candidates`, `applications`, `interviews`

### QA/QC (16)
- `audits`, `batch-release`, `capa`, `change-control`,
  `cleaning`, `complaints`, `deviations`, `document-control`,
  `env-monitoring`, `oos`, `recalls`, `risk`, `spc`, `stability`,
  `supplier-quality`, `training`, `vendor-scoring`, `water-system`

### Manufacturing (4)
- `manufacturing/batch-records`, `manufacturing/equipment`,
  `work-orders`, `maintenance/orders`

### Operations (5)
- `assets`, `contracts`, `projects`, `expenses`, `tasks` (implied),
  `equipment`

### AI & analytics (3)
- `ai/chat`, `ai/status`, `forecasting`

### Platform (10)
- `tenants`, `users`, `audit`, `notifications`, `approval-logs`,
  `health`, `csrf`, `events`, `docs`, `webhooks`

### Industry-specific (3)
- `einvoice` (deleted in B6), `compliance`, `banking`

## Module count summary

Going by groupings: **~85 distinct API entity surfaces** across
**16 domain areas**. The user's "all modules" includes all of
these.

## Phase 1 module decomposition v2 (multi-industry, 2026-05-12)

Doctrine v2 reframe: Phase 1 is **multi-industry**, not pharma-only.
The decomposition is a **kernel + horizontal core + pluggable
verticals + localization packs + platform services** layout.

### Tier 1 — Kernel + cross-cutting (always-on)

| Module | Owns |
|---|---|
| **kernel** | Tenancy resolution, RLS, request lifecycle, error model |
| **identity** | Users, roles (ABAC predicates), sessions, MFA, API tokens |
| **org** | Business units, departments, cost centers, locations, sites |
| **common** | Currency, FX, tax codes, addresses, contacts, custom fields, units of measure, calendar |
| **audit** | Audit log, retention policies, e-signature, data privacy (PII flags), GDPR-style erasure |
| **observability** | Logging, metrics, tracing, error reporting |

### Tier 2 — Horizontal business core (industry-agnostic)

| Module | Owns |
|---|---|
| **finance** | Chart of accounts, journals, AR (invoices), AP (bills), payments, banking reconciliation, period close, FX revaluation, fiscal periods, budgets |
| **procurement** | Suppliers, RFQ, PO, goods receipt, three-way match |
| **inventory** | Products, SKUs, lots/serials, warehouses, zones, movements, valuation, expiry, traceability |
| **sales** | Customers, quotes, sales orders, delivery, returns, pricing |
| **crm** | Accounts, contacts, leads, opportunities, pipelines, activities, tickets, campaigns |
| **hr** | Employees, departments, attendance, leave, payroll |
| **ats** | Jobs, candidates, applications, interviews, offers |
| **projects** | Projects, tasks, time entries, deliverables, billing |
| **assets** | Fixed assets, maintenance, depreciation, contracts |
| **reporting** | Dashboards, KPIs, custom queries, exports |

### Tier 3 — Vertical packs (pluggable, customer-chosen)

Each is an opt-in module that extends the horizontal core with
domain-specific entities, workflows, validations, and screens.

| Vertical | Adds |
|---|---|
| **vertical-pharma** | Doctor CRM (doctors, visits, weekly plans, sample requests, market requests), batch traceability, GMP QA/QC (deviations, CAPAs, change control, batch release, stability, recalls, cleaning, water system, env monitoring), regulatory (e-signature, 21 CFR Part 11 audit) |
| **vertical-manufacturing** | Work orders, BOMs, routings, equipment records, maintenance schedules, OEE |
| **vertical-distribution** | Route plans, delivery sequences, cash van, COD, cold chain, proof-of-delivery |
| **vertical-healthcare** | Patients, encounters, claims, ICD-10 coding, referrals, payer mix |
| **vertical-retail** | POS, registers, footfall, baskets, shrinkage, planograms |
| **vertical-services** | Utilization, billable hours, realization, T&M projects, fixed-price contracts |
| **vertical-field-service** | Dispatch, technician routing, first-time-fix, service contracts |

### Tier 4 — Localization packs

| Pack | Adds |
|---|---|
| **loc-eg** | ETA e-invoicing, EGP, VAT 14%, governorates, Arabic strings, RTL flag, Hijri calendar option |
| **loc-sa** (future) | ZATCA e-invoicing, Zakat, VAT 15%, Saudi geographic divisions |
| **loc-ae** (future) | UAE FTA, VAT 5%, free zone awareness, emirate divisions |

### Tier 5 — Platform services

| Service | Notes |
|---|---|
| **ai** | Provider abstraction (Claude / OpenAI / Ollama); per-module agent contracts |
| **integrations** | Connector framework, EDI, webhook delivery |
| **notifications** | In-app, email, SMS, push |
| **search** | Postgres FTS or Meilisearch; vector embeddings per ADR |
| **import-export** | Bulk CSV / Excel / API import; export pipelines |
| **jobs** | Background job runner (BullMQ or equivalent) |
| **files** | Object storage, signed URLs, virus scanning |

### Tenant-shape examples

**Pharma company in Egypt** enables: Tier 1 + all of Tier 2 +
`vertical-pharma` (+ optional `vertical-distribution`) + `loc-eg` +
platform services as needed.

**B2B distributor in Egypt** enables: Tier 1 + Tier 2 (skip ATS
maybe) + `vertical-distribution` + `loc-eg`.

**Professional services firm in UAE** enables: Tier 1 + Tier 2
(skip inventory + procurement) + `vertical-services` + `loc-ae`.

**Multi-vertical holding company** enables: Tier 1 + Tier 2 +
multiple verticals with per-business-unit scoping.

### Old pharma-only map (reference)

The previous "15 modules" decomposition (pre-doctrine-v2) collapsed
verticals into the horizontal core, which is why everything felt
pharma-shaped. Avoid that in Phase 1: keep horizontal modules
industry-agnostic and let verticals add their own entities.

### Operator note on the inventory above

The lib + API tables earlier in this doc are the **historical
footprint** of the old repo. The dispositions ("salvage", "rebuild",
"re-audit") in the lib table are pre-doctrine-v2; in doctrine v2 the
following overrides apply:
- Anything tagged "salvage" related to integrations (`integrations`,
  `banking`, `webhooks`, `connectors`) is reference-only.
- Anything tagged "salvage" related to validation is reference-only.
- Anything tagged "salvage" related to seed / demo data is mock.
- Anything tagged "salvage" related to workflow / state-machine is
  reference-only.
- `platform` (module registry) + `security` + `tenant` + `api`
  (helpers) remain high-value salvage as architectural patterns.
