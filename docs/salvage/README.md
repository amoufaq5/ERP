# Phase 0 Salvage Inventory

> The Phase 0 closing artifact. What's worth taking from the ERP
> repo into the Phase 1 monorepo before this repo is archived.

## Context

After Phase 0 audit + hardening, the user (repo owner) decided:

- **Don't carry forward any UI or flows.** None match their vision.
- **Don't carry forward any data.** No real production users.
- **Phase 1 = greenfield rebuild in `amoufaq5/CrossEngin`**, AI-assisted.

That makes most of the existing ERP code disposable, but the
**domain knowledge** captured during ERP's development is real
and reusable. This directory is the handoff doc.

## What's in here

| File | Content | Purpose |
|---|---|---|
| [`01-schema-reference.md`](./01-schema-reference.md) | Every Prisma model with fields, relations, indexes, SQL table name | Domain map for Phase 1 module ownership |
| [`02-domain-vocabulary.md`](./02-domain-vocabulary.md) | 67 enums + state-machine transition maps + Egyptian pharma reference data | Business states + workflow rules |
| [`03-validation-catalog.md`](./03-validation-catalog.md) | 52 zod schemas across 26 entities | Field-level constraints + cross-field rules |
| [`04-integrations.md`](./04-integrations.md) | Every external service touched (DB, auth, ETA, AI, email, S3, Stripe, Sentry, OTel) | What was attempted and what worked |
| [`05-patterns.md`](./05-patterns.md) | Phase 0 reusable code: tenant-scoping extension, RLS generator, state-transition helper, route factory, etc. | Production-tested patterns |
| [`06-seed-data.md`](./06-seed-data.md) | Egyptian pharma sample data: hospitals, pharmacies, distributors, doctors, products, expenses | Demo tenant + AI training context |
| [`07-do-not-carry.md`](./07-do-not-carry.md) | Explicit anti-list: what looks tempting but should be rebuilt | Saves Phase 1 from re-importing known bugs |

## How Phase 1 should use this

### Week 1 — Read the inventory

Before any code is written in `amoufaq5/CrossEngin`:

1. Read `01-schema-reference.md` to understand the domain.
2. Read `02-domain-vocabulary.md` to absorb the business vocabulary.
3. Read `07-do-not-carry.md` as a guard against regression.

### Week 2-3 — Monorepo + kernel foundation

The kernel skeleton lives in `amoufaq5/CrossEngin` per ADR-0001.
Build it from the 25 ADRs + the patterns in `05-patterns.md`.

Specific patterns to port:
- `withAuthAndTenant` + `tenant-augment` (Layer 1 isolation)
- RLS migration generator (Layer 2 isolation)
- State-transition helper
- Route factory

### Week 4+ — Per-module work (Big Bang per the sequencing decision)

For every module:
1. Read the relevant section of `01-schema-reference.md`.
2. Adopt the enums from `02-domain-vocabulary.md` (renaming if needed).
3. Adopt validations from `03-validation-catalog.md` (preserve
   `.refine()` cross-field rules).
4. Adopt state-machine maps where relevant.
5. Design the UI + flows fresh per the Phase 1 design system —
   **do not** look at the old screens.

## Reproducibility

Auto-generated parts can be regenerated:

```bash
bash scripts/salvage-schema.sh    # rebuilds 01-schema-reference.md
bash scripts/triage-routes.sh     # historic Phase 0 triage (already irrelevant)
```

Prose parts (02-07) are hand-written; update only if the underlying
code changes meaningfully before archive.

## Archive readiness

After this inventory is reviewed:

1. Final commit on `claude/design-erp-system-OvuW9`.
2. Open a Phase-0-closing PR against `main` of the ERP repo (or
   merge directly if no PR workflow).
3. Tag the merge commit as `phase-0-end`.
4. Archive the ERP repo on GitHub (Settings → Archive this
   repository) — this preserves history while preventing
   accidental commits.
5. Begin Phase 1 in `amoufaq5/CrossEngin`.

## Cross-references

- `docs/PHASE0_PLAN.md` — original Phase 0 work plan
- `docs/PHASE0_TRACK_B_AUDIT.md` — original tenant-isolation audit
- `docs/PHASE0_TRACK_B2_BRIEF.md` — B2 design + decisions
- `docs/PHASE0_TRACK_B_TRIAGE.md` — final route classification
- `docs/PHASE0_TRACK_B_PLAYBOOK.md` — operator playbook
- `amoufaq5/CrossEngin/docs/adr/0001-0025` — the 25 architecture
  decision records that govern Phase 1
