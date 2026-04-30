import { PrismaClient } from "@prisma/client";

const globalForMaster = globalThis as unknown as { masterPrisma: PrismaClient };

function createMasterClient(): PrismaClient {
  const url = process.env.MASTER_DATABASE_URL || "file:./prisma/master.db";
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export const masterDb = globalForMaster.masterPrisma || createMasterClient();

if (process.env.NODE_ENV !== "production") {
  globalForMaster.masterPrisma = masterDb;
}
