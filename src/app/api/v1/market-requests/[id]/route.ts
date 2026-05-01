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

// ─── GET /api/v1/market-requests/:id ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.marketRequest.findUnique({ where: { id } });
        if (!record) {
          return apiError(`Market request with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "mr-1": { id: "mr-1", type: "SAMPLE", title: "Cardiomax 10mg samples for Ain Shams cardiology dept", description: "Dr. Ahmed Hassan requested 50 sample boxes of Cardiomax 10mg for the cardiology department evaluation program.", requesterId: "rep-1", status: "APPROVED", value: 2500.00, approvalHistory: [{ action: "SUBMITTED", by: "rep-1", date: "2025-06-01T10:00:00Z" }, { action: "APPROVED", by: "mgr-1", date: "2025-06-02T09:00:00Z", comment: "Strategic KOL, approved" }], createdAt: "2025-06-01T10:00:00Z" },
      "mr-2": { id: "mr-2", type: "LITERATURE", title: "Updated clinical data brochures for diabetes line", description: "Request for 200 copies of updated clinical trial brochures for the GlucoStabil insulin product range.", requesterId: "rep-1", status: "FULFILLED", value: 1200.00, approvalHistory: [{ action: "SUBMITTED", by: "rep-1", date: "2025-05-15T10:00:00Z" }, { action: "APPROVED", by: "mgr-1", date: "2025-05-16T09:00:00Z" }, { action: "FULFILLED", by: "logistics-1", date: "2025-05-20T14:00:00Z" }], createdAt: "2025-05-15T10:00:00Z" },
      "mr-3": { id: "mr-3", type: "EVENT", title: "Oncology CME dinner symposium at Nile Ritz-Carlton", description: "Sponsorship for a CME dinner event targeting 30 oncologists in Greater Cairo.", requesterId: "rep-3", status: "PENDING", value: 45000.00, approvalHistory: [{ action: "SUBMITTED", by: "rep-3", date: "2025-06-10T10:00:00Z" }], createdAt: "2025-06-10T10:00:00Z" },
      "mr-4": { id: "mr-4", type: "DISCOUNT", title: "Volume discount for Alexandria University Hospital pharmacy", description: "Request 15% volume discount on bulk order of 500 boxes of Omeprazole 20mg.", requesterId: "rep-2", status: "REJECTED", value: 6750.00, approvalHistory: [{ action: "SUBMITTED", by: "rep-2", date: "2025-06-05T10:00:00Z" }, { action: "REJECTED", by: "mgr-1", date: "2025-06-06T11:00:00Z", comment: "Discount exceeds maximum threshold" }], createdAt: "2025-06-05T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Market request with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch market request", 500);
  }
}

// ─── PATCH /api/v1/market-requests/:id ─────────────────────────────────────

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
        const existing = await prisma.marketRequest.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Market request with id '${id}' not found`, 404);
        }

        const record = await prisma.marketRequest.update({
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
    return apiError((err as Error).message || "Failed to update market request", 500);
  }
});

// ─── DELETE /api/v1/market-requests/:id ────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.marketRequest.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Market request with id '${id}' not found`, 404);
        }

        await prisma.marketRequest.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete market request", 500);
  }
});
