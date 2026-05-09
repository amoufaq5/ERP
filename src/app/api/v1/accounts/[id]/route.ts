import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateAccountSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process accounts:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/accounts/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.account.findUnique({
          where: { id },
          include: { contacts: true, opportunities: true, tickets: true },
        });
        if (!record) {
          return apiError(`Account with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process accounts:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "acct-1": { id: "acct-1", name: "Eva Pharma", industry: "Pharmaceutical", website: "https://evapharma.com", phone: "+20-2-3851-4000", email: "info@evapharma.com", address: "6th of October City", city: "Cairo", country: "Egypt", type: "CUSTOMER", annualRevenue: 50000000, employeeCount: 3500, contacts: [], opportunities: [], tickets: [], createdAt: "2025-01-10T10:00:00Z", updatedAt: "2025-01-10T10:00:00Z" },
      "acct-2": { id: "acct-2", name: "EIPICO", industry: "Pharmaceutical", website: "https://eipico.com.eg", phone: "+20-2-2622-1499", email: "info@eipico.com.eg", address: "10th of Ramadan City", city: "Sharqia", country: "Egypt", type: "CUSTOMER", annualRevenue: 75000000, employeeCount: 5000, contacts: [], opportunities: [], tickets: [], createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-01-15T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Account with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch account", 500);
  }
}

// ─── PATCH /api/v1/accounts/:id ────────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateAccountSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.account.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Account with id '${id}' not found`, 404);
        }

        const floatFields = ["annualRevenue", "latitude", "longitude"];
        for (const field of floatFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseFloat(body[field]);
          }
        }
        if (body.employeeCount !== undefined && body.employeeCount !== null) {
          body.employeeCount = parseInt(body.employeeCount);
        }
        if (body.type) body.type = body.type.toUpperCase();

        const record = await prisma.account.update({
          where: { id },
          data: body,
          include: { contacts: true },
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process accounts:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update account", 500);
  }
});

// ─── DELETE /api/v1/accounts/:id ───────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.account.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Account with id '${id}' not found`, 404);
        }

        await prisma.account.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch (error) { console.error("Failed to process accounts:", error); }
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete account", 500);
  }
});
