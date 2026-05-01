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

// ─── GET /api/v1/weekly-plans ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const repId = params.get("repId");
    const status = params.get("status");
    const week = params.get("week");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (repId) where.repId = repId;
        if (status) where.status = status.toUpperCase();
        if (week) where.weekStartDate = new Date(week);
        if (search) {
          where.OR = [
            { repId: { contains: search } },
            { status: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.weeklyPlan.count({ where }),
          prisma.weeklyPlan.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { weekStartDate: "desc" },
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

    const mock = generateMockWeeklyPlans();
    let filtered = filterBySearch(mock, search, ["repId", "status"]);
    if (repId) filtered = filtered.filter((p) => p.repId === repId);
    if (status) filtered = filtered.filter((p) => p.status === status.toUpperCase());
    if (week) filtered = filtered.filter((p) => p.weekStartDate === week);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch weekly plans", 500);
  }
}

// ─── POST /api/v1/weekly-plans ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["repId", "weekStartDate"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.weeklyPlan.create({
          data: {
            repId: body.repId,
            weekStartDate: new Date(body.weekStartDate),
            status: (body.status || "DRAFT").toUpperCase(),
            dailyPlans: body.dailyPlans || null,
            approvalHistory: body.approvalHistory || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `wp-${Date.now()}`,
      ...body,
      status: (body.status || "DRAFT").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create weekly plan", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockWeeklyPlans() {
  return [
    {
      id: "wp-1",
      repId: "rep-1",
      weekStartDate: "2025-06-09",
      status: "APPROVED",
      dailyPlans: [
        { day: "Sunday", visits: [{ doctorId: "doc-1", time: "09:00", location: "Ain Shams University Hospital" }, { doctorId: "doc-2", time: "11:00", location: "Kasr Al-Ainy" }] },
        { day: "Monday", visits: [{ doctorId: "doc-4", time: "10:00", location: "National Cancer Institute" }] },
        { day: "Tuesday", visits: [{ doctorId: "doc-1", time: "09:00", location: "Ain Shams University Hospital" }] },
        { day: "Wednesday", visits: [{ doctorId: "doc-2", time: "14:00", location: "Kasr Al-Ainy" }] },
        { day: "Thursday", visits: [{ doctorId: "doc-4", time: "11:00", location: "National Cancer Institute" }] },
      ],
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-1", date: "2025-06-07T10:00:00Z" },
        { action: "APPROVED", by: "mgr-1", date: "2025-06-08T09:00:00Z", comment: "Good coverage of key accounts" },
      ],
      createdAt: "2025-06-06T10:00:00Z",
    },
    {
      id: "wp-2",
      repId: "rep-2",
      weekStartDate: "2025-06-09",
      status: "SUBMITTED",
      dailyPlans: [
        { day: "Sunday", visits: [{ doctorId: "doc-3", time: "14:00", location: "Abu El Reesh Children's Hospital" }] },
        { day: "Monday", visits: [{ doctorId: "doc-5", time: "10:00", location: "Alexandria University Hospital" }] },
        { day: "Tuesday", visits: [{ doctorId: "doc-3", time: "09:00", location: "Abu El Reesh Children's Hospital" }] },
        { day: "Wednesday", visits: [] },
        { day: "Thursday", visits: [{ doctorId: "doc-5", time: "15:00", location: "Alexandria University Hospital" }] },
      ],
      approvalHistory: [
        { action: "SUBMITTED", by: "rep-2", date: "2025-06-07T14:00:00Z" },
      ],
      createdAt: "2025-06-06T14:00:00Z",
    },
    {
      id: "wp-3",
      repId: "rep-1",
      weekStartDate: "2025-06-16",
      status: "DRAFT",
      dailyPlans: [
        { day: "Sunday", visits: [{ doctorId: "doc-1", time: "09:00", location: "Ain Shams University Hospital" }] },
        { day: "Monday", visits: [] },
        { day: "Tuesday", visits: [] },
        { day: "Wednesday", visits: [] },
        { day: "Thursday", visits: [] },
      ],
      approvalHistory: [],
      createdAt: "2025-06-13T10:00:00Z",
    },
  ];
}
