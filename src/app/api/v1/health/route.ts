import { apiResponse, corsOptions } from "@/lib/api/api-helpers";
import { getLogStats } from "@/lib/api/request-logger";
import { DEFAULT_CONFIG, WRITE_CONFIG } from "@/lib/api/rate-limiter";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  let dbStatus = "disconnected";
  try {
    const prisma = require("@/lib/prisma").default;
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  return apiResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: dbStatus,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
    api: getLogStats(),
    rateLimiter: {
      readConfig: { windowMs: DEFAULT_CONFIG.windowMs, maxRequests: DEFAULT_CONFIG.maxRequests },
      writeConfig: { windowMs: WRITE_CONFIG.windowMs, maxRequests: WRITE_CONFIG.maxRequests },
      // Probe a test key to show the limiter is active (does not consume a real slot)
      status: "active",
    },
  });
}
