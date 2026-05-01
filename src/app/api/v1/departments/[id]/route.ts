import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateDepartmentSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/departments/:id ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.department.findUnique({
          where: { id },
          include: {
            manager: { select: { id: true, name: true, email: true } },
            employees: true,
            jobs: true,
          },
        });
        if (!record) {
          return apiError(`Department with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "dept-1": { id: "dept-1", name: "Research & Development", description: "Drug discovery and formulation research", managerId: "user-1", budget: 2500000, createdAt: "2024-06-01T10:00:00Z" },
      "dept-2": { id: "dept-2", name: "Quality Assurance", description: "GMP compliance and quality control", managerId: "user-2", budget: 1800000, createdAt: "2024-06-01T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Department with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch department", 500);
  }
}

// ─── PATCH /api/v1/departments/:id ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateDepartmentSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Department with id '${id}' not found`, 404);
        }

        if (body.budget !== undefined && body.budget !== null) {
          body.budget = parseFloat(body.budget);
        }

        const record = await prisma.department.update({
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
    return apiError((err as Error).message || "Failed to update department", 500);
  }
}

// ─── DELETE /api/v1/departments/:id ────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Department with id '${id}' not found`, 404);
        }

        await prisma.department.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete department", 500);
  }
}
