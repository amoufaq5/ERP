import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateJobSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/jobs/:id ──────────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.job.findFirst({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        hiringManager: { select: { id: true, name: true, email: true } },
        applications: true,
      },
    });
    if (!record) {
      return apiError(`Job with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch job", 500);
  }
});

// ─── PATCH /api/v1/jobs/:id ────────────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateJobSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.job.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Job with id '${id}' not found`, 404);
    }

    const dateFields = ["postedDate", "closingDate"];
    for (const field of dateFields) {
      if (body[field] && typeof body[field] === "string") {
        body[field] = new Date(body[field]);
      }
    }

    const floatFields = ["salaryMin", "salaryMax"];
    for (const field of floatFields) {
      if (body[field] !== undefined && body[field] !== null) {
        body[field] = parseFloat(body[field]);
      }
    }

    if (body.status) body.status = body.status.toUpperCase();
    if (body.type) body.type = body.type.toUpperCase();

    const record = await db.job.update({
      where: { id },
      data: body,
      include: {
        department: { select: { id: true, name: true } },
        hiringManager: { select: { id: true, name: true, email: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update job", 500);
  }
});

// ─── DELETE /api/v1/jobs/:id ───────────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.job.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Job with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to CLOSED
    const record = await db.job.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete job", 500);
  }
});
