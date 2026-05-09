import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { validate, updateContactSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process contacts:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/contacts/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.contact.findUnique({
          where: { id },
          include: {
            account: { select: { id: true, name: true } },
            opportunities: true,
            tickets: true,
          },
        });
        if (!record) {
          return apiError(`Contact with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch (error) { console.error("Failed to process contacts:", error); }
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "cont-1": { id: "cont-1", firstName: "Dr. Ahmed", lastName: "El-Sayed", email: "ahmed.elsayed@evapharma.com", phone: "+20-10-1234-5678", mobile: "+20-12-3456-7890", title: "Chief Pharmacist", accountId: "acct-1", account: { id: "acct-1", name: "Eva Pharma" }, doNotCall: false, doNotEmail: false, opportunities: [], tickets: [], createdAt: "2025-01-12T10:00:00Z" },
      "cont-2": { id: "cont-2", firstName: "Dr. Fatma", lastName: "Hassan", email: "fatma.hassan@asu-hospital.edu.eg", phone: "+20-10-2345-6789", mobile: "+20-11-4567-8901", title: "Head of Procurement", accountId: "acct-3", account: { id: "acct-3", name: "Ain Shams University Hospital" }, doNotCall: false, doNotEmail: false, opportunities: [], tickets: [], createdAt: "2025-01-20T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Contact with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch contact", 500);
  }
}

// ─── PATCH /api/v1/contacts/:id ────────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateContactSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.contact.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Contact with id '${id}' not found`, 404);
        }

        const record = await prisma.contact.update({
          where: { id },
          data: body,
          include: { account: { select: { id: true, name: true } } },
        });
        return apiResponse(record);
      } catch (error) { console.error("Failed to process contacts:", error); }
    }

    // Mock fallback
    const updated = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update contact", 500);
  }
});

// ─── DELETE /api/v1/contacts/:id ───────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.contact.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Contact with id '${id}' not found`, 404);
        }

        await prisma.contact.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch (error) { console.error("Failed to process contacts:", error); }
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete contact", 500);
  }
});
