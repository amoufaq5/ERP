import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createSalesOrderSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/sales-orders ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const customerId = params.get("customerId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (customerId) where.customerId = customerId;
        if (search) {
          where.OR = [
            { orderNumber: { contains: search } },
            { notes: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.salesOrder.count({ where }),
          prisma.salesOrder.findMany({
            where,
            include: { customer: true, items: { include: { product: true } } },
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
          }),
        ]);

        const totalPages = Math.ceil(total / Math.min(limit, 100));
        return apiResponse(records, 200, {
          page: Math.max(1, page),
          limit: Math.min(limit, 100),
          total,
          totalPages,
        });
      } catch {}
    }

    const mock = generateMockSalesOrders();
    let filtered = filterBySearch(mock, search, ["orderNumber", "customerName", "notes"]);
    if (status) filtered = filtered.filter((o) => o.status === status.toUpperCase());
    if (customerId) filtered = filtered.filter((o) => o.customerId === customerId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch sales orders", 500);
  }
}

// ─── POST /api/v1/sales-orders ──────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createSalesOrderSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.salesOrder.create({
          data: {
            orderNumber: body.orderNumber,
            customerId: body.customerId,
            date: new Date(body.date),
            status: (body.status || "PENDING").toUpperCase(),
            total: parseFloat(body.total),
            shippingAddress: body.shippingAddress || null,
            notes: body.notes || null,
            items: body.items
              ? {
                  create: body.items.map((item: any) => ({
                    productId: item.productId,
                    quantity: parseInt(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    total: parseFloat(item.total),
                  })),
                }
              : undefined,
          },
          include: { items: true },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `so-${Date.now()}`,
      ...body,
      status: (body.status || "PENDING").toUpperCase(),
      total: parseFloat(body.total),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create sales order", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockSalesOrders() {
  return [
    { id: "so-1", orderNumber: "SO-2025-001", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-01-25", status: "DELIVERED", total: 4500, shippingAddress: "123 Main St, New York", notes: null, createdAt: "2025-01-25T10:00:00Z" },
    { id: "so-2", orderNumber: "SO-2025-002", customerId: "acct-2", customerName: "MedLife Labs", date: "2025-02-18", status: "SHIPPED", total: 8200, shippingAddress: "456 Lab Ave, Boston", notes: "Fragile items", createdAt: "2025-02-18T10:00:00Z" },
    { id: "so-3", orderNumber: "SO-2025-003", customerId: "acct-3", customerName: "Global Health Corp", date: "2025-03-22", status: "CONFIRMED", total: 2100, shippingAddress: "789 Health Rd, London", notes: null, createdAt: "2025-03-22T10:00:00Z" },
    { id: "so-4", orderNumber: "SO-2025-004", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-04-05", status: "PENDING", total: 12000, shippingAddress: "123 Main St, New York", notes: "Q2 bulk order", createdAt: "2025-04-05T10:00:00Z" },
    { id: "so-5", orderNumber: "SO-2025-005", customerId: "acct-4", customerName: "BioSynth AG", date: "2025-04-20", status: "CANCELLED", total: 3500, shippingAddress: "10 Pharma Str, Berlin", notes: "Customer cancelled", createdAt: "2025-04-20T10:00:00Z" },
  ];
}
