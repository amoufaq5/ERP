// Pure tenant-scoping logic for Prisma query args.
//
// This file deliberately has NO runtime imports (no Prisma client, no
// NextAuth, no logger). It exists so the augmentation logic can be
// unit-tested in isolation without booting the full server runtime.
//
// `src/lib/api/with-tenant.ts` consumes these exports to build the
// runtime helpers that wrap auth + the Prisma extension.
//
// Cross-references:
//   docs/PHASE0_TRACK_B_AUDIT.md
//   amoufaq5/CrossEngin/docs/adr/0002-multi-tenancy-model.md

// ─── Shared lookup allowlist ────────────────────────────────────────────────
//
// Models in this set are intentionally cross-tenant: a single source of
// truth, identical for every tenant. They are NOT auto-scoped by the
// extension.
//
// Adding a model here is a security decision and requires code review +
// confirmation from the security-of-record owner (see ADR-0008).
//
// Finding from B1 schema audit (2026-05-11): the current ERP schema has
// NO cross-tenant reference tables. All 119 tenant-scoped models have
// `tenantId: String @@index([tenantId])`. No `Country` / `Currency` /
// `ICD10Code` / `DrugFormulary` / `Permission` / `Role` tables exist —
// roles are string enums on `User.role`, currency / country are stored
// inline as strings.
//
// The allowlist is therefore empty in this codebase. Kept as a typed
// constant so future schema changes that introduce true global tables
// have a single, reviewable place to declare the exemption.
export const SHARED_LOOKUP_MODELS = new Set<string>([
  // (none — see comment above)
]);

// ─── Known schema exceptions ────────────────────────────────────────────────
//
// Models that SHOULD be tenant-scoped but currently lack a `tenantId`
// column. Auto-scoping is suppressed for these until the schema is fixed.
//
// Every entry here is a known security debt. Track B2 must close them
// by adding `tenantId String @@index([tenantId])` + backfill migration.
//
// DO NOT add new entries without explicit approval — this set should
// only shrink.
export const TENANT_SCHEMA_DEBT = new Set<string>([
  // User: NextAuth callbacks set `token.tenantId = user.tenantId` but the
  // Prisma `User` model has no `tenantId` field. Auth flow currently
  // depends on this field being set elsewhere (likely a hand-populated
  // session value). Track B2 adds the column + backfills from related
  // entity ownership or master-db tenant assignments.
  "User",
]);

// ─── Pure augmentation helper ──────────────────────────────────────────────
//
// Given a model name, operation, and the original args object, returns a
// new args object with `tenantId` injected into the appropriate places.
//
// Spread order is `{ ...callerWhere, tenantId }` — the wrapper's tenantId
// always wins, so a handler cannot accidentally (or maliciously) query
// another tenant's data by passing `where: { tenantId: "other" }`.
//
// Returns the original args unchanged (identity, no copy) when:
//   - The model is in SHARED_LOOKUP_MODELS (intentionally cross-tenant)
//   - The model is in TENANT_SCHEMA_DEBT (cannot scope; column missing)
//
// For recognized operations, returns a shallow copy with the relevant
// where / data / create branch replaced by an augmented version.
//
// For unrecognized operations (e.g., $executeRaw or aggregations not
// in the recognized list), returns a shallow copy with no augmentation.
// Such callers must scope manually or use platformAdminPrisma().
export function augmentArgsForTenant(
  model: string | undefined,
  operation: string,
  args: unknown,
  tenantId: string,
): unknown {
  if (model && SHARED_LOOKUP_MODELS.has(model)) return args;
  if (model && TENANT_SCHEMA_DEBT.has(model)) return args;

  const a = { ...((args ?? {}) as Record<string, unknown>) };

  if (
    operation === "findUnique" ||
    operation === "findUniqueOrThrow" ||
    operation === "findFirst" ||
    operation === "findFirstOrThrow" ||
    operation === "findMany" ||
    operation === "count" ||
    operation === "aggregate" ||
    operation === "groupBy" ||
    operation === "update" ||
    operation === "updateMany" ||
    operation === "delete" ||
    operation === "deleteMany"
  ) {
    a.where = { ...(a.where as object | undefined), tenantId };
  }

  if (operation === "create") {
    a.data = { ...(a.data as object | undefined), tenantId };
  }
  if (operation === "createMany") {
    const data = a.data;
    if (Array.isArray(data)) {
      a.data = data.map((row) => ({ ...(row as object), tenantId }));
    } else if (data && typeof data === "object") {
      a.data = { ...(data as object), tenantId };
    }
  }
  if (operation === "upsert") {
    a.where = { ...(a.where as object | undefined), tenantId };
    a.create = { ...(a.create as object | undefined), tenantId };
  }

  return a;
}
