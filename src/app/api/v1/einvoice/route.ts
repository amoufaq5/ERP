import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  parseQueryParams,
} from "@/lib/api/api-helpers";

// ---------------------------------------------------------------------------
// E-Invoice API -- /api/v1/einvoice
// GET  -- list all e-invoices
// POST -- save a new e-invoice
// ---------------------------------------------------------------------------

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable */
}

interface StoredInvoice {
  id: string;
  internalId: string;
  issuerName: string;
  issuerTaxId: string;
  receiverName: string;
  receiverTaxId: string;
  dateTimeIssued: string;
  invoiceLines: any[];
  totalSalesAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
  taxTotals: any[];
  totalAmount: number;
  status: string;
  uuid?: string;
  submissionId?: string;
  longId?: string;
}

const inMemoryStore: StoredInvoice[] = [];

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const { page, limit, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (dateFrom || dateTo) {
          where.dateTimeIssued = {};
          if (dateFrom) (where.dateTimeIssued as any).gte = new Date(dateFrom);
          if (dateTo) (where.dateTimeIssued as any).lte = new Date(dateTo);
        }
        const [total, records] = await Promise.all([
          prisma.eInvoice.count({ where }),
          prisma.eInvoice.findMany({
            where,
            orderBy: { dateTimeIssued: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);
        return apiResponse(records, 200, {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
        });
      } catch {
        /* fall through */
      }
    }

    let results = [...inMemoryStore];
    if (status) results = results.filter((inv) => inv.status === status);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      results = results.filter((inv) => new Date(inv.dateTimeIssued).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      results = results.filter((inv) => new Date(inv.dateTimeIssued).getTime() <= to);
    }
    results.sort((a, b) => new Date(b.dateTimeIssued).getTime() - new Date(a.dateTimeIssued).getTime());

    const { items, pagination } = paginate(results, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch e-invoices", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const invoice: StoredInvoice = {
      id: body.id || `EINV-${Date.now()}`,
      internalId: body.internalId || "",
      issuerName: body.issuerName || "",
      issuerTaxId: body.issuerTaxId || "",
      receiverName: body.receiverName || "",
      receiverTaxId: body.receiverTaxId || "",
      dateTimeIssued: body.dateTimeIssued || new Date().toISOString(),
      invoiceLines: body.invoiceLines || [],
      totalSalesAmount: body.totalSalesAmount || 0,
      totalDiscountAmount: body.totalDiscountAmount || 0,
      netAmount: body.netAmount || 0,
      taxTotals: body.taxTotals || [],
      totalAmount: body.totalAmount || 0,
      status: body.status || "draft",
      uuid: body.uuid,
      submissionId: body.submissionId,
      longId: body.longId,
    };

    if (prisma) {
      try {
        const created = await prisma.eInvoice.create({ data: invoice });
        return apiResponse(created, 201);
      } catch {
        /* fall through */
      }
    }

    // Update existing or add new
    const idx = inMemoryStore.findIndex((inv) => inv.id === invoice.id);
    if (idx >= 0) {
      inMemoryStore[idx] = invoice;
    } else {
      inMemoryStore.push(invoice);
    }

    return apiResponse(invoice, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to save e-invoice", 500);
  }
}
