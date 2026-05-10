import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCache } from "@/lib/cache/redis";

function getTenantId(req: NextRequest): string {
  return req.headers.get("x-tenant-id") || req.headers.get("x-tenant-slug") || "default";
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

interface NumberRangeRecord {
  id: string;
  tenant_id: string;
  object_type: string;
  sub_type: string | null;
  prefix: string;
  current_number: number;
  number_length: number;
  fiscal_year_dependent: boolean;
  org_unit_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// In-memory storage as fallback when DB table doesn't exist
const inMemoryRanges: Map<string, NumberRangeRecord[]> = new Map();

function getMemRanges(tenantId: string): NumberRangeRecord[] {
  if (!inMemoryRanges.has(tenantId)) {
    inMemoryRanges.set(tenantId, []);
  }
  return inMemoryRanges.get(tenantId)!;
}

async function loadRangesFromDb(tenantId: string): Promise<NumberRangeRecord[] | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<NumberRangeRecord[]>(
      `SELECT id, tenant_id, object_type, sub_type, prefix, current_number, number_length, fiscal_year_dependent, org_unit_id, created_at, updated_at
       FROM number_ranges WHERE tenant_id = $1 ORDER BY object_type, sub_type`,
      tenantId
    );
    return rows;
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/config/number-ranges
 * List all number ranges for the tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);

    const dbRows = await loadRangesFromDb(tenantId);
    if (dbRows !== null) {
      const ranges = dbRows.map(formatRange);
      return NextResponse.json({ success: true, data: ranges });
    }

    // Fallback to in-memory
    const memRanges = getMemRanges(tenantId).map(formatRange);
    return NextResponse.json({ success: true, data: memRanges });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list number ranges";
    return jsonError(message, 500);
  }
}

/**
 * POST /api/v1/config/number-ranges
 * Create a new number range or get the next number in a sequence.
 *
 * Body for creating: { objectType, prefix, numberLength, subType?, fiscalYearDependent?, orgUnitId? }
 * Body for next number: { action: "next", objectType, subType?, orgUnitId?, fiscalYear? }
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();

    // Handle "next" action (atomic increment)
    if (body.action === "next") {
      return await handleNextNumber(tenantId, body);
    }

    // Validate required fields for creation
    if (!body.objectType || !body.prefix || !body.numberLength) {
      return jsonError(
        "Required fields: objectType, prefix, numberLength",
        400
      );
    }

    const id = `nr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const record: NumberRangeRecord = {
      id,
      tenant_id: tenantId,
      object_type: body.objectType,
      sub_type: body.subType || null,
      prefix: body.prefix,
      current_number: body.currentNumber || 0,
      number_length: body.numberLength,
      fiscal_year_dependent: body.fiscalYearDependent || false,
      org_unit_id: body.orgUnitId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Try DB first
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO number_ranges (id, tenant_id, object_type, sub_type, prefix, current_number, number_length, fiscal_year_dependent, org_unit_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        record.id,
        record.tenant_id,
        record.object_type,
        record.sub_type,
        record.prefix,
        record.current_number,
        record.number_length,
        record.fiscal_year_dependent,
        record.org_unit_id,
        record.created_at,
        record.updated_at
      );
    } catch {
      // Fallback to in-memory
      getMemRanges(tenantId).push(record);
    }

    return NextResponse.json(
      { success: true, data: formatRange(record) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create number range";
    return jsonError(message, 500);
  }
}

/**
 * PUT /api/v1/config/number-ranges
 * Update an existing number range.
 * Body: { id, prefix?, numberLength?, currentNumber? }
 */
export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();

    if (!body.id) {
      return jsonError("Required field: id", 400);
    }

    // Try DB first
    try {
      const existing = await prisma.$queryRawUnsafe<NumberRangeRecord[]>(
        `SELECT * FROM number_ranges WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        body.id,
        tenantId
      );

      if (!existing || existing.length === 0) {
        return jsonError(`Number range not found: ${body.id}`, 404);
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.prefix !== undefined) {
        updates.push(`prefix = $${paramIndex++}`);
        values.push(body.prefix);
      }
      if (body.numberLength !== undefined) {
        updates.push(`number_length = $${paramIndex++}`);
        values.push(body.numberLength);
      }
      if (body.currentNumber !== undefined) {
        updates.push(`current_number = $${paramIndex++}`);
        values.push(body.currentNumber);
      }
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(body.id);
      values.push(tenantId);

      await prisma.$executeRawUnsafe(
        `UPDATE number_ranges SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}`,
        ...values
      );

      const updated = await prisma.$queryRawUnsafe<NumberRangeRecord[]>(
        `SELECT * FROM number_ranges WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        body.id,
        tenantId
      );

      return NextResponse.json({ success: true, data: formatRange(updated[0]) });
    } catch {
      // Fallback to in-memory
      const memRanges = getMemRanges(tenantId);
      const idx = memRanges.findIndex((r) => r.id === body.id);
      if (idx === -1) {
        return jsonError(`Number range not found: ${body.id}`, 404);
      }

      if (body.prefix !== undefined) memRanges[idx].prefix = body.prefix;
      if (body.numberLength !== undefined) memRanges[idx].number_length = body.numberLength;
      if (body.currentNumber !== undefined) memRanges[idx].current_number = body.currentNumber;
      memRanges[idx].updated_at = new Date();

      return NextResponse.json({ success: true, data: formatRange(memRanges[idx]) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update number range";
    return jsonError(message, 500);
  }
}

// ─── Next number handler (atomic increment) ─────────────────────────────────

async function handleNextNumber(
  tenantId: string,
  body: { objectType: string; subType?: string; orgUnitId?: string; fiscalYear?: number }
): Promise<NextResponse> {
  const { objectType, subType, orgUnitId, fiscalYear } = body;

  if (!objectType) {
    return jsonError("Required field: objectType", 400);
  }

  // Try atomic increment in DB
  try {
    const subTypeCondition = subType ? `AND sub_type = '${subType}'` : "AND sub_type IS NULL";
    const orgCondition = orgUnitId ? `AND org_unit_id = '${orgUnitId}'` : "AND org_unit_id IS NULL";

    const rows = await prisma.$queryRawUnsafe<NumberRangeRecord[]>(
      `UPDATE number_ranges
       SET current_number = current_number + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND object_type = $2 ${subTypeCondition} ${orgCondition}
       RETURNING *`,
      tenantId,
      objectType
    );

    if (!rows || rows.length === 0) {
      return jsonError(
        `No number range configured for objectType "${objectType}" in tenant "${tenantId}"`,
        404
      );
    }

    const record = rows[0];
    const formattedNumber = buildFormattedNumber(record, fiscalYear);

    return NextResponse.json({
      success: true,
      data: {
        number: formattedNumber,
        currentValue: record.current_number,
        range: formatRange(record),
      },
    });
  } catch {
    // Fallback to in-memory with cache-based locking
    const memRanges = getMemRanges(tenantId);
    const match = memRanges.find(
      (r) =>
        r.object_type === objectType &&
        (subType ? r.sub_type === subType : r.sub_type === null) &&
        (orgUnitId ? r.org_unit_id === orgUnitId : r.org_unit_id === null)
    );

    if (!match) {
      return jsonError(
        `No number range configured for objectType "${objectType}" in tenant "${tenantId}"`,
        404
      );
    }

    // Use cache for atomic increment
    const cache = await getCache();
    const lockKey = `nr:lock:${tenantId}:${objectType}:${subType || ""}:${orgUnitId || ""}`;
    const counterKey = `nr:counter:${tenantId}:${match.id}`;

    // Initialize counter in cache if needed
    const exists = await cache.exists(counterKey);
    if (!exists) {
      await cache.set(counterKey, String(match.current_number));
    }

    // Atomic increment
    const newValue = await cache.incr(counterKey);
    match.current_number = newValue;
    match.updated_at = new Date();

    // Release lock
    await cache.del(lockKey);

    const formattedNumber = buildFormattedNumber(match, fiscalYear);

    return NextResponse.json({
      success: true,
      data: {
        number: formattedNumber,
        currentValue: newValue,
        range: formatRange(match),
      },
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildFormattedNumber(
  record: NumberRangeRecord,
  fiscalYear?: number
): string {
  let prefix = record.prefix;
  if (record.fiscal_year_dependent && fiscalYear) {
    prefix = `${prefix}${fiscalYear}-`;
  }
  const numberStr = record.current_number.toString().padStart(record.number_length, "0");
  return `${prefix}${numberStr}`;
}

function formatRange(record: NumberRangeRecord) {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    objectType: record.object_type,
    subType: record.sub_type,
    prefix: record.prefix,
    currentNumber: record.current_number,
    numberLength: record.number_length,
    fiscalYearDependent: record.fiscal_year_dependent,
    orgUnitId: record.org_unit_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id, X-Tenant-Slug, X-User-Id",
    },
  });
}
