import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateApplicationSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/applications/:id ──────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.application.findFirst({
      where: { id },
      include: {
        candidate: true,
        job: {
          include: {
            department: { select: { id: true, name: true } },
          },
        },
        interviews: true,
        offerLetter: true,
      },
    });
    if (!record) {
      return apiError(`Application with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch application", 500);
  }
});

// ─── PATCH /api/v1/applications/:id ────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateApplicationSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.application.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Application with id '${id}' not found`, 404);
    }

    if (body.appliedDate && typeof body.appliedDate === "string") {
      body.appliedDate = new Date(body.appliedDate);
    }
    if (body.score !== undefined && body.score !== null) {
      body.score = parseInt(body.score);
    }
    if (body.status) body.status = body.status.toUpperCase();

    const record = await db.application.update({
      where: { id },
      data: body,
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update application", 500);
  }
});

// ─── DELETE /api/v1/applications/:id ───────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.application.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Application with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to REJECTED
    const record = await db.application.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete application", 500);
  }
});
