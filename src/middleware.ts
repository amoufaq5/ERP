import { NextRequest, NextResponse } from "next/server";

// ─── Constants ───────────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/icons",
  "/manifest.json",
  "/sw.js",
];

const STATIC_EXTENSIONS = [".svg", ".png", ".jpg", ".css", ".js", ".ico", ".woff2", ".woff"];

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Routes exempt from CSRF validation */
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/",
  "/api/v1/webhooks/",
];

const CSRF_EXEMPT_EXACT = [
  "/api/v1/health",
  "/api/v1/events",
];

const CSRF_COOKIE_NAME = "csrf-token";

const RATE_LIMIT_DEFAULT = 100;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.includes(".") &&
    !pathname.endsWith("/") &&
    STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  );
}

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_EXACT.includes(pathname)) {
    return true;
  }
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
}

function addRateLimitHeaders(response: NextResponse): void {
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_DEFAULT));
  response.headers.set("X-RateLimit-Remaining", String(RATE_LIMIT_DEFAULT));
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // ─── CSRF Protection for API routes ────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // Add security headers to all API responses
    addSecurityHeaders(response);
    addRateLimitHeaders(response);

    // Read or generate CSRF token
    let csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    if (!csrfToken) {
      csrfToken = crypto.randomUUID();
    }

    // Always set/refresh the cookie on the response
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // JavaScript must read it
      sameSite: "strict",
      secure: isProduction,
      path: "/",
    });

    // Validate CSRF token on state-changing requests
    if (STATE_CHANGING_METHODS.has(request.method) && !isCsrfExempt(pathname)) {
      const headerToken = request.headers.get("x-csrf-token");

      // The cookie must already exist on the incoming request (not the one we
      // just generated) and the header must match it.
      const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json(
          { success: false, error: "CSRF token validation failed" },
          { status: 403 },
        );
      }
    }

    return response;
  }

  // ─── Page routes: add security headers + CSRF cookie ───────────────────
  const response = NextResponse.next();
  addSecurityHeaders(response);

  let csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
  }

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
  });

  // ─── Session check for authenticated pages ────────────────────────────
  const hasPlain = request.cookies.has("next-auth.session-token");
  const hasSecure = request.cookies.has("__Secure-next-auth.session-token");

  if (!hasPlain && !hasSecure) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);

    // Carry the CSRF cookie through redirects as well
    redirectResponse.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: isProduction,
      path: "/",
    });

    return redirectResponse;
  }

  // JWT verification and role checks happen in the dashboard layout
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
