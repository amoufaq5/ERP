import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/market-requests/:id ───────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.marketRequest.findFirst({ where: { id } });
    if (!record) {
      return apiError(`Market request with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch market request", 500);
  }
});

// ─── PATCH /api/v1/market-requests/:id ─────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return apiError("Request body cannot be empty", 400);
    }

    delete body.id;
    delete body.createdAt;

    const existing = await db.marketRequest.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Market request with id '${id}' not found`, 404);
    }

    const record = await db.marketRequest.update({
      where: { id },
      data: body,
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update market request", 500);
  }
});

// ─── DELETE /api/v1/market-requests/:id ────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.marketRequest.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Market request with id '${id}' not found`, 404);
    }

    await db.marketRequest.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete market request", 500);
  }
});
