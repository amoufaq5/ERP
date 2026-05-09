import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createJobSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process jobs:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/jobs ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const type = params.get("type");
    const departmentId = params.get("departmentId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (type) where.type = type.toUpperCase();
        if (departmentId) where.departmentId = departmentId;
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
            { location: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.job.count({ where }),
          prisma.job.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              department: { select: { id: true, name: true } },
              hiringManager: { select: { id: true, name: true, email: true } },
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
      } catch (error) { console.error("Failed to process jobs:", error); }
    }

    const mock = generateMockJobs();
    let filtered = filterBySearch(mock, search, ["title", "description", "location"]);
    if (status) filtered = filtered.filter((j) => j.status === status.toUpperCase());
    if (type) filtered = filtered.filter((j) => j.type === type.toUpperCase());
    if (departmentId) filtered = filtered.filter((j) => j.departmentId === departmentId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch jobs", 500);
  }
}

// ─── POST /api/v1/jobs ─────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createJobSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.job.create({
          data: {
            title: data.title,
            departmentId: data.departmentId || null,
            location: data.location || null,
            type: data.type,
            status: data.status,
            description: data.description || null,
            requirements: data.requirements || null,
            salaryMin: data.salaryMin || null,
            salaryMax: data.salaryMax || null,
            benefits: data.benefits || null,
            postedDate: data.postedDate ? new Date(data.postedDate) : null,
            closingDate: data.closingDate ? new Date(data.closingDate) : null,
            hiringManagerId: data.hiringManagerId || null,
          },
        });
        return apiResponse(record, 201);
      } catch (error) { console.error("Failed to process jobs:", error); }
    }

    const record = {
      id: `job-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create job", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockJobs() {
  return [
    { id: "job-1", title: "Senior Pharmaceutical Scientist", departmentId: "dept-1", location: "Boston, MA", type: "FULL_TIME", status: "OPEN", description: "Lead drug formulation research for oral solid dosage forms", requirements: "PhD in Pharmaceutical Sciences, 5+ years experience", salaryMin: 110000, salaryMax: 145000, benefits: "Health, 401k, stock options", postedDate: "2025-03-01T10:00:00Z", closingDate: "2025-05-01T10:00:00Z", hiringManagerId: "user-1", createdAt: "2025-03-01T10:00:00Z" },
    { id: "job-2", title: "Quality Control Analyst", departmentId: "dept-2", location: "Newark, NJ", type: "FULL_TIME", status: "OPEN", description: "Perform analytical testing of raw materials and finished products per cGMP", requirements: "BS in Chemistry, HPLC/GC experience", salaryMin: 65000, salaryMax: 85000, benefits: "Health, dental, PTO", postedDate: "2025-03-10T10:00:00Z", closingDate: "2025-04-30T10:00:00Z", hiringManagerId: "user-2", createdAt: "2025-03-10T10:00:00Z" },
    { id: "job-3", title: "Regulatory Affairs Specialist", departmentId: "dept-4", location: "Remote", type: "REMOTE", status: "OPEN", description: "Prepare and submit FDA regulatory filings (NDA/ANDA/IND)", requirements: "BS in Life Sciences, 3+ years regulatory experience", salaryMin: 90000, salaryMax: 120000, benefits: "Full remote, health, 401k", postedDate: "2025-02-15T10:00:00Z", closingDate: null, hiringManagerId: "user-4", createdAt: "2025-02-15T10:00:00Z" },
    { id: "job-4", title: "Clinical Research Associate", departmentId: "dept-5", location: "San Francisco, CA", type: "CONTRACT", status: "DRAFT", description: "Monitor Phase III clinical trial sites for oncology drug candidate", requirements: "BS in Life Sciences, ACRP certification preferred", salaryMin: 80000, salaryMax: 100000, benefits: "Contract benefits", postedDate: null, closingDate: null, hiringManagerId: null, createdAt: "2025-04-01T10:00:00Z" },
    { id: "job-5", title: "Pharmaceutical Manufacturing Intern", departmentId: "dept-3", location: "Newark, NJ", type: "INTERN", status: "CLOSED", description: "Support tablet compression and coating operations", requirements: "Enrolled in Pharmacy or ChemE program", salaryMin: 20, salaryMax: 25, benefits: "Stipend", postedDate: "2025-01-01T10:00:00Z", closingDate: "2025-02-01T10:00:00Z", hiringManagerId: "user-3", createdAt: "2025-01-01T10:00:00Z" },
  ];
}
