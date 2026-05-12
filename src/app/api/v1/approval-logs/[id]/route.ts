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
      const record = await db.approvalLog.findFirst({
        where: { id },
        include: {
          performedBy: { select: { id: true, name: true, email: true } },
          businessUnit: {
            select: { id: true, name: true, code: true, color: true },
          },
        },
      });
      if (!record) {
        return apiError(`Approval log with id '${id}' not found`, 404);
      }
      return apiResponse(record);
    } catch (err: unknown) {
      return apiError(
        (err as Error).message || "Failed to fetch approval log",
        500,
      );
    }
  },
);
