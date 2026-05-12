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
//             via `current_setting('app.current_tenant_id')`. Wired in
//             Track B2.4 via `set_config` inside an interactive transaction;
//             activated when the migration in scripts/generated/rls-enable.sql
//             is applied (operator action; see B2 brief).
//
// Phase 0 transaction model:
//   Each tenant-scoped request opens a Prisma interactive transaction. The
//   transaction's connection has `app.current_tenant_id` set via
//   `SELECT set_config(..., is_local := true)`. The handler runs entirely
//   inside this transaction; both Layer 1 (the extension) and Layer 2 (RLS
//   policies on the same connection) apply consistently. The transaction
//   commits on handler return, releasing the connection back to the pool.
//
// Tradeoffs:
//   - Every request holds a connection for the handler's lifetime.
//     Connection-pool size must be tuned to peak concurrent in-flight
//     handlers.
//   - Long-running handlers can hit the 30s transaction timeout. Slow
//     report queries should be moved off the request path.
//   - PgBouncer transaction mode works. Statement mode would break the
//     SET LOCAL semantics; do NOT deploy under statement-pooling.
//
// Shared lookup tables (none in this schema; see SHARED_LOOKUP_MODELS in
// tenant-augment.ts) are exempt from auto-scoping.
//
// Cross-references:
//   docs/PHASE0_TRACK_B_AUDIT.md       — full audit and remediation plan
//   docs/PHASE0_TRACK_B2_BRIEF.md      — B2 work plan + decisions
//   docs/PHASE0_PLAN.md                — Phase 0 Track B
//   scripts/generated/rls-enable.sql   — Layer 2 policies
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

// ─── Tunables ───────────────────────────────────────────────────────────────

/**
 * Per-request transaction timeout. Handlers must complete (including all DB
 * work) within this window; otherwise Prisma rolls the transaction back and
 * the request errors. Slow report endpoints should be moved off the
 * request path (cron + materialized view, queue + async, etc.).
 */
const TENANT_TX_TIMEOUT_MS = 30_000;

/**
 * Maximum time to wait for a free connection before timing out the request
 * acquisition. Lower than the per-request timeout so we fail fast under
 * pool exhaustion instead of compounding waits.
 */
const TENANT_TX_MAX_WAIT_MS = 5_000;

// ─── Handler context ────────────────────────────────────────────────────────

export interface TenantAuthContext {
  tenantId: string;
  userId: string;
  role: string;
  /**
   * Tenant-scoped Prisma client. Backed by an interactive transaction whose
   * connection has `app.current_tenant_id` set; queries are auto-augmented
   * with `where: { tenantId }` on top of that.
   *
   * Do NOT fall back to the global `prisma` import inside handlers protected
   * by this wrapper — that connection has no session variable and RLS will
   * block every row (fail-closed by design).
   *
   * Typed as `PrismaClient` for ergonomics; the runtime value is the extended
   * transactional client.
   */
  db: PrismaClient;
}

// ─── Prisma extension: auto-inject tenantId via $extends ───────────────────
//
// Layer 1 defense. Builds on the pure augmentArgsForTenant helper from
// tenant-augment.ts. Generic over the underlying client so it can extend
// either the global PrismaClient OR an interactive transaction client
// (`tx` from $transaction). The transactional variant is what
// withAuthAndTenant uses so Layer 1 and Layer 2 (set_config on the same
// connection) compose correctly.
function applyTenantScoping<C extends { $extends: PrismaClient["$extends"] }>(
  client: C,
  tenantId: string,
): C {
  return client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const augmented = augmentArgsForTenant(model, operation, args, tenantId);
          return query(augmented as typeof args);
        },
      },
    },
  }) as unknown as C;
}

/**
 * Background-job / script entry point. Returns the Layer-1-only extended
 * client over the global prisma instance — NO transaction, NO SET LOCAL.
 * Use this only outside the request path (cron, ad-hoc scripts) AND only
 * when the caller has already arranged for RLS to be off or bypassed
 * (e.g., running as a migration role).
 *
 * For request-path code, use withAuthAndTenant instead.
 */
export function createTenantScopedPrisma(tenantId: string): PrismaClient {
  return applyTenantScoping(prisma, tenantId) as unknown as PrismaClient;
}

// ─── Wrappers ───────────────────────────────────────────────────────────────

/**
 * Per-request body of the tenant-scoped wrappers. Resolves session, runs
 * RBAC, opens an interactive transaction with `app.current_tenant_id`
 * set, then invokes the handler with an extended `tx` client.
 *
 * Pulled out of the two wrapper functions to keep them DRY and to make
 * the transaction lifetime + error handling explicit.
 */
async function runTenantScoped<T>(
  req: NextRequest,
  invokeHandler: (ctx: TenantAuthContext) => Promise<Response>,
): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return apiError("unauthenticated: missing tenant context", 401, req);
  }

  const auth = await requirePermission(req, session.user.role, session.user.id);
  if ("error" in auth) {
    return apiError(auth.error as string, auth.status as number, req);
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const role = session.user.role || "ADMIN";

  return prisma.$transaction(
    async (tx) => {
      // Layer 2 hookup. set_config(name, value, is_local := true) is the
      // function-call equivalent of `SET LOCAL`; scoped to this transaction,
      // auto-reverted on commit. RLS policies in scripts/generated/rls-enable.sql
      // read it via current_setting('app.current_tenant_id', true).
      //
      // tenantId comes from a signed JWT, never user input. Belt and braces,
      // $executeRaw's tagged-template form parameterizes the value, so even
      // a malformed JWT can't inject SQL.
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

      const db = applyTenantScoping(tx, tenantId) as unknown as PrismaClient;
      return invokeHandler({ tenantId, userId, role, db });
    },
    { timeout: TENANT_TX_TIMEOUT_MS, maxWait: TENANT_TX_MAX_WAIT_MS },
  );
}

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
 *     const orders = await db.salesOrder.findMany();   // auto-scoped + RLS
 *     return apiResponse(orders);
 *   });
 */
export function withAuthAndTenant(
  handler: (req: NextRequest, ctx: TenantAuthContext) => Promise<Response>,
) {
  return (req: NextRequest) =>
    runTenantScoped(req, (ctx) => handler(req, ctx));
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
  return (req: NextRequest, params: P) =>
    runTenantScoped(req, (ctx) => handler(req, params, ctx));
}

// ─── Escape hatch for Band 2 (platform admin / cross-tenant) routes ────────
//
// Use ONLY for routes that intentionally operate across tenants
// (e.g., CrossEngin staff admin tools). The route MUST gate on a
// platform-admin role and SHOULD log an audit event for every operation.
//
// Returns the unscoped global Prisma client. NO transaction is opened, so
// RLS will block all reads against this client once policies are applied —
// platform-admin routes therefore need to run inside a transaction that
// either disables RLS for that connection (BYPASSRLS role) or sets a
// per-table `app.platform_admin = 'true'` policy escape. Defer until
// Band 2 migration.
export function platformAdminPrisma(): PrismaClient {
  return prisma;
}
