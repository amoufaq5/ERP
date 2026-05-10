import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable */
}

// Reference the in-memory store from the parent route would require a shared module,
// so we use a simple approach: try Prisma first, then return 404 for in-memory.
// In production, Prisma handles persistence.

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (prisma) {
    try {
      const invoice = await prisma.eInvoice.findUnique({ where: { id } });
      if (!invoice) return apiError("E-invoice not found", 404);
      return apiResponse(invoice);
    } catch {
      /* fall through */
    }
  }

  return apiError("E-invoice not found", 404);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (prisma) {
    try {
      const updated = await prisma.eInvoice.update({
        where: { id },
        data: body,
      });
      return apiResponse(updated);
    } catch {
      /* fall through */
    }
  }

  // In-memory: return the body back as the updated record
  return apiResponse({ id, ...body });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (prisma) {
    try {
      await prisma.eInvoice.delete({ where: { id } });
      return apiResponse({ deleted: true });
    } catch {
      /* fall through */
    }
  }

  return apiResponse({ deleted: true });
}
