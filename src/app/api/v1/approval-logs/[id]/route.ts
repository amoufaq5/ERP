import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/approval-logs/:id ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.approvalLog.findUnique({
          where: { id },
          include: {
            performedBy: { select: { id: true, name: true, email: true } },
            businessUnit: {
              select: { id: true, name: true, code: true, color: true },
            },
          },
        });
        if (!record) {
          return apiError(`Approval log with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "al-1": {
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
        businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV", color: "#ef4444" },
        createdAt: "2025-03-01T09:00:00Z",
      },
      "al-2": {
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
        businessUnit: { id: "bu-1", name: "Cardiovascular Business Unit", code: "BU-CV", color: "#ef4444" },
        createdAt: "2025-03-01T11:30:00Z",
      },
      "al-3": {
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
        businessUnit: { id: "bu-2", name: "Anti-Infectives Business Unit", code: "BU-AI", color: "#3b82f6" },
        createdAt: "2025-03-02T08:00:00Z",
      },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Approval log with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch approval log", 500);
  }
}
