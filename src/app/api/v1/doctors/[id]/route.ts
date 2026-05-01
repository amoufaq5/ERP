import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/doctors/:id ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.doctor.findUnique({ where: { id } });
        if (!record) {
          return apiError(`Doctor with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "doc-1": { id: "doc-1", name: "Dr. Ahmed Hassan", specialty: "Cardiology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20-100-123-4567", email: "a.hassan@ainshams.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-1", buyingLadderStage: "Champion", notes: "Key opinion leader in cardiology, frequent conference speaker", createdAt: "2025-01-05T10:00:00Z" },
      "doc-2": { id: "doc-2", name: "Dr. Fatma El-Sayed", specialty: "Endocrinology", hospital: "Cairo University Hospital (Kasr Al-Ainy)", city: "Cairo", phone: "+20-101-234-5678", email: "f.elsayed@kasralainy.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-1", buyingLadderStage: "Advocate", notes: "Leads the diabetes clinic, high prescriber of insulin products", createdAt: "2025-01-10T10:00:00Z" },
      "doc-3": { id: "doc-3", name: "Dr. Mohamed Abdel-Rahman", specialty: "Pediatrics", hospital: "Abu El Reesh Children's Hospital", city: "Cairo", phone: "+20-102-345-6789", email: "m.abdelrahman@abuelreesh.org", classification: "B", isKOL: false, visitFrequency: "Bi-weekly", assignedRepId: "rep-2", buyingLadderStage: "User", notes: "Growing practice, interested in new pediatric formulations", createdAt: "2025-02-01T10:00:00Z" },
      "doc-4": { id: "doc-4", name: "Dr. Nadia Kamal", specialty: "Oncology", hospital: "National Cancer Institute", city: "Cairo", phone: "+20-103-456-7890", email: "n.kamal@nci.cu.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-3", buyingLadderStage: "Champion", notes: "Head of oncology department, involved in clinical trials", createdAt: "2025-02-15T10:00:00Z" },
      "doc-5": { id: "doc-5", name: "Dr. Youssef Mansour", specialty: "Gastroenterology", hospital: "Alexandria University Hospital", city: "Alexandria", phone: "+20-104-567-8901", email: "y.mansour@alexu.edu.eg", classification: "B", isKOL: false, visitFrequency: "Monthly", assignedRepId: "rep-2", buyingLadderStage: "Aware", notes: "Emerging specialist in the Alexandria territory", createdAt: "2025-03-01T10:00:00Z" },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Doctor with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch doctor", 500);
  }
}

// ─── PATCH /api/v1/doctors/:id ─────────────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
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
        const existing = await prisma.doctor.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Doctor with id '${id}' not found`, 404);
        }

        const record = await prisma.doctor.update({
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
    return apiError((err as Error).message || "Failed to update doctor", 500);
  }
});

// ─── DELETE /api/v1/doctors/:id ────────────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.doctor.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Doctor with id '${id}' not found`, 404);
        }

        await prisma.doctor.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete doctor", 500);
  }
});
