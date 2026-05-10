import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  parseQueryParams,
  filterBySearch,
} from "@/lib/api/api-helpers";

// ---------------------------------------------------------------------------
// Generic data-store API route
// ---------------------------------------------------------------------------
// GET  /api/v1/data-store?entity=<key>&search=...&page=...&limit=...
// POST /api/v1/data-store  { entity, data }
// PUT  /api/v1/data-store  { entity, id, data }
// DELETE /api/v1/data-store?entity=<key>&id=<id>
// POST /api/v1/data-store with { action: "next-number", type: "..." }
// POST /api/v1/data-store with { action: "bulk-add", entity, items }
// POST /api/v1/data-store with { action: "reset" }
// ---------------------------------------------------------------------------

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable */
}

// In-memory storage keyed by entity name
const inMemoryStore: Record<string, Array<Record<string, any>>> = {};

// Sequence counters
const sequences: Record<string, number> = {
  nextInvoiceSeq: 3,
  nextJournalSeq: 9,
  nextPOSeq: 5,
  nextSOSeq: 4,
  nextRFQSeq: 3,
  nextGRNSeq: 2,
  nextDNSeq: 2,
  nextCustomerSeq: 1006,
  nextVendorSeq: 2006,
  nextProductSeq: 9,
  nextBankSeq: 5,
  nextCostCenterSeq: 7,
  nextPaymentSeq: 6,
  nextChequeSeq: 8,
  nextShipmentSeq: 1,
};

// Entity to Prisma model mapping for DB-backed entities
const ENTITY_PRISMA_MAP: Record<string, string> = {
  products: "product",
  customers: "account",
  invoices: "invoice",
  employees: "employee",
  doctors: "doctor",
  visits: "visit",
  territories: "territory",
  journalEntries: "journalEntry",
  glAccounts: "glAccount",
  purchaseOrders: "purchaseOrder",
  salesOrders: "salesOrder",
  shipments: "shipment",
  payments: "payment",
  campaigns: "campaign",
  opportunities: "opportunity",
};

function getStore(entity: string): Array<Record<string, any>> {
  if (!inMemoryStore[entity]) {
    inMemoryStore[entity] = [];
  }
  return inMemoryStore[entity];
}

// ---------------------------------------------------------------------------
export async function OPTIONS() {
  return corsOptions();
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const entity = params.get("entity");

    if (!entity) {
      // Return sequences
      return apiResponse({ sequences });
    }

    // Try Prisma if we have a mapping
    const prismaModel = ENTITY_PRISMA_MAP[entity];
    if (prisma && prismaModel) {
      try {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma[prismaModel].count({ where }),
          prisma[prismaModel].findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);

        return apiResponse(records, 200, {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
        });
      } catch {
        /* fall through to in-memory */
      }
    }

    // In-memory
    let data = getStore(entity);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter((item) => {
        return Object.values(item).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q)
        );
      });
    }

    const { items, pagination } = paginate(data, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch data", 500);
  }
}

// ---------------------------------------------------------------------------
// POST -- create / bulk-add / next-number / reset
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Generate next number
    if (body.action === "next-number") {
      const key = body.type as string;
      if (!key || !(key in sequences)) {
        return apiError(`Unknown sequence type: ${key}`, 400);
      }
      const value = sequences[key];
      sequences[key] = value + 1;
      return apiResponse({ value });
    }

    // Bulk add
    if (body.action === "bulk-add") {
      const entity = body.entity as string;
      const items = body.items as Array<Record<string, any>>;
      if (!entity || !items) {
        return apiError("entity and items are required", 400);
      }
      const store = getStore(entity);
      store.push(...items);
      return apiResponse({ added: items.length });
    }

    // Reset
    if (body.action === "reset") {
      for (const key of Object.keys(inMemoryStore)) {
        inMemoryStore[key] = [];
      }
      // Reset sequences
      sequences.nextInvoiceSeq = 3;
      sequences.nextJournalSeq = 9;
      sequences.nextPOSeq = 5;
      sequences.nextSOSeq = 4;
      sequences.nextRFQSeq = 3;
      sequences.nextGRNSeq = 2;
      sequences.nextDNSeq = 2;
      sequences.nextCustomerSeq = 1006;
      sequences.nextVendorSeq = 2006;
      sequences.nextProductSeq = 9;
      sequences.nextBankSeq = 5;
      sequences.nextCostCenterSeq = 7;
      sequences.nextPaymentSeq = 6;
      sequences.nextChequeSeq = 8;
      sequences.nextShipmentSeq = 1;
      return apiResponse({ reset: true });
    }

    // Single item create
    const entity = body.entity as string;
    const data = body.data as Record<string, any>;
    if (!entity || !data) {
      return apiError("entity and data are required", 400);
    }

    // Try Prisma
    const prismaModel = ENTITY_PRISMA_MAP[entity];
    if (prisma && prismaModel) {
      try {
        const created = await prisma[prismaModel].create({ data });
        return apiResponse(created, 201);
      } catch {
        /* fall through */
      }
    }

    // In-memory
    const store = getStore(entity);
    store.push(data);
    return apiResponse(data, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create record", 500);
  }
}

// ---------------------------------------------------------------------------
// PUT -- update a record
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const entity = body.entity as string;
    const id = body.id as string;
    const data = body.data as Record<string, any>;

    if (!entity || !id || !data) {
      return apiError("entity, id, and data are required", 400);
    }

    // Try Prisma
    const prismaModel = ENTITY_PRISMA_MAP[entity];
    if (prisma && prismaModel) {
      try {
        const updated = await prisma[prismaModel].update({
          where: { id },
          data,
        });
        return apiResponse(updated);
      } catch {
        /* fall through */
      }
    }

    // In-memory
    const store = getStore(entity);
    const idx = store.findIndex((item) => item.id === id);
    if (idx === -1) return apiError("Record not found", 404);
    store[idx] = { ...store[idx], ...data };
    return apiResponse(store[idx]);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update record", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const { params } = parseQueryParams(req.url);
    const entity = params.get("entity");
    const id = params.get("id");

    if (!entity || !id) {
      return apiError("entity and id are required", 400);
    }

    // Try Prisma
    const prismaModel = ENTITY_PRISMA_MAP[entity];
    if (prisma && prismaModel) {
      try {
        await prisma[prismaModel].delete({ where: { id } });
        return apiResponse({ deleted: true });
      } catch {
        /* fall through */
      }
    }

    // In-memory
    const store = getStore(entity);
    const idx = store.findIndex((item) => item.id === id);
    if (idx === -1) return apiError("Record not found", 404);
    store.splice(idx, 1);
    return apiResponse({ deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete record", 500);
  }
}
