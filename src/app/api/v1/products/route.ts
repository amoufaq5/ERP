import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createProductSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/products ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const category = params.get("category");
    const status = params.get("status");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (category) where.category = category;
        if (status) where.status = status.toUpperCase();
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { sku: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
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

    const mock = generateMockProducts();
    let filtered = filterBySearch(mock, search, ["name", "sku", "description", "category"]);
    if (category) filtered = filtered.filter((p) => p.category === category);
    if (status) filtered = filtered.filter((p) => p.status === status.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch products", 500);
  }
}

// ─── POST /api/v1/products ──────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createProductSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.product.create({
          data: {
            name: body.name,
            sku: body.sku,
            description: body.description || null,
            category: body.category || null,
            unitPrice: parseFloat(body.unitPrice),
            costPrice: parseFloat(body.costPrice),
            quantity: body.quantity ? parseInt(body.quantity) : 0,
            reorderLevel: body.reorderLevel ? parseInt(body.reorderLevel) : 10,
            unit: body.unit || "pcs",
            status: (body.status || "ACTIVE").toUpperCase(),
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `prod-${Date.now()}`,
      ...body,
      unitPrice: parseFloat(body.unitPrice),
      costPrice: parseFloat(body.costPrice),
      quantity: parseInt(body.quantity || "0"),
      status: (body.status || "ACTIVE").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create product", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockProducts() {
  return [
    { id: "prod-1", sku: "PARA-500", name: "Paracetamol 500mg", description: "Pain relief tablets", category: "OTC", unitPrice: 5.99, costPrice: 2.5, quantity: 1200, reorderLevel: 200, unit: "box", status: "ACTIVE", createdAt: "2025-01-10T10:00:00Z" },
    { id: "prod-2", sku: "AMOX-250", name: "Amoxicillin 250mg", description: "Antibiotic capsules", category: "Prescription", unitPrice: 12.5, costPrice: 6.0, quantity: 800, reorderLevel: 100, unit: "box", status: "ACTIVE", createdAt: "2025-01-12T10:00:00Z" },
    { id: "prod-3", sku: "OMEP-20", name: "Omeprazole 20mg", description: "Proton pump inhibitor", category: "Prescription", unitPrice: 8.99, costPrice: 3.75, quantity: 500, reorderLevel: 80, unit: "box", status: "ACTIVE", createdAt: "2025-02-01T10:00:00Z" },
    { id: "prod-4", sku: "IBUP-400", name: "Ibuprofen 400mg", description: "Anti-inflammatory", category: "OTC", unitPrice: 6.49, costPrice: 2.8, quantity: 1500, reorderLevel: 250, unit: "box", status: "ACTIVE", createdAt: "2025-02-15T10:00:00Z" },
    { id: "prod-5", sku: "CETR-10", name: "Cetirizine 10mg", description: "Antihistamine", category: "OTC", unitPrice: 4.99, costPrice: 1.5, quantity: 0, reorderLevel: 150, unit: "box", status: "DISCONTINUED", createdAt: "2025-03-01T10:00:00Z" },
  ];
}
