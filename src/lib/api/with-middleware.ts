import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
  DEFAULT_CONFIG,
  WRITE_CONFIG,
} from "./rate-limiter";
import { logRequest } from "./request-logger";
import { apiError } from "./api-helpers";

export function withMiddleware(
  handler: (req: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest): Promise<Response> => {
    const start = Date.now();
    const clientId = getClientIdentifier(req);
    const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);

    // Rate limit check
    const rateLimitResult = checkRateLimit(
      `${clientId}:${isWrite ? "write" : "read"}`,
      isWrite ? WRITE_CONFIG : DEFAULT_CONFIG,
    );

    if (!rateLimitResult.allowed) {
      const duration = Date.now() - start;
      logRequest({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.nextUrl.pathname,
        status: 429,
        duration,
        userId: clientId,
        error: "Rate limit exceeded",
      });

      const resp = apiError("Too many requests. Please try again later.", 429);
      const headers = getRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([k, v]) => resp.headers.set(k, v));
      return resp;
    }

    // Execute handler
    let response: Response;
    let status = 200;
    let error: string | undefined;

    try {
      response = await handler(req);
      status = response.status;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      status = 500;
      response = apiError(error, 500);
    }

    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));

    // Log request
    const duration = Date.now() - start;
    logRequest({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.nextUrl.pathname,
      status,
      duration,
      userId: clientId,
      error,
    });

    return response;
  };
}
