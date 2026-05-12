import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createSalesOrderSchema } from "@/lib/api/validations";
import { withAuthAndTenant } from "@/lib/api/with-tenant";

// Phase 0 Track B3 — exemplar migration to withAuthAndTenant.
// The previous version:
//   - loaded prisma via a try/catch require shim (no longer needed; the
//     wrapper provides db);
//   - ran GET unauthenticated and unscoped (P0 cross-tenant read);
//   - fell back to mock data when prisma was missing (dead code under
//     the wrapper, which 401s on missing session — removed).
//
// See docs/PHASE0_TRACK_B_AUDIT.md + docs/PHASE0_TRACK_B2_BRIEF.md.

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/sales-orders ───────────────────────────────────────────────

export const GET = withAuthAndTenant(async (req: NextRequest, { db }) => {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const customerId = params.get("customerId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const take = Math.min(limit, 100);
    const skip = (Math.max(1, page) - 1) * take;

    const [total, records] = await Promise.all([
      db.salesOrder.count({ where }),
      db.salesOrder.findMany({
        where,
        include: { customer: true, items: { include: { product: true } } },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return apiResponse(records, 200, {
      page: Math.max(1, page),
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch sales orders", 500);
  }
});

// ─── POST /api/v1/sales-orders ──────────────────────────────────────────────

export const POST = withAuthAndTenant(async (req: NextRequest, { db, tenantId }) => {
  try {
    const body = await req.json();
    const validation = validate(createSalesOrderSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    // The wrapper auto-injects tenantId on top-level `data` for the SalesOrder
    // row. Nested relation creates (items below) are NOT walked by the
    // extension, so each item must carry tenantId explicitly. The schema's
    // NOT NULL constraint + Layer 2 RLS catch a miss, but explicit is safer.
    const record = await db.salesOrder.create({
      data: {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        date: new Date(data.date),
        status: data.status,
        total: data.total,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        items: data.items
          ? {
              create: data.items.map((item: any) => ({
                tenantId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create sales order", 500);
  }
});
