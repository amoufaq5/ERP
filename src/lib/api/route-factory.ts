import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteFactoryConfig {
  entity: string;
  modelName: string; // Prisma model name (camelCase for delegate access)
  validationSchema?: {
    create?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  searchFields?: string[]; // fields to search across
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  defaultPageSize?: number;
  allowedIncludes?: string[]; // relations that can be included
  hooks?: {
    beforeCreate?: (data: any, req: NextRequest) => Promise<any>;
    afterCreate?: (record: any, req: NextRequest) => Promise<void>;
    beforeUpdate?: (id: string, data: any, req: NextRequest) => Promise<any>;
    afterUpdate?: (record: any, req: NextRequest) => Promise<void>;
    beforeDelete?: (id: string, req: NextRequest) => Promise<void>;
    afterDelete?: (id: string, req: NextRequest) => Promise<void>;
  };
  authorization?: {
    objectId: string;
    createActivity?: string;
    readActivity?: string;
    updateActivity?: string;
    deleteActivity?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getModel(modelName: string) {
  return (prisma as any)[modelName];
}

function buildIncludeClause(
  include: string | null,
  allowedIncludes?: string[],
): Record<string, boolean> | undefined {
  if (!include || !allowedIncludes || allowedIncludes.length === 0) {
    return undefined;
  }
  const requested = include.split(',');
  const clause: Record<string, boolean> = {};
  let hasKeys = false;
  for (const rel of requested) {
    const trimmed = rel.trim();
    if (allowedIncludes.includes(trimmed)) {
      clause[trimmed] = true;
      hasKeys = true;
    }
  }
  return hasKeys ? clause : undefined;
}

// ─── List + Create (collection routes) ───────────────────────────────────────

export function createRouteHandlers(config: RouteFactoryConfig) {
  const model = getModel(config.modelName);

  async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('pageSize') || String(config.defaultPageSize || 25), 10)),
      );
      const search = searchParams.get('search') || '';
      const sort = searchParams.get('sort') || config.defaultSort?.field || 'createdAt';
      const direction = searchParams.get('direction') || config.defaultSort?.direction || 'desc';
      const include = searchParams.get('include');

      // Build where clause
      const where: any = {};

      // Extract tenant from auth header
      const tenantId = req.headers.get('x-tenant-id') || 'default';
      where.tenantId = tenantId;

      // Search across configured fields
      if (search && config.searchFields && config.searchFields.length > 0) {
        where.OR = config.searchFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        }));
      }

      // Extract filter params (e.g., filter[status]=OPEN)
      searchParams.forEach((value, key) => {
        if (key.startsWith('filter[') && key.endsWith(']')) {
          const field = key.slice(7, -1);
          where[field] = value;
        }
      });

      // Build include clause
      const includeClause = buildIncludeClause(include, config.allowedIncludes);

      const skip = (page - 1) * pageSize;

      const [data, total] = await Promise.all([
        model.findMany({
          where,
          orderBy: { [sort]: direction },
          skip,
          take: pageSize,
          ...(includeClause && { include: includeClause }),
        }),
        model.count({ where }),
      ]);

      return NextResponse.json({
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error(`[API] GET /${config.entity} error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      const tenantId = req.headers.get('x-tenant-id') || 'default';

      // Validate
      let validatedData = body;
      if (config.validationSchema?.create) {
        const result = config.validationSchema.create.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: result.error.flatten() },
            { status: 400 },
          );
        }
        validatedData = result.data;
      }

      // Before hook
      if (config.hooks?.beforeCreate) {
        validatedData = await config.hooks.beforeCreate(validatedData, req);
      }

      const record = await model.create({
        data: { ...validatedData, tenantId },
      });

      // After hook
      if (config.hooks?.afterCreate) {
        await config.hooks.afterCreate(record, req);
      }

      return NextResponse.json(record, { status: 201 });
    } catch (error) {
      console.error(`[API] POST /${config.entity} error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  return { GET, POST };
}

// ─── Single-resource routes (by id) ─────────────────────────────────────────

export function createRouteHandlersWithId(config: RouteFactoryConfig) {
  const model = getModel(config.modelName);

  async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params;
      const tenantId = req.headers.get('x-tenant-id') || 'default';

      const includeParam = new URL(req.url).searchParams.get('include');
      const includeClause = buildIncludeClause(includeParam, config.allowedIncludes);

      const record = await model.findFirst({
        where: { id, tenantId },
        ...(includeClause && { include: includeClause }),
      });

      if (!record) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(record);
    } catch (error) {
      console.error(`[API] GET /${config.entity}/:id error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params;
      const body = await req.json();
      const tenantId = req.headers.get('x-tenant-id') || 'default';

      // Verify ownership
      const existing = await model.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      // Validate
      let validatedData = body;
      if (config.validationSchema?.update) {
        const result = config.validationSchema.update.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: result.error.flatten() },
            { status: 400 },
          );
        }
        validatedData = result.data;
      }

      // Before hook
      if (config.hooks?.beforeUpdate) {
        validatedData = await config.hooks.beforeUpdate(id, validatedData, req);
      }

      const record = await model.update({
        where: { id },
        data: validatedData,
      });

      // After hook
      if (config.hooks?.afterUpdate) {
        await config.hooks.afterUpdate(record, req);
      }

      return NextResponse.json(record);
    } catch (error) {
      console.error(`[API] PATCH /${config.entity}/:id error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params;
      const tenantId = req.headers.get('x-tenant-id') || 'default';

      // Verify ownership
      const existing = await model.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      // Before hook
      if (config.hooks?.beforeDelete) {
        await config.hooks.beforeDelete(id, req);
      }

      await model.delete({ where: { id } });

      // After hook
      if (config.hooks?.afterDelete) {
        await config.hooks.afterDelete(id, req);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`[API] DELETE /${config.entity}/:id error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  }

  return { GET, PATCH, DELETE };
}
