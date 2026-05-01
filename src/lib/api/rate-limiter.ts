// Simple in-memory rate limiter using sliding window
// In production, use Redis. This is for dev/staging.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,   // 1 minute
  maxRequests: 100,    // 100 requests per minute
};

const WRITE_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,     // 30 writes per minute
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `${identifier}`;

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const userId = req.headers.get("x-user-id") || ip;
  return userId;
}

export { DEFAULT_CONFIG, WRITE_CONFIG };
