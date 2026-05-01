import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateGlAccountSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/gl-accounts/:id ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const record = await prisma.chartOfAccount.findUnique({
          where: { id },
          include: { children: true, parent: true, journalLines: true },
        });
        if (!record) return apiError("GL account not found", 404);
        return apiResponse(record);
      } catch {}
    }

    return apiError("GL account not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch GL account", 500);
  }
}

// ─── PATCH /api/v1/gl-accounts/:id ─────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validate(updateGlAccountSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.chartOfAccount.findUnique({ where: { id } });
        if (!existing) return apiError("GL account not found", 404);

        if (body.balance !== undefined && body.balance !== null) {
          body.balance = parseFloat(body.balance);
        }
        if (body.type) body.type = body.type.toUpperCase();

        const record = await prisma.chartOfAccount.update({
          where: { id },
          data: body,
          include: { children: true, parent: true },
        });
        return apiResponse(record);
      } catch {}
    }

    return apiError("GL account not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update GL account", 500);
  }
});

// ─── DELETE /api/v1/gl-accounts/:id ────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const existing = await prisma.chartOfAccount.findUnique({ where: { id } });
        if (!existing) return apiError("GL account not found", 404);

        // Soft-delete by deactivating
        const record = await prisma.chartOfAccount.update({
          where: { id },
          data: { isActive: false },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    return apiError("GL account not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete GL account", 500);
  }
});
