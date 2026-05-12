# Phase 0 Track B — Migration Playbook (automated)

> Companion to `docs/PHASE0_TRACK_B_AUDIT.md` (the original audit) and
> `docs/PHASE0_TRACK_B_TRIAGE.md` (auto-generated route classification).

This is the playbook for moving the ERP repo from "no tenant isolation"
to "Layer-1 + Layer-2 enforced isolation on every request" with as
much automation as possible.

## Inventory

Run the triage:
```bash
bash scripts/triage-routes.sh
```

Then review `docs/PHASE0_TRACK_B_TRIAGE.md`. Categories:

| Bucket | Action | Automation |
|---|---|---|
| **FACTORY** (92 routes) | Migrate `src/lib/api/route-factory.ts` once | Single-file change; all routes inherit |
| **STANDARD** (55 routes) | Run codemod | `scripts/migrate-routes.ts` |
| **REWRITE** (5 routes) | Scaffold from schema | `scripts/scaffold-route.ts` |
| **REVIEW** (3 routes) | Manual | Read + decide |
| **NO-PRISMA** (53 routes) | Manual triage | Categorize: proxy / dead / needs-DB |
| **BAND-3** (12 routes) | Skip | Auth / webhook / health / docs |

## Order of operations

Strict order matters — applying RLS before routes are migrated will
break unmigrated routes.

### Step 1 — Apply pending DB migrations
Per Track B2 brief:

```bash
# B2.1 migration (User.tenantId column)
npx prisma migrate dev --create-only --name add_user_tenantid_and_composite_unique
# Splice scripts/b2-1-user-tenantid-migration.sql into the generated migration.sql
npx prisma migrate dev
sqlite3 prisma/master.db < scripts/b2-1-master-tenant-seed.sql
```

DO NOT apply `scripts/generated/rls-enable.sql` yet.

### Step 2 — Migrate route-factory.ts (B4)

Already landed in commit `<this branch>`. Verifies via:

```bash
npx vitest run src/lib/api
```

Touches 92 routes by transitive inheritance. All factory routes now
require an authenticated session.

### Step 3 — Run the codemod on STANDARD routes (B5)

```bash
# Dry run first
npx tsx scripts/migrate-routes.ts

# Inspect the diff
cat scripts/generated/migrate-routes-*.diff | less

# Apply
npx tsx scripts/migrate-routes.ts --apply

# Sanity check
git diff --stat
npx vitest run
npm run build    # type errors are tolerated (ignoreBuildErrors=true)
```

The codemod handles ~80% of cases mechanically. Look for the
`CODEMOD: verify wrapping closure` markers — those flag handlers
where the closing `});` may not have been placed correctly.

Run in folder batches if you want smaller PRs:

```bash
npx tsx scripts/migrate-routes.ts --target 'src/app/api/v1/products/**' --apply
```

### Step 4 — Rewrite REWRITE-bucket routes (B6)

For each entry under `## REWRITE` in the triage report, choose
either to replace with the scaffold or to delete the route. Current
REWRITE list (5 routes):

| Route | Model reference | Decision |
|---|---|---|
| `/api/v1/einvoice/route.ts` | `eInvoice` (missing) | needs e-invoice domain decision |
| `/api/v1/einvoice/[id]/route.ts` | `eInvoice` | same |
| `/api/v1/einvoice/settings/route.ts` | `etaSettings` | same |
| `/api/v1/kpis/route.ts` | `kpi` (model is `KPI`) | model exists; scaffold should work |
| `/api/v1/kpis/[id]/route.ts` | `kpi` | same |

For the KPIs entries the model DOES exist (the route just got the
casing wrong). The scaffold generator uses correct casing:

```bash
rm src/app/api/v1/kpis/route.ts src/app/api/v1/kpis/[id]/route.ts
npx tsx scripts/scaffold-route.ts --model KPI --path /api/v1/kpis
```

For the e-invoice routes, the domain model doesn't exist in
`prisma/schema.prisma` at all. Operator decision: either add an
`EInvoice` model to the schema (then scaffold) OR delete these
routes (they cannot work today regardless). Defer to Phase 1 kernel
where a proper e-invoicing domain can be designed.

### Step 5 — Manual review (B7-B8)

REVIEW (3 routes): inspect each and decide migrate vs. rewrite:
- `src/app/api/users/route.ts`
- `src/app/api/v1/equipment/[id]/route.ts`
- `src/app/api/v1/equipment/route.ts`

NO-PRISMA (53 routes): sample-classify. Most likely sub-buckets:
- AI proxies (do not need migration)
- Stats / search / forecasting (compute over data; may need scoping if
  they read multi-tenant input)
- Mock-only stubs (delete or scaffold against the schema)

### Step 6 — Apply RLS migration (B9)

ONLY after all route migrations are merged:

```bash
npx prisma migrate dev --create-only --name enable_tenant_rls
# Splice scripts/generated/rls-enable.sql into the generated migration.sql
npx prisma migrate dev
```

Confirm with:

```bash
npm run db:rls:verify
```

After RLS lands in production, any unmigrated route still using the
global `prisma` import will return 0 rows on every query (fail-closed).
This is the safety net that catches stragglers.

### Step 7 — Two-tenant integration test (B2.5)

Final check: a Playwright/vitest test that boots the app with two
tenants and verifies cross-tenant requests return 404 / empty results.

## Automation guardrails

- `scripts/triage-routes.sh` is idempotent. Re-run anytime to refresh
  the triage report.
- `scripts/migrate-routes.ts` is dry-run by default. `--apply` writes;
  every run produces a diff under `scripts/generated/`.
- `scripts/scaffold-route.ts` refuses to overwrite without `--force`.
- `npm run db:rls:verify` (existing) fails CI if the schema and
  `scripts/generated/rls-enable.sql` drift apart.

## When the codemod is wrong

The codemod is regex-based and brittle by design (so it's reviewable).
Specific cases it CAN'T handle:

1. **Multi-line handler bodies with mock fallback** — the codemod
   wraps the handler with `withAuthAndTenant` but doesn't always
   close the wrapping parens cleanly. Look for the `CODEMOD: verify
   wrapping closure` marker and fix by hand.

2. **Nested relation creates** — `items: { create: [...] }` won't
   get `tenantId` auto-injected on the nested items. Layer 2 RLS +
   the NOT NULL constraint catch it at runtime; add explicit
   `tenantId` to each nested create on touched routes.

3. **Hand-written validation imports** — if the route's validation
   schema lives somewhere unusual, the import rewrite may not match.
   Manual fix.

For each, the workflow is:
1. Note the case in the diff review.
2. Run `git checkout` on the offending file.
3. Migrate by hand using B3 as the template.
4. Open an issue describing the new edge case so the codemod can be
   extended.

## Estimated effort with automation

| Task | Manual | With automation |
|---|---|---|
| Factory routes (92) | 60-90 h | 0.5 h (single PR) |
| Standard routes (55) | 25-35 h | 4-6 h (codemod + diff review + manual edge cases) |
| Rewrite routes (5) | 8-10 h | 2 h (scaffold + verify) |
| Review + No-Prisma (56) | 20-30 h | 12-15 h (still manual but bucketed) |
| **Total** | **115-165 h** | **~20 h** |

Roughly an 80% reduction in migration effort, mostly from the
factory hit.
