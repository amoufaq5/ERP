import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateSupplierSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

type IdParams = { params: Promise<{ id: string }> };

export const GET = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const record = await db.supplier.findFirst({
        where: { id },
        include: { bills: true, purchaseOrders: true, contracts: true },
      });
      if (!record) return apiError("Supplier not found", 404);
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to fetch supplier",
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
      const validation = validate(updateSupplierSchema, body);
      if (!validation.success) return apiError(validation.error, 400);

      delete body.id;
      delete body.createdAt;

      const existing = await db.supplier.findFirst({ where: { id } });
      if (!existing) return apiError("Supplier not found", 404);

      if (body.rating !== undefined && body.rating !== null) {
        body.rating = parseFloat(body.rating);
      }
      if (body.status) body.status = body.status.toUpperCase();

      const record = await db.supplier.update({ where: { id }, data: body });
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to update supplier",
        500,
      );
    }
  },
);

export const DELETE = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.supplier.findFirst({ where: { id } });
      if (!existing) return apiError("Supplier not found", 404);

      // Soft-delete by setting status to INACTIVE.
      const record = await db.supplier.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return apiResponse({ ...record, _softDeleted: true });
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to delete supplier",
        500,
      );
    }
  },
);
