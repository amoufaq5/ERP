import { PrismaClient } from '@prisma/client';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  orgUnitIds?: string[];
}

let currentContext: TenantContext | null = null;

export function setTenantContext(context: TenantContext): void {
  currentContext = context;
}

export function getTenantContext(): TenantContext | null {
  return currentContext;
}

export function clearTenantContext(): void {
  currentContext = null;
}

// Models that don't have tenantId (system-level)
const SYSTEM_MODELS = new Set(['User', 'Account', 'Session', 'VerificationToken', 'Tenant']);

export function withTenantIsolation(prisma: PrismaClient): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            args.where = { ...args.where, tenantId: currentContext.tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            args.where = { ...args.where, tenantId: currentContext.tenantId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }: { model: string; args: any; query: any }) {
          const result = await query(args);
          if (!SYSTEM_MODELS.has(model) && currentContext && result) {
            if ((result as any).tenantId && (result as any).tenantId !== currentContext.tenantId) {
              return null; // Tenant mismatch - treat as not found
            }
          }
          return result;
        },
        async create({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            args.data = { ...args.data, tenantId: currentContext.tenantId };
          }
          return query(args);
        },
        async update({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            // Verify the record belongs to this tenant before updating
            const existing = await prisma.$queryRawUnsafe(
              `SELECT "tenantId" FROM "${model}" WHERE id = $1`,
              (args.where as any).id
            ) as any[];
            if (existing.length > 0 && existing[0].tenantId !== currentContext.tenantId) {
              throw new Error('Access denied: record belongs to another tenant');
            }
          }
          return query(args);
        },
        async delete({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            const existing = await prisma.$queryRawUnsafe(
              `SELECT "tenantId" FROM "${model}" WHERE id = $1`,
              (args.where as any).id
            ) as any[];
            if (existing.length > 0 && existing[0].tenantId !== currentContext.tenantId) {
              throw new Error('Access denied: record belongs to another tenant');
            }
          }
          return query(args);
        },
        async count({ model, args, query }: { model: string; args: any; query: any }) {
          if (!SYSTEM_MODELS.has(model) && currentContext) {
            args.where = { ...args.where, tenantId: currentContext.tenantId };
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}
