import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateSupplierSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/suppliers/:id ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const record = await prisma.supplier.findUnique({
          where: { id },
          include: { bills: true, purchaseOrders: true, contracts: true },
        });
        if (!record) return apiError("Supplier not found", 404);
        return apiResponse(record);
      } catch {}
    }

    return apiError("Supplier not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch supplier", 500);
  }
}

// ─── PATCH /api/v1/suppliers/:id ───────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validate(updateSupplierSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.supplier.findUnique({ where: { id } });
        if (!existing) return apiError("Supplier not found", 404);

        if (body.rating !== undefined && body.rating !== null) {
          body.rating = parseFloat(body.rating);
        }
        if (body.status) body.status = body.status.toUpperCase();

        const record = await prisma.supplier.update({
          where: { id },
          data: body,
        });
        return apiResponse(record);
      } catch {}
    }

    return apiError("Supplier not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update supplier", 500);
  }
}

// ─── DELETE /api/v1/suppliers/:id ──────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const existing = await prisma.supplier.findUnique({ where: { id } });
        if (!existing) return apiError("Supplier not found", 404);

        // Soft-delete by setting status to INACTIVE
        const record = await prisma.supplier.update({
          where: { id },
          data: { status: "INACTIVE" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    return apiError("Supplier not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete supplier", 500);
  }
}
