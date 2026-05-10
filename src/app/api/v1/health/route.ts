import { apiResponse, corsOptions } from "@/lib/api/api-helpers";
import { getLogStats } from "@/lib/api/request-logger";
import { DEFAULT_CONFIG, WRITE_CONFIG } from "@/lib/api/rate-limiter";
import { getCache } from "@/lib/cache/redis";
import { eventBus } from "@/lib/notifications/event-bus";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, ComponentHealth> = {};

  // Database check
  checks.database = await checkDatabase();

  // Cache check
  checks.cache = await checkCache();

  // Event bus check
  checks.eventBus = checkEventBus();

  // System resources
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

  const overallStatus = allHealthy ? 'healthy' : hasDegraded ? 'degraded' : 'unhealthy';

  return apiResponse({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    responseTimeMs: Date.now() - startTime,
    checks,
    uptime: process.uptime(),
    system: {
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
        unit: "MB",
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000),
        unit: "ms",
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    },
    api: getLogStats(),
    rateLimiter: {
      readConfig: { windowMs: DEFAULT_CONFIG.windowMs, maxRequests: DEFAULT_CONFIG.maxRequests },
      writeConfig: { windowMs: WRITE_CONFIG.windowMs, maxRequests: WRITE_CONFIG.maxRequests },
      status: "active",
    },
    connections: {
      eventBusSubscribers: eventBus.totalUsers,
    },
  }, allHealthy ? 200 : 503);
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const prisma = require("@/lib/prisma").default;
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

async function checkCache(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const cache = await getCache();
    const testKey = '__health_check__';
    await cache.set(testKey, 'ok', 10);
    const val = await cache.get(testKey);
    await cache.del(testKey);
    if (val === 'ok') {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return { status: 'degraded', latencyMs: Date.now() - start, message: 'Cache read/write mismatch' };
  } catch (err) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Cache unavailable (using fallback)',
    };
  }
}

function checkEventBus(): ComponentHealth {
  return {
    status: 'healthy',
    message: `${eventBus.totalUsers} connected users`,
  };
}
