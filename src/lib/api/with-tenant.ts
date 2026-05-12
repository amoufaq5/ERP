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
import {
  augmentArgsForTenant,
  SHARED_LOOKUP_MODELS,
  TENANT_SCHEMA_DEBT,
} from "./tenant-augment";

// Re-export pure helpers so consumers can import everything from a single
// module if they don't care about the runtime/pure separation.
export { augmentArgsForTenant, SHARED_LOOKUP_MODELS, TENANT_SCHEMA_DEBT };

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

// ─── Prisma extension: auto-inject tenantId via $extends ───────────────────
//
// Thin wrapper around augmentArgsForTenant. Every Prisma query against a
// tenant-scoped model has its args augmented with the current tenantId.
//
// This is the Layer-1 defense. Layer 2 (Postgres RLS) is added in
// Track B2 and provides an independent enforcement point — a bug in
// the augmentation logic still cannot leak cross-tenant data once
// RLS is enabled.
function createTenantScopedPrisma(tenantId: string): PrismaClient {
  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const augmented = augmentArgsForTenant(model, operation, args, tenantId);
          return query(augmented as typeof args);
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
