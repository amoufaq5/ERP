# Phase 0 Salvage Inventory

> The Phase 0 closing artifact. What's worth taking from the ERP
> repo into the Phase 1 monorepo before this repo is archived.

## Context

After Phase 0 audit + hardening, the user (repo owner) decided:

- **Don't carry forward any UI or flows.** None match their vision.
- **Don't carry forward any data.** No real production users.
- **Phase 1 = greenfield rebuild in `amoufaq5/CrossEngin`**, AI-assisted.

## Doctrine v2 — operator directive 2026-05-12

After a doctrine review, the salvage corpus is reclassified:

1. **Vision is multi-industry, not pharma-only.** The old repo was
   built for pharma; Phase 1 (CrossEngin) targets a modular ERP
   where pharma is one verticalization. Read schema, enums, and
   module list as one possible vertical, not as canonical.
2. **Integrations were corrupted.** Doc 04 is reference only for
   what external systems were attempted, not code to copy.
3. **Workflows were corrupted.** State-machine maps in doc 02 are
   reference only — re-derive in Phase 1.
4. **Seed data was mock.** Doc 06 is descriptive only. Don't
   import names / phones / addresses / products.
5. **Roles were demo.** Doc 08 (RBAC) is reference only for the
   kinds of personas typical at an Egyptian pharma company. Phase
   1 designs its own role set.
6. **Validations are corrupted.** Docs 03 and 10 are reference
   only for WHICH entities had validation + field naming.
   Re-derive every rule in Phase 1.

Net effect: salvage value is **architectural + vocabulary** —
patterns in 05, expanded vocabulary in 02 (v2), the ADRs, and the
multi-industry module decomposition in 09 (v2). Code-level
artifacts (validations, integrations, seed, RBAC, workflow maps,
pharma-only schema) are checklists, not source.

## What's in here

| File | Content | Doctrine v2 disposition |
|---|---|---|
| [`01-schema-reference.md`](./01-schema-reference.md) | Every Prisma model with fields, relations, indexes, SQL table name | **Reference only** — pharma-vertical entity inventory; Phase 1 designs a multi-industry baseline + pluggable verticals |
| [`02-domain-vocabulary.md`](./02-domain-vocabulary.md) | Cross-industry + MENA + Egyptian vocabulary (v2 expansion) + 67 pharma enums + state-machine maps | **Carry** vocabulary; **reference only** for state machines |
| [`03-validation-catalog.md`](./03-validation-catalog.md) | 52 zod schemas across 26 entities | **CORRUPTED** — reference only for entity list + field naming |
| [`04-integrations.md`](./04-integrations.md) | External services attempted (DB, auth, ETA, AI, email, S3, Stripe, Sentry, OTel) | **CORRUPTED** — reference only for what was tried |
| [`05-patterns.md`](./05-patterns.md) | Phase 0 reusable code: tenant-scoping extension, RLS generator, state-transition helper, route factory | **Carry** — validated in Phase 0 |
| [`06-seed-data.md`](./06-seed-data.md) | Egyptian pharma sample data | **MOCK** — do not import; reference only for fixture shape |
| [`07-do-not-carry.md`](./07-do-not-carry.md) | Anti-list incl. doctrine v2 additions | **Carry** as regression guard |
| [`08-rbac-matrix.md`](./08-rbac-matrix.md) | RBAC role × entity table from `src/lib/api/rbac.ts` | **Reference only** — pharma-vertical personas |
| [`09-module-list.md`](./09-module-list.md) | Module / domain-area inventory + multi-industry Phase 1 decomposition (v2) | **Carry** v2 decomposition; reference old API surface as one vertical |
| [`10-validations-full.md`](./10-validations-full.md) | Verbatim dump of `src/lib/api/validations.ts` (52 zod schemas) | **CORRUPTED** — do not port logic |

## How Phase 1 should use this (v2)

### Week 1 — Read the inventory

Before any code is written in `amoufaq5/CrossEngin`:

1. Read this README, especially the **Doctrine v2** section.
2. Read `07-do-not-carry.md` as the regression guard.
3. Read the expanded vocabulary in `02-domain-vocabulary.md`
   (cross-industry + platform + MENA + vertical placeholders).
4. Read `09-module-list.md` v2 for the multi-industry
   decomposition (kernel + horizontal core + verticals +
   localization + platform services).
5. Read `01-schema-reference.md` as a **pharma-vertical entity
   catalog only**, not the Phase 1 baseline.

### Week 2-3 — Monorepo + kernel foundation

The kernel skeleton lives in `amoufaq5/CrossEngin` per ADR-0001.
Build it from the 25 ADRs + the patterns in `05-patterns.md`.

Specific patterns to port:
- `withAuthAndTenant` + `tenant-augment` (Layer 1 isolation)
- RLS migration generator (Layer 2 isolation)
- State-transition helper
- Route factory (or its trpc / server-action equivalent)

### Week 4+ — Per-module work

For Tier 1 (kernel) and Tier 2 (horizontal core) modules:

1. **Schema:** design fresh from the multi-industry vision. Doc 01
   is reference for the pharma vertical only.
2. **Vocabulary:** pull from `02-domain-vocabulary.md` v2 sections
   (processes + platform + MENA). Pharma enums apply only to the
   pharma vertical pack.
3. **Validations:** re-derive. Docs 03 + 10 are entity checklist
   + field-naming hint only — the logic is corrupted.
4. **Workflows / state machines:** re-derive from real business
   rules. Maps in doc 02 are reference only.
5. **Integrations:** design fresh against ADRs. Doc 04 is a "what
   external systems exist" checklist.
6. **RBAC:** design fresh per ADR-0008 (ABAC). Doc 08 informs the
   pharma vertical's role pack only.
7. **Seed data:** design fresh from public sources. Doc 06
   indicates shape, not content.
8. **UI + flows:** design fresh per the Phase 1 design system. Do
   not look at the old screens.

For Tier 3 (vertical packs):
- **Pharma:** lift pharma-specific enums + entities from 01 + 02
  as a starting point; re-derive validations + workflows.
- **Other verticals:** design from the vertical vocabulary
  placeholders in doc 02 + fresh domain research.

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
