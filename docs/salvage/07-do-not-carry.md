# Phase 0 Salvage — What NOT to Carry

> Explicit anti-list. Things in the ERP repo that look tempting but
> would import known problems into Phase 1.

The user's stated dissatisfaction with the existing UI/UX/flows is
strong. Phase 1 is greenfield by design. This list captures
specific patterns that should NOT be copied even if a Phase 1
developer (human or AI) is tempted to reach for them.

## UI layer (entire surface)

- **Every screen in `src/app/**/page.tsx`** — design + UX rebuilt
  from scratch per the Phase 1 design system.
- **Every UI component in `src/components/`** — re-derive from
  shadcn/ui + the Phase 1 design tokens.
- **The page-level navigation / IA / sidebar / topbar layout.**
- **Color palette + typography choices** — Phase 1 picks fresh.

## Flow + integration patterns

- **Page transitions / routing** — Phase 1 IA will differ.
- **Data fetching hooks tied to old store shapes** — Phase 1 uses
  whatever the new data layer dictates.
- **Form-state management patterns** — re-derive with React Hook
  Form / formstand + zod on the Phase 1 design system.

## Anti-patterns explicitly found in Phase 0

| Anti-pattern | Where | Why not |
|---|---|---|
| `let prisma: any = null; try { require("@/lib/prisma").default; } catch ...` | 55+ route files | Lazy-load shim; useless under a kernel that owns the data layer |
| `(prisma as any).<model>` | 5 status routes (now migrated) | Casts away types; led to wrong-casing bugs (`prisma.kpi` vs `kPI`) |
| `tenantId = req.headers.get("x-tenant-id") \|\| "default"` | route-factory + 5 status routes | P0 security hole; tenancy must come from signed session, never headers |
| `let prisma = new PrismaClient()` inside a request handler | `auth-options.ts:38` and `users/route.ts` | Connection leak per request |
| `Mock fallback` arrays inside API handlers | 30+ routes | Conflated dev + production paths; dead code under the wrapper |
| `localStorage` references in API routes | `users/route.ts` (`STORAGE_KEY`, `CREDS_KEY`) | Mixes client + server concerns |
| `INITIAL_*` mock arrays as canonical data | 8 dashboard pages (Track C of Phase 0 was supposed to fix this) | Page-level mocks instead of real data |
| Routes referencing missing Prisma models | `einvoice` (`eInvoice`, `etaSettings`) | Non-functional; deleted in Track B6 |
| `as any` to bypass type errors | 7 routes | Hides real bugs |
| Generic `catch (error) { console.error("Failed to process X:", error); }` blocks | 56 routes | Silently swallows errors; logs without context |
| `email String @unique` on `User` | Was in `prisma/schema.prisma` until Track B2.1 | Incompatible with multi-tenancy (now `@@unique([tenantId, email])`) |

## Route-level shapes to avoid

- **Routes that mix mock + real backends** — Phase 1 has no mocks
  at the route level; mock at the data-layer / fixture level instead.
- **Routes that hand-build CRUD instead of using `createRouteHandlers`** — the
  factory pattern (or its trpc / server-action equivalent in Phase 1) should be the default.
- **Status-transition logic inlined in routes** — use the helper.

## Don't try to fix it in place

If you're tempted to "just clean up" an old screen / route before
porting it to Phase 1:

1. The salvage inventory (this directory) captures what's worth
   keeping at a structural level.
2. Phase 1 is meant to start with a clean module template, not
   modified-old-code.
3. Time spent polishing ERP code is time not spent on Phase 1.

## Phase 0 tracks that did NOT close

Just so the next maintainer doesn't expect them:

- **Track B Band 1 list-route migration** — 31 STANDARD list routes
  + 80 NO-PRISMA routes never migrated. Acceptable because Phase 1
  rebuilds the route layer entirely.
- **Track C** — INITIAL_* removal in 8 pages. Never started; the
  pages will be replaced.
- **Track E** — CI hardening (contract tests, Playwright smoke,
  type-coverage gate). Never started; Phase 1 starts CI fresh.
- **Track A2-A4** — Sentry release tracking, per-tenant tagging.
  Track A1 (install) is done; the rest will be configured in Phase 1.
- **Track B2.5** — Two-tenant integration test. Never written;
  Phase 1 should write the equivalent against the new kernel.

## Doctrine v2 additions (2026-05-12)

Operator-issued: additional categories that look salvageable but
should NOT be carried into Phase 1 in the form they exist in the
old repo.

| Category | Rationale | Phase 1 disposition |
|---|---|---|
| **Seed / demo data** | All mock; no real-market validation. Names, phones, products are placeholders | Phase 1 designs demo data fresh from public sources. Doc 06 is shape-only. |
| **Integrations** | All corrupted. Connector framework, AI provider stubs, email queue, banking client were attempted but not production-grade | Doc 04 is a checklist of WHICH external systems matter. Phase 1 picks integrations fresh per ADRs. |
| **Workflows / state machines** | State-machine maps in doc 02 and in route code were corrupted | Re-derive in Phase 1 from real business rules; maps in doc 02 are reference only. |
| **RBAC / roles** | Demo only; not based on real customer org charts | Phase 1 designs its own role + permission system. Doc 08 is reference for pharma-vertical persona types. |
| **Validations (zod schemas)** | Corrupted. Field rules, refinements, enum lists don't reflect the real schema | Docs 03 and 10 are reference for entity list + field naming only. Re-derive every rule in Phase 1. |
| **Pharma-only entity scoping** | Old schema is pharma-vertical; multi-industry vision requires broader baseline | Doc 01 is reference for the pharma vertical. Phase 1 designs a multi-industry baseline + pharma as one pluggable vertical. |

## Final guidance (v2)

When in doubt, **default to building from scratch in Phase 1.**

The salvage inventory is for **decisions** and **vocabulary** to
carry forward — not for code to copy-paste.

**Carry list (high confidence):**
- The 25 ADRs in `amoufaq5/CrossEngin/docs/adr/`.
- Patterns in `05-patterns.md` (route factory, tenant-scoping
  extension, RLS generator, state-transition helper).
- Vocabulary expansion in `02-domain-vocabulary.md` v2
  (cross-industry processes + platform + MENA + vertical
  placeholders).
- Module decomposition v2 in `09-module-list.md`.

**Reference-only list:**
- Schema (01), state machines (02 second half), RBAC (08) — input
  to the pharma vertical pack only.
- Integrations (04) — checklist for "did we miss any external
  dependency?"
- Validations (03, 10) — checklist for "which entities need
  validation?"

**Discard list:**
- Seed data specifics (06).
- All UI, flows, screens.
- All old route handler code.
- Any old config / env values not reconfirmed in Phase 1.
