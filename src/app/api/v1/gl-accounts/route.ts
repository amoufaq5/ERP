import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createGlAccountSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/gl-accounts ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const isActive = params.get("isActive");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (isActive !== null && isActive !== "") where.isActive = isActive === "true";
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { code: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.chartOfAccount.count({ where }),
          prisma.chartOfAccount.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { code: "asc" },
            include: { children: true },
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

    const mock = generateMockGLAccounts();
    let filtered = filterBySearch(mock, search, ["name", "code"]);
    if (type) filtered = filtered.filter((a) => a.type === type.toUpperCase());
    if (isActive !== null && isActive !== "") filtered = filtered.filter((a) => a.isActive === (isActive === "true"));
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch GL accounts", 500);
  }
}

// ─── POST /api/v1/gl-accounts ──────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createGlAccountSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.chartOfAccount.create({
          data: {
            code: data.code,
            name: data.name,
            type: data.type,
            balance: data.balance,
            parentId: data.parentId || null,
            isActive: data.isActive,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `coa-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create GL account", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockGLAccounts() {
  return [
    { id: "coa-1", code: "1000", name: "Cash and Cash Equivalents", type: "ASSET", balance: 250000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-2", code: "1100", name: "Accounts Receivable", type: "ASSET", balance: 87500, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-3", code: "1200", name: "Pharmaceutical Inventory", type: "ASSET", balance: 435000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-4", code: "1300", name: "Raw Materials Inventory", type: "ASSET", balance: 162000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-5", code: "2000", name: "Accounts Payable", type: "LIABILITY", balance: 95000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-6", code: "2100", name: "Accrued Expenses", type: "LIABILITY", balance: 42000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-7", code: "3000", name: "Retained Earnings", type: "EQUITY", balance: 520000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-8", code: "4000", name: "Drug Sales Revenue", type: "REVENUE", balance: 1250000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-9", code: "4100", name: "OTC Product Revenue", type: "REVENUE", balance: 340000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-10", code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", balance: 680000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-11", code: "5100", name: "R&D Expenses", type: "EXPENSE", balance: 195000, parentId: null, isActive: true, createdAt: "2025-01-01T00:00:00Z" },
    { id: "coa-12", code: "5200", name: "Quality Control Expenses", type: "EXPENSE", balance: 78000, parentId: null, isActive: false, createdAt: "2025-01-01T00:00:00Z" },
  ];
}
