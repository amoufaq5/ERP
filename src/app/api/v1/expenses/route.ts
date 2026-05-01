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

// ─── GET /api/v1/expenses ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const category = params.get("category");
    const userId = params.get("userId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (category) where.category = category;
        if (userId) where.userId = userId;
        if (search) {
          where.OR = [
            { description: { contains: search } },
            { category: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.expense.count({ where }),
          prisma.expense.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { date: "desc" },
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

    const mock = generateMockExpenses();
    let filtered = filterBySearch(mock, search, ["description", "category"]);
    if (status) filtered = filtered.filter((e) => e.status === status.toUpperCase());
    if (category) filtered = filtered.filter((e) => e.category === category);
    if (userId) filtered = filtered.filter((e) => e.userId === userId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch expenses", 500);
  }
}

// ─── POST /api/v1/expenses ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["userId", "category", "amount", "date"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.expense.create({
          data: {
            userId: body.userId,
            category: body.category,
            description: body.description || null,
            amount: parseFloat(body.amount),
            date: new Date(body.date),
            receiptUrl: body.receiptUrl || null,
            status: (body.status || "DRAFT").toUpperCase(),
            approvalHistory: body.approvalHistory || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `exp-${Date.now()}`,
      ...body,
      amount: parseFloat(body.amount),
      status: (body.status || "DRAFT").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create expense", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockExpenses() {
  return [
    {
      id: "exp-1",
      userId: "rep-1",
      category: "Transportation",
      description: "Uber rides for doctor visits across Greater Cairo (Ain Shams, Kasr Al-Ainy, NCI)",
      amount: 450.00,
      date: "2025-06-10",
      receiptUrl: null,
      status: "APPROVED",
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-1", date: "2025-06-10T18:00:00Z" },
        { action: "APPROVED", by: "mgr-1", date: "2025-06-11T09:00:00Z", comment: "Within daily transport allowance" },
      ],
      createdAt: "2025-06-10T18:00:00Z",
    },
    {
      id: "exp-2",
      userId: "rep-2",
      category: "Meals & Entertainment",
      description: "Lunch meeting with Dr. Mohamed Abdel-Rahman at Abu El Reesh Hospital cafeteria",
      amount: 280.00,
      date: "2025-06-11",
      receiptUrl: "/receipts/exp-2-receipt.jpg",
      status: "SUBMITTED",
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-2", date: "2025-06-11T16:00:00Z" },
      ],
      createdAt: "2025-06-11T16:00:00Z",
    },
    {
      id: "exp-3",
      userId: "rep-3",
      category: "Conference & Events",
      description: "Registration fee for Egyptian Oncology Society annual meeting at Cairo International Convention Center",
      amount: 3500.00,
      date: "2025-06-08",
      receiptUrl: "/receipts/exp-3-receipt.pdf",
      status: "APPROVED",
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-3", date: "2025-06-08T10:00:00Z" },
        { action: "APPROVED", by: "mgr-1", date: "2025-06-09T09:00:00Z", comment: "Pre-approved event budget" },
      ],
      createdAt: "2025-06-08T10:00:00Z",
    },
    {
      id: "exp-4",
      userId: "rep-1",
      category: "Office Supplies",
      description: "Printing of product detail aids and leave-behind materials at Copy Center Maadi",
      amount: 175.00,
      date: "2025-06-12",
      receiptUrl: "/receipts/exp-4-receipt.jpg",
      status: "DRAFT",
      approvalHistory: [],
      createdAt: "2025-06-12T14:00:00Z",
    },
  ];
}
