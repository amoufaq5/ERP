import { PrismaClient } from '@prisma/client';
import { withAuditLogging } from './audit-middleware';
import { withTenantIsolation } from './tenant-middleware';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Apply middleware chain
  const withAudit = withAuditLogging(base);
  const withTenant = withTenantIsolation(withAudit);

  return withTenant;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export { setTenantContext, clearTenantContext, getTenantContext } from './tenant-middleware';
export { auditLogger } from './audit-middleware';
