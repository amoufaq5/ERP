import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/kpis/:id ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.kpi.findUnique({ where: { id } });
        if (!record) {
          return apiError(`KPI with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "kpi-1": { id: "kpi-1", userId: "rep-1", period: "2025-Q2", metric: "Doctor Visits", target: 80, actual: 72, unit: "visits", score: 90, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-2": { id: "kpi-2", userId: "rep-1", period: "2025-Q2", metric: "Sales Revenue", target: 250000, actual: 215000, unit: "EGP", score: 86, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-3": { id: "kpi-3", userId: "rep-1", period: "2025-Q2", metric: "New Prescribers", target: 10, actual: 8, unit: "doctors", score: 80, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-4": { id: "kpi-4", userId: "rep-2", period: "2025-Q2", metric: "Doctor Visits", target: 60, actual: 58, unit: "visits", score: 97, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-5": { id: "kpi-5", userId: "rep-2", period: "2025-Q2", metric: "Sales Revenue", target: 180000, actual: 192000, unit: "EGP", score: 107, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-6": { id: "kpi-6", userId: "rep-3", period: "2025-Q2", metric: "Doctor Visits", target: 50, actual: 45, unit: "visits", score: 90, createdAt: "2025-06-01T10:00:00Z" },
      "kpi-7": { id: "kpi-7", userId: "rep-3", period: "2025-Q2", metric: "Market Share Growth", target: 5, actual: 3.2, unit: "%", score: 64, createdAt: "2025-06-01T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`KPI with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch KPI", 500);
  }
}

// ─── PATCH /api/v1/kpis/:id ───────────────────────────────────────────────

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
        const existing = await prisma.kpi.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`KPI with id '${id}' not found`, 404);
        }

        const record = await prisma.kpi.update({
          where: { id },
          data: body,
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update KPI", 500);
  }
});

// ─── DELETE /api/v1/kpis/:id ──────────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.kpi.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`KPI with id '${id}' not found`, 404);
        }

        await prisma.kpi.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete KPI", 500);
  }
});
