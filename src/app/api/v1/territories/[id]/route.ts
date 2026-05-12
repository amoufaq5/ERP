import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateTerritorySchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/territories/:id ───────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.territory.findFirst({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!record) {
      return apiError(`Territory with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch territory", 500);
  }
});

// ─── PATCH /api/v1/territories/:id ─────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateTerritorySchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.territory.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Territory with id '${id}' not found`, 404);
    }

    const record = await db.territory.update({
      where: { id },
      data: body,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update territory", 500);
  }
});

// ─── DELETE /api/v1/territories/:id ────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.territory.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Territory with id '${id}' not found`, 404);
    }

    await db.territory.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete territory", 500);
  }
});
