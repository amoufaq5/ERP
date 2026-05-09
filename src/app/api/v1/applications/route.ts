import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createApplicationSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process applications:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/applications ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const jobId = params.get("jobId");
    const candidateId = params.get("candidateId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (jobId) where.jobId = jobId;
        if (candidateId) where.candidateId = candidateId;
        if (search) {
          where.OR = [
            { coverLetter: { contains: search } },
            { candidate: { firstName: { contains: search } } },
            { candidate: { lastName: { contains: search } } },
            { job: { title: { contains: search } } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.application.count({ where }),
          prisma.application.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
              job: { select: { id: true, title: true, status: true } },
            },
          }),
        ]);

        const totalPages = Math.ceil(total / Math.min(limit, 100));
        return apiResponse(records, 200, {
          page: Math.max(1, page),
          limit: Math.min(limit, 100),
          total,
          totalPages,
        });
      } catch (error) { console.error("Failed to process applications:", error); }
    }

    const mock = generateMockApplications();
    let filtered = filterBySearch(mock, search, ["candidateName", "jobTitle", "coverLetter"]);
    if (status) filtered = filtered.filter((a) => a.status === status.toUpperCase());
    if (jobId) filtered = filtered.filter((a) => a.jobId === jobId);
    if (candidateId) filtered = filtered.filter((a) => a.candidateId === candidateId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch applications", 500);
  }
}

// ─── POST /api/v1/applications ─────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createApplicationSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.application.create({
          data: {
            candidateId: data.candidateId,
            jobId: data.jobId,
            status: data.status,
            appliedDate: data.appliedDate ? new Date(data.appliedDate) : new Date(),
            coverLetter: data.coverLetter || null,
            score: data.score || null,
          },
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            job: { select: { id: true, title: true } },
          },
        });
        return apiResponse(record, 201);
      } catch (error) { console.error("Failed to process applications:", error); }
    }

    const record = {
      id: `app-${Date.now()}`,
      ...data,
      appliedDate: data.appliedDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create application", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockApplications() {
  return [
    { id: "app-1", candidateId: "cand-1", candidateName: "Emily Chen", jobId: "job-1", jobTitle: "Senior Pharmaceutical Scientist", status: "INTERVIEW", appliedDate: "2025-03-16T10:00:00Z", coverLetter: "Experienced in oral solid dosage formulation at Pfizer", score: 85, createdAt: "2025-03-16T10:00:00Z" },
    { id: "app-2", candidateId: "cand-2", candidateName: "James Okafor", jobId: "job-2", jobTitle: "Quality Control Analyst", status: "SCREENING", appliedDate: "2025-03-21T10:00:00Z", coverLetter: "QC analyst with 4 years of cGMP lab experience", score: 72, createdAt: "2025-03-21T10:00:00Z" },
    { id: "app-3", candidateId: "cand-3", candidateName: "Priya Sharma", jobId: "job-3", jobTitle: "Regulatory Affairs Specialist", status: "APPLIED", appliedDate: "2025-04-02T10:00:00Z", coverLetter: "Seeking to leverage my NDA/ANDA filing experience", score: null, createdAt: "2025-04-02T10:00:00Z" },
    { id: "app-4", candidateId: "cand-5", candidateName: "Sarah Kim", jobId: "job-4", jobTitle: "Clinical Research Associate", status: "OFFER", appliedDate: "2025-04-11T10:00:00Z", coverLetter: "ACRP-certified CRA with oncology trial monitoring experience", score: 92, createdAt: "2025-04-11T10:00:00Z" },
    { id: "app-5", candidateId: "cand-4", candidateName: "David Morales", jobId: "job-5", jobTitle: "Pharmaceutical Manufacturing Intern", status: "REJECTED", appliedDate: "2025-01-15T10:00:00Z", coverLetter: null, score: 45, createdAt: "2025-01-15T10:00:00Z" },
  ];
}
