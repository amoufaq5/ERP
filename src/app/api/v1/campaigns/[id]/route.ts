import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateCampaignSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/campaigns/:id ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.campaign.findUnique({
          where: { id },
        });
        if (!record) {
          return apiError(`Campaign with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "camp-1": { id: "camp-1", name: "Egypt Pharma Conference 2025", type: "EVENT", status: "COMPLETED", startDate: "2025-02-15", endDate: "2025-02-17", budget: 50000, spent: 47500, expectedRevenue: 200000, actualRevenue: 185000, leads: 120, conversions: 18, createdAt: "2025-01-05T10:00:00Z" },
      "camp-2": { id: "camp-2", name: "Antibiotic Awareness Campaign", type: "CONTENT", status: "ACTIVE", startDate: "2025-03-01", endDate: "2025-05-31", budget: 15000, spent: 8200, expectedRevenue: 75000, actualRevenue: 32000, leads: 65, conversions: 8, createdAt: "2025-02-20T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Campaign with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch campaign", 500);
  }
}

// ─── PATCH /api/v1/campaigns/:id ───────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateCampaignSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.campaign.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Campaign with id '${id}' not found`, 404);
        }

        const floatFields = ["budget", "spent", "expectedRevenue", "actualRevenue"];
        for (const field of floatFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseFloat(body[field]);
          }
        }
        const intFields = ["leads", "conversions"];
        for (const field of intFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseInt(body[field]);
          }
        }
        const dateFields = ["startDate", "endDate"];
        for (const field of dateFields) {
          if (body[field] && typeof body[field] === "string") {
            body[field] = new Date(body[field]);
          }
        }
        if (body.type) body.type = body.type.toUpperCase();
        if (body.status) body.status = body.status.toUpperCase();

        const record = await prisma.campaign.update({
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
    return apiError((err as Error).message || "Failed to update campaign", 500);
  }
});

// ─── DELETE /api/v1/campaigns/:id ──────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.campaign.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Campaign with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to COMPLETED
        const record = await prisma.campaign.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, status: "COMPLETED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete campaign", 500);
  }
});
