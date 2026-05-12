# Phase 0 — Track B Audit: Tenant Isolation Enforcement

> **Status:** Audit complete; remediation plan ready
> **Date:** 2026-05-11
> **Branch:** `claude/design-erp-system-OvuW9`
> **Author:** amoufaq5 (with AI assistance)
> **Reviewer:** _pending_

## Headline finding

**API routes have auth checks but no tenant isolation.** A user authenticated to tenant A can call most `GET` endpoints and receive rows from tenant B. This is a P0-class data-isolation issue that Phase 0 must close before the ERP repo is archived (per Round 8 timing) or used in any multi-tenant production context.

## Methodology

1. Enumerated all `route.ts` files under `src/app/api`. **Total: 220 route files** across 17 top-level groups.
2. Inspected the middleware (`src/middleware.ts`) — handles CSRF + security headers + session-existence redirect for page routes; does **not** enforce tenant scope on API calls.
3. Inspected the shared auth helper (`src/lib/api/with-auth.ts`) — `withAuth` calls `getServerSession` and `requirePermission`, returns `{ role, userId }` to handlers. **No `tenantId` is attached.**
4. Inspected the Prisma client (`src/lib/prisma.ts`) — a single global `PrismaClient` shared across all requests. No request-scoped extension, no `SET LOCAL` of any Postgres session variable.
5. Inspected `src/lib/tenant/resolve-tenant.ts` — resolves tenant by `x-tenant-slug` header, subdomain, or `host`. Returns a tenant row. **Not wired into API request handlers.**
6. Sampled 10 routes including `/api/v1/sales-orders`, `/api/v1/customers`, `/api/v1/employees`, `/api/users`, `/api/notifications`, `/api/einvoice`, `/api/v1/weekly-plans`, `/api/search`, `/api/upload`, `/api/import`. **Confirmed:** Prisma queries use `where: { ...filters }` clauses with **no `tenantId` filter** in the sampled set.

## Concrete vulnerability example

`src/app/api/v1/sales-orders/route.ts` GET handler:

```typescript
const [total, records] = await Promise.all([
  prisma.salesOrder.count({ where }),                    // ← no tenantId
  prisma.salesOrder.findMany({
    where,                                                // ← no tenantId
    include: { customer: true, items: { include: { product: true } } },
    skip: ...,
    take: ...,
    orderBy: { createdAt: "desc" },
  }),
]);
```

Any authenticated user — regardless of their tenant — gets every sales order across every tenant in this single Postgres instance. The handler doesn't use `withAuth`, so it isn't even role-gated.

## Coverage snapshot

| Category | Count | % |
|---|---|---|
| Total `route.ts` files | 220 | 100% |
| Routes calling `withAuth` (auth-gated) | 56 | 25% |
| Routes referencing `tenantId` / `tenant_id` / `getCurrentTenant` anywhere in the file | 13 | 6% |
| Routes that actually scope Prisma queries by `tenantId` (sampled, extrapolated) | likely <10% |

The 13 routes that *mention* tenancy are mostly the tenant-management endpoints themselves (`/api/tenant`, `/api/tenants`) and a handful of platform-admin routes. The 200+ business-logic routes have no tenant scoping.

## Risk severity

- **Confidentiality:** P0. Cross-tenant reads are trivially exploitable.
- **Integrity:** P0. POST/PUT/PATCH handlers similarly lack tenant scoping; a tenant could create / update / delete records assigned to another tenant by guessing IDs.
- **Compliance impact:** any compliance pack (21 CFR Part 11, HIPAA, EU GMP, UAE PDPL) considers this a fundamental control failure. The repo would not pass a SOC 2 / ISO 27001 audit in this state.
- **Multi-tenant trust SLO** (per ADR-0017 — "0 cross-tenant incidents, ever"): this is the most expensive constraint to retrofit and the most important to get right.

The mitigating factor is that the ERP repo is **not yet in production with multiple tenants**. There is no current incident; this is a pre-launch defect Phase 0 must close before the repo serves real tenants.

## Remediation pattern

Two layers, applied in order:

### Layer 1 — Application-side tenant scoping

Create a new `withAuthAndTenant` helper that:

1. Resolves the session (existing `withAuth` logic).
2. Resolves the tenant from the session's `tenantId` (already in NextAuth session per `auth-options.ts`).
3. Returns a request-scoped Prisma client whose `where` clauses are auto-augmented with `tenantId`.
4. Sets a Postgres session variable (`SET LOCAL app.current_tenant_id = '<id>'`) for RLS.

```typescript
// src/lib/api/with-tenant.ts (new)
export function withAuthAndTenant<P = void>(
  handler: (req: NextRequest, ctx: {
    tenantId: string
    userId: string
    role: string
    db: TenantScopedPrisma     // Prisma client extension that injects tenantId
  }, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, params: P) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return apiError("unauthenticated", 401);

    const auth = await requirePermission(req, session.user.role, session.user.id);
    if ("error" in auth) return apiError(auth.error as string, auth.status as number);

    const db = createTenantScopedPrisma(session.user.tenantId);
    try {
      return await handler(req, {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        role: session.user.role,
        db,
      }, params);
    } finally {
      await db.$disconnect?.();
    }
  };
}
```

The `TenantScopedPrisma` extension (a Prisma client middleware) injects `where: { tenantId }` into every query against tenant-scoped models. Shared lookup tables (drug formulary, ICD-10 codes — to be enumerated in the next step) are exempt via a model-allowlist.

### Layer 2 — Postgres Row-Level Security

For every Prisma model that has a `tenantId` column, generate an RLS policy:

```sql
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Prescription"
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
```

`current_setting('app.current_tenant_id', true)` reads the per-connection session variable set by Layer 1. Misuse from outside the kernel API (e.g., direct psql access by a bug) is blocked at the database.

Per the Round-9 decision (UAE PDPL + HIPAA roadmap) and ADR-0002, RLS is non-negotiable defense-in-depth.

### Layer 3 — Audit emission

Per ADR-0008, every tenant-scoped mutation emits an audit log. Tracked separately from Track B; mentioned here because the `withAuthAndTenant` wrapper is the natural place to wire audit emission.

## Triage of 220 routes

Routes split into three bands by remediation complexity:

### Band 1 — Tenant-scoped business logic (~180 routes, high-priority)

The bulk of `/api/v1/*` plus most of the top-level groups (banking, einvoice, notifications, etc.). Pattern: route reads/writes a tenant-owned entity. Must use `withAuthAndTenant`.

Examples: `/api/v1/sales-orders`, `/api/v1/customers`, `/api/v1/employees`, `/api/v1/contracts`, `/api/v1/assets`, `/api/v1/equipment`, `/api/v1/audit`, `/api/v1/expenses`, etc.

Effort estimate: ~15 minutes per route after the helper exists. ~45 hours total. Parallelizable across folders.

### Band 2 — Cross-tenant / platform-admin routes (~25 routes, medium-priority)

Routes that intentionally operate across tenants for CrossEngin staff. Must use `withAuth` (role check for ADMIN/PLATFORM) **without** auto-tenant scoping, and explicitly select the tenant they want to operate on.

Examples: `/api/admin/*`, `/api/tenants` (the platform tenant-management endpoints), some `/api/v1/audit` admin views.

Effort: per-route care; ~30 minutes each. ~12 hours total.

### Band 3 — Public / no-data routes (~15 routes, low-priority)

Routes that don't touch tenant data: `/api/v1/health`, `/api/v1/events` (webhook receiver, separately authenticated), `/api/v1/csrf`, `/api/auth/*`, `/api/v1/docs`.

Effort: confirm and document. ~5 minutes each.

## Plan: incremental Phase 0 Track B PRs

| # | PR | Effort |
|---|---|---|
| B1 | Build `src/lib/api/with-tenant.ts` + `TenantScopedPrisma` extension + the allowlist of shared lookup models. Add unit + property tests. **No route changes yet.** | 2 days |
| B2 | Enable Postgres RLS on all tenant-scoped models via Prisma migration. Backfill any missing `tenantId` columns (audit first). | 3 days |
| B3 | Migrate `/api/v1/sales-orders` + `/api/v1/customers` as exemplars; verify end-to-end with two-tenant Playwright test. | 1 day |
| B4 | Migrate remaining `/api/v1/*` Band-1 routes (~120 routes). Batch by feature folder; one PR per folder. | 8 days |
| B5 | Migrate top-level groups (`/api/banking`, `/api/einvoice`, etc.). | 4 days |
| B6 | Triage Band-2 admin/platform routes; add explicit cross-tenant capability where needed. | 2 days |
| B7 | Document Band-3 routes; add to `KERNEL_INVARIANTS.md`. | 0.5 day |
| B8 | `KERNEL_INVARIANTS.md` with the "never query without tenant context" rule (per ADR-0002). | 0.5 day |
| B9 | Property tests: random session + random query must never return out-of-tenant rows. | 2 days |

**Total: ~23 days** (matches the 2-3 week estimate in `PHASE0_PLAN.md` Track B).

## Open questions for review

| Question | Recommendation |
|---|---|
| `withAuthAndTenant` vs. modifying `withAuth` in place — additive new helper vs. breaking change | **Additive.** New helper. Old `withAuth` stays during migration; routes upgrade as we touch them. After Band-1+2 done, deprecate the old wrapper. |
| Shared lookup table inventory — which models are intentionally cross-tenant? | Audit during B1. Likely candidates: country list, currency list, ICD-10 codes, drug-formulary references, time-zone list. Document explicitly. |
| Transaction handling for `SET LOCAL` — does Prisma's transaction wrap honor the session variable correctly? | Verify in B1 with a focused test. If not, fall back to per-call query interception. |
| Backfill of missing `tenantId` columns — which models lack the column entirely? | Audit during B2. For any tenant-scoped model without `tenantId`, the migration must add the column + backfill from related-entity ownership before enabling RLS. |
| Performance impact of RLS — adds a filter to every query. Concern at scale? | Postgres RLS overhead is minimal when the policy uses an indexed column. Confirm by load-testing the heaviest endpoint after B2. |
| ABAC predicates on top of RLS — the kernel ADRs envision OPA Rego for per-record predicates (per ADR-0008). Apply during Phase 0 or defer to Phase 1 monorepo? | **Defer to Phase 1.** Phase 0 closes the cross-tenant gap; finer-grained ABAC is built fresh in the kernel. |

## Cross-references

- `docs/PHASE0_PLAN.md` — overarching Phase 0 plan; Track B section
- ADR-0002 (`amoufaq5/CrossEngin/docs/adr/0002-multi-tenancy-model.md`) — schema-per-tenant model that the new kernel will use; RLS as defense-in-depth
- ADR-0008 — RBAC + ABAC + audit model; informs the eventual ABAC overlay
- ADR-0009 §Threat Model — "cross-tenant data leak" is the most severe threat
- ADR-0017 §SLOs — "tenant-isolation: 0 incidents ever"
