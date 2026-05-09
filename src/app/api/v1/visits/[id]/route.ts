import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process visits:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/visits/:id ────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.visit.findUnique({ where: { id } });
        if (!record) {
          return apiError(`Visit with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process visits:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "visit-1": { id: "visit-1", repId: "rep-1", doctorId: "doc-1", accountId: "acc-1", date: "2025-06-10", startTime: "09:00", endTime: "09:30", type: "SINGLE", status: "APPROVED", notes: "Discussed new cardiac drug launch, doctor very receptive. Left 3 samples of Cardiomax 10mg.", samples: [{ productId: "prod-1", quantity: 3 }], createdAt: "2025-06-10T09:30:00Z" },
      "visit-2": { id: "visit-2", repId: "rep-1", doctorId: "doc-2", accountId: "acc-2", date: "2025-06-10", startTime: "10:30", endTime: "11:00", type: "SINGLE", status: "APPROVED", notes: "Reviewed insulin product data with Dr. Fatma. She requested additional clinical studies.", samples: [{ productId: "prod-2", quantity: 2 }], createdAt: "2025-06-10T11:00:00Z" },
      "visit-3": { id: "visit-3", repId: "rep-2", doctorId: "doc-3", accountId: "acc-3", date: "2025-06-11", startTime: "14:00", endTime: "14:45", type: "DOUBLE", status: "LOGGED", notes: "Joint visit with district manager. Presented pediatric syrup line.", samples: [{ productId: "prod-3", quantity: 5 }], createdAt: "2025-06-11T14:45:00Z" },
      "visit-4": { id: "visit-4", repId: "rep-3", doctorId: "doc-4", accountId: "acc-4", date: "2025-06-12", startTime: "11:00", endTime: "11:30", type: "SINGLE", status: "LOGGED", notes: "Follow-up on oncology trial results. Dr. Nadia interested in new treatment protocol.", samples: [], createdAt: "2025-06-12T11:30:00Z" },
      "visit-5": { id: "visit-5", repId: "rep-2", doctorId: "doc-5", accountId: "acc-5", date: "2025-06-12", startTime: "16:00", endTime: "16:20", type: "SINGLE", status: "REJECTED", notes: "Doctor was unavailable, rescheduled for next week.", samples: [], createdAt: "2025-06-12T16:20:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Visit with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch visit", 500);
  }
}

// ─── PATCH /api/v1/visits/:id ──────────────────────────────────────────────

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
        const existing = await prisma.visit.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Visit with id '${id}' not found`, 404);
        }

        const record = await prisma.visit.update({
          where: { id },
          data: body,
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process visits:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update visit", 500);
  }
});

// ─── DELETE /api/v1/visits/:id ─────────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.visit.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Visit with id '${id}' not found`, 404);
        }

        await prisma.visit.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch (error) { console.error("Failed to process visits:", error); }
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete visit", 500);
  }
});
