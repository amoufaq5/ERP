import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateDepartmentSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/departments/:id ───────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.department.findFirst({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        employees: true,
        jobs: true,
      },
    });
    if (!record) {
      return apiError(`Department with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch department", 500);
  }
});

// ─── PATCH /api/v1/departments/:id ─────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateDepartmentSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.department.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Department with id '${id}' not found`, 404);
    }

    if (body.budget !== undefined && body.budget !== null) {
      body.budget = parseFloat(body.budget);
    }

    const record = await db.department.update({
      where: { id },
      data: body,
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update department", 500);
  }
});

// ─── DELETE /api/v1/departments/:id ────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.department.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Department with id '${id}' not found`, 404);
    }

    await db.department.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete department", 500);
  }
});
