# Phase 0 Salvage — Module / Domain-Area List

> Source: `src/lib/*` library directories + `src/app/api/v1/*` +
> `src/app/api/*` route groupings.
>
> Makes the user's "dissatisfied with all modules" statement concrete
> by enumerating what "all" is. Phase 1 inherits this domain breadth
> but rebuilds each module fresh.

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

## Phase 1 module decomposition guidance

The Phase 1 monorepo (per ADR-0001) is a plugin / module system.
Reasonable module boundaries based on the above grouping:

1. **Kernel** (auth, tenancy, audit, RLS, observability, platform)
2. **Finance** module
3. **Procurement** module
4. **Inventory** module
5. **Sales** module
6. **CRM** module (general)
7. **Pharma-CRM** module (doctor visits, weekly plans, market requests)
8. **HR** module
9. **ATS** module
10. **QA/QC** module (largest — may need sub-modules)
11. **Manufacturing** module
12. **Operations** module (assets, contracts, projects)
13. **AI** module (provider + agents + scoring)
14. **Egyptian-localization** module (ETA, Arabic i18n, EGP, local pharmacies)
15. **Reporting / dashboard** module

15 modules is the rough order of magnitude. Some may merge in Phase 1
(e.g., Inventory + Procurement) or split (e.g., QA/QC subdivides).
