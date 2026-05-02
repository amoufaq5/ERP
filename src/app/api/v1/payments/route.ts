import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createPaymentSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/payments ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const method = params.get("method");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (method) where.method = method.toUpperCase();
        if (search) {
          where.OR = [
            { reference: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.payment.count({ where }),
          prisma.payment.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: { invoice: true, bill: true },
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

    const mock = generateMockPayments();
    let filtered = filterBySearch(mock, search, ["reference"]);
    if (type) filtered = filtered.filter((p) => p.type === type.toUpperCase());
    if (method) filtered = filtered.filter((p) => p.method === method.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch payments", 500);
  }
}

// ─── POST /api/v1/payments ─────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createPaymentSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.payment.create({
          data: {
            type: data.type,
            amount: data.amount,
            date: new Date(data.date),
            method: data.method || null,
            reference: data.reference || null,
            invoiceId: data.invoiceId || null,
            billId: data.billId || null,
          },
          include: { invoice: true, bill: true },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `pay-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create payment", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockPayments() {
  return [
    { id: "pay-1", type: "INCOMING", amount: 16500, date: "2025-01-20T00:00:00Z", method: "BANK_TRANSFER", reference: "PAY-RCV-001", invoiceId: "inv-1", billId: null, createdAt: "2025-01-20T10:00:00Z" },
    { id: "pay-2", type: "OUTGOING", amount: 25000, date: "2025-02-05T00:00:00Z", method: "BANK_TRANSFER", reference: "PAY-OUT-001", invoiceId: null, billId: "bill-1", createdAt: "2025-02-05T10:00:00Z" },
    { id: "pay-3", type: "INCOMING", amount: 35200, date: "2025-03-01T00:00:00Z", method: "CHECK", reference: "PAY-RCV-002", invoiceId: "inv-2", billId: null, createdAt: "2025-03-01T10:00:00Z" },
    { id: "pay-4", type: "OUTGOING", amount: 12800, date: "2025-03-10T00:00:00Z", method: "BANK_TRANSFER", reference: "PAY-OUT-002", invoiceId: null, billId: "bill-2", createdAt: "2025-03-10T10:00:00Z" },
    { id: "pay-5", type: "INCOMING", amount: 8750, date: "2025-03-15T00:00:00Z", method: "CREDIT_CARD", reference: "PAY-RCV-003", invoiceId: "inv-3", billId: null, createdAt: "2025-03-15T10:00:00Z" },
    { id: "pay-6", type: "OUTGOING", amount: 45000, date: "2025-03-20T00:00:00Z", method: "BANK_TRANSFER", reference: "PAY-OUT-003", invoiceId: null, billId: "bill-3", createdAt: "2025-03-20T10:00:00Z" },
    { id: "pay-7", type: "INCOMING", amount: 5400, date: "2025-04-01T00:00:00Z", method: "CASH", reference: "PAY-RCV-004", invoiceId: null, billId: null, createdAt: "2025-04-01T10:00:00Z" },
  ];
}
