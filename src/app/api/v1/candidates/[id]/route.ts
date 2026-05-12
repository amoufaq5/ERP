import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateCandidateSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/candidates/:id ────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.candidate.findFirst({
      where: { id },
      include: {
        applications: {
          include: {
            job: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });
    if (!record) {
      return apiError(`Candidate with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch candidate", 500);
  }
});

// ─── PATCH /api/v1/candidates/:id ──────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateCandidateSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.candidate.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Candidate with id '${id}' not found`, 404);
    }

    if (body.expectedSalary !== undefined && body.expectedSalary !== null) {
      body.expectedSalary = parseFloat(body.expectedSalary);
    }
    if (body.rating !== undefined && body.rating !== null) {
      body.rating = parseInt(body.rating);
    }
    if (body.status) body.status = body.status.toUpperCase();
    if (body.source) body.source = body.source.toUpperCase();

    const record = await db.candidate.update({
      where: { id },
      data: body,
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update candidate", 500);
  }
});

// ─── DELETE /api/v1/candidates/:id ─────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.candidate.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Candidate with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to REJECTED
    const record = await db.candidate.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete candidate", 500);
  }
});
