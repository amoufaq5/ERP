import { PrismaClient } from "@prisma/client";

export type DatabaseType = "sqlite" | "postgresql";

export function detectDatabaseType(): DatabaseType {
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return "postgresql";
  }
  return "sqlite";
}

export function getDatabaseConfig() {
  const dbType = detectDatabaseType();
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";

  return {
    type: dbType,
    url: dbType === "sqlite" ? url : url.replace(/^postgres:\/\//, "postgresql://"),
    isProduction: process.env.NODE_ENV === "production",
    poolSize: dbType === "postgresql" ? parseInt(process.env.DB_POOL_SIZE || "10") : 1,
  };
}

let prisma: PrismaClient | null = null;

export function getDatabase(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: getDatabaseConfig().url } },
    });
  }
  return prisma;
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  type: DatabaseType;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  const config = getDatabaseConfig();
  try {
    const db = getDatabase();
    await db.$queryRawUnsafe("SELECT 1");
    return {
      connected: true,
      type: config.type,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      connected: false,
      type: config.type,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getTableStats(): Promise<{ table: string; count: number }[]> {
  const db = getDatabase();
  const config = getDatabaseConfig();

  const tables = [
    "User", "AuditLog", "Invoice", "Payment", "JournalEntry",
    "Product", "Warehouse", "SalesOrder", "PurchaseOrder",
    "Employee", "Department", "Lead", "Opportunity", "Account",
    "Contact", "Campaign", "Ticket", "Job", "Candidate",
  ];

  const results: { table: string; count: number }[] = [];

  for (const table of tables) {
    try {
      const sqlTable = config.type === "postgresql"
        ? `"${table}"`
        : `"${table}"`;
      const res = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${sqlTable}`);
      const count = Number((res as { count: number | bigint }[])[0]?.count || 0);
      results.push({ table, count });
    } catch {
      results.push({ table, count: -1 });
    }
  }

  return results;
}
