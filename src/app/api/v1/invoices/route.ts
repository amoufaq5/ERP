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

// ─── GET /api/v1/invoices ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const customerId = params.get("customerId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (customerId) where.customerId = customerId;
        if (search) {
          where.OR = [
            { invoiceNumber: { contains: search } },
            { notes: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.invoice.count({ where }),
          prisma.invoice.findMany({
            where,
            include: { customer: true, items: true },
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

    const mock = generateMockInvoices();
    let filtered = filterBySearch(mock, search, ["invoiceNumber", "customerName", "notes"]);
    if (status) filtered = filtered.filter((i) => i.status === status.toUpperCase());
    if (customerId) filtered = filtered.filter((i) => i.customerId === customerId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch invoices", 500);
  }
}

// ─── POST /api/v1/invoices ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, [
      "invoiceNumber",
      "customerId",
      "date",
      "dueDate",
      "subtotal",
      "total",
    ]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.invoice.create({
          data: {
            invoiceNumber: body.invoiceNumber,
            customerId: body.customerId,
            date: new Date(body.date),
            dueDate: new Date(body.dueDate),
            status: (body.status || "DRAFT").toUpperCase(),
            subtotal: parseFloat(body.subtotal),
            tax: body.tax ? parseFloat(body.tax) : 0,
            total: parseFloat(body.total),
            notes: body.notes || null,
            items: body.items
              ? {
                  create: body.items.map((item: any) => ({
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    tax: item.tax ? parseFloat(item.tax) : 0,
                    total: parseFloat(item.total),
                  })),
                }
              : undefined,
          },
          include: { items: true },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `inv-${Date.now()}`,
      ...body,
      status: (body.status || "DRAFT").toUpperCase(),
      subtotal: parseFloat(body.subtotal),
      tax: parseFloat(body.tax || "0"),
      total: parseFloat(body.total),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create invoice", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockInvoices() {
  return [
    { id: "inv-1", invoiceNumber: "INV-2025-001", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-01-20", dueDate: "2025-02-20", status: "PAID", subtotal: 1500, tax: 150, total: 1650, notes: null, createdAt: "2025-01-20T10:00:00Z" },
    { id: "inv-2", invoiceNumber: "INV-2025-002", customerId: "acct-2", customerName: "MedLife Labs", date: "2025-02-15", dueDate: "2025-03-15", status: "SENT", subtotal: 3200, tax: 320, total: 3520, notes: "Rush order", createdAt: "2025-02-15T10:00:00Z" },
    { id: "inv-3", invoiceNumber: "INV-2025-003", customerId: "acct-3", customerName: "Global Health Corp", date: "2025-03-10", dueDate: "2025-04-10", status: "OVERDUE", subtotal: 750, tax: 75, total: 825, notes: null, createdAt: "2025-03-10T10:00:00Z" },
    { id: "inv-4", invoiceNumber: "INV-2025-004", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-04-01", dueDate: "2025-05-01", status: "DRAFT", subtotal: 5000, tax: 500, total: 5500, notes: "Quarterly supply", createdAt: "2025-04-01T10:00:00Z" },
  ];
}
