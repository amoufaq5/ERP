import { NextRequest, NextResponse } from "next/server";
import { configService, ConfigValidationError } from "@/lib/platform/config-service";

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
 * GET /api/v1/config
 * Returns full tenant configuration (defaults merged with overrides).
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const config = await configService.getEffectiveConfig(tenantId);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get config";
    return jsonError(message, 500);
  }
}

/**
 * PUT /api/v1/config
 * Update specific config path using dot-notation.
 * Body: { path: "finance.taxRate", value: 15 }
 */
export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = await req.json();

    if (!body.path || body.value === undefined) {
      return jsonError("Request body must include 'path' and 'value'", 400);
    }

    const config = await configService.setConfig(tenantId, body.path, body.value, userId);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return jsonError(error.message, 422);
    }
    const message = error instanceof Error ? error.message : "Failed to update config";
    return jsonError(message, 500);
  }
}

/**
 * POST /api/v1/config
 * Handles sub-actions via `action` field:
 * - { action: "reset", path?: string } → reset path or full config
 * - { action: "export" } → export config for backup
 * - { action: "import", config: {...} } → import config with validation
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case "reset": {
        if (body.path) {
          const config = await configService.resetConfig(tenantId, body.path, userId);
          return NextResponse.json({ success: true, data: config });
        }
        const config = await configService.resetAllConfig(tenantId, userId);
        return NextResponse.json({ success: true, data: config });
      }

      case "export": {
        const exported = await configService.exportConfig(tenantId);
        return NextResponse.json({ success: true, data: exported });
      }

      case "import": {
        if (!body.config) {
          return jsonError("Request body must include 'config' for import action", 400);
        }
        const result = await configService.importConfig(tenantId, body.config, userId);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: "Validation failed", details: result.errors },
            { status: 422 }
          );
        }
        const config = await configService.getEffectiveConfig(tenantId);
        return NextResponse.json({ success: true, data: config });
      }

      case "validate": {
        if (!body.config) {
          return jsonError("Request body must include 'config' for validate action", 400);
        }
        const result = configService.validateConfig(tenantId, body.config);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return jsonError(
          `Unknown action: "${action}". Valid actions: reset, export, import, validate`,
          400
        );
    }
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return jsonError(error.message, 422);
    }
    const message = error instanceof Error ? error.message : "Failed to process config action";
    return jsonError(message, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id, X-Tenant-Slug, X-User-Id",
    },
  });
}
