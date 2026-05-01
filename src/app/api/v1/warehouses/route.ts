import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createWarehouseSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/warehouses ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const managerId = params.get("managerId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (managerId) where.managerId = managerId;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { location: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.warehouse.count({ where }),
          prisma.warehouse.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              manager: { select: { id: true, name: true, email: true } },
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

    const mock = generateMockWarehouses();
    let filtered = filterBySearch(mock, search, ["name", "location"]);
    if (managerId) filtered = filtered.filter((w) => w.managerId === managerId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch warehouses", 500);
  }
}

// ─── POST /api/v1/warehouses ───────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createWarehouseSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.warehouse.create({
          data: {
            name: body.name,
            location: body.location || null,
            capacity: body.capacity ? parseInt(body.capacity) : null,
            managerId: body.managerId || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `wh-${Date.now()}`,
      ...body,
      capacity: body.capacity ? parseInt(body.capacity) : null,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create warehouse", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockWarehouses() {
  return [
    { id: "wh-1", name: "Primary Distribution Center", location: "Newark, NJ", capacity: 50000, managerId: "user-1", createdAt: "2024-01-15T10:00:00Z" },
    { id: "wh-2", name: "Cold Chain Storage Facility", location: "Indianapolis, IN", capacity: 15000, managerId: "user-2", createdAt: "2024-03-20T10:00:00Z" },
    { id: "wh-3", name: "Raw Materials Warehouse", location: "Houston, TX", capacity: 30000, managerId: "user-3", createdAt: "2024-05-10T10:00:00Z" },
    { id: "wh-4", name: "Finished Goods Depot", location: "Chicago, IL", capacity: 40000, managerId: null, createdAt: "2024-07-01T10:00:00Z" },
    { id: "wh-5", name: "Controlled Substances Vault", location: "Newark, NJ", capacity: 5000, managerId: "user-1", createdAt: "2024-09-15T10:00:00Z" },
  ];
}
