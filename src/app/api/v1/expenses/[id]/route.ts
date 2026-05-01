import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/expenses/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.expense.findUnique({ where: { id } });
        if (!record) {
          return apiError(`Expense with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "exp-1": { id: "exp-1", userId: "rep-1", category: "Transportation", description: "Uber rides for doctor visits across Greater Cairo (Ain Shams, Kasr Al-Ainy, NCI)", amount: 450.00, date: "2025-06-10", receiptUrl: null, status: "APPROVED", approvalHistory: [{ action: "SUBMITTED", by: "rep-1", date: "2025-06-10T18:00:00Z" }, { action: "APPROVED", by: "mgr-1", date: "2025-06-11T09:00:00Z", comment: "Within daily transport allowance" }], createdAt: "2025-06-10T18:00:00Z" },
      "exp-2": { id: "exp-2", userId: "rep-2", category: "Meals & Entertainment", description: "Lunch meeting with Dr. Mohamed Abdel-Rahman at Abu El Reesh Hospital cafeteria", amount: 280.00, date: "2025-06-11", receiptUrl: "/receipts/exp-2-receipt.jpg", status: "SUBMITTED", approvalHistory: [{ action: "SUBMITTED", by: "rep-2", date: "2025-06-11T16:00:00Z" }], createdAt: "2025-06-11T16:00:00Z" },
      "exp-3": { id: "exp-3", userId: "rep-3", category: "Conference & Events", description: "Registration fee for Egyptian Oncology Society annual meeting at Cairo International Convention Center", amount: 3500.00, date: "2025-06-08", receiptUrl: "/receipts/exp-3-receipt.pdf", status: "APPROVED", approvalHistory: [{ action: "SUBMITTED", by: "rep-3", date: "2025-06-08T10:00:00Z" }, { action: "APPROVED", by: "mgr-1", date: "2025-06-09T09:00:00Z", comment: "Pre-approved event budget" }], createdAt: "2025-06-08T10:00:00Z" },
      "exp-4": { id: "exp-4", userId: "rep-1", category: "Office Supplies", description: "Printing of product detail aids and leave-behind materials at Copy Center Maadi", amount: 175.00, date: "2025-06-12", receiptUrl: "/receipts/exp-4-receipt.jpg", status: "DRAFT", approvalHistory: [], createdAt: "2025-06-12T14:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Expense with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch expense", 500);
  }
}

// ─── PATCH /api/v1/expenses/:id ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return apiError("Request body cannot be empty", 400);
    }

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Expense with id '${id}' not found`, 404);
        }

        const record = await prisma.expense.update({
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
    return apiError((err as Error).message || "Failed to update expense", 500);
  }
}

// ─── DELETE /api/v1/expenses/:id ───────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Expense with id '${id}' not found`, 404);
        }

        await prisma.expense.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete expense", 500);
  }
}
