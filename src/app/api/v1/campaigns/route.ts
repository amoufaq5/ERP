import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createCampaignSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/campaigns ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const status = params.get("status");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (status) where.status = status.toUpperCase();
        if (search) {
          where.OR = [
            { name: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.campaign.count({ where }),
          prisma.campaign.findMany({
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

    const mock = generateMockCampaigns();
    let filtered = filterBySearch(mock, search, ["name", "type"]);
    if (type) filtered = filtered.filter((c) => c.type === type.toUpperCase());
    if (status) filtered = filtered.filter((c) => c.status === status.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch campaigns", 500);
  }
}

// ─── POST /api/v1/campaigns ────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createCampaignSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.campaign.create({
          data: {
            name: body.name,
            type: body.type.toUpperCase(),
            status: (body.status || "DRAFT").toUpperCase(),
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
            budget: body.budget ? parseFloat(body.budget) : 0,
            spent: body.spent ? parseFloat(body.spent) : 0,
            expectedRevenue: body.expectedRevenue ? parseFloat(body.expectedRevenue) : 0,
            actualRevenue: body.actualRevenue ? parseFloat(body.actualRevenue) : 0,
            leads: body.leads ? parseInt(body.leads) : 0,
            conversions: body.conversions ? parseInt(body.conversions) : 0,
            ownerId: body.ownerId || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `camp-${Date.now()}`,
      ...body,
      type: body.type.toUpperCase(),
      status: (body.status || "DRAFT").toUpperCase(),
      budget: body.budget ? parseFloat(body.budget) : 0,
      spent: body.spent ? parseFloat(body.spent) : 0,
      expectedRevenue: body.expectedRevenue ? parseFloat(body.expectedRevenue) : 0,
      actualRevenue: body.actualRevenue ? parseFloat(body.actualRevenue) : 0,
      leads: body.leads ? parseInt(body.leads) : 0,
      conversions: body.conversions ? parseInt(body.conversions) : 0,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create campaign", 500);
  }
});

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockCampaigns() {
  return [
    { id: "camp-1", name: "Egypt Pharma Conference 2025", type: "EVENT", status: "COMPLETED", startDate: "2025-02-15", endDate: "2025-02-17", budget: 50000, spent: 47500, expectedRevenue: 200000, actualRevenue: 185000, leads: 120, conversions: 18, createdAt: "2025-01-05T10:00:00Z" },
    { id: "camp-2", name: "Antibiotic Awareness Campaign", type: "CONTENT", status: "ACTIVE", startDate: "2025-03-01", endDate: "2025-05-31", budget: 15000, spent: 8200, expectedRevenue: 75000, actualRevenue: 32000, leads: 65, conversions: 8, createdAt: "2025-02-20T10:00:00Z" },
    { id: "camp-3", name: "Hospital Procurement Webinar Series", type: "WEBINAR", status: "SCHEDULED", startDate: "2025-06-01", endDate: "2025-06-30", budget: 10000, spent: 0, expectedRevenue: 150000, actualRevenue: 0, leads: 0, conversions: 0, createdAt: "2025-03-10T10:00:00Z" },
    { id: "camp-4", name: "OTC Product Launch - Cairo Region", type: "ADS", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-06-30", budget: 25000, spent: 12000, expectedRevenue: 100000, actualRevenue: 45000, leads: 210, conversions: 35, createdAt: "2025-03-20T10:00:00Z" },
    { id: "camp-5", name: "Physician Email Outreach - Delta Region", type: "EMAIL", status: "DRAFT", startDate: null, endDate: null, budget: 5000, spent: 0, expectedRevenue: 60000, actualRevenue: 0, leads: 0, conversions: 0, createdAt: "2025-04-01T10:00:00Z" },
  ];
}
