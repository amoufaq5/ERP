import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateTrainingSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/training/:id ──────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.trainingCourse.findFirst({
      where: { id },
      include: {
        enrollments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!record) {
      return apiError(`Training course with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch training course", 500);
  }
});

// ─── PATCH /api/v1/training/:id ────────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateTrainingSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.trainingCourse.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Training course with id '${id}' not found`, 404);
    }

    if (body.status) body.status = body.status.toUpperCase();
    if (body.format) body.format = body.format.toUpperCase();

    const record = await db.trainingCourse.update({
      where: { id },
      data: body,
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update training course", 500);
  }
});

// ─── DELETE /api/v1/training/:id ───────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.trainingCourse.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Training course with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to ARCHIVED
    const record = await db.trainingCourse.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete training course", 500);
  }
});
