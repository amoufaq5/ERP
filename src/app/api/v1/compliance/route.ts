import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { getComplianceService, STANDARDS } from "@/lib/compliance/compliance-service";

function jsonResponse(data: unknown, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function jsonError(error: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Resolve the tenant ID from the session. Falls back to a header for API
 * clients and "default" for development.
 */
async function resolveTenantId(request: NextRequest): Promise<{
  tenantId: string;
  authorized: boolean;
}> {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const tenantId =
      (session.user as Record<string, unknown>).tenantId as string | undefined;
    return { tenantId: tenantId ?? "default", authorized: true };
  }

  // Fallback: header-based tenant for API clients / dev
  const headerTenant = request.headers.get("x-tenant-id");
  if (headerTenant) {
    return { tenantId: headerTenant, authorized: true };
  }

  // Dev mode: allow unauthenticated access
  if (process.env.NODE_ENV !== "production") {
    return { tenantId: "default", authorized: true };
  }

  return { tenantId: "", authorized: false };
}

/**
 * Normalize a standard query parameter to the canonical constant.
 */
function normalizeStandard(input: string): string | null {
  const upper = input.toUpperCase().replace(/[\s-]/g, "");
  if (upper === "SOC2") return STANDARDS.SOC2;
  if (upper === "HIPAA") return STANDARDS.HIPAA;
  if (upper === "ISO27001") return STANDARDS.ISO27001;
  if (upper === "21CFRPART11" || upper === "CFR21PART11" || upper === "CFRPART11")
    return STANDARDS.CFR21_PART11;

  // Try direct match
  const values = Object.values(STANDARDS) as string[];
  if (values.includes(input)) return input;

  return null;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { tenantId, authorized } = await resolveTenantId(request);
  if (!authorized) {
    return jsonError("Unauthorized", 401);
  }

  const service = getComplianceService();
  const { searchParams } = new URL(request.url);
  const standardParam = searchParams.get("standard");

  if (standardParam) {
    const standard = normalizeStandard(standardParam);
    if (!standard) {
      return jsonError(
        `Unknown standard "${standardParam}". Valid values: SOC2, HIPAA, ISO27001, 21CFRPart11`,
        400,
      );
    }

    const report = await service.generateReport(tenantId, standard);
    return jsonResponse(report);
  }

  // No filter: return all controls + scores
  const controls = await service.getAllControls(tenantId);
  const scores = await service.getComplianceScore(tenantId);

  return jsonResponse({ controls, scores });
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { tenantId, authorized } = await resolveTenantId(request);
  if (!authorized) {
    return jsonError("Unauthorized", 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Empty body is fine for a full re-check
  }

  const service = getComplianceService();

  const action = body.action as string | undefined;

  if (action === "check" || !action) {
    // Trigger a full compliance re-check
    const reports = await service.runAllChecks(tenantId);
    const scores = await service.getComplianceScore(tenantId);
    return jsonResponse({ reports, scores });
  }

  if (action === "control") {
    const controlId = body.controlId as string | undefined;
    if (!controlId) {
      return jsonError("controlId is required for action=control", 400);
    }
    const control = await service.getControlStatus(controlId, tenantId);
    if (!control) {
      return jsonError(`Control "${controlId}" not found`, 404);
    }
    return jsonResponse(control);
  }

  return jsonError(`Unknown action "${action}"`, 400);
}
