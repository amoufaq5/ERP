import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createTerritorySchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/territories ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const assignedToId = params.get("assignedToId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (assignedToId) where.assignedToId = assignedToId;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.territory.count({ where }),
          prisma.territory.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              assignedTo: { select: { id: true, name: true } },
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

    const mock = generateMockTerritories();
    let filtered = filterBySearch(mock, search, ["name", "description"]);
    if (assignedToId) filtered = filtered.filter((t) => t.assignedToId === assignedToId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch territories", 500);
  }
}

// ─── POST /api/v1/territories ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validate(createTerritorySchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.territory.create({
          data: {
            name: body.name,
            description: body.description || null,
            assignedToId: body.assignedToId || null,
            boundaries: body.boundaries || null,
            color: body.color || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `terr-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create territory", 500);
  }
}

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockTerritories() {
  return [
    { id: "terr-1", name: "Greater Cairo", description: "Cairo, Giza, and Qalyubia governorates - major hospitals and pharmacy chains", assignedToId: "user-1", assignedToName: "Ahmed Mostafa", boundaries: '{"type":"polygon","coordinates":[[30.04,31.24],[30.12,31.40],[30.08,31.35]]}', color: "#2563eb", createdAt: "2025-01-05T10:00:00Z" },
    { id: "terr-2", name: "Alexandria & Delta", description: "Alexandria, Beheira, Gharbia, and Dakahlia governorates", assignedToId: "user-2", assignedToName: "Sara Mahmoud", boundaries: '{"type":"polygon","coordinates":[[31.20,30.00],[31.22,31.50],[30.90,31.10]]}', color: "#16a34a", createdAt: "2025-01-10T10:00:00Z" },
    { id: "terr-3", name: "Upper Egypt North", description: "Beni Suef, Fayoum, and Minya governorates - rural pharma distribution", assignedToId: "user-3", assignedToName: "Khaled Nabil", boundaries: '{"type":"polygon","coordinates":[[28.50,30.75],[29.10,31.20],[28.80,30.90]]}', color: "#dc2626", createdAt: "2025-01-15T10:00:00Z" },
    { id: "terr-4", name: "Upper Egypt South", description: "Assiut, Sohag, Qena, Luxor, and Aswan governorates", assignedToId: "user-4", assignedToName: "Mona Adel", boundaries: '{"type":"polygon","coordinates":[[25.70,32.65],[27.20,31.18],[26.50,31.90]]}', color: "#9333ea", createdAt: "2025-02-01T10:00:00Z" },
    { id: "terr-5", name: "Canal Zone & Sinai", description: "Suez, Ismailia, Port Said, North and South Sinai", assignedToId: "user-1", assignedToName: "Ahmed Mostafa", boundaries: '{"type":"polygon","coordinates":[[30.00,32.30],[31.25,32.32],[30.60,33.80]]}', color: "#ea580c", createdAt: "2025-02-10T10:00:00Z" },
  ];
}
