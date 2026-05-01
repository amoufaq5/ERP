import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateStockMovementSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/stock-movements/:id ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.stockMovement.findUnique({
          where: { id },
          include: {
            product: { select: { id: true, name: true, sku: true, category: true } },
            warehouse: { select: { id: true, name: true, location: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });
        if (!record) {
          return apiError(`Stock movement with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "sm-1": { id: "sm-1", productId: "prod-1", productName: "Paracetamol 500mg", productSku: "PARA-500", warehouseId: "wh-1", type: "IN", quantity: 500, date: "2025-04-01T08:00:00Z", reference: "PO-2025-010", notes: "Received from supplier ChemSource Ltd", createdById: "user-1" },
      "sm-2": { id: "sm-2", productId: "prod-2", productName: "Amoxicillin 250mg", productSku: "AMOX-250", warehouseId: "wh-1", type: "OUT", quantity: 200, date: "2025-04-02T14:00:00Z", reference: "SO-2025-005", notes: "Shipped to Acme Pharma Inc.", createdById: "user-2" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Stock movement with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch stock movement", 500);
  }
}

// ─── PATCH /api/v1/stock-movements/:id ─────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateStockMovementSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;

    if (prisma) {
      try {
        const existing = await prisma.stockMovement.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Stock movement with id '${id}' not found`, 404);
        }

        if (body.date && typeof body.date === "string") {
          body.date = new Date(body.date);
        }
        if (body.quantity !== undefined && body.quantity !== null) {
          body.quantity = parseInt(body.quantity);
        }
        if (body.type) body.type = body.type.toUpperCase();

        const record = await prisma.stockMovement.update({
          where: { id },
          data: body,
          include: {
            product: { select: { id: true, name: true, sku: true } },
            warehouse: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update stock movement", 500);
  }
}

// ─── DELETE /api/v1/stock-movements/:id ────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.stockMovement.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Stock movement with id '${id}' not found`, 404);
        }

        await prisma.stockMovement.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete stock movement", 500);
  }
}
