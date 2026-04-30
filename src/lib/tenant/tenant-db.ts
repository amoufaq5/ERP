import { PrismaClient } from "@prisma/client";

const tenantClients = new Map<string, PrismaClient>();

export function getTenantDb(databaseUrl: string): PrismaClient {
  const existing = tenantClients.get(databaseUrl);
  if (existing) return existing;

  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  tenantClients.set(databaseUrl, client);
  return client;
}

export async function disconnectTenantDb(databaseUrl: string): Promise<void> {
  const client = tenantClients.get(databaseUrl);
  if (client) {
    await client.$disconnect();
    tenantClients.delete(databaseUrl);
  }
}

export async function disconnectAll(): Promise<void> {
  const promises = Array.from(tenantClients.values()).map((c) => c.$disconnect());
  await Promise.all(promises);
  tenantClients.clear();
}
