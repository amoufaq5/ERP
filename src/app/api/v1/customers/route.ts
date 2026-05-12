import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createCustomerSchema } from "@/lib/api/validations";
import { withAuthAndTenant } from "@/lib/api/with-tenant";

// Phase 0 Track B3 — exemplar migration to withAuthAndTenant.
// /api/v1/customers maps to the CRM `Account` model under the hood.
// Previous version: lazy prisma require, unauthenticated GET, no tenant
// filter, mock fallback. All removed; the wrapper supplies db and 401s
// on missing session.
//
// See docs/PHASE0_TRACK_B_AUDIT.md + docs/PHASE0_TRACK_B2_BRIEF.md.

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/customers ──────────────────────────────────────────────────

export const GET = withAuthAndTenant(async (req: NextRequest, { db }) => {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const type = params.get("type"); // CUSTOMER, PROSPECT, PARTNER, VENDOR
    const city = params.get("city");
    const country = params.get("country");

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

    const take = Math.min(limit, 100);
    const skip = (Math.max(1, page) - 1) * take;

    const [total, records] = await Promise.all([
      db.account.count({ where }),
      db.account.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return apiResponse(records, 200, {
      page: Math.max(1, page),
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch customers", 500);
  }
});

// ─── POST /api/v1/customers ─────────────────────────────────────────────────

export const POST = withAuthAndTenant(async (req: NextRequest, { db }) => {
  try {
    const body = await req.json();
    const validation = validate(createCustomerSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    // tenantId is auto-injected on `data` by the wrapper's $extends middleware.
    const record = await db.account.create({
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
      },
    });
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create customer", 500);
  }
});
