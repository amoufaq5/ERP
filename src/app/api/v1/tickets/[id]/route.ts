import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateTicketSchema } from "@/lib/api/validations";
import { withAuthAndTenantParams } from "@/lib/api/with-tenant";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/tickets/:id ───────────────────────────────────────────────

export const GET = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    { db, tenantId }) => {
  const { id } = await params;

  try {
    const record = await db.ticket.findFirst({
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

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch ticket", 500);
  }
});

// ─── PATCH /api/v1/tickets/:id ─────────────────────────────────────────────

export const PATCH = withAuthAndTenantParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateTicketSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;
    delete body.ticketNumber;

    const existing = await db.ticket.findFirst({ where: { id } });
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

    const record = await db.ticket.update({
      where: { id },
      data: body,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return apiResponse(record);

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update ticket", 500);
  }
});

// ─── DELETE /api/v1/tickets/:id ────────────────────────────────────────────

export const DELETE = withAuthAndTenantParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { db, tenantId, role, userId }) => {
  const { id } = await params;

  try {
    const existing = await db.ticket.findFirst({ where: { id } });
    if (!existing) {
      return apiError(`Ticket with id '${id}' not found`, 404);
    }

    // Soft-delete by setting status to CLOSED
    const record = await db.ticket.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    return apiResponse({ ...record, _softDeleted: true });

  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete ticket", 500);
  }
});
