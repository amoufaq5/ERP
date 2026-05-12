import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

type IdParams = { params: Promise<{ id: string }> };

export const GET = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const record = await db.expense.findFirst({ where: { id } });
      if (!record) {
        return apiError(`Expense with id '${id}' not found`, 404);
      }
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to fetch expense",
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
      if (!body || Object.keys(body).length === 0) {
        return apiError("Request body cannot be empty", 400);
      }

      delete body.id;
      delete body.createdAt;

      const existing = await db.expense.findFirst({ where: { id } });
      if (!existing) {
        return apiError(`Expense with id '${id}' not found`, 404);
      }

      const record = await db.expense.update({ where: { id }, data: body });
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to update expense",
        500,
      );
    }
  },
);

export const DELETE = withAuthAndTenantParams<IdParams>(
  async (_req, { params }, { db }) => {
    try {
      const { id } = await params;
      const existing = await db.expense.findFirst({ where: { id } });
      if (!existing) {
        return apiError(`Expense with id '${id}' not found`, 404);
      }

      await db.expense.delete({ where: { id } });
      return apiResponse({ id, deleted: true });
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to delete expense",
        500,
      );
    }
  },
);
