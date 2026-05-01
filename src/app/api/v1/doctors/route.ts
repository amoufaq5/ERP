import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  validateRequiredFields,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/doctors ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const specialty = params.get("specialty");
    const city = params.get("city");
    const classification = params.get("classification");
    const isKOL = params.get("isKOL");
    const assignedRepId = params.get("assignedRepId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (specialty) where.specialty = specialty;
        if (city) where.city = city;
        if (classification) where.classification = classification.toUpperCase();
        if (isKOL) where.isKOL = isKOL === "true";
        if (assignedRepId) where.assignedRepId = assignedRepId;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { specialty: { contains: search } },
            { hospital: { contains: search } },
            { city: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.doctor.count({ where }),
          prisma.doctor.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
          }),
        ]);

        const totalPages = Math.ceil(total / Math.min(limit, 100));
        return apiResponse(records, 200, {
          page: Math.max(1, page),
          limit: Math.min(limit, 100),
          total,
          totalPages,
        });
      } catch {}
    }

    const mock = generateMockDoctors();
    let filtered = filterBySearch(mock, search, ["name", "specialty", "hospital", "city"]);
    if (specialty) filtered = filtered.filter((d) => d.specialty === specialty);
    if (city) filtered = filtered.filter((d) => d.city === city);
    if (classification) filtered = filtered.filter((d) => d.classification === classification.toUpperCase());
    if (isKOL) filtered = filtered.filter((d) => d.isKOL === (isKOL === "true"));
    if (assignedRepId) filtered = filtered.filter((d) => d.assignedRepId === assignedRepId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch doctors", 500);
  }
}

// ─── POST /api/v1/doctors ──────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["name", "specialty"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.doctor.create({
          data: {
            name: body.name,
            specialty: body.specialty,
            hospital: body.hospital || null,
            city: body.city || null,
            phone: body.phone || null,
            email: body.email || null,
            classification: (body.classification || "C").toUpperCase(),
            isKOL: body.isKOL ?? false,
            visitFrequency: body.visitFrequency || null,
            assignedRepId: body.assignedRepId || null,
            buyingLadderStage: body.buyingLadderStage || null,
            notes: body.notes || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `doc-${Date.now()}`,
      ...body,
      classification: (body.classification || "C").toUpperCase(),
      isKOL: body.isKOL ?? false,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create doctor", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockDoctors() {
  return [
    { id: "doc-1", name: "Dr. Ahmed Hassan", specialty: "Cardiology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20-100-123-4567", email: "a.hassan@ainshams.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-1", buyingLadderStage: "Champion", notes: "Key opinion leader in cardiology, frequent conference speaker", createdAt: "2025-01-05T10:00:00Z" },
    { id: "doc-2", name: "Dr. Fatma El-Sayed", specialty: "Endocrinology", hospital: "Cairo University Hospital (Kasr Al-Ainy)", city: "Cairo", phone: "+20-101-234-5678", email: "f.elsayed@kasralainy.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-1", buyingLadderStage: "Advocate", notes: "Leads the diabetes clinic, high prescriber of insulin products", createdAt: "2025-01-10T10:00:00Z" },
    { id: "doc-3", name: "Dr. Mohamed Abdel-Rahman", specialty: "Pediatrics", hospital: "Abu El Reesh Children's Hospital", city: "Cairo", phone: "+20-102-345-6789", email: "m.abdelrahman@abuelreesh.org", classification: "B", isKOL: false, visitFrequency: "Bi-weekly", assignedRepId: "rep-2", buyingLadderStage: "User", notes: "Growing practice, interested in new pediatric formulations", createdAt: "2025-02-01T10:00:00Z" },
    { id: "doc-4", name: "Dr. Nadia Kamal", specialty: "Oncology", hospital: "National Cancer Institute", city: "Cairo", phone: "+20-103-456-7890", email: "n.kamal@nci.cu.edu.eg", classification: "A", isKOL: true, visitFrequency: "Weekly", assignedRepId: "rep-3", buyingLadderStage: "Champion", notes: "Head of oncology department, involved in clinical trials", createdAt: "2025-02-15T10:00:00Z" },
    { id: "doc-5", name: "Dr. Youssef Mansour", specialty: "Gastroenterology", hospital: "Alexandria University Hospital", city: "Alexandria", phone: "+20-104-567-8901", email: "y.mansour@alexu.edu.eg", classification: "B", isKOL: false, visitFrequency: "Monthly", assignedRepId: "rep-2", buyingLadderStage: "Aware", notes: "Emerging specialist in the Alexandria territory", createdAt: "2025-03-01T10:00:00Z" },
  ];
}
