import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateBusinessUnitSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/business-units/:id ─────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.businessUnit.findFirst({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        products: {
          include: {
            product: { select: { id: true, name: true, sku: true, category: true } },
          },
        },
        territories: {
          include: {
            territory: { select: { id: true, name: true, description: true } },
          },
        },
        approvalLogs: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            performedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!record) {
      return apiError(`Business unit with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch business unit", 500);
  }
});

// ─── PATCH /api/v1/business-units/:id ───────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateBusinessUnitSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.businessUnit.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Business unit with id '${id}' not found`, 404);
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.description !== undefined) data.description = body.description;
    if (body.managerId !== undefined) data.managerId = body.managerId;
    if (body.color !== undefined) data.color = body.color;
    if (body.status !== undefined) data.status = body.status.toUpperCase();

    const record = await db.businessUnit.update({
      where: { id },
      data,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        products: {
          include: {
            product: { select: { id: true, name: true, sku: true, category: true } },
          },
        },
        territories: {
          include: {
            territory: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update business unit", 500);
  }
});

// ─── DELETE /api/v1/business-units/:id ──────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.businessUnit.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Business unit with id '${id}' not found`, 404);
    }

    await db.businessUnit.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete business unit", 500);
  }
});
