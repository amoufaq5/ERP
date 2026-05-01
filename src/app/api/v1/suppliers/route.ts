import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createSupplierSchema } from "@/lib/api/validations";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/suppliers ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const country = params.get("country");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (country) where.country = country;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { city: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.supplier.count({ where }),
          prisma.supplier.findMany({
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

    const mock = generateMockSuppliers();
    let filtered = filterBySearch(mock, search, ["name", "email", "city"]);
    if (status) filtered = filtered.filter((s) => s.status === status.toUpperCase());
    if (country) filtered = filtered.filter((s) => s.country === country);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch suppliers", 500);
  }
}

// ─── POST /api/v1/suppliers ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validate(createSupplierSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.supplier.create({
          data: {
            name: body.name,
            email: body.email || null,
            phone: body.phone || null,
            address: body.address || null,
            city: body.city || null,
            country: body.country || null,
            status: (body.status || "ACTIVE").toUpperCase(),
            rating: body.rating ? parseFloat(body.rating) : null,
            paymentTerms: body.paymentTerms || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `sup-${Date.now()}`,
      ...body,
      status: (body.status || "ACTIVE").toUpperCase(),
      rating: body.rating ? parseFloat(body.rating) : null,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create supplier", 500);
  }
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockSuppliers() {
  return [
    { id: "sup-1", name: "ChemSource Ltd", email: "orders@chemsource.com", phone: "+1-555-0301", address: "100 Chemical Way", city: "Houston", country: "USA", status: "ACTIVE", rating: 4.5, paymentTerms: "Net 30", createdAt: "2024-06-15T10:00:00Z" },
    { id: "sup-2", name: "PharmaRaw Inc.", email: "supply@pharmaraw.com", phone: "+1-555-0302", address: "200 Pharma Blvd", city: "Newark", country: "USA", status: "ACTIVE", rating: 4.2, paymentTerms: "Net 45", createdAt: "2024-07-20T10:00:00Z" },
    { id: "sup-3", name: "BioActive Ingredients AG", email: "info@bioactive-ag.de", phone: "+49-30-55501", address: "Pharmastrasse 12", city: "Berlin", country: "Germany", status: "ACTIVE", rating: 4.8, paymentTerms: "Net 60", createdAt: "2024-08-10T10:00:00Z" },
    { id: "sup-4", name: "MedPack Solutions", email: "sales@medpack.co.uk", phone: "+44-20-55502", address: "45 Packaging Lane", city: "London", country: "UK", status: "ACTIVE", rating: 3.9, paymentTerms: "Net 30", createdAt: "2024-09-05T10:00:00Z" },
    { id: "sup-5", name: "AsiaPharm Materials", email: "export@asiapharm.cn", phone: "+86-21-55503", address: "88 Industrial Park", city: "Shanghai", country: "China", status: "ACTIVE", rating: 4.0, paymentTerms: "Net 30", createdAt: "2024-10-01T10:00:00Z" },
    { id: "sup-6", name: "Excipient World Corp", email: "contact@excipientworld.com", phone: "+1-555-0306", address: "500 Excipient Dr", city: "Chicago", country: "USA", status: "INACTIVE", rating: 3.2, paymentTerms: "Net 15", createdAt: "2024-11-12T10:00:00Z" },
    { id: "sup-7", name: "ColdChain Logistics", email: "ops@coldchain.com", phone: "+1-555-0307", address: "700 Logistics Ave", city: "Memphis", country: "USA", status: "ACTIVE", rating: 4.6, paymentTerms: "Net 30", createdAt: "2025-01-08T10:00:00Z" },
  ];
}
