import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  parseQueryParams,
  validateRequiredFields,
} from "@/lib/api/api-helpers";

// ---------------------------------------------------------------------------
// In-memory tenant store (fallback when master DB unavailable)
// ---------------------------------------------------------------------------

let masterDb: any = null;
try {
  masterDb = require("@/lib/tenant/master-db").masterDb;
} catch {
  /* master DB unavailable */
}

interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  plan: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredTenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const inMemoryTenants: StoredTenant[] = [];
const inMemoryUsers: StoredTenantUser[] = [];

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// OPTIONS
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return corsOptions();
}

// ---------------------------------------------------------------------------
// GET /api/v1/tenants  -- list all or get by id/slug
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { page, limit, params } = parseQueryParams(req.url);
    const id = params.get("id");
    const slug = params.get("slug");

    // Single tenant lookup
    if (id || slug) {
      if (masterDb) {
        try {
          const where = id ? { id } : { slug: slug! };
          const tenant = await masterDb.tenant.findUnique({
            where,
            include: { _count: { select: { users: true } } },
          });
          if (!tenant) return apiError("Tenant not found", 404);
          return apiResponse(tenant);
        } catch {
          /* fall through */
        }
      }
      const found = id
        ? inMemoryTenants.find((t) => t.id === id)
        : inMemoryTenants.find((t) => t.slug === slug);
      if (!found) return apiError("Tenant not found", 404);
      return apiResponse(found);
    }

    // List all tenants
    if (masterDb) {
      try {
        const tenants = await masterDb.tenant.findMany({
          include: { _count: { select: { users: true } } },
          orderBy: { createdAt: "desc" },
        });
        const { items, pagination } = paginate(tenants, page, limit);
        return apiResponse(items, 200, pagination);
      } catch {
        /* fall through */
      }
    }

    const { items, pagination } = paginate([...inMemoryTenants], page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch tenants", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/tenants  -- create a new tenant
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["name", "slug"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (masterDb) {
      try {
        const existing = await masterDb.tenant.findUnique({
          where: { slug: body.slug },
        });
        if (existing) return apiError(`Tenant with slug "${body.slug}" already exists`, 409);

        const tenant = await masterDb.tenant.create({
          data: {
            name: body.name,
            slug: body.slug,
            domain: body.domain,
            logo: body.logo,
            primaryColor: body.primaryColor,
            plan: body.plan || "STARTER",
            maxUsers: body.maxUsers || 10,
            isActive: true,
          },
        });
        return apiResponse(tenant, 201);
      } catch {
        /* fall through */
      }
    }

    // In-memory fallback
    if (inMemoryTenants.some((t) => t.slug === body.slug)) {
      return apiError(`Tenant with slug "${body.slug}" already exists`, 409);
    }

    const now = new Date().toISOString();
    const tenant: StoredTenant = {
      id: genId("tn"),
      name: body.name,
      slug: body.slug,
      domain: body.domain,
      logo: body.logo,
      primaryColor: body.primaryColor,
      plan: body.plan || "STARTER",
      maxUsers: body.maxUsers || 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryTenants.push(tenant);
    return apiResponse(tenant, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create tenant", 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/v1/tenants  -- update a tenant (body must include id)
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return apiError("id is required", 400);

    if (masterDb) {
      try {
        const updated = await masterDb.tenant.update({
          where: { id: body.id },
          data: {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.domain !== undefined && { domain: body.domain }),
            ...(body.logo !== undefined && { logo: body.logo }),
            ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
            ...(body.plan !== undefined && { plan: body.plan }),
            ...(body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
          },
        });
        return apiResponse(updated);
      } catch {
        /* fall through */
      }
    }

    // In-memory fallback
    const idx = inMemoryTenants.findIndex((t) => t.id === body.id);
    if (idx === -1) return apiError("Tenant not found", 404);

    const updated: StoredTenant = {
      ...inMemoryTenants[idx],
      ...(body.name !== undefined && { name: body.name }),
      ...(body.domain !== undefined && { domain: body.domain }),
      ...(body.logo !== undefined && { logo: body.logo }),
      ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
      ...(body.plan !== undefined && { plan: body.plan }),
      ...(body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      updatedAt: new Date().toISOString(),
    };
    inMemoryTenants[idx] = updated;
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update tenant", 500);
  }
}
