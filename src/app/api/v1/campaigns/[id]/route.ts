import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateCampaignSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/campaigns/:id ─────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.campaign.findFirst({
      where: { id },
    });
    if (!record) {
      return apiError(`Campaign with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch campaign", 500);
  }
});

// ─── PATCH /api/v1/campaigns/:id ───────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateCampaignSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.campaign.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Campaign with id '${id}' not found`, 404);
    }

    const floatFields = ["budget", "spent", "expectedRevenue", "actualRevenue"];
    for (const field of floatFields) {
      if (body[field] !== undefined && body[field] !== null) {
        body[field] = parseFloat(body[field]);
      }
    }
    const intFields = ["leads", "conversions"];
    for (const field of intFields) {
      if (body[field] !== undefined && body[field] !== null) {
        body[field] = parseInt(body[field]);
      }
    }
    const dateFields = ["startDate", "endDate"];
    for (const field of dateFields) {
      if (body[field] && typeof body[field] === "string") {
        body[field] = new Date(body[field]);
      }
    }
    if (body.type) body.type = body.type.toUpperCase();
    if (body.status) body.status = body.status.toUpperCase();

    const record = await db.campaign.update({
      where: { id },
      data: body,
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update campaign", 500);
  }
});

// ─── DELETE /api/v1/campaigns/:id ──────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.campaign.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Campaign with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to COMPLETED
    const record = await db.campaign.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete campaign", 500);
  }
});
