import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createStockMovementSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/stock-movements ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const productId = params.get("productId");
    const warehouseId = params.get("warehouseId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (productId) where.productId = productId;
        if (warehouseId) where.warehouseId = warehouseId;
        if (search) {
          where.OR = [
            { reference: { contains: search } },
            { notes: { contains: search } },
            { product: { name: { contains: search } } },
            { product: { sku: { contains: search } } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.stockMovement.count({ where }),
          prisma.stockMovement.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { date: "desc" },
            include: {
              product: { select: { id: true, name: true, sku: true } },
              warehouse: { select: { id: true, name: true, location: true } },
              createdBy: { select: { id: true, name: true } },
            },
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

    const mock = generateMockStockMovements();
    let filtered = filterBySearch(mock, search, ["reference", "notes", "productName", "productSku"]);
    if (type) filtered = filtered.filter((m) => m.type === type.toUpperCase());
    if (productId) filtered = filtered.filter((m) => m.productId === productId);
    if (warehouseId) filtered = filtered.filter((m) => m.warehouseId === warehouseId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch stock movements", 500);
  }
}

// ─── POST /api/v1/stock-movements ──────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createStockMovementSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.stockMovement.create({
          data: {
            productId: body.productId,
            warehouseId: body.warehouseId || null,
            type: body.type.toUpperCase(),
            quantity: parseInt(body.quantity),
            date: new Date(body.date),
            reference: body.reference || null,
            notes: body.notes || null,
            createdById: body.createdById,
          },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            warehouse: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `sm-${Date.now()}`,
      ...body,
      type: body.type.toUpperCase(),
      quantity: parseInt(body.quantity),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create stock movement", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockStockMovements() {
  return [
    { id: "sm-1", productId: "prod-1", productName: "Paracetamol 500mg", productSku: "PARA-500", warehouseId: "wh-1", type: "IN", quantity: 500, date: "2025-04-01T08:00:00Z", reference: "PO-2025-010", notes: "Received from supplier ChemSource Ltd", createdById: "user-1" },
    { id: "sm-2", productId: "prod-2", productName: "Amoxicillin 250mg", productSku: "AMOX-250", warehouseId: "wh-1", type: "OUT", quantity: 200, date: "2025-04-02T14:00:00Z", reference: "SO-2025-005", notes: "Shipped to Acme Pharma Inc.", createdById: "user-2" },
    { id: "sm-3", productId: "prod-3", productName: "Omeprazole 20mg", productSku: "OMEP-20", warehouseId: "wh-2", type: "IN", quantity: 300, date: "2025-04-03T09:00:00Z", reference: "PO-2025-012", notes: "Cold chain shipment received", createdById: "user-1" },
    { id: "sm-4", productId: "prod-1", productName: "Paracetamol 500mg", productSku: "PARA-500", warehouseId: "wh-1", type: "TRANSFER", quantity: 100, date: "2025-04-05T11:00:00Z", reference: "TRF-001", notes: "Transfer to Finished Goods Depot (wh-4)", createdById: "user-3" },
    { id: "sm-5", productId: "prod-4", productName: "Ibuprofen 400mg", productSku: "IBUP-400", warehouseId: "wh-3", type: "ADJUSTMENT", quantity: -15, date: "2025-04-06T16:00:00Z", reference: "ADJ-001", notes: "Inventory count adjustment - expired stock removed", createdById: "user-1" },
  ];
}
