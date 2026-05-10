import { NextRequest, NextResponse } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  parseQueryParams,
} from "@/lib/api/api-helpers";

// ---------------------------------------------------------------------------
// In-memory audit store (fallback when DB unavailable)
// ---------------------------------------------------------------------------

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable -- use in-memory store */
}

interface StoredAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  details?: string;
  changes?: { field: string; from: unknown; to: unknown }[];
  metadata?: Record<string, unknown>;
  userAgent?: string;
}

const inMemoryStore: StoredAuditEntry[] = [];

function generateId(): string {
  return `audit-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// OPTIONS
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return corsOptions();
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit  -- list audit entries with optional filters
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const module = params.get("module");
    const entity = params.get("entity");
    const action = params.get("action");
    const userId = params.get("userId");
    const userName = params.get("userName");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    // Try Prisma first
    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (module && module !== "All") where.module = module;
        if (entity && entity !== "All") where.entity = entity;
        if (action && action !== "All") where.action = action;
        if (userId) where.userId = userId;
        if (userName) {
          where.userName = { contains: userName, mode: "insensitive" };
        }
        if (dateFrom || dateTo) {
          where.timestamp = {};
          if (dateFrom) (where.timestamp as any).gte = new Date(dateFrom);
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            (where.timestamp as any).lte = to;
          }
        }
        if (search) {
          where.OR = [
            { userName: { contains: search, mode: "insensitive" } },
            { entity: { contains: search, mode: "insensitive" } },
            { entityName: { contains: search, mode: "insensitive" } },
            { details: { contains: search, mode: "insensitive" } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.auditLog.count({ where }),
          prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);

        return apiResponse(records, 200, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch {
        /* fall through to in-memory */
      }
    }

    // In-memory fallback with filtering
    let results = [...inMemoryStore];

    if (module && module !== "All") results = results.filter((e) => e.module === module);
    if (entity && entity !== "All") results = results.filter((e) => e.entity === entity);
    if (action && action !== "All") results = results.filter((e) => e.action === action);
    if (userId) results = results.filter((e) => e.userId === userId);
    if (userName) {
      const q = userName.toLowerCase();
      results = results.filter((e) => e.userName.toLowerCase().includes(q));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter((e) => new Date(e.timestamp) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter((e) => new Date(e.timestamp) <= to);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter((e) => {
        const searchable = [
          e.userName, e.action, e.module, e.entity,
          e.entityId, e.entityName || "", e.details || "", e.userRole,
        ].join(" ").toLowerCase();
        return searchable.includes(q);
      });
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const { items, pagination } = paginate(results, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch audit logs", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/audit  -- create a new audit entry
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry: StoredAuditEntry = {
      id: body.id || generateId(),
      timestamp: body.timestamp || new Date().toISOString(),
      userId: body.userId || "",
      userName: body.userName || "",
      userRole: body.userRole || "",
      action: body.action || "",
      module: body.module || "",
      entity: body.entity || "",
      entityId: body.entityId || "",
      entityName: body.entityName,
      oldValues: body.oldValues,
      newValues: body.newValues,
      ipAddress: body.ipAddress || req.headers.get("x-forwarded-for") || undefined,
      details: body.details,
      changes: body.changes,
      metadata: body.metadata,
      userAgent: body.userAgent || req.headers.get("user-agent") || undefined,
    };

    // Try Prisma first
    if (prisma) {
      try {
        const created = await prisma.auditLog.create({ data: entry });
        return apiResponse(created, 201);
      } catch {
        /* fall through */
      }
    }

    // In-memory fallback
    inMemoryStore.unshift(entry);
    // Cap in-memory store at 10000 entries
    if (inMemoryStore.length > 10000) inMemoryStore.length = 10000;

    return apiResponse(entry, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create audit entry", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/audit  -- clear all audit logs
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest) {
  try {
    if (prisma) {
      try {
        await prisma.auditLog.deleteMany({});
        return apiResponse({ cleared: true });
      } catch {
        /* fall through */
      }
    }
    inMemoryStore.length = 0;
    return apiResponse({ cleared: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to clear audit logs", 500);
  }
}
