# Phase 0 Salvage — Reusable Patterns

> Code-level patterns introduced or hardened during Phase 0 that are
> worth carrying into the Phase 1 kernel.

These are **proven** patterns — implemented, exercised against 100+
routes, and validated by hand and via unit tests where possible.

## 1. Tenant-scoped Prisma extension (`src/lib/api/tenant-augment.ts`)

A pure function that augments any Prisma query arg object to inject
`tenantId` on read predicates and create payloads. Used by the
`withAuthAndTenant` wrapper.

Key properties:
- Pure (no side effects, no runtime imports)
- Unit-tested (30+ cases in `with-tenant.test.ts`)
- Spread order guarantees caller-provided `tenantId` is always overridden — handlers can't escape their tenant even by accident
- Exempts `SHARED_LOOKUP_MODELS` (empty in this codebase) and `TENANT_SCHEMA_DEBT` (closed in Track B2.1)

```ts
augmentArgsForTenant(model, operation, args, tenantId) -> args'
```

**Phase 1 import:** carry this verbatim. Wire it into the kernel's
data layer the same way (extension on a `$transaction`-bound client).

## 2. Per-request transaction with `SET LOCAL` (`src/lib/api/with-tenant.ts`)

Each tenant-scoped request opens a Prisma interactive transaction
and runs `SELECT set_config('app.current_tenant_id', $1, true)` on
the tx connection. The handler runs inside this tx with both:

- Layer 1: the `$extends` middleware (auto-`tenantId` injection)
- Layer 2: Postgres RLS policies that read `current_setting('app.current_tenant_id')`

```ts
withAuthAndTenant((req, { db, tenantId, userId, role }) => Response)
withAuthAndTenantParams<P>((req, params: P, ctx) => Response)
```

Tunables: `TENANT_TX_TIMEOUT_MS = 30s`, `TENANT_TX_MAX_WAIT_MS = 5s`.
PgBouncer must be in transaction mode (statement mode breaks
`SET LOCAL`).

**Phase 1 import:** the architecture is the right shape for any
Postgres-backed multi-tenant kernel. Re-implement against the new
data layer; keep the same defense-in-depth model.

## 3. RLS policy generator (`scripts/generate-rls-migration.ts` + `scripts/generated/rls-enable.sql`)

A TypeScript generator that parses `prisma/schema.prisma` and emits
SQL for `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY
tenant_isolation ON <table> USING ("tenantId" = current_setting(...))`
for every tenant-scoped model.

Properties:
- Deterministic output (sorted by table name)
- Drift verifier: `npm run db:rls:verify` fails CI if schema changes
  haven't been re-run through the generator
- 120 policies emitted from this schema

**Phase 1 import:** the generator pattern. Phase 1's schema will have
different models but the same shape — auto-generate RLS to match.

## 4. State-transition route helper (`src/lib/api/status-transitions.ts`)

Folds the "PUT /<resource>/[id]/status with allowed-transitions
state machine" pattern into one config-driven helper:

```ts
export const { PUT } = createStateTransitionHandler({
  modelName: "invoice",
  entity: "invoice",
  statusEnum: ["DRAFT", "SENT", "PAID", "CANCELLED", "OVERDUE"] as const,
  allowedTransitions: { DRAFT: ["SENT", "CANCELLED"], ... },
  extraBody: { approvedBy: z.string().optional() },
  computeUpdate: ({ transition, extras }) => ({ approvedAt: new Date() }),
});
```

Supports configurable field name (status vs. stage), HTTP method
(PUT vs. PATCH), side-effect computation, and an `afterUpdate` hook.

**Phase 1 import:** keep the contract; reimplement on the new data
layer. Per-module state machines plug in as configs.

## 5. Generic CRUD route factory (`src/lib/api/route-factory.ts`)

`createRouteHandlers(config)` and `createRouteHandlersWithId(config)`
return wired-up handlers for list / create / read / update / delete
on any Prisma model.

Config exposes:
- `modelName` (Prisma client property name)
- `validationSchema` (create/update zod schemas)
- `searchFields` (which fields are searchable)
- `defaultSort`, `defaultPageSize`, `allowedIncludes`
- `hooks` (beforeCreate / afterCreate / etc.)

92 routes in the ERP repo use this. **Phase 1's per-module CRUD
should follow the same shape**, even if the implementation lives in
a new framework (e.g., trpc, REST, Server Actions).

## 6. Triage + codemod tooling (`scripts/triage-routes.sh`, `codemod-id-routes.sh`)

Not directly portable to Phase 1 (greenfield doesn't need migration
tooling), but the **pattern** is: when you have N routes to refactor,
build a triage script first that classifies them, then a codemod
that handles the bulk of cases. Hand-migrate the rest.

For Phase 1, the equivalent might be: when generating ~30 modules
with AI, build a sanity-check script that verifies every module
matches the template before merging.

## 7. Structured logger (`src/lib/logger.ts`)

Hand-rolled (not Pino) but provides:
- JSON-line output with level filtering
- Child loggers via `withRequest(requestId, tenantId, userId)`
- PII redaction (`password`, `secret`, `token`, `apikey`, etc.)
- Pretty mode in development

**Phase 1 import:** the API surface. Reimplementing on top of Pino
would be straightforward; the redaction logic is the valuable part.

## 8. Audit log emission (`src/lib/api/audit-logger.tsx` + Prisma `AuditLog` model)

Not deeply exercised in Phase 0 work, but the model + helper exist.
Phase 1 should make audit log emission **mandatory** on every
mutation (per ADR-0008), which Phase 0 left as a TODO inside the
`withAuthAndTenant` wrapper.

## Worth a deeper read before salvage

Identified but not exhaustively audited:
- `src/lib/workflow/` — workflow engine (matches the `Workflow`/`WorkflowLog` Prisma models)
- `src/lib/platform/` — module-registry pattern; aligns with ADR-0001 monorepo + module shape
- `src/lib/jobs/` — likely BullMQ integration scaffold
- `src/lib/cache/` — Redis caching layer
- `src/lib/i18n/` — Arabic + English (Egypt market)
- `src/lib/pwa/` — offline / installable app

If Phase 1 needs any of these, audit the source first. Don't
reinvent without checking.
