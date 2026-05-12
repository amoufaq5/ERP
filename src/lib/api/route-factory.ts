// Generic CRUD route factory.
//
// PHASE 0 TRACK B4 — migrated to withAuthAndTenant.
//
// Before this commit, the factory:
//   - Read `tenantId` from the `x-tenant-id` request header, defaulting
//     to the string "default" — a P0 vulnerability. Any client could
//     claim any tenant by setting that header; unauthenticated callers
//     got the "default" bucket which then leaked or silently mismatched.
//   - Had no authentication check at all. 92 API routes inherited this
//     posture.
//
// After migration:
//   - Every factory-generated handler is wrapped in `withAuthAndTenant`.
//     The session-derived `tenantId` is the only one used; the
//     `x-tenant-id` header is now ignored entirely.
//   - The handler receives a request-scoped, tenant-scoped Prisma
//     client (`db`) backed by an interactive transaction with
//     `app.current_tenant_id` set. Layer-1 ($extends auto-injection)
//     handles `where.tenantId` / `data.tenantId` for top-level args;
//     Layer-2 RLS (once applied) blocks any miss at the DB.
//
// Operational impact:
//   - All 92 factory routes now require an authenticated session. Any
//     client that was relying on header-based or unauthenticated access
//     will break and must be updated to send NextAuth cookies.
//   - Per-request transaction (30s timeout); see with-tenant.ts header
//     for the connection-pool sizing note.
//
// Hooks (beforeCreate / afterCreate / etc.) keep their existing
// signature (data, req). If a hook does its own DB work it should
// pull `db` from the surrounding handler closure (see config.hooks
// type below) rather than importing the global `prisma`, which is
// not tenant-scoped and will fail-closed under RLS.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { withAuthAndTenant, withAuthAndTenantParams } from './with-tenant';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteFactoryConfig {
  entity: string;
  modelName: string; // Prisma model name (camelCase for delegate access)
  validationSchema?: {
    create?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  searchFields?: string[];
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  defaultPageSize?: number;
  allowedIncludes?: string[];
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

function getModel(db: PrismaClient, modelName: string) {
  return (db as any)[modelName];
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
  const GET = withAuthAndTenant(async (req, { db }) => {
    try {
      const model = getModel(db, config.modelName);
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const pageSize = Math.min(
        100,
        Math.max(
          1,
          parseInt(
            searchParams.get('pageSize') || String(config.defaultPageSize || 25),
            10,
          ),
        ),
      );
      const search = searchParams.get('search') || '';
      const sort = searchParams.get('sort') || config.defaultSort?.field || 'createdAt';
      const direction =
        searchParams.get('direction') || config.defaultSort?.direction || 'desc';
      const include = searchParams.get('include');

      // tenantId is auto-injected by the $extends middleware; do NOT add it
      // to `where` here.
      const where: any = {};

      if (search && config.searchFields && config.searchFields.length > 0) {
        where.OR = config.searchFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        }));
      }

      searchParams.forEach((value, key) => {
        if (key.startsWith('filter[') && key.endsWith(']')) {
          const field = key.slice(7, -1);
          where[field] = value;
        }
      });

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
  });

  const POST = withAuthAndTenant(async (req, { db }) => {
    try {
      const model = getModel(db, config.modelName);
      const body = await req.json();

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

      if (config.hooks?.beforeCreate) {
        validatedData = await config.hooks.beforeCreate(validatedData, req);
      }

      // tenantId auto-injected on `data` by the extension; do not add it here.
      const record = await model.create({ data: validatedData });

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
  });

  return { GET, POST };
}

// ─── Single-resource routes (by id) ─────────────────────────────────────────

export function createRouteHandlersWithId(config: RouteFactoryConfig) {
  type IdParams = Promise<{ id: string }>;

  const GET = withAuthAndTenantParams<{ params: IdParams }>(
    async (req, { params }, { db }) => {
      try {
        const model = getModel(db, config.modelName);
        const { id } = await params;

        const includeParam = new URL(req.url).searchParams.get('include');
        const includeClause = buildIncludeClause(
          includeParam,
          config.allowedIncludes,
        );

        // where.tenantId is auto-injected by the extension; passing just `id`
        // is enough.
        const record = await model.findFirst({
          where: { id },
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
    },
  );

  const PATCH = withAuthAndTenantParams<{ params: IdParams }>(
    async (req, { params }, { db }) => {
      try {
        const model = getModel(db, config.modelName);
        const { id } = await params;
        const body = await req.json();

        const existing = await model.findFirst({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

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

        if (config.hooks?.beforeUpdate) {
          validatedData = await config.hooks.beforeUpdate(id, validatedData, req);
        }

        const record = await model.update({
          where: { id },
          data: validatedData,
        });

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
    },
  );

  const DELETE = withAuthAndTenantParams<{ params: IdParams }>(
    async (req, { params }, { db }) => {
      try {
        const model = getModel(db, config.modelName);
        const { id } = await params;

        const existing = await model.findFirst({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (config.hooks?.beforeDelete) {
          await config.hooks.beforeDelete(id, req);
        }

        await model.delete({ where: { id } });

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
    },
  );

  return { GET, PATCH, DELETE };
}
