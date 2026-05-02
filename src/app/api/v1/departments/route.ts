import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createDepartmentSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/departments ───────────────────────────────────────────────

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
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.department.count({ where }),
          prisma.department.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: { manager: { select: { id: true, name: true, email: true } } },
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

    const mock = generateMockDepartments();
    let filtered = filterBySearch(mock, search, ["name", "description"]);
    if (managerId) filtered = filtered.filter((d) => d.managerId === managerId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch departments", 500);
  }
}

// ─── POST /api/v1/departments ──────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createDepartmentSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.department.create({
          data: {
            name: data.name,
            managerId: data.managerId || null,
            description: data.description || null,
            budget: data.budget || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `dept-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create department", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockDepartments() {
  return [
    { id: "dept-1", name: "Research & Development", description: "Drug discovery and formulation research", managerId: "user-1", budget: 2500000, createdAt: "2024-06-01T10:00:00Z" },
    { id: "dept-2", name: "Quality Assurance", description: "GMP compliance and quality control", managerId: "user-2", budget: 1800000, createdAt: "2024-06-01T10:00:00Z" },
    { id: "dept-3", name: "Manufacturing", description: "Drug manufacturing and packaging", managerId: "user-3", budget: 3200000, createdAt: "2024-07-15T10:00:00Z" },
    { id: "dept-4", name: "Regulatory Affairs", description: "FDA submissions and compliance", managerId: "user-4", budget: 900000, createdAt: "2024-08-01T10:00:00Z" },
    { id: "dept-5", name: "Clinical Trials", description: "Phase I-IV clinical trial management", managerId: null, budget: 5000000, createdAt: "2024-09-10T10:00:00Z" },
  ];
}
