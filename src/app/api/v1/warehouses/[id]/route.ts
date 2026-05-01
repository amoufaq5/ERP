import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateWarehouseSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/warehouses/:id ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.warehouse.findUnique({
          where: { id },
          include: {
            manager: { select: { id: true, name: true, email: true } },
            stockMovements: {
              take: 20,
              orderBy: { date: "desc" },
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        });
        if (!record) {
          return apiError(`Warehouse with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "wh-1": { id: "wh-1", name: "Primary Distribution Center", location: "Newark, NJ", capacity: 50000, managerId: "user-1", createdAt: "2024-01-15T10:00:00Z" },
      "wh-2": { id: "wh-2", name: "Cold Chain Storage Facility", location: "Indianapolis, IN", capacity: 15000, managerId: "user-2", createdAt: "2024-03-20T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Warehouse with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch warehouse", 500);
  }
}

// ─── PATCH /api/v1/warehouses/:id ──────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateWarehouseSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.warehouse.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Warehouse with id '${id}' not found`, 404);
        }

        if (body.capacity !== undefined && body.capacity !== null) {
          body.capacity = parseInt(body.capacity);
        }

        const record = await prisma.warehouse.update({
          where: { id },
          data: body,
          include: { manager: { select: { id: true, name: true, email: true } } },
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update warehouse", 500);
  }
});

// ─── DELETE /api/v1/warehouses/:id ─────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.warehouse.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Warehouse with id '${id}' not found`, 404);
        }

        await prisma.warehouse.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete warehouse", 500);
  }
});
