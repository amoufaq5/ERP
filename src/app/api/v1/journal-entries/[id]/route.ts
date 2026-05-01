import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateJournalEntrySchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/journal-entries/:id ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const record = await prisma.journalEntry.findUnique({
          where: { id },
          include: {
            lines: { include: { account: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });
        if (!record) return apiError("Journal entry not found", 404);
        return apiResponse(record);
      } catch {}
    }

    return apiError("Journal entry not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch journal entry", 500);
  }
}

// ─── PATCH /api/v1/journal-entries/:id ─────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validate(updateJournalEntrySchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.journalEntry.findUnique({ where: { id } });
        if (!existing) return apiError("Journal entry not found", 404);

        if (body.date && typeof body.date === "string") {
          body.date = new Date(body.date);
        }
        if (body.status) body.status = body.status.toUpperCase();

        // Handle lines update separately
        const lines = body.lines;
        delete body.lines;

        const data: Record<string, unknown> = { ...body };

        if (lines && Array.isArray(lines)) {
          // Delete existing lines and recreate
          await prisma.journalEntryLine.deleteMany({ where: { journalEntryId: id } });
          data.lines = {
            create: lines.map((line: any) => ({
              accountId: line.accountId,
              debit: parseFloat(line.debit || "0"),
              credit: parseFloat(line.credit || "0"),
              description: line.description || null,
            })),
          };
        }

        const record = await prisma.journalEntry.update({
          where: { id },
          data,
          include: {
            lines: { include: { account: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });
        return apiResponse(record);
      } catch {}
    }

    return apiError("Journal entry not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update journal entry", 500);
  }
});

// ─── DELETE /api/v1/journal-entries/:id ────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  try {
    const { id } = await params;

    if (prisma) {
      try {
        const existing = await prisma.journalEntry.findUnique({ where: { id } });
        if (!existing) return apiError("Journal entry not found", 404);

        // Soft-delete by voiding
        const record = await prisma.journalEntry.update({
          where: { id },
          data: { status: "VOID" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    return apiError("Journal entry not found", 404);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete journal entry", 500);
  }
});
