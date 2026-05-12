import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateAccountSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/accounts/:id ──────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.account.findFirst({
      where: { id },
      include: { contacts: true, opportunities: true, tickets: true },
    });
    if (!record) {
      return apiError(`Account with id '${id}' not found`, 404);
    }
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch account", 500);
  }
});

// ─── PATCH /api/v1/accounts/:id ────────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateAccountSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    const existing = await db.account.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Account with id '${id}' not found`, 404);
    }

    const floatFields = ["annualRevenue", "latitude", "longitude"];
    for (const field of floatFields) {
      if (body[field] !== undefined && body[field] !== null) {
        body[field] = parseFloat(body[field]);
      }
    }
    if (body.employeeCount !== undefined && body.employeeCount !== null) {
      body.employeeCount = parseInt(body.employeeCount);
    }
    if (body.type) body.type = body.type.toUpperCase();

    const record = await db.account.update({
      where: { id },
      data: body,
      include: { contacts: true },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update account", 500);
  }
});

// ─── DELETE /api/v1/accounts/:id ───────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.account.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Account with id '${id}' not found`, 404);
    }

    await db.account.delete({ where: { id } });
    return apiResponse({ id, deleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete account", 500);
  }
});
