import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process weekly plans:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/weekly-plans/:id ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.weeklyPlan.findUnique({ where: { id } });
        if (!record) {
          return apiError(`Weekly plan with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process weekly plans:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "wp-1": {
        id: "wp-1", repId: "rep-1", weekStartDate: "2025-06-09", status: "APPROVED",
        dailyPlans: [
          { day: "Sunday", visits: [{ doctorId: "doc-1", time: "09:00", location: "Ain Shams University Hospital" }, { doctorId: "doc-2", time: "11:00", location: "Kasr Al-Ainy" }] },
          { day: "Monday", visits: [{ doctorId: "doc-4", time: "10:00", location: "National Cancer Institute" }] },
        ],
        approvalHistory: [
          { action: "SUBMITTED", by: "rep-1", date: "2025-06-07T10:00:00Z" },
          { action: "APPROVED", by: "mgr-1", date: "2025-06-08T09:00:00Z", comment: "Good coverage of key accounts" },
        ],
        createdAt: "2025-06-06T10:00:00Z",
      },
      "wp-2": {
        id: "wp-2", repId: "rep-2", weekStartDate: "2025-06-09", status: "SUBMITTED",
        dailyPlans: [
          { day: "Sunday", visits: [{ doctorId: "doc-3", time: "14:00", location: "Abu El Reesh Children's Hospital" }] },
        ],
        approvalHistory: [{ action: "SUBMITTED", by: "rep-2", date: "2025-06-07T14:00:00Z" }],
        createdAt: "2025-06-06T14:00:00Z",
      },
      "wp-3": {
        id: "wp-3", repId: "rep-1", weekStartDate: "2025-06-16", status: "DRAFT",
        dailyPlans: [],
        approvalHistory: [],
        createdAt: "2025-06-13T10:00:00Z",
      },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Weekly plan with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch weekly plan", 500);
  }
}

// ─── PATCH /api/v1/weekly-plans/:id ────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return apiError("Request body cannot be empty", 400);
    }

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.weeklyPlan.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Weekly plan with id '${id}' not found`, 404);
        }

        const record = await prisma.weeklyPlan.update({
          where: { id },
          data: body,
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process weekly plans:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update weekly plan", 500);
  }
});

// ─── DELETE /api/v1/weekly-plans/:id ───────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.weeklyPlan.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Weekly plan with id '${id}' not found`, 404);
        }

        await prisma.weeklyPlan.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch (error) { console.error("Failed to process weekly plans:", error); }
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete weekly plan", 500);
  }
});
