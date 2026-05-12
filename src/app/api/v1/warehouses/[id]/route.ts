import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateWarehouseSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/warehouses/:id ────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.warehouse.findFirst({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        stockMovements: {
          take: 20,
          orderBy: { date: "desc" },
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
    if (!record) {
      return apiError(`Warehouse with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch warehouse", 500);
  }
});

// ─── PATCH /api/v1/warehouses/:id ──────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateWarehouseSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.warehouse.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Warehouse with id '${id}' not found`, 404);
    }

    if (body.capacity !== undefined && body.capacity !== null) {
      body.capacity = parseInt(body.capacity);
    }

    const record = await db.warehouse.update({
      where: { id },
      data: body,
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update warehouse", 500);
  }
});

// ─── DELETE /api/v1/warehouses/:id ─────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.warehouse.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Warehouse with id '${id}' not found`, 404);
    }

    await db.warehouse.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete warehouse", 500);
  }
});
