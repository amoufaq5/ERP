import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateStockMovementSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/stock-movements/:id ───────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.stockMovement.findFirst({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true, category: true } },
        warehouse: { select: { id: true, name: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!record) {
      return apiError(`Stock movement with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch stock movement", 500);
  }
});

// ─── PATCH /api/v1/stock-movements/:id ─────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateStockMovementSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;

    const existing = await db.stockMovement.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Stock movement with id '${id}' not found`, 404);
    }

    if (body.date && typeof body.date === "string") {
      body.date = new Date(body.date);
    }
    if (body.quantity !== undefined && body.quantity !== null) {
      body.quantity = parseInt(body.quantity);
    }
    if (body.type) body.type = body.type.toUpperCase();

    const record = await db.stockMovement.update({
      where: { id },
      data: body,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update stock movement", 500);
  }
});

// ─── DELETE /api/v1/stock-movements/:id ────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.stockMovement.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Stock movement with id '${id}' not found`, 404);
    }

    await db.stockMovement.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete stock movement", 500);
  }
});
