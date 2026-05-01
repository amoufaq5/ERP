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

// ─── GET /api/v1/journal-entries ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (search) {
          where.OR = [
            { entryNumber: { contains: search } },
            { description: { contains: search } },
            { reference: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.journalEntry.count({ where }),
          prisma.journalEntry.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              lines: { include: { account: true } },
              createdBy: { select: { id: true, name: true, email: true } },
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

    const mock = generateMockJournalEntries();
    let filtered = filterBySearch(mock, search, ["entryNumber", "description", "reference"]);
    if (status) filtered = filtered.filter((j) => j.status === status.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch journal entries", 500);
  }
}

// ─── POST /api/v1/journal-entries ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["entryNumber", "date", "description", "createdById"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const data: Record<string, unknown> = {
          entryNumber: body.entryNumber,
          date: new Date(body.date),
          reference: body.reference || null,
          description: body.description,
          status: (body.status || "DRAFT").toUpperCase(),
          createdById: body.createdById,
        };

        // Create with lines if provided
        if (body.lines && Array.isArray(body.lines) && body.lines.length > 0) {
          data.lines = {
            create: body.lines.map((line: any) => ({
              accountId: line.accountId,
              debit: parseFloat(line.debit || "0"),
              credit: parseFloat(line.credit || "0"),
              description: line.description || null,
            })),
          };
        }

        const record = await prisma.journalEntry.create({
          data,
          include: {
            lines: { include: { account: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `je-${Date.now()}`,
      ...body,
      date: body.date,
      status: (body.status || "DRAFT").toUpperCase(),
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create journal entry", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockJournalEntries() {
  return [
    {
      id: "je-1", entryNumber: "JE-2025-001", date: "2025-01-15T00:00:00Z", reference: "INV-2025-001",
      description: "Record revenue from bulk paracetamol sale to Acme Pharma", status: "POSTED",
      createdById: "user-1", createdBy: { id: "user-1", name: "Jane Doe", email: "jane@company.com" },
      lines: [
        { id: "jel-1", accountId: "coa-2", accountCode: "1100", accountName: "Accounts Receivable", debit: 16500, credit: 0, description: "AR - Acme Pharma" },
        { id: "jel-2", accountId: "coa-8", accountCode: "4000", accountName: "Drug Sales Revenue", debit: 0, credit: 15000, description: "Revenue" },
        { id: "jel-3", accountId: "coa-6", accountCode: "2100", accountName: "Accrued Expenses", debit: 0, credit: 1500, description: "Sales tax payable" },
      ],
      createdAt: "2025-01-15T10:00:00Z",
    },
    {
      id: "je-2", entryNumber: "JE-2025-002", date: "2025-02-01T00:00:00Z", reference: "PO-2025-003",
      description: "Record raw material purchase for antibiotic production", status: "POSTED",
      createdById: "user-2", createdBy: { id: "user-2", name: "John Smith", email: "john@company.com" },
      lines: [
        { id: "jel-4", accountId: "coa-4", accountCode: "1300", accountName: "Raw Materials Inventory", debit: 25000, credit: 0, description: "API raw material" },
        { id: "jel-5", accountId: "coa-5", accountCode: "2000", accountName: "Accounts Payable", debit: 0, credit: 25000, description: "AP - ChemSource Ltd" },
      ],
      createdAt: "2025-02-01T10:00:00Z",
    },
    {
      id: "je-3", entryNumber: "JE-2025-003", date: "2025-02-15T00:00:00Z", reference: null,
      description: "Monthly R&D expense accrual for drug development", status: "DRAFT",
      createdById: "user-1", createdBy: { id: "user-1", name: "Jane Doe", email: "jane@company.com" },
      lines: [
        { id: "jel-6", accountId: "coa-11", accountCode: "5100", accountName: "R&D Expenses", debit: 45000, credit: 0, description: "Clinical trial costs" },
        { id: "jel-7", accountId: "coa-6", accountCode: "2100", accountName: "Accrued Expenses", debit: 0, credit: 45000, description: "Accrued R&D" },
      ],
      createdAt: "2025-02-15T10:00:00Z",
    },
    {
      id: "je-4", entryNumber: "JE-2025-004", date: "2025-03-01T00:00:00Z", reference: "PAY-2025-005",
      description: "Record payment received from MedLife Labs", status: "POSTED",
      createdById: "user-2", createdBy: { id: "user-2", name: "John Smith", email: "john@company.com" },
      lines: [
        { id: "jel-8", accountId: "coa-1", accountCode: "1000", accountName: "Cash and Cash Equivalents", debit: 35200, credit: 0, description: "Cash received" },
        { id: "jel-9", accountId: "coa-2", accountCode: "1100", accountName: "Accounts Receivable", debit: 0, credit: 35200, description: "AR - MedLife Labs" },
      ],
      createdAt: "2025-03-01T10:00:00Z",
    },
    {
      id: "je-5", entryNumber: "JE-2025-005", date: "2025-03-10T00:00:00Z", reference: "ADJ-001",
      description: "Inventory write-down for expired OTC medications", status: "VOID",
      createdById: "user-1", createdBy: { id: "user-1", name: "Jane Doe", email: "jane@company.com" },
      lines: [
        { id: "jel-10", accountId: "coa-10", accountCode: "5000", accountName: "Cost of Goods Sold", debit: 8500, credit: 0, description: "Expired inventory write-off" },
        { id: "jel-11", accountId: "coa-3", accountCode: "1200", accountName: "Pharmaceutical Inventory", debit: 0, credit: 8500, description: "Inventory reduction" },
      ],
      createdAt: "2025-03-10T10:00:00Z",
    },
  ];
}
