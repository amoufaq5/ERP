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
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/market-requests ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const status = params.get("status");
    const requesterId = params.get("requesterId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (status) where.status = status.toUpperCase();
        if (requesterId) where.requesterId = requesterId;
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.marketRequest.count({ where }),
          prisma.marketRequest.findMany({
            where,
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

    const mock = generateMockMarketRequests();
    let filtered = filterBySearch(mock, search, ["title", "description"]);
    if (type) filtered = filtered.filter((r) => r.type === type.toUpperCase());
    if (status) filtered = filtered.filter((r) => r.status === status.toUpperCase());
    if (requesterId) filtered = filtered.filter((r) => r.requesterId === requesterId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch market requests", 500);
  }
}

// ─── POST /api/v1/market-requests ──────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["type", "title", "requesterId"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.marketRequest.create({
          data: {
            type: body.type.toUpperCase(),
            title: body.title,
            description: body.description || null,
            requesterId: body.requesterId,
            status: (body.status || "PENDING").toUpperCase(),
            value: body.value ? parseFloat(body.value) : null,
            approvalHistory: body.approvalHistory || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `mr-${Date.now()}`,
      ...body,
      type: body.type.toUpperCase(),
      status: (body.status || "PENDING").toUpperCase(),
      value: body.value ? parseFloat(body.value) : null,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create market request", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockMarketRequests() {
  return [
    {
      id: "mr-1",
      type: "SAMPLE",
      title: "Cardiomax 10mg samples for Ain Shams cardiology dept",
      description: "Dr. Ahmed Hassan requested 50 sample boxes of Cardiomax 10mg for the cardiology department evaluation program at Ain Shams University Hospital.",
      requesterId: "rep-1",
      status: "APPROVED",
      value: 2500.00,
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-1", date: "2025-06-01T10:00:00Z" },
        { action: "APPROVED", by: "mgr-1", date: "2025-06-02T09:00:00Z", comment: "Strategic KOL, approved" },
      ],
      createdAt: "2025-06-01T10:00:00Z",
    },
    {
      id: "mr-2",
      type: "LITERATURE",
      title: "Updated clinical data brochures for diabetes line",
      description: "Request for 200 copies of updated clinical trial brochures for the GlucoStabil insulin product range, to be distributed across Cairo territory.",
      requesterId: "rep-1",
      status: "FULFILLED",
      value: 1200.00,
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-1", date: "2025-05-15T10:00:00Z" },
        { action: "APPROVED", by: "mgr-1", date: "2025-05-16T09:00:00Z" },
        { action: "FULFILLED", by: "logistics-1", date: "2025-05-20T14:00:00Z" },
      ],
      createdAt: "2025-05-15T10:00:00Z",
    },
    {
      id: "mr-3",
      type: "EVENT",
      title: "Oncology CME dinner symposium at Nile Ritz-Carlton",
      description: "Sponsorship for a Continuing Medical Education dinner event targeting 30 oncologists in Greater Cairo. Speaker: Prof. Nadia Kamal from NCI.",
      requesterId: "rep-3",
      status: "PENDING",
      value: 45000.00,
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-3", date: "2025-06-10T10:00:00Z" },
      ],
      createdAt: "2025-06-10T10:00:00Z",
    },
    {
      id: "mr-4",
      type: "DISCOUNT",
      title: "Volume discount for Alexandria University Hospital pharmacy",
      description: "Request 15% volume discount on bulk order of 500 boxes of Omeprazole 20mg for Alexandria University Hospital pharmacy contract renewal.",
      requesterId: "rep-2",
      status: "REJECTED",
      value: 6750.00,
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-2", date: "2025-06-05T10:00:00Z" },
        { action: "REJECTED", by: "mgr-1", date: "2025-06-06T11:00:00Z", comment: "Discount exceeds maximum threshold for this account tier" },
      ],
      createdAt: "2025-06-05T10:00:00Z",
    },
  ];
}
