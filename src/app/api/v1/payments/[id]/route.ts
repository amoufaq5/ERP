import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updatePaymentSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/payments/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const record = await prisma.payment.findUnique({
          where: { id },
          include: { invoice: true, bill: true },
        });
        if (!record) return apiError("Payment not found", 404);
        return apiResponse(record);
      } catch {}
    }

    return apiError("Payment not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch payment", 500);
  }
}

// ─── PATCH /api/v1/payments/:id ────────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validate(updatePaymentSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.payment.findUnique({ where: { id } });
        if (!existing) return apiError("Payment not found", 404);

        if (body.date && typeof body.date === "string") {
          body.date = new Date(body.date);
        }
        if (body.amount !== undefined && body.amount !== null) {
          body.amount = parseFloat(body.amount);
        }
        if (body.type) body.type = body.type.toUpperCase();
        if (body.method) body.method = body.method.toUpperCase();

        const record = await prisma.payment.update({
          where: { id },
          data: body,
          include: { invoice: true, bill: true },
        });
        return apiResponse(record);
      } catch {}
    }

    return apiError("Payment not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update payment", 500);
  }
});

// ─── DELETE /api/v1/payments/:id ───────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const existing = await prisma.payment.findUnique({ where: { id } });
        if (!existing) return apiError("Payment not found", 404);

        await prisma.payment.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    return apiError("Payment not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete payment", 500);
  }
});
