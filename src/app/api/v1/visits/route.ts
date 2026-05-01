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

// ─── GET /api/v1/visits ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const repId = params.get("repId");
    const status = params.get("status");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const doctorId = params.get("doctorId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (repId) where.repId = repId;
        if (status) where.status = status.toUpperCase();
        if (doctorId) where.doctorId = doctorId;
        if (dateFrom || dateTo) {
          where.date = {};
          if (dateFrom) (where.date as any).gte = new Date(dateFrom);
          if (dateTo) (where.date as any).lte = new Date(dateTo);
        }
        if (search) {
          where.OR = [
            { notes: { contains: search } },
            { doctorId: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.visit.count({ where }),
          prisma.visit.findMany({
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

    const mock = generateMockVisits();
    let filtered = filterBySearch(mock, search, ["notes", "doctorId", "repId"]);
    if (repId) filtered = filtered.filter((v) => v.repId === repId);
    if (status) filtered = filtered.filter((v) => v.status === status.toUpperCase());
    if (doctorId) filtered = filtered.filter((v) => v.doctorId === doctorId);
    if (dateFrom) filtered = filtered.filter((v) => v.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((v) => v.date <= dateTo);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch visits", 500);
  }
}

// ─── POST /api/v1/visits ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["repId", "doctorId", "date"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.visit.create({
          data: {
            repId: body.repId,
            doctorId: body.doctorId,
            accountId: body.accountId || null,
            date: new Date(body.date),
            startTime: body.startTime || null,
            endTime: body.endTime || null,
            type: (body.type || "SINGLE").toUpperCase(),
            status: (body.status || "LOGGED").toUpperCase(),
            notes: body.notes || null,
            samples: body.samples || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `visit-${Date.now()}`,
      ...body,
      type: (body.type || "SINGLE").toUpperCase(),
      status: (body.status || "LOGGED").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create visit", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockVisits() {
  return [
    { id: "visit-1", repId: "rep-1", doctorId: "doc-1", accountId: "acc-1", date: "2025-06-10", startTime: "09:00", endTime: "09:30", type: "SINGLE", status: "APPROVED", notes: "Discussed new cardiac drug launch, doctor very receptive. Left 3 samples of Cardiomax 10mg.", samples: [{ productId: "prod-1", quantity: 3 }], createdAt: "2025-06-10T09:30:00Z" },
    { id: "visit-2", repId: "rep-1", doctorId: "doc-2", accountId: "acc-2", date: "2025-06-10", startTime: "10:30", endTime: "11:00", type: "SINGLE", status: "APPROVED", notes: "Reviewed insulin product data with Dr. Fatma. She requested additional clinical studies.", samples: [{ productId: "prod-2", quantity: 2 }], createdAt: "2025-06-10T11:00:00Z" },
    { id: "visit-3", repId: "rep-2", doctorId: "doc-3", accountId: "acc-3", date: "2025-06-11", startTime: "14:00", endTime: "14:45", type: "DOUBLE", status: "LOGGED", notes: "Joint visit with district manager. Presented pediatric syrup line. Doctor placed initial order.", samples: [{ productId: "prod-3", quantity: 5 }], createdAt: "2025-06-11T14:45:00Z" },
    { id: "visit-4", repId: "rep-3", doctorId: "doc-4", accountId: "acc-4", date: "2025-06-12", startTime: "11:00", endTime: "11:30", type: "SINGLE", status: "LOGGED", notes: "Follow-up on oncology trial results. Dr. Nadia interested in new treatment protocol.", samples: [], createdAt: "2025-06-12T11:30:00Z" },
    { id: "visit-5", repId: "rep-2", doctorId: "doc-5", accountId: "acc-5", date: "2025-06-12", startTime: "16:00", endTime: "16:20", type: "SINGLE", status: "REJECTED", notes: "Doctor was unavailable, rescheduled for next week.", samples: [], createdAt: "2025-06-12T16:20:00Z" },
  ];
}
