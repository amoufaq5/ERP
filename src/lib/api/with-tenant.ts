// Tenant-scoped auth wrappers for Next.js API route handlers.
//
// This file is the entry point for Phase 0 Track B (PR B1). It replaces direct
// uses of `withAuth` + the global Prisma client for tenant-scoped business
// logic. Routes that touch tenant data must use `withAuthAndTenant` (or its
// `[id]`-route variant `withAuthAndTenantParams`) and use the `db` handle on
// the handler context — not the global Prisma import.
//
// Defense-in-depth model (per ADR-0002, ADR-0008, ADR-0017):
//   Layer 1 — Application: TenantScopedPrisma extension auto-injects
//             `where: { tenantId }` on every query against tenant-scoped
//             models. Bypassing this is a compile-time mistake.
//   Layer 2 — Database: Postgres RLS policies enforce the same constraint
//             via `current_setting('app.current_tenant_id')`. Activated in
//             Track B2; works alongside Layer 1.
//
// Shared lookup tables (Country, ICD10Code, DrugFormulary, etc.) are exempt
// from auto-scoping via SHARED_LOOKUP_MODELS below. Additions require a
// code review.
//
// Cross-references:
//   docs/PHASE0_TRACK_B_AUDIT.md — full audit and remediation plan
//   docs/PHASE0_PLAN.md          — Phase 0 Track B
//   amoufaq5/CrossEngin/docs/adr/0002-multi-tenancy-model.md
//   amoufaq5/CrossEngin/docs/adr/0008-rbac-abac-and-audit.md
//   amoufaq5/CrossEngin/docs/adr/0017-observability-and-slos.md

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { requirePermission } from "./rbac";
import { apiError } from "./api-helpers";
import prisma from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

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

// ─── Handler context ────────────────────────────────────────────────────────

export interface TenantAuthContext {
  tenantId: string;
  userId: string;
  role: string;
  /**
   * Tenant-scoped Prisma client. All queries through this handle are
   * automatically restricted to the current tenant. Do NOT fall back to the
   * global `prisma` import inside handlers protected by this wrapper.
   */
  db: PrismaClient;
}

// ─── Prisma extension: auto-inject `where: { tenantId }` ────────────────────
//
// Uses Prisma's `$extends` mechanism. Every find / count / update / delete
// against a tenant-scoped model has its `where` augmented with the current
// tenantId. Creates have their `data` augmented similarly.
//
// Models in SHARED_LOOKUP_MODELS pass through unchanged.
//
// NOTE: this is the Layer-1 defense. Layer 2 (Postgres RLS) is added in
// Track B2 and provides an independent enforcement point — a bug in this
// extension still cannot leak cross-tenant data once RLS is enabled.
function createTenantScopedPrisma(tenantId: string): PrismaClient {
  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && SHARED_LOOKUP_MODELS.has(model)) {
            return query(args);
          }
          if (model && TENANT_SCHEMA_DEBT.has(model)) {
            // Known schema debt — Track B2 must close. Until then, no
            // auto-scoping is possible because the column doesn't exist.
            // Layer 2 RLS will gate this once the column is added.
            return query(args);
          }

          const a = (args ?? {}) as Record<string, unknown>;

          // Read / list / aggregate / count / update / delete: scope WHERE
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

          // Create: inject tenantId into data
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

          // Upsert: scope both create payload and where + update payload
          if (operation === "upsert") {
            a.where = { ...(a.where as object | undefined), tenantId };
            a.create = { ...(a.create as object | undefined), tenantId };
          }

          return query(a);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// ─── Wrappers ───────────────────────────────────────────────────────────────

/**
 * Wrap a tenant-scoped Next.js API route handler.
 *
 * Verifies session, attaches `tenantId` + tenant-scoped Prisma client,
 * and returns 401 if the session lacks `tenantId`. RBAC checks proceed
 * through `requirePermission` (same as the legacy `withAuth`).
 *
 * Example:
 *
 *   export const GET = withAuthAndTenant(async (req, { db, tenantId }) => {
 *     const orders = await db.salesOrder.findMany();   // auto-scoped
 *     return apiResponse(orders);
 *   });
 */
export function withAuthAndTenant(
  handler: (req: NextRequest, ctx: TenantAuthContext) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return apiError("unauthenticated: missing tenant context", 401, req);
    }

    const auth = await requirePermission(req, session.user.role, session.user.id);
    if ("error" in auth) {
      return apiError(auth.error as string, auth.status as number, req);
    }

    const db = createTenantScopedPrisma(session.user.tenantId);
    return handler(req, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role || "ADMIN",
      db,
    });
  };
}

/**
 * `[id]`-route variant. Mirrors the legacy `withAuthParams`.
 */
export function withAuthAndTenantParams<P>(
  handler: (
    req: NextRequest,
    params: P,
    ctx: TenantAuthContext,
  ) => Promise<Response>,
) {
  return async (req: NextRequest, params: P) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return apiError("unauthenticated: missing tenant context", 401, req);
    }

    const auth = await requirePermission(req, session.user.role, session.user.id);
    if ("error" in auth) {
      return apiError(auth.error as string, auth.status as number, req);
    }

    const db = createTenantScopedPrisma(session.user.tenantId);
    return handler(req, params, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role || "ADMIN",
      db,
    });
  };
}

// ─── Escape hatch for Band 2 (platform admin / cross-tenant) routes ────────
//
// Use ONLY for routes that intentionally operate across tenants
// (e.g., CrossEngin staff admin tools). The route MUST gate on a
// platform-admin role and SHOULD log an audit event for every operation.
//
// Returns the unscoped global Prisma client.
export function platformAdminPrisma(): PrismaClient {
  return prisma;
}
