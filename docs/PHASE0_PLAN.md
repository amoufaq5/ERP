# Phase 0 Plan — `/home/user/ERP` Cleanup

> **Status:** Draft 1
> **Date:** 2026-05-11
> **Branch:** `claude/design-erp-system-OvuW9`
> **Companion:** ADR-0024 in `amoufaq5/CrossEngin` (Repository and migration strategy)

## Scope reality vs. ADR-0024's estimate

ADR-0024 estimated Phase 0 at 1–2 weeks based on an inventory of "22 Prisma models" and "~1,707 TODO comments." The actual repo state at 2026-05-11 is substantially larger:

| Metric | ADR-0024 estimate | Actual |
|---|---|---|
| Prisma models | 22 | **120** |
| TS/TSX lines in `src/` | (unstated) | **258,269** |
| Page files > 1,500 lines | (unstated; "page-level monoliths") | **~19** |
| `INITIAL_*` mock arrays | "many pages" | 29 references across 8 files |
| TODO comments | ~1,707 | 22 |
| API routes | (unstated) | ~30 route groups under `src/app/api` |
| Observability dependencies | "none" | None (matches estimate) |
| Tenant isolation enforcement | "none" | None (matches estimate) |

Realistic Phase 0 timeline given a solo / duo team: **8–12 weeks** of focused engineering, not 1–2.

The Prisma model count (120 vs. 22) reflects ERP scope expansion since the ADR was drafted (CRM, ATS, banking, einvoicing, manufacturing, hospitality, etc., all in addition to the original pharma GxP/QA-QC core). The lower TODO + INITIAL_* count is good news — earlier code was hand-curated rather than mock-heavy across the board.

## Goals (unchanged from ADR-0024)

Phase 0 aims to leave `amoufaq5/ERP` in an **"honestly working" state** before Phase 1 opens the new monorepo's code surface. After Phase 0 the ERP repo:

- Has zero `INITIAL_*` mock arrays in user-facing pages.
- Has every API route wired to real Prisma with explicit tenancy.
- Has Postgres Row-Level Security enforced for every tenant-scoped table.
- Has OpenTelemetry, Sentry, and pino structured logs installed and wired.
- Has the largest page monoliths split into list / detail / form components.
- Passes CI hardening: contract tests on every route, Playwright smoke on the dashboard, type-coverage gate.

All changes land on `claude/design-erp-system-OvuW9` in one-PR-per-chunk fashion.

After Phase 0, ERP is **archived** (per Round 8 decision; pulled forward from the original "after Phase 5"). Domain knowledge is captured; the monorepo build-out begins.

## Work breakdown

### Track A — Observability foundation (1 week)

**Goal:** every error, every request, every job emits to Sentry + Better Stack + OTel collector.

| Task | Approx. effort |
|---|---|
| Add Sentry (`@sentry/nextjs`) — server + client + edge | 1 day |
| Add OpenTelemetry SDK (`@opentelemetry/sdk-node` + `@vercel/otel`) — trace + span propagation | 1 day |
| Add Pino structured logger; replace `console.log` calls (a few hundred call sites) | 1 day |
| Wire Sentry release tracking + source map upload in CI | 0.5 day |
| Per-tenant tagging on every span / log | 1 day |
| Dashboard for top errors + slow endpoints (Sentry Performance) | 0.5 day |

**Branch sub-strategy:** one PR per dependency family.

### Track B — Tenant isolation enforcement (2–3 weeks)

**Goal:** zero possibility of cross-tenant data leak. Defense-in-depth: app layer + Postgres RLS.

| Task | Approx. effort |
|---|---|
| Audit current tenant-scoping on all ~30 API route groups; classify (scoped, partially scoped, unscoped) | 2 days |
| Build `tenantContext` middleware that resolves session → tenant + sets Postgres session var | 1 day |
| Wire every API handler to `tenantContext`; reject requests without one | 3 days |
| Generate RLS policies for every tenant-scoped Prisma model (120 models × triage = subset) | 5 days |
| Wire Prisma client to per-request Postgres session variable | 1 day |
| Property tests: random session + random query must never return out-of-tenant rows | 2 days |
| Add `KERNEL_INVARIANTS.md` per ADR-0002 | 0.5 day |

**Risk:** some Prisma models may be "shared kernel" (look-up tables, drug formularies) that intentionally don't have a tenant column. Audit must distinguish.

### Track C — INITIAL_* mock removal (1–1.5 weeks)

**Goal:** every page reads real data via TanStack Query against a real `/api/...` endpoint.

8 page files carry mock arrays:

- `src/app/(dashboard)/integration-hub/page.tsx`
- `src/app/(dashboard)/ats/onboarding/page.tsx`
- `src/app/(dashboard)/ats/interviews/page.tsx`
- `src/app/(dashboard)/crm/leads/page.tsx`
- `src/app/(dashboard)/crm/reports/page.tsx`
- `src/app/(dashboard)/crm/campaigns/page.tsx`
- `src/app/(dashboard)/crm/accounts/page.tsx`
- `src/app/(dashboard)/supply-chain/page.tsx`

Per page:

1. Ensure backing Prisma model + API route exist (some may need creation).
2. Replace `INITIAL_*` constants with TanStack Query hooks.
3. Add Zod schemas at the API boundary.
4. Handle loading / empty / error states properly.
5. Add a smoke test.

**Approx. effort:** ~1 day per page. Some pages may be more complex if backing models don't yet exist.

### Track D — Monolith split (2–3 weeks)

**Goal:** no page file > 800 lines after split.

19 monolith pages (1,500–3,000 lines each). Pattern per page:

1. Extract list view → `<EntityList>` component in same directory.
2. Extract detail / record view → `<EntityDetail>` component.
3. Extract form → `<EntityForm>` component.
4. Page becomes a thin shell that composes them.
5. Existing tests updated; new tests for the extracted components.

**Approx. effort:** 0.5–1 day per page. ~12–19 days total.

**Note:** these splits are throwaway work in the long term — ADR-0018's renderer architecture replaces hand-coded pages with generic renderers. Track D is a Phase 0 hygiene step so the existing surface is maintainable for the months before the monorepo migration; aggressive splitting is not necessary for files that will be replaced by manifest-driven UI early in Phase 4. **Open question (below):** should Track D be deprioritized?

### Track E — CI hardening (1 week)

**Goal:** every PR runs a tight, fast CI that catches regressions.

| Task | Approx. effort |
|---|---|
| Contract tests on every route (Vitest) — generate from API schemas | 2 days |
| Playwright smoke on the dashboard primary flows | 2 days |
| Type-coverage gate via `typescript-coverage-report` (target ≥ 95%) | 0.5 day |
| `gitleaks` + `pnpm audit` already exist; wire Socket.dev | 0.5 day |
| Vitest unit tests for all new code (TDD discipline for new work) | ongoing |

### Track F — Inventory + archive prep (0.5 week)

**Goal:** when ERP gets archived (per Round 8 timing), the salvage opportunities are documented for the monorepo migration (Phase 1).

| Task | Effort |
|---|---|
| Document the 120 Prisma models with category + salvage disposition | 1 day |
| Document the UI design system tokens to extract for `packages/ui` | 0.5 day |
| Document the auth flow for `packages/auth` salvage | 0.5 day |
| Document the API routes for `packages/kernel-prisma` reference patterns | 1 day |

## Sequencing recommendation

1. **Track A (Observability)** first — every later track benefits from visibility into what's happening.
2. **Track B (Tenant isolation)** second — security-critical; can run in parallel with C once Track A foundation exists.
3. **Track C (INITIAL_* removal)** third — small, well-scoped.
4. **Track E (CI hardening)** in parallel — gates the velocity of B and C.
5. **Track F (Inventory)** in parallel.
6. **Track D (Monolith split)** last — **defer or skip** if Phase 1 monorepo timing makes it throwaway work.

**Total realistic timeline:** 8–12 weeks solo / duo if all tracks land.

If Phase 1 opens earlier (e.g., Track D skipped, Track F overlapped):

**Aggressive minimum (skip D):** 5–6 weeks.

## Open questions for review

| Question | Recommendation | Decision needed |
|---|---|---|
| Skip Track D (Monolith split)? Pages will be replaced by ADR-0018 renderers in Phase 4. | **Skip** unless a specific page becomes a velocity blocker. | Yes |
| Do all 120 Prisma models get RLS, or only a subset (those carrying tenant data)? | RLS on every model that has a `tenantId` column. Shared lookups (drug formulary, country list) exempt. | Yes |
| Sentry pricing tier — free vs. Team vs. Business for ERP-only (the monorepo gets its own Sentry project later). | Free tier sufficient for Phase 0 traffic. | Yes |
| Per-tenant Postgres session variable approach — `app.current_tenant_id` via `SET LOCAL` per Prisma query vs. middleware-managed connection. | `SET LOCAL` from a Prisma middleware extension is the cleanest. | Yes |
| Should ERP be archived at end of Phase 0 (per Round 8 decision) or kept writable through Phase 1 monorepo build-out? | Per Round 8: archive at Phase 1 opening, which means **at end of Phase 0**. | Confirm |
| Phase 1 trigger condition — does the monorepo open immediately after Phase 0 ends, or wait for additional setup? | Open Phase 1 immediately when Track A + B + C + E complete. Track D + F can land alongside or be skipped. | Yes |

## Branch hygiene

All Phase 0 work commits to `claude/design-erp-system-OvuW9`. Each track produces a series of small PRs (squash-merged) rather than one giant change set. The current local-proxy push setup allows pushes to `claude/*` branches; production deploy of ERP is on the `main` branch (separate from this work).

When Phase 0 ends:
- Final commit on `claude/design-erp-system-OvuW9`.
- Merge to `main` of `amoufaq5/ERP`.
- Tag `archived-pre-crossengin`.
- Set repo to read-only.
- Add README pointing to `amoufaq5/CrossEngin` as the live codebase.

## Why this plan exists separately from ADR-0024

ADR-0024 captured the strategy at a point in time when the codebase inventory was much smaller. Rather than rewriting ADR-0024 (which would invalidate cross-references and history), this PHASE0_PLAN document supplements it with the post-survey reality. ADR-0024's strategy is unchanged; only the effort estimate and inventory differ.

## Status

| Field | Value |
|---|---|
| Document status | Draft 1 (awaiting review) |
| Author | amoufaq5 (with AI assistance) |
| Reviewer | _pending_ |
| Next review | Before any Phase 0 execution work begins |
