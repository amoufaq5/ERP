import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createCustomerSchema } from "@/lib/api/validations";

// ─── Prisma import (optional — falls back to mock) ──────────────────────────

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  // Prisma not available; will use mock data
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/customers ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type"); // CUSTOMER, PROSPECT, PARTNER, VENDOR
    const city = params.get("city");
    const country = params.get("country");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (city) where.city = { contains: city };
        if (country) where.country = { contains: country };
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
      } catch {
        // fall through to mock
      }
    }

    // ── Mock fallback ──
    const mock = generateMockCustomers();
    let filtered = filterBySearch(mock, search, ["name", "email", "phone", "city"]);
    if (type) filtered = filtered.filter((c) => c.type === type.toUpperCase());
    if (city) filtered = filtered.filter((c) => c.city?.toLowerCase().includes(city.toLowerCase()));
    if (country) filtered = filtered.filter((c) => c.country?.toLowerCase().includes(country.toLowerCase()));
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch customers", 500);
  }
}

// ─── POST /api/v1/customers ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validate(createCustomerSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.account.create({
          data: {
            name: body.name,
            industry: body.industry || null,
            website: body.website || null,
            phone: body.phone || null,
            email: body.email || null,
            address: body.address || null,
            city: body.city || null,
            country: body.country || null,
            type: (body.type || "CUSTOMER").toUpperCase(),
            annualRevenue: body.annualRevenue ? parseFloat(body.annualRevenue) : null,
            employeeCount: body.employeeCount ? parseInt(body.employeeCount) : null,
            ownerId: body.ownerId || null,
          },
        });
        return apiResponse(record, 201);
      } catch {
        // fall through to mock
      }
    }

    const record = {
      id: `acct-${Date.now()}`,
      ...body,
      type: (body.type || "CUSTOMER").toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create customer", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockCustomers() {
  return [
    { id: "acct-1", name: "Acme Pharma Inc.", email: "contact@acme.com", phone: "+1-555-0100", industry: "Pharmaceutical", type: "CUSTOMER", city: "New York", country: "USA", createdAt: "2025-01-15T10:00:00Z" },
    { id: "acct-2", name: "MedLife Labs", email: "info@medlife.com", phone: "+1-555-0200", industry: "Biotech", type: "CUSTOMER", city: "Boston", country: "USA", createdAt: "2025-02-20T10:00:00Z" },
    { id: "acct-3", name: "Global Health Corp", email: "sales@ghc.com", phone: "+44-20-7946-0958", industry: "Healthcare", type: "PROSPECT", city: "London", country: "UK", createdAt: "2025-03-05T10:00:00Z" },
    { id: "acct-4", name: "BioSynth AG", email: "kontakt@biosynth.de", phone: "+49-30-1234567", industry: "Chemical", type: "PARTNER", city: "Berlin", country: "Germany", createdAt: "2025-04-10T10:00:00Z" },
    { id: "acct-5", name: "PharmaDist Ltd", email: "hello@pharmadist.co.uk", phone: "+44-121-555-0300", industry: "Distribution", type: "VENDOR", city: "Birmingham", country: "UK", createdAt: "2025-05-01T10:00:00Z" },
  ];
}
