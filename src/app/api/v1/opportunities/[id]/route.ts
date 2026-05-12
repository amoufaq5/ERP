import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateOpportunitySchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/opportunities/:id ─────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.opportunity.findFirst({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!record) {
      return apiError(`Opportunity with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch opportunity", 500);
  }
});

// ─── PATCH /api/v1/opportunities/:id ───────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateOpportunitySchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.opportunity.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Opportunity with id '${id}' not found`, 404);
    }

    if (body.value !== undefined && body.value !== null) {
      body.value = parseFloat(body.value);
    }
    if (body.probability !== undefined && body.probability !== null) {
      body.probability = parseInt(body.probability);
    }
    if (body.expectedCloseDate && typeof body.expectedCloseDate === "string") {
      body.expectedCloseDate = new Date(body.expectedCloseDate);
    }
    if (body.stage) body.stage = body.stage.toUpperCase();

    const record = await db.opportunity.update({
      where: { id },
      data: body,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update opportunity", 500);
  }
});

// ─── DELETE /api/v1/opportunities/:id ──────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.opportunity.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Opportunity with id '${id}' not found`, 404);
    }

    // Soft-delete by setting stage to CLOSED_LOST
    const record = await db.opportunity.update({
      where: { id },
      data: { stage: "CLOSED_LOST" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete opportunity", 500);
  }
});
