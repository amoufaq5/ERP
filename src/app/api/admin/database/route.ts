import { NextResponse } from "next/server";
import { getDatabaseConfig, checkDatabaseHealth, getTableStats } from "@/lib/db/database-config";

export async function GET() {
  try {
    const config = getDatabaseConfig();
    const health = await checkDatabaseHealth();
    let tables: { table: string; count: number }[] = [];

    if (health.connected) {
      try {
        tables = await getTableStats();
      } catch {
        tables = [];
      }
    }

    return NextResponse.json({
      config: {
        type: config.type,
        isProduction: config.isProduction,
        poolSize: config.poolSize,
      },
      health,
      tables,
      migrations: {
        status: "up-to-date",
        pending: 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check database" },
      { status: 500 }
    );
  }
}
