import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updatePaymentSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

type IdParams = { params: Promise<{ id: string }> };

export const GET = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const record = await db.payment.findFirst({
        where: { id },
        include: { invoice: true, bill: true },
      });
      if (!record) return apiError("Payment not found", 404);
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to fetch payment",
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
      const validation = validate(updatePaymentSchema, body);
      if (!validation.success) return apiError(validation.error, 400);

      delete body.id;
      delete body.createdAt;

      const existing = await db.payment.findFirst({ where: { id } });
      if (!existing) return apiError("Payment not found", 404);

      if (body.date && typeof body.date === "string") {
        body.date = new Date(body.date);
      }
      if (body.amount !== undefined && body.amount !== null) {
        body.amount = parseFloat(body.amount);
      }
      if (body.type) body.type = body.type.toUpperCase();
      if (body.method) body.method = body.method.toUpperCase();

      const record = await db.payment.update({
        where: { id },
        data: body,
        include: { invoice: true, bill: true },
      });
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to update payment",
        500,
      );
    }
  },
);

export const DELETE = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.payment.findFirst({ where: { id } });
      if (!existing) return apiError("Payment not found", 404);

      await db.payment.delete({ where: { id } });
      return apiResponse({ id, deleted: true });
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to delete payment",
        500,
      );
    }
  },
);
