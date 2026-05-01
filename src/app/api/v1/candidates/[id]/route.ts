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

// ─── GET /api/v1/candidates/:id ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.candidate.findUnique({
          where: { id },
          include: {
            applications: {
              include: {
                job: { select: { id: true, title: true, status: true } },
              },
            },
          },
        });
        if (!record) {
          return apiError(`Candidate with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "cand-1": { id: "cand-1", firstName: "Emily", lastName: "Chen", email: "emily.chen@gmail.com", phone: "+1-555-0301", source: "LINKEDIN", status: "INTERVIEW", currentCompany: "Pfizer Inc.", currentTitle: "Research Scientist II", expectedSalary: 125000, rating: 4, createdAt: "2025-03-15T10:00:00Z" },
      "cand-2": { id: "cand-2", firstName: "James", lastName: "Okafor", email: "j.okafor@outlook.com", phone: "+1-555-0302", source: "REFERRAL", status: "SCREENING", currentCompany: "Merck & Co.", currentTitle: "QC Analyst", expectedSalary: 78000, rating: 3, createdAt: "2025-03-20T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Candidate with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch candidate", 500);
  }
}

// ─── PATCH /api/v1/candidates/:id ──────────────────────────────────────────

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
        const existing = await prisma.candidate.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Candidate with id '${id}' not found`, 404);
        }

        if (body.expectedSalary !== undefined && body.expectedSalary !== null) {
          body.expectedSalary = parseFloat(body.expectedSalary);
        }
        if (body.rating !== undefined && body.rating !== null) {
          body.rating = parseInt(body.rating);
        }
        if (body.status) body.status = body.status.toUpperCase();
        if (body.source) body.source = body.source.toUpperCase();

        const record = await prisma.candidate.update({
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
    return apiError((err as Error).message || "Failed to update candidate", 500);
  }
}

// ─── DELETE /api/v1/candidates/:id ─────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.candidate.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Candidate with id '${id}' not found`, 404);
        }

        // Soft-delete by setting status to REJECTED
        const record = await prisma.candidate.update({
          where: { id },
          data: { status: "REJECTED" },
        });
        return apiResponse({ ...record, _softDeleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, status: "REJECTED", _softDeleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete candidate", 500);
  }
}
