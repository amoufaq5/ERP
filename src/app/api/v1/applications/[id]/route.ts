import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/applications/:id ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.application.findUnique({
          where: { id },
          include: {
            candidate: true,
            job: {
              include: {
                department: { select: { id: true, name: true } },
              },
            },
            interviews: true,
            offerLetter: true,
          },
        });
        if (!record) {
          return apiError(`Application with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "app-1": { id: "app-1", candidateId: "cand-1", candidateName: "Emily Chen", jobId: "job-1", jobTitle: "Senior Pharmaceutical Scientist", status: "INTERVIEW", appliedDate: "2025-03-16T10:00:00Z", coverLetter: "Experienced in oral solid dosage formulation at Pfizer", score: 85, createdAt: "2025-03-16T10:00:00Z" },
      "app-2": { id: "app-2", candidateId: "cand-2", candidateName: "James Okafor", jobId: "job-2", jobTitle: "Quality Control Analyst", status: "SCREENING", appliedDate: "2025-03-21T10:00:00Z", coverLetter: "QC analyst with 4 years of cGMP lab experience", score: 72, createdAt: "2025-03-21T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Application with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch application", 500);
  }
}

// ─── PATCH /api/v1/applications/:id ────────────────────────────────────────

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
        const existing = await prisma.application.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Application with id '${id}' not found`, 404);
        }

        if (body.appliedDate && typeof body.appliedDate === "string") {
          body.appliedDate = new Date(body.appliedDate);
        }
        if (body.score !== undefined && body.score !== null) {
          body.score = parseInt(body.score);
        }
        if (body.status) body.status = body.status.toUpperCase();

        const record = await prisma.application.update({
          where: { id },
          data: body,
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            job: { select: { id: true, title: true } },
          },
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update application", 500);
  }
}

// ─── DELETE /api/v1/applications/:id ───────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.application.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Application with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to REJECTED
        const record = await prisma.application.update({
          where: { id },
          data: { status: "REJECTED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, status: "REJECTED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete application", 500);
  }
}
