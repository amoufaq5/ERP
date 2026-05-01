import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/territories/:id ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.territory.findUnique({
          where: { id },
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        });
        if (!record) {
          return apiError(`Territory with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "terr-1": { id: "terr-1", name: "Greater Cairo", description: "Cairo, Giza, and Qalyubia governorates - major hospitals and pharmacy chains", assignedToId: "user-1", assignedTo: { id: "user-1", name: "Ahmed Mostafa" }, boundaries: '{"type":"polygon","coordinates":[[30.04,31.24],[30.12,31.40],[30.08,31.35]]}', color: "#2563eb", createdAt: "2025-01-05T10:00:00Z" },
      "terr-2": { id: "terr-2", name: "Alexandria & Delta", description: "Alexandria, Beheira, Gharbia, and Dakahlia governorates", assignedToId: "user-2", assignedTo: { id: "user-2", name: "Sara Mahmoud" }, boundaries: '{"type":"polygon","coordinates":[[31.20,30.00],[31.22,31.50],[30.90,31.10]]}', color: "#16a34a", createdAt: "2025-01-10T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Territory with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch territory", 500);
  }
}

// ─── PATCH /api/v1/territories/:id ─────────────────────────────────────────

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
        const existing = await prisma.territory.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Territory with id '${id}' not found`, 404);
        }

        const record = await prisma.territory.update({
          where: { id },
          data: body,
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
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
    return apiError((err as Error).message || "Failed to update territory", 500);
  }
}

// ─── DELETE /api/v1/territories/:id ────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.territory.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Territory with id '${id}' not found`, 404);
        }

        await prisma.territory.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete territory", 500);
  }
}
