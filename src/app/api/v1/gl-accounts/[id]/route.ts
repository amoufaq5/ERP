import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateGlAccountSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

type IdParams = { params: Promise<{ id: string }> };

export const GET = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const record = await db.chartOfAccount.findFirst({
        where: { id },
        include: { children: true, parent: true, journalLines: true },
      });
      if (!record) return apiError("GL account not found", 404);
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to fetch GL account",
        500,
      );
    }
  },
);

export const PATCH = withAuthAndTenantParams<IdParams>(
  async (req, { params }, { db }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validation = validate(updateGlAccountSchema, body);
      if (!validation.success) return apiError(validation.error, 400);

      delete body.id;
      delete body.createdAt;

      const existing = await db.chartOfAccount.findFirst({ where: { id } });
      if (!existing) return apiError("GL account not found", 404);

      if (body.balance !== undefined && body.balance !== null) {
        body.balance = parseFloat(body.balance);
      }
      if (body.type) body.type = body.type.toUpperCase();

      const record = await db.chartOfAccount.update({
        where: { id },
        data: body,
        include: { children: true, parent: true },
      });
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to update GL account",
        500,
      );
    }
  },
);

export const DELETE = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.chartOfAccount.findFirst({ where: { id } });
      if (!existing) return apiError("GL account not found", 404);

      // Soft-delete by deactivating.
      const record = await db.chartOfAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return apiResponse({ ...record, _softDeleted: true });
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to delete GL account",
        500,
      );
    }
  },
);
