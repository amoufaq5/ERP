import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createBusinessUnitSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/business-units ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const managerId = params.get("managerId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (managerId) where.managerId = managerId;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { code: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.businessUnit.count({ where }),
          prisma.businessUnit.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              manager: { select: { id: true, name: true, email: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              products: {
                include: {
                  product: { select: { id: true, name: true, sku: true, category: true } },
                },
              },
              territories: {
                include: {
                  territory: { select: { id: true, name: true, description: true } },
                },
              },
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

    const mock = generateMockBusinessUnits();
    let filtered = filterBySearch(mock, search, ["name", "code", "description"]);
    if (status) filtered = filtered.filter((bu) => bu.status === status.toUpperCase());
    if (managerId) filtered = filtered.filter((bu) => bu.managerId === managerId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch business units", 500);
  }
}

// ─── POST /api/v1/business-units ────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createBusinessUnitSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const createData: Record<string, unknown> = {
          name: data.name,
          code: data.code,
          description: data.description || null,
          managerId: data.managerId,
          color: data.color || null,
          status: data.status,
        };

        // Support nested members creation
        if (data.members && Array.isArray(data.members)) {
          createData.members = {
            create: data.members.map((m: Record<string, unknown>) => ({
              userId: m.userId,
              role: m.role || "MEDICAL_REP",
            })),
          };
        }

        // Support nested products creation
        if (data.products && Array.isArray(data.products)) {
          createData.products = {
            create: data.products.map((p: Record<string, unknown>) => ({
              productId: p.productId,
            })),
          };
        }

        const record = await prisma.businessUnit.create({
          data: createData,
          include: {
            manager: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            products: {
              include: {
                product: { select: { id: true, name: true, sku: true, category: true } },
              },
            },
            territories: {
              include: {
                territory: { select: { id: true, name: true, description: true } },
              },
            },
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `bu-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create business unit", 500);
  }
});

// ─── Mock data ──────────────────────────────────────────────────────────────

function generateMockBusinessUnits() {
  return [
    {
      id: "bu-1",
      name: "Cardiovascular Business Unit",
      code: "BU-CV",
      description: "Heart & circulatory system products",
      managerId: "user-bum",
      manager: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" },
      color: "#ef4444",
      status: "ACTIVE",
      members: [
        { id: "bum-1", userId: "user-bum", role: "BUM", user: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" } },
        { id: "bum-2", userId: "user-mr1", role: "MEDICAL_REP", user: { id: "user-mr1", name: "Mona Abdel-Nour", email: "mona@pharmaerp.eg" } },
      ],
      products: [
        { id: "bup-1", productId: "prod-3", product: { id: "prod-3", name: "Cardioprex 10mg", sku: "CRD-10", category: "Cardiovascular" } },
        { id: "bup-2", productId: "prod-5", product: { id: "prod-5", name: "Crestor 20mg", sku: "CRS-20", category: "Cardiovascular" } },
      ],
      territories: [],
      createdAt: "2025-01-10T10:00:00Z",
      updatedAt: "2025-01-10T10:00:00Z",
    },
    {
      id: "bu-2",
      name: "Anti-Infectives Business Unit",
      code: "BU-AI",
      description: "Antibiotics and antiviral products",
      managerId: "user-mgr",
      manager: { id: "user-mgr", name: "Sara El-Masry", email: "sarah@pharmaerp.eg" },
      color: "#3b82f6",
      status: "ACTIVE",
      members: [
        { id: "bum-3", userId: "user-mgr", role: "BUM", user: { id: "user-mgr", name: "Sara El-Masry", email: "sarah@pharmaerp.eg" } },
      ],
      products: [
        { id: "bup-3", productId: "prod-1", product: { id: "prod-1", name: "Augmentin 1g", sku: "AUG-1G", category: "Antibiotics" } },
      ],
      territories: [],
      createdAt: "2025-01-12T10:00:00Z",
      updatedAt: "2025-01-12T10:00:00Z",
    },
    {
      id: "bu-3",
      name: "GI & Metabolic Business Unit",
      code: "BU-GI",
      description: "Gastrointestinal and diabetes products",
      managerId: "user-bum",
      manager: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" },
      color: "#10b981",
      status: "ACTIVE",
      members: [
        { id: "bum-4", userId: "user-bum", role: "BUM", user: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" } },
        { id: "bum-5", userId: "user-mr2", role: "MEDICAL_REP", user: { id: "user-mr2", name: "Khaled Mansour", email: "khaled@pharmaerp.eg" } },
      ],
      products: [
        { id: "bup-4", productId: "prod-6", product: { id: "prod-6", name: "Omepak 20mg", sku: "OMP-20", category: "Gastrointestinal" } },
        { id: "bup-5", productId: "prod-8", product: { id: "prod-8", name: "Glimaryl 2mg", sku: "GLM-2", category: "Diabetes" } },
      ],
      territories: [],
      createdAt: "2025-02-01T10:00:00Z",
      updatedAt: "2025-02-01T10:00:00Z",
    },
  ];
}
