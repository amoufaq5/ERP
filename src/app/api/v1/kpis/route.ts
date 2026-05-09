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
} catch (error) { console.error("Failed to process kpis:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/kpis ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const userId = params.get("userId");
    const period = params.get("period");
    const metric = params.get("metric");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;
        if (period) where.period = period;
        if (metric) where.metric = metric;
        if (search) {
          where.OR = [
            { metric: { contains: search } },
            { period: { contains: search } },
            { userId: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.kpi.count({ where }),
          prisma.kpi.findMany({
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
      } catch (error) { console.error("Failed to process kpis:", error); }
    }

    const mock = generateMockKPIs();
    let filtered = filterBySearch(mock, search, ["metric", "period", "userId"]);
    if (userId) filtered = filtered.filter((k) => k.userId === userId);
    if (period) filtered = filtered.filter((k) => k.period === period);
    if (metric) filtered = filtered.filter((k) => k.metric === metric);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch KPIs", 500);
  }
}

// ─── POST /api/v1/kpis ────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["userId", "period", "metric", "target"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.kpi.create({
          data: {
            userId: body.userId,
            period: body.period,
            metric: body.metric,
            target: parseFloat(body.target),
            actual: body.actual ? parseFloat(body.actual) : 0,
            unit: body.unit || null,
            score: body.score ? parseFloat(body.score) : null,
          },
        });
        return apiResponse(record, 201);
      } catch (error) { console.error("Failed to process kpis:", error); }
    }

    const target = parseFloat(body.target);
    const actual = body.actual ? parseFloat(body.actual) : 0;
    const record = {
      id: `kpi-${Date.now()}`,
      ...body,
      target,
      actual,
      score: body.score ? parseFloat(body.score) : (target > 0 ? Math.round((actual / target) * 100) : 0),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create KPI", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockKPIs() {
  return [
    { id: "kpi-1", userId: "rep-1", period: "2025-Q2", metric: "Doctor Visits", target: 80, actual: 72, unit: "visits", score: 90, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-2", userId: "rep-1", period: "2025-Q2", metric: "Sales Revenue", target: 250000, actual: 215000, unit: "EGP", score: 86, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-3", userId: "rep-1", period: "2025-Q2", metric: "New Prescribers", target: 10, actual: 8, unit: "doctors", score: 80, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-4", userId: "rep-2", period: "2025-Q2", metric: "Doctor Visits", target: 60, actual: 58, unit: "visits", score: 97, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-5", userId: "rep-2", period: "2025-Q2", metric: "Sales Revenue", target: 180000, actual: 192000, unit: "EGP", score: 107, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-6", userId: "rep-3", period: "2025-Q2", metric: "Doctor Visits", target: 50, actual: 45, unit: "visits", score: 90, createdAt: "2025-06-01T10:00:00Z" },
    { id: "kpi-7", userId: "rep-3", period: "2025-Q2", metric: "Market Share Growth", target: 5, actual: 3.2, unit: "%", score: 64, createdAt: "2025-06-01T10:00:00Z" },
  ];
}
