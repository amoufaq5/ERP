import { NextRequest, NextResponse } from "next/server";
import {
  configService,
  ConfigValidationError,
  MODULE_SCHEMAS,
  type ModuleName,
} from "@/lib/platform/config-service";

function getTenantId(req: NextRequest): string {
  return req.headers.get("x-tenant-id") || req.headers.get("x-tenant-slug") || "default";
}

function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id") || "anonymous";
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/v1/config/[module]
 * Returns module-specific configuration.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const tenantId = getTenantId(req);

    if (!MODULE_SCHEMAS[module]) {
      return jsonError(
        `Unknown module: "${module}". Valid modules: ${Object.keys(MODULE_SCHEMAS).join(", ")}`,
        404
      );
    }

    const moduleConfig = await configService.getConfig(tenantId, module as ModuleName);
    return NextResponse.json({ success: true, data: { module, config: moduleConfig } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get module config";
    return jsonError(message, 500);
  }
}

/**
 * PUT /api/v1/config/[module]
 * Update an entire module's config.
 * Body: the full module config object.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!MODULE_SCHEMAS[module]) {
      return jsonError(
        `Unknown module: "${module}". Valid modules: ${Object.keys(MODULE_SCHEMAS).join(", ")}`,
        404
      );
    }

    const body = await req.json();

    const config = await configService.updateModuleConfig(
      tenantId,
      module as ModuleName,
      body,
      userId
    );

    return NextResponse.json({ success: true, data: { module, config: config[module as ModuleName] } });
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return jsonError(error.message, 422);
    }
    const message = error instanceof Error ? error.message : "Failed to update module config";
    return jsonError(message, 500);
  }
}

/**
 * PATCH /api/v1/config/[module]
 * Partially update a module's config.
 * Body: partial module config (only fields to change).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await params;
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!MODULE_SCHEMAS[module]) {
      return jsonError(
        `Unknown module: "${module}". Valid modules: ${Object.keys(MODULE_SCHEMAS).join(", ")}`,
        404
      );
    }

    const body = await req.json();

    // Get current module config, merge with patch, then update
    const current = await configService.getConfig(tenantId, module as ModuleName);
    const merged = { ...(current as unknown as Record<string, unknown>), ...body };

    const config = await configService.updateModuleConfig(
      tenantId,
      module as ModuleName,
      merged,
      userId
    );

    return NextResponse.json({ success: true, data: { module, config: config[module as ModuleName] } });
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return jsonError(error.message, 422);
    }
    const message = error instanceof Error ? error.message : "Failed to patch module config";
    return jsonError(message, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id, X-Tenant-Slug, X-User-Id",
    },
  });
}
