// ─── In-memory rate limiter (single-instance / serverless-friendly) ─────────

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiterOptions {
  /** Time window in milliseconds. Default: 15 minutes. */
  windowMs?: number;
  /** Maximum requests allowed per window. Default: 100. */
  maxRequests?: number;
}

export interface RateLimiter {
  /** Check whether the given key is within the rate limit. */
  check(key: string): RateLimitResult;
  /** Reset a specific key (e.g. after successful auth). */
  reset(key: string): void;
}

/**
 * Create a simple in-memory rate limiter backed by a Map.
 *
 * Suitable for a single Next.js server instance. For multi-instance
 * deployments, swap this out for a Redis-backed implementation.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *
 * export async function POST(req: Request) {
 *   const ip = req.headers.get("x-forwarded-for") ?? "unknown";
 *   const { allowed, remaining, resetAt } = limiter.check(ip);
 *   if (!allowed) {
 *     return NextResponse.json(
 *       { error: "Too many requests", retryAfter: resetAt.toISOString() },
 *       { status: 429 },
 *     );
 *   }
 *   // ... handle request
 * }
 * ```
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.maxRequests ?? 100;

  const store = new Map<string, RateLimitEntry>();

  // Periodically evict expired entries to prevent unbounded memory growth.
  // Runs every windowMs or 60 s, whichever is larger.
  const cleanupInterval = Math.max(windowMs, 60_000);
  let cleanupTimer: ReturnType<typeof setInterval> | null = null;

  function ensureCleanup() {
    if (cleanupTimer !== null) return;
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (entry.resetAt <= now) {
          store.delete(key);
        }
      }
      // Stop the timer when the store is empty to avoid leaking in tests
      if (store.size === 0 && cleanupTimer !== null) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
      }
    }, cleanupInterval);

    // Allow the Node.js process to exit even if the timer is active
    if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
      cleanupTimer.unref();
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = store.get(key);

    // Window expired or first request — start a fresh window
    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
      ensureCleanup();
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(entry.resetAt),
      };
    }

    // Within the current window
    entry.count += 1;
    const allowed = entry.count <= maxRequests;
    return {
      allowed,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: new Date(entry.resetAt),
    };
  }

  function reset(key: string): void {
    store.delete(key);
  }

  return { check, reset };
}
