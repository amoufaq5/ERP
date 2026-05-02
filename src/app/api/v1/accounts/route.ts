import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createAccountSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/accounts ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type");
    const industry = params.get("industry");
    const country = params.get("country");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (industry) where.industry = industry;
        if (country) where.country = country;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { city: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.account.count({ where }),
          prisma.account.findMany({
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

    const mock = generateMockAccounts();
    let filtered = filterBySearch(mock, search, ["name", "email", "phone", "city"]);
    if (type) filtered = filtered.filter((a) => a.type === type.toUpperCase());
    if (industry) filtered = filtered.filter((a) => a.industry === industry);
    if (country) filtered = filtered.filter((a) => a.country === country);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch accounts", 500);
  }
}

// ─── POST /api/v1/accounts ─────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createAccountSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.account.create({
          data: {
            name: data.name,
            industry: data.industry || null,
            website: data.website || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            city: data.city || null,
            country: data.country || null,
            type: data.type,
            annualRevenue: data.annualRevenue || null,
            employeeCount: data.employeeCount || null,
            ownerId: data.ownerId || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `acct-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create account", 500);
  }
});

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockAccounts() {
  return [
    { id: "acct-1", name: "Eva Pharma", industry: "Pharmaceutical", website: "https://evapharma.com", phone: "+20-2-3851-4000", email: "info@evapharma.com", address: "6th of October City", city: "Cairo", country: "Egypt", type: "CUSTOMER", annualRevenue: 50000000, employeeCount: 3500, createdAt: "2025-01-10T10:00:00Z", updatedAt: "2025-01-10T10:00:00Z" },
    { id: "acct-2", name: "EIPICO", industry: "Pharmaceutical", website: "https://eipico.com.eg", phone: "+20-2-2622-1499", email: "info@eipico.com.eg", address: "10th of Ramadan City", city: "Sharqia", country: "Egypt", type: "CUSTOMER", annualRevenue: 75000000, employeeCount: 5000, createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-01-15T10:00:00Z" },
    { id: "acct-3", name: "Ain Shams University Hospital", industry: "Healthcare", website: "https://asu.edu.eg", phone: "+20-2-2685-7100", email: "procurement@asu-hospital.edu.eg", address: "Ain Shams, Abbassia", city: "Cairo", country: "Egypt", type: "CUSTOMER", annualRevenue: 20000000, employeeCount: 1200, createdAt: "2025-02-01T10:00:00Z", updatedAt: "2025-02-01T10:00:00Z" },
    { id: "acct-4", name: "Amoun Pharmaceutical", industry: "Pharmaceutical", website: "https://amoun.com", phone: "+20-2-3303-6100", email: "sales@amoun.com", address: "El Obour City", city: "Cairo", country: "Egypt", type: "PROSPECT", annualRevenue: 30000000, employeeCount: 2000, createdAt: "2025-02-10T10:00:00Z", updatedAt: "2025-02-10T10:00:00Z" },
    { id: "acct-5", name: "Dar Al Fouad Hospital", industry: "Healthcare", website: "https://daralfouad.com", phone: "+20-2-3835-6030", email: "info@daralfouad.com", address: "6th of October City", city: "Giza", country: "Egypt", type: "PARTNER", annualRevenue: 40000000, employeeCount: 800, createdAt: "2025-03-05T10:00:00Z", updatedAt: "2025-03-05T10:00:00Z" },
  ];
}
