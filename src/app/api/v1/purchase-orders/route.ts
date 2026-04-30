import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  validateRequiredFields,
  parseQueryParams,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/purchase-orders ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const supplierId = params.get("supplierId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (supplierId) where.supplierId = supplierId;
        if (search) {
          where.OR = [
            { poNumber: { contains: search } },
            { notes: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.purchaseOrder.count({ where }),
          prisma.purchaseOrder.findMany({
            where,
            include: {
              supplier: true,
              items: { include: { product: true } },
              createdBy: { select: { id: true, name: true, email: true } },
            },
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

    const mock = generateMockPurchaseOrders();
    let filtered = filterBySearch(mock, search, ["poNumber", "supplierName", "notes"]);
    if (status) filtered = filtered.filter((po) => po.status === status.toUpperCase());
    if (supplierId) filtered = filtered.filter((po) => po.supplierId === supplierId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch purchase orders", 500);
  }
}

// ─── POST /api/v1/purchase-orders ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, [
      "poNumber",
      "supplierId",
      "date",
      "total",
      "createdById",
    ]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.purchaseOrder.create({
          data: {
            poNumber: body.poNumber,
            supplierId: body.supplierId,
            date: new Date(body.date),
            expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
            status: (body.status || "DRAFT").toUpperCase(),
            total: parseFloat(body.total),
            notes: body.notes || null,
            createdById: body.createdById,
            items: body.items
              ? {
                  create: body.items.map((item: any) => ({
                    productId: item.productId || null,
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    total: parseFloat(item.total),
                  })),
                }
              : undefined,
          },
          include: { supplier: true, items: true },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `po-${Date.now()}`,
      ...body,
      status: (body.status || "DRAFT").toUpperCase(),
      total: parseFloat(body.total),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create purchase order", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockPurchaseOrders() {
  return [
    { id: "po-1", poNumber: "PO-2025-001", supplierId: "sup-1", supplierName: "ChemSource Ltd", date: "2025-01-10", expectedDate: "2025-02-10", status: "RECEIVED", total: 25000, notes: null, createdAt: "2025-01-10T10:00:00Z" },
    { id: "po-2", poNumber: "PO-2025-002", supplierId: "sup-2", supplierName: "PharmaRaw Inc.", date: "2025-02-05", expectedDate: "2025-03-05", status: "APPROVED", total: 18500, notes: "API materials", createdAt: "2025-02-05T10:00:00Z" },
    { id: "po-3", poNumber: "PO-2025-003", supplierId: "sup-1", supplierName: "ChemSource Ltd", date: "2025-03-15", expectedDate: "2025-04-15", status: "SENT", total: 42000, notes: "Bulk order", createdAt: "2025-03-15T10:00:00Z" },
    { id: "po-4", poNumber: "PO-2025-004", supplierId: "sup-3", supplierName: "PackageCo", date: "2025-04-01", expectedDate: null, status: "DRAFT", total: 7800, notes: "Packaging materials", createdAt: "2025-04-01T10:00:00Z" },
    { id: "po-5", poNumber: "PO-2025-005", supplierId: "sup-2", supplierName: "PharmaRaw Inc.", date: "2025-04-10", expectedDate: "2025-05-10", status: "CANCELLED", total: 12000, notes: "Cancelled - supplier issue", createdAt: "2025-04-10T10:00:00Z" },
  ];
}
