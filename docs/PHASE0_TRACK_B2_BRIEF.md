# Phase 0 — Track B2 Starter Brief: User.tenantId + RLS

> **Status:** Investigation complete; ready for B2 PR work
> **Date:** 2026-05-11
> **Branch:** `claude/design-erp-system-OvuW9`
> **Prerequisite:** Track B1 (commits `f07bd99` + `66e61af` + this brief)
> **Owner:** _pending_

## The architectural confusion

The ERP repo has **two simultaneous tenancy models** declared in code, only one of which is implemented:

### Declared intent (master.prisma)
A schema-per-tenant model:
- `master.prisma` defines `Tenant`, `TenantUser`, `TenantInvite` in a SQLite master DB.
- `Tenant.dbUrl` field implies each tenant has its own database.
- `TenantUser` is keyed by `(tenantId, email)` — same email can exist in different tenants.

### Actual implementation (schema.prisma + code)
A single-DB-with-tenantId-columns model:
- `src/lib/prisma.ts` creates one global `PrismaClient` pointing at `DATABASE_URL`.
- `prisma/schema.prisma` defines 120 models; 119 have `tenantId: String @@index([tenantId])`.
- `prisma/seed.ts` hardcodes `TENANT_ID = "tenant_pharmacorp_eg"` and assigns it to every row.
- Nothing reads `Tenant.dbUrl` to route per-tenant connections.

### The auth gap (the immediate B2 issue)

```
auth-options.ts:64-69  →  return { id, name, email, role, department }
                          (no tenantId)
auth-options.ts:100    →  token.tenantId = user.tenantId
                          (user.tenantId is always undefined)
auth-options.ts:111    →  session.user.tenantId = token.tenantId
                          (always undefined)
```

`session.user.tenantId` is **always `undefined`** in production today. The new
`withAuthAndTenant` wrapper from Track B1 rejects every request with
"unauthenticated: missing tenant context" until this is fixed.

The master DB exists but is touched only by `/api/v1/tenants`,
`/api/tenants/[id]` (Band 2 admin routes). Login never consults it.

## The recommended path for Phase 0

**Pick the model that matches the code, not the model that matches the
declared intent.** Going single-DB-with-tenantId-everywhere for Phase 0
means:

1. The repo can be made multi-tenant-safe in days, not months.
2. The 119 existing `tenantId` columns become *the* tenancy mechanism
   (currently they're only consulted in 13 of 220 API routes — the rest
   ignore them).
3. RLS works straightforwardly: one `tenant_isolation` policy per table.
4. **Phase 1 kernel can choose schema-per-tenant from a clean slate**
   (per ADR-0002), because the ERP repo is being archived. The work
   here is finite and disposable.

The schema-per-tenant scaffolding in `master.prisma` becomes vestigial —
left in place for the few admin routes that already use it, but not
extended.

## Status (live)

- ✅ **B2.1 — Schema + auth wiring**. User.tenantId field
  added, email constraint changed to `@@unique([tenantId, email])`,
  login flow attaches tenantId from User row (and demo credentials
  fall back to `DEFAULT_DEMO_TENANT_ID`). `TENANT_SCHEMA_DEBT` is now
  empty; tests updated to verify User is auto-scoped.
- ⏳ B2.2 — Operator action: apply the migration in
  `scripts/b2-1-user-tenantid-migration.sql` + the master seed in
  `scripts/b2-1-master-tenant-seed.sql`.
- ✅ **B2.3 — RLS generator + 120-table SQL output** (this commit).
  `scripts/generate-rls-migration.ts` parses `schema.prisma`, excludes
  `SHARED_LOOKUP_MODELS` ∪ `TENANT_SCHEMA_DEBT`, emits deterministic
  `scripts/generated/rls-enable.sql` + `rls-disable.sql`. CI can
  re-run via `npm run db:rls:verify` to catch schema drift.
- ⏳ B2.4 — SET LOCAL wiring in withAuthAndTenant.
- ⏳ B2.5 — Two-tenant integration test.

## B2 work breakdown

### B2.1 — Schema migration: add User.tenantId (1 day)

`prisma/schema.prisma` change:

```prisma
model User {
  id           String   @id @default(cuid())
  tenantId     String
  // ... existing fields
  @@index([tenantId])
  @@unique([tenantId, email])    // replace the existing @unique on email
  @@map("users")
}
```

The current `email String @unique` constraint is broken-by-design for
multi-tenancy: it would prevent two tenants from having a user with the
same email. Replace with `@@unique([tenantId, email])` (matches the
master schema's `TenantUser` shape).

Backfill migration (Phase 0-safe — works with the current single-tenant
seed):

```sql
-- 1. Add column as nullable so existing rows accept the alter
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;

-- 2. Backfill all existing users to the seed tenant.
--    For pre-launch ERP this is the only tenant in use.
UPDATE "users" SET "tenantId" = 'tenant_pharmacorp_eg' WHERE "tenantId" IS NULL;

-- 3. Lock it down
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- 4. Replace the unique-email constraint
ALTER TABLE "users" DROP CONSTRAINT "users_email_key";
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
```

If `tenant_pharmacorp_eg` doesn't exist as a `Tenant` row in the master DB
(seed only creates the per-tenant data), B2.1 also creates that row so
foreign-key integrity is maintainable.

After this lands:
- Remove `"User"` from `TENANT_SCHEMA_DEBT` in
  `src/lib/api/tenant-augment.ts`.
- Update test expectations in
  `src/lib/api/__tests__/with-tenant.test.ts` (the `TENANT_SCHEMA_DEBT.has("User")` assertion becomes `false`).

### B2.2 — Wire login to populate session.user.tenantId (0.5 day)

In `src/lib/auth/auth-options.ts`:

```typescript
// DB user lookup (line 55-69) — add tenantId to the return
const dbUser = await prisma.user.findFirst({
  where: { OR: [{ email: trimUser }, { name: trimUser }], isActive: true },
});

if (dbUser && compareSync(trimPass, dbUser.passwordHash)) {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department || undefined,
    tenantId: dbUser.tenantId,        // ← NEW: now defined after B2.1
  };
}
```

Demo credentials (lines 35-47) need `tenantId` too. For Phase 0 the
straightforward fix is to attach the seed tenant to every demo
credential in `auth-utils.ts`:

```typescript
{ profile: { ..., tenantId: "tenant_pharmacorp_eg" } }
```

Production-only NextAuth Credentials provider already requires email
lookup, so once B2.1 lands, `user.tenantId` flows through naturally.

**Multi-tenant email collision** (a user with the same email in two
tenants) is out of scope for Phase 0 — `findFirst({ where: { email } })`
returns the first match. Phase 1 kernel addresses this with a tenant-
slugged login URL (`/login?tenant=acme`). For Phase 0, document this as
a known limitation since current data has exactly one tenant.

### B2.3 — Postgres RLS policies on 119 tenant-scoped models (2-3 days)

Generate one migration that:

```sql
-- For every tenant-scoped table (119 of them), enable RLS + add policy:
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ... repeat for SalesOrder, Invoice, Workflow, ... (119 total)
```

The 1 model NOT in this loop is whichever schema-debt model exists at
the time. After B2.1 lands `User` should be removed from
`TENANT_SCHEMA_DEBT` and included in the RLS rollout.

Generation strategy: a script in `scripts/` that reads `schema.prisma`,
emits SQL for each tenant-scoped `@@map` model, and outputs a Prisma
migration file. Keeps the migration deterministic and reviewable.

### B2.4 — Wire SET LOCAL into withAuthAndTenant (0.5 day)

Once RLS is on, `withAuthAndTenant` must set the session variable per
request:

```typescript
// in createTenantScopedPrisma, wrap operations in a transaction that
// sets app.current_tenant_id at the start of each connection-bound op:
await prisma.$executeRawUnsafe(
  `SET LOCAL app.current_tenant_id = '${tenantId}'`,
);
```

Q3 from the audit (does Prisma's `$transaction` honor `SET LOCAL`?) is
empirically verified here. If it doesn't, fallback to a Prisma
`$extends` query interceptor that issues `SET app.current_tenant_id`
before each statement on the same connection.

**Security note:** `tenantId` comes from a signed JWT session — not
user-controlled input — so `SET LOCAL ... '${tenantId}'` is not an
injection vector. Belt and suspenders, validate tenantId as a CUID
shape before interpolation.

### B2.5 — Integration test with two real tenants (1 day)

Creates Playwright/vitest test that:

1. Seeds two tenants (`tenant_a`, `tenant_b`) with one user each.
2. Logs in as user A.
3. Creates a `SalesOrder` in tenant A.
4. Calls `GET /api/v1/sales-orders` — verifies only tenant A's order
   returns.
5. Tries to fetch tenant B's order by ID — verifies 404.
6. Repeats with `withAuthAndTenant` and direct Prisma access via
   `$queryRaw` to verify RLS blocks both paths.

This becomes the canonical regression test for B3-B9 route migrations.

## B2 estimated total: 5 days

| Step | Effort |
|---|---|
| B2.1 — User.tenantId schema migration | 1 d |
| B2.2 — Login flow attaches tenantId | 0.5 d |
| B2.3 — RLS policies on 119 models | 3 d |
| B2.4 — SET LOCAL in withAuthAndTenant | 0.5 d |
| B2.5 — Two-tenant integration test | 1 d |

Original Track B estimate was 23 days total; B2 fits in the 3-day
slot originally allocated.

## Open decisions for B2 kickoff

| Question | Default |
|---|---|
| Do we backfill `User.tenantId` to a single seed tenant, or require manual remediation? | Single seed tenant (`tenant_pharmacorp_eg`) — only one tenant in current data. |
| Email-uniqueness change: switch from `@unique` to `@@unique([tenantId, email])` in this PR? | Yes — current constraint is incompatible with multi-tenancy. |
| Should we also create the matching `Tenant` row in master DB? | Yes — keeps the two DBs consistent for the few admin routes that already read master. |
| Multi-tenant login (same email across tenants) — solve in Phase 0 or defer? | Defer to Phase 1 kernel. Document Phase-0 limitation: exactly-one-tenant in current data, so collision can't happen. |
| RLS migration: one-big-migration or per-table? | One migration generated by a script reading `schema.prisma`. Reviewable, deterministic, reversible. |

## What this does NOT address

Out of scope for B2 (and Phase 0):
- Schema-per-tenant routing (`Tenant.dbUrl` consumption) — Phase 1 kernel only.
- Per-tenant admin onboarding flow / tenant provisioning.
- ABAC predicates (Q6 — confirmed defer to Phase 1).
- Audit-log emission from `withAuthAndTenant` — separate ADR-0008 work, scheduled with the kernel.
- Cross-tenant migration tooling (tenant move, tenant merge, tenant deletion).

## Cross-references

- `docs/PHASE0_TRACK_B_AUDIT.md` — the parent audit doc; B2 closes audit findings P0-Confidentiality and P0-Integrity.
- `docs/PHASE0_PLAN.md` — Phase 0 Track B section
- `src/lib/api/tenant-augment.ts` — the `TENANT_SCHEMA_DEBT.User` entry that B2.1 removes
- `prisma/master.prisma` — the dormant schema-per-tenant declaration; stays untouched
- `prisma/schema.prisma` — modified in B2.1 (User model)
- ADR-0002 (`amoufaq5/CrossEngin/docs/adr/0002-multi-tenancy-model.md`) — schema-per-tenant for the new kernel
- ADR-0008, ADR-0017 — audit + observability requirements informing follow-ups
