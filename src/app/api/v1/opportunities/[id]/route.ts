import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateOpportunitySchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process opportunities:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/opportunities/:id ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.opportunity.findUnique({
          where: { id },
          include: {
            account: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            lead: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        if (!record) {
          return apiError(`Opportunity with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process opportunities:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "opp-1": { id: "opp-1", title: "Eva Pharma - Annual Supply Contract", accountId: "acct-1", account: { id: "acct-1", name: "Eva Pharma" }, contactId: "cont-1", contact: { id: "cont-1", firstName: "Dr. Ahmed", lastName: "El-Sayed" }, stage: "NEGOTIATION", value: 250000, probability: 75, expectedCloseDate: "2025-06-30", notes: "Renewal of annual antibiotics supply agreement", createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-03-01T10:00:00Z" },
      "opp-2": { id: "opp-2", title: "EIPICO - OTC Product Line Distribution", accountId: "acct-2", account: { id: "acct-2", name: "EIPICO" }, contactId: "cont-3", contact: { id: "cont-3", firstName: "Dr. Mohamed", lastName: "Kamal" }, stage: "PROPOSAL", value: 180000, probability: 60, expectedCloseDate: "2025-07-15", notes: "Distribution deal for new OTC product line", createdAt: "2025-02-01T10:00:00Z", updatedAt: "2025-03-10T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Opportunity with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch opportunity", 500);
  }
}

// ─── PATCH /api/v1/opportunities/:id ───────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateOpportunitySchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.opportunity.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Opportunity with id '${id}' not found`, 404);
        }

        if (body.value !== undefined && body.value !== null) {
          body.value = parseFloat(body.value);
        }
        if (body.probability !== undefined && body.probability !== null) {
          body.probability = parseInt(body.probability);
        }
        if (body.expectedCloseDate && typeof body.expectedCloseDate === "string") {
          body.expectedCloseDate = new Date(body.expectedCloseDate);
        }
        if (body.stage) body.stage = body.stage.toUpperCase();

        const record = await prisma.opportunity.update({
          where: { id },
          data: body,
          include: {
            account: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process opportunities:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update opportunity", 500);
  }
});

// ─── DELETE /api/v1/opportunities/:id ──────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.opportunity.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Opportunity with id '${id}' not found`, 404);
        }

        // Soft-delete by setting stage to CLOSED_LOST
        const record = await prisma.opportunity.update({
          where: { id },
          data: { stage: "CLOSED_LOST" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch (error) { console.error("Failed to process opportunities:", error); }
    }

    // Mock fallback
    return apiResponse({ id, stage: "CLOSED_LOST", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete opportunity", 500);
  }
});
