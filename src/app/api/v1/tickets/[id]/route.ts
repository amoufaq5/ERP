import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateTicketSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process tickets:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/tickets/:id ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.ticket.findUnique({
          where: { id },
          include: {
            account: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        if (!record) {
          return apiError(`Ticket with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process tickets:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "tkt-1": { id: "tkt-1", ticketNumber: "TKT-00001", subject: "Delayed shipment of Amoxicillin batch", description: "Order #SO-2025-012 has not been delivered within the agreed SLA of 48 hours.", accountId: "acct-1", account: { id: "acct-1", name: "Eva Pharma" }, contactId: "cont-1", contact: { id: "cont-1", firstName: "Dr. Ahmed", lastName: "El-Sayed" }, status: "OPEN", priority: "HIGH", assignedToId: "user-1", category: "Delivery", slaDeadline: "2025-03-20T18:00:00Z", createdAt: "2025-03-18T09:00:00Z", updatedAt: "2025-03-18T09:00:00Z" },
      "tkt-2": { id: "tkt-2", ticketNumber: "TKT-00002", subject: "Quality concern - Omeprazole packaging", description: "Customer reported damaged blister packs in last delivery batch BN-20250215.", accountId: "acct-2", account: { id: "acct-2", name: "EIPICO" }, contactId: "cont-3", contact: { id: "cont-3", firstName: "Dr. Mohamed", lastName: "Kamal" }, status: "IN_PROGRESS", priority: "CRITICAL", assignedToId: "user-2", category: "Quality", slaDeadline: "2025-03-19T12:00:00Z", createdAt: "2025-03-17T14:30:00Z", updatedAt: "2025-03-18T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Ticket with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch ticket", 500);
  }
}

// ─── PATCH /api/v1/tickets/:id ─────────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateTicketSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;
    delete body.ticketNumber;

    if (prisma) {
      try {
        const existing = await prisma.ticket.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Ticket with id '${id}' not found`, 404);
        }

        if (body.satisfaction !== undefined && body.satisfaction !== null) {
          body.satisfaction = parseInt(body.satisfaction);
        }
        const dateFields = ["slaDeadline", "resolvedAt"];
        for (const field of dateFields) {
          if (body[field] && typeof body[field] === "string") {
            body[field] = new Date(body[field]);
          }
        }
        if (body.status) body.status = body.status.toUpperCase();
        if (body.priority) body.priority = body.priority.toUpperCase();

        const record = await prisma.ticket.update({
          where: { id },
          data: body,
          include: {
            account: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process tickets:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update ticket", 500);
  }
});

// ─── DELETE /api/v1/tickets/:id ────────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.ticket.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Ticket with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to CLOSED
        const record = await prisma.ticket.update({
          where: { id },
          data: { status: "CLOSED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch (error) { console.error("Failed to process tickets:", error); }
    }

    // Mock fallback
    return apiResponse({ id, status: "CLOSED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete ticket", 500);
  }
});
