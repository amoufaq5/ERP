import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createTrainingSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/training ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const format = params.get("format");
    const category = params.get("category");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (format) where.format = format.toUpperCase();
        if (category) where.category = category;
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
            { category: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.trainingCourse.count({ where }),
          prisma.trainingCourse.findMany({
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

    const mock = generateMockTrainingCourses();
    let filtered = filterBySearch(mock, search, ["title", "description", "category"]);
    if (status) filtered = filtered.filter((c) => c.status === status.toUpperCase());
    if (format) filtered = filtered.filter((c) => c.format === format.toUpperCase());
    if (category) filtered = filtered.filter((c) => c.category === category);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch training courses", 500);
  }
}

// ─── POST /api/v1/training ─────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createTrainingSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.trainingCourse.create({
          data: {
            title: body.title,
            description: body.description || null,
            category: body.category || null,
            duration: body.duration || null,
            format: (body.format || "ONLINE").toUpperCase(),
            status: (body.status || "DRAFT").toUpperCase(),
            materials: body.materials || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `train-${Date.now()}`,
      ...body,
      format: (body.format || "ONLINE").toUpperCase(),
      status: (body.status || "DRAFT").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create training course", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockTrainingCourses() {
  return [
    { id: "train-1", title: "cGMP Fundamentals", description: "Current Good Manufacturing Practice regulations and compliance for pharmaceutical production", category: "Compliance", duration: "8 hours", format: "CLASSROOM", status: "PUBLISHED", materials: "Slides, handbook, quiz", createdAt: "2025-01-10T10:00:00Z" },
    { id: "train-2", title: "HPLC Method Development", description: "Advanced high-performance liquid chromatography techniques for drug analysis", category: "Laboratory", duration: "16 hours", format: "HYBRID", status: "PUBLISHED", materials: "Lab manual, video tutorials", createdAt: "2025-01-20T10:00:00Z" },
    { id: "train-3", title: "FDA Regulatory Submissions", description: "Preparing NDA, ANDA, and IND submissions for the US market", category: "Regulatory", duration: "12 hours", format: "ONLINE", status: "PUBLISHED", materials: "Case studies, templates, webinars", createdAt: "2025-02-05T10:00:00Z" },
    { id: "train-4", title: "Pharmacovigilance & Drug Safety", description: "Adverse event reporting, signal detection, and REMS programs", category: "Safety", duration: "6 hours", format: "ONLINE", status: "DRAFT", materials: "E-learning modules", createdAt: "2025-03-01T10:00:00Z" },
    { id: "train-5", title: "Aseptic Processing & Sterile Manufacturing", description: "Cleanroom operations, media fills, and contamination control for injectable products", category: "Manufacturing", duration: "24 hours", format: "CLASSROOM", status: "PUBLISHED", materials: "Gowning SOP, cleanroom sim", createdAt: "2025-03-15T10:00:00Z" },
  ];
}
