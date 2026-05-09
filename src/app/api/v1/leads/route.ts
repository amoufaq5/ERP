import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createLeadSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch (error) { console.error("Failed to process leads:", error); }

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/leads ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const source = params.get("source");
    const assignedToId = params.get("assignedToId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (source) where.source = source.toUpperCase();
        if (assignedToId) where.assignedToId = assignedToId;
        if (search) {
          where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.lead.count({ where }),
          prisma.lead.findMany({
            where,
            include: { assignedTo: { select: { id: true, name: true, email: true } } },
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
      } catch (error) { console.error("Failed to process leads:", error); }
    }

    const mock = generateMockLeads();
    let filtered = filterBySearch(mock, search, ["firstName", "lastName", "email", "company"]);
    if (status) filtered = filtered.filter((l) => l.status === status.toUpperCase());
    if (source) filtered = filtered.filter((l) => l.source === source.toUpperCase());
    if (assignedToId) filtered = filtered.filter((l) => l.assignedToId === assignedToId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch leads", 500);
  }
}

// ─── POST /api/v1/leads ─────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createLeadSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.lead.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            source: data.source,
            status: data.status,
            assignedToId: data.assignedToId || null,
            score: data.score,
            value: data.value || null,
            notes: data.notes || null,
          },
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
        });
        return apiResponse(record, 201);
      } catch (error) { console.error("Failed to process leads:", error); }
    }

    const record = {
      id: `lead-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create lead", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockLeads() {
  return [
    { id: "lead-1", firstName: "Alice", lastName: "Walker", email: "alice@example.com", phone: "+1-555-0201", company: "HealthFirst Inc.", source: "WEB", status: "NEW", score: 45, value: 15000, assignedToId: null, createdAt: "2025-03-01T10:00:00Z" },
    { id: "lead-2", firstName: "Bob", lastName: "Martinez", email: "bob@biotech.com", phone: "+1-555-0202", company: "BioTech Solutions", source: "REFERRAL", status: "CONTACTED", score: 72, value: 32000, assignedToId: "usr-1", createdAt: "2025-03-05T10:00:00Z" },
    { id: "lead-3", firstName: "Catherine", lastName: "Lee", email: "cat.lee@medgroup.com", phone: "+1-555-0203", company: "MedGroup Asia", source: "EVENT", status: "QUALIFIED", score: 88, value: 50000, assignedToId: "usr-1", createdAt: "2025-03-10T10:00:00Z" },
    { id: "lead-4", firstName: "David", lastName: "Kim", email: "david.kim@pharmanet.com", phone: "+1-555-0204", company: "PharmaNet", source: "ADS", status: "UNQUALIFIED", score: 20, value: null, assignedToId: null, createdAt: "2025-03-15T10:00:00Z" },
    { id: "lead-5", firstName: "Eva", lastName: "Petrov", email: "eva@globalrx.com", phone: "+44-20-555-0205", company: "GlobalRx", source: "SOCIAL", status: "CONVERTED", score: 95, value: 75000, assignedToId: "usr-2", createdAt: "2025-02-20T10:00:00Z" },
  ];
}
