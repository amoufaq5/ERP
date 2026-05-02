import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createApprovalLogSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/approval-logs ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const entityType = params.get("entityType");
    const entityId = params.get("entityId");
    const performedById = params.get("performedById");
    const businessUnitId = params.get("businessUnitId");
    const action = params.get("action");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (entityType) where.entityType = entityType.toUpperCase();
        if (entityId) where.entityId = entityId;
        if (performedById) where.performedById = performedById;
        if (businessUnitId) where.businessUnitId = businessUnitId;
        if (action) where.action = action.toUpperCase();
        if (search) {
          where.OR = [
            { entityType: { contains: search } },
            { entityId: { contains: search } },
            { action: { contains: search } },
            { comment: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.approvalLog.count({ where }),
          prisma.approvalLog.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              performedBy: { select: { id: true, name: true, email: true } },
              businessUnit: { select: { id: true, name: true, code: true } },
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

    const mock = generateMockApprovalLogs();
    let filtered = filterBySearch(mock, search, ["entityType", "entityId", "action", "comment"]);
    if (entityType) filtered = filtered.filter((l) => l.entityType === entityType.toUpperCase());
    if (entityId) filtered = filtered.filter((l) => l.entityId === entityId);
    if (performedById) filtered = filtered.filter((l) => l.performedById === performedById);
    if (businessUnitId) filtered = filtered.filter((l) => l.businessUnitId === businessUnitId);
    if (action) filtered = filtered.filter((l) => l.action === action.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch approval logs", 500);
  }
}

// ─── POST /api/v1/approval-logs ─────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createApprovalLogSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.approvalLog.create({
          data: {
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            performedById: data.performedById,
            comment: data.comment || null,
            level: data.level,
            businessUnitId: data.businessUnitId || null,
          },
          include: {
            performedBy: { select: { id: true, name: true, email: true } },
            businessUnit: { select: { id: true, name: true, code: true } },
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `al-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create approval log", 500);
  }
});

// ─── Mock data ──────────────────────────────────────────────────────────────

function generateMockApprovalLogs() {
  return [
    {
      id: "al-1",
      entityType: "EXPENSE",
      entityId: "exp-001",
      action: "SUBMITTED",
      fromStatus: "DRAFT",
      toStatus: "PENDING",
      performedById: "user-mr1",
      performedBy: { id: "user-mr1", name: "Mona Abdel-Nour", email: "mona@pharmaerp.eg" },
      comment: null,
      level: 1,
      businessUnitId: "bu-1",
      businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV" },
      createdAt: "2025-03-01T09:00:00Z",
    },
    {
      id: "al-2",
      entityType: "EXPENSE",
      entityId: "exp-001",
      action: "APPROVED",
      fromStatus: "PENDING",
      toStatus: "APPROVED",
      performedById: "user-bum",
      performedBy: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" },
      comment: "Within budget",
      level: 3,
      businessUnitId: "bu-1",
      businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV" },
      createdAt: "2025-03-01T11:30:00Z",
    },
    {
      id: "al-3",
      entityType: "WEEKLY_PLAN",
      entityId: "wp-001",
      action: "SUBMITTED",
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED",
      performedById: "user-mr2",
      performedBy: { id: "user-mr2", name: "Khaled Mansour", email: "khaled@pharmaerp.eg" },
      comment: null,
      level: 1,
      businessUnitId: "bu-2",
      businessUnit: { id: "bu-2", name: "Anti-Infectives Business Unit", code: "BU-AI" },
      createdAt: "2025-03-02T08:00:00Z",
    },
    {
      id: "al-4",
      entityType: "MARKET_REQUEST",
      entityId: "mr-001",
      action: "SUBMITTED",
      fromStatus: "DRAFT",
      toStatus: "PENDING",
      performedById: "user-mr1",
      performedBy: { id: "user-mr1", name: "Mona Abdel-Nour", email: "mona@pharmaerp.eg" },
      comment: null,
      level: 1,
      businessUnitId: "bu-1",
      businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV" },
      createdAt: "2025-03-03T10:00:00Z",
    },
    {
      id: "al-5",
      entityType: "MARKET_REQUEST",
      entityId: "mr-001",
      action: "APPROVED",
      fromStatus: "PENDING",
      toStatus: "APPROVED",
      performedById: "user-mgr",
      performedBy: { id: "user-mgr", name: "Sara El-Masry", email: "sarah@pharmaerp.eg" },
      comment: "Approved - conference sponsorship",
      level: 2,
      businessUnitId: "bu-1",
      businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV" },
      createdAt: "2025-03-03T14:00:00Z",
    },
  ];
}
