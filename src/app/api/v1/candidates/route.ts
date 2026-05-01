import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createCandidateSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/candidates ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const source = params.get("source");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (source) where.source = source.toUpperCase();
        if (search) {
          where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { currentCompany: { contains: search } },
            { currentTitle: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.candidate.count({ where }),
          prisma.candidate.findMany({
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

    const mock = generateMockCandidates();
    let filtered = filterBySearch(mock, search, ["firstName", "lastName", "email", "currentCompany", "currentTitle"]);
    if (status) filtered = filtered.filter((c) => c.status === status.toUpperCase());
    if (source) filtered = filtered.filter((c) => c.source === source.toUpperCase());
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch candidates", 500);
  }
}

// ─── POST /api/v1/candidates ───────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createCandidateSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.candidate.create({
          data: {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone || null,
            linkedIn: body.linkedIn || null,
            resumeUrl: body.resumeUrl || null,
            source: (body.source || "WEBSITE").toUpperCase(),
            status: (body.status || "NEW").toUpperCase(),
            currentCompany: body.currentCompany || null,
            currentTitle: body.currentTitle || null,
            expectedSalary: body.expectedSalary ? parseFloat(body.expectedSalary) : null,
            rating: body.rating ? parseInt(body.rating) : null,
            notes: body.notes || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `cand-${Date.now()}`,
      ...body,
      source: (body.source || "WEBSITE").toUpperCase(),
      status: (body.status || "NEW").toUpperCase(),
      expectedSalary: body.expectedSalary ? parseFloat(body.expectedSalary) : null,
      rating: body.rating ? parseInt(body.rating) : null,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create candidate", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockCandidates() {
  return [
    { id: "cand-1", firstName: "Emily", lastName: "Chen", email: "emily.chen@gmail.com", phone: "+1-555-0301", linkedIn: "linkedin.com/in/emilychen", resumeUrl: null, source: "LINKEDIN", status: "INTERVIEW", currentCompany: "Pfizer Inc.", currentTitle: "Research Scientist II", expectedSalary: 125000, rating: 4, notes: "Strong HPLC background", createdAt: "2025-03-15T10:00:00Z" },
    { id: "cand-2", firstName: "James", lastName: "Okafor", email: "j.okafor@outlook.com", phone: "+1-555-0302", linkedIn: null, resumeUrl: null, source: "REFERRAL", status: "SCREENING", currentCompany: "Merck & Co.", currentTitle: "QC Analyst", expectedSalary: 78000, rating: 3, notes: "Referred by Sarah Johnson", createdAt: "2025-03-20T10:00:00Z" },
    { id: "cand-3", firstName: "Priya", lastName: "Sharma", email: "priya.sharma@yahoo.com", phone: "+1-555-0303", linkedIn: "linkedin.com/in/priyasharma", resumeUrl: null, source: "WEBSITE", status: "NEW", currentCompany: "Novartis", currentTitle: "Regulatory Affairs Associate", expectedSalary: 95000, rating: null, notes: null, createdAt: "2025-04-01T10:00:00Z" },
    { id: "cand-4", firstName: "David", lastName: "Morales", email: "d.morales@hotmail.com", phone: "+1-555-0304", linkedIn: null, resumeUrl: null, source: "JOB_BOARD", status: "SHORTLISTED", currentCompany: "Abbott Laboratories", currentTitle: "Manufacturing Technician", expectedSalary: 62000, rating: 3, notes: "Tablet compression experience", createdAt: "2025-04-05T10:00:00Z" },
    { id: "cand-5", firstName: "Sarah", lastName: "Kim", email: "s.kim@gmail.com", phone: "+1-555-0305", linkedIn: "linkedin.com/in/sarahkim", resumeUrl: null, source: "AGENCY", status: "OFFER", currentCompany: "Johnson & Johnson", currentTitle: "Senior Clinical Research Associate", expectedSalary: 105000, rating: 5, notes: "Oncology trial experience, ACRP certified", createdAt: "2025-04-10T10:00:00Z" },
  ];
}
