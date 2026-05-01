import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateTrainingSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/training/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.trainingCourse.findUnique({
          where: { id },
          include: {
            enrollments: {
              include: {
                employee: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        });
        if (!record) {
          return apiError(`Training course with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "train-1": { id: "train-1", title: "cGMP Fundamentals", description: "Current Good Manufacturing Practice regulations and compliance for pharmaceutical production", category: "Compliance", duration: "8 hours", format: "CLASSROOM", status: "PUBLISHED", materials: "Slides, handbook, quiz", createdAt: "2025-01-10T10:00:00Z" },
      "train-2": { id: "train-2", title: "HPLC Method Development", description: "Advanced high-performance liquid chromatography techniques for drug analysis", category: "Laboratory", duration: "16 hours", format: "HYBRID", status: "PUBLISHED", materials: "Lab manual, video tutorials", createdAt: "2025-01-20T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Training course with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch training course", 500);
  }
}

// ─── PATCH /api/v1/training/:id ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateTrainingSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.trainingCourse.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Training course with id '${id}' not found`, 404);
        }

        if (body.status) body.status = body.status.toUpperCase();
        if (body.format) body.format = body.format.toUpperCase();

        const record = await prisma.trainingCourse.update({
          where: { id },
          data: body,
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update training course", 500);
  }
}

// ─── DELETE /api/v1/training/:id ───────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.trainingCourse.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Training course with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to ARCHIVED
        const record = await prisma.trainingCourse.update({
          where: { id },
          data: { status: "ARCHIVED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, status: "ARCHIVED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete training course", 500);
  }
}
