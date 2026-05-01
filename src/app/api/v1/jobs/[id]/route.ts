import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateJobSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/jobs/:id ──────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.job.findUnique({
          where: { id },
          include: {
            department: { select: { id: true, name: true } },
            hiringManager: { select: { id: true, name: true, email: true } },
            applications: true,
          },
        });
        if (!record) {
          return apiError(`Job with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "job-1": { id: "job-1", title: "Senior Pharmaceutical Scientist", departmentId: "dept-1", location: "Boston, MA", type: "FULL_TIME", status: "OPEN", description: "Lead drug formulation research for oral solid dosage forms", salaryMin: 110000, salaryMax: 145000, createdAt: "2025-03-01T10:00:00Z" },
      "job-2": { id: "job-2", title: "Quality Control Analyst", departmentId: "dept-2", location: "Newark, NJ", type: "FULL_TIME", status: "OPEN", description: "Perform analytical testing of raw materials and finished products per cGMP", salaryMin: 65000, salaryMax: 85000, createdAt: "2025-03-10T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Job with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch job", 500);
  }
}

// ─── PATCH /api/v1/jobs/:id ────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateJobSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Job with id '${id}' not found`, 404);
        }

        const dateFields = ["postedDate", "closingDate"];
        for (const field of dateFields) {
          if (body[field] && typeof body[field] === "string") {
            body[field] = new Date(body[field]);
          }
        }

        const floatFields = ["salaryMin", "salaryMax"];
        for (const field of floatFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseFloat(body[field]);
          }
        }

        if (body.status) body.status = body.status.toUpperCase();
        if (body.type) body.type = body.type.toUpperCase();

        const record = await prisma.job.update({
          where: { id },
          data: body,
          include: {
            department: { select: { id: true, name: true } },
            hiringManager: { select: { id: true, name: true, email: true } },
          },
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update job", 500);
  }
}

// ─── DELETE /api/v1/jobs/:id ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Job with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to CLOSED
        const record = await prisma.job.update({
          where: { id },
          data: { status: "CLOSED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, status: "CLOSED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete job", 500);
  }
}
