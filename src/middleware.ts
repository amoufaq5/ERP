import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type UserRole, ROLE_ROUTES } from "@/lib/auth/role-routes";

/** Routes that don't require authentication. */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/icons",
  "/manifest.json",
  "/sw.js",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Check if a user role is allowed to access a given pathname
 * based on the ROLE_ROUTES ACL from user-context.
 */
function isRoleAllowed(role: string, pathname: string): boolean {
  const routes = ROLE_ROUTES[role as UserRole];
  if (!routes) return false;
  // Wildcard = full access
  if (routes.includes("*")) return true;
  // Check if the pathname matches any allowed route
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes that aren't under /api/v1 (e.g., /api/auth is already handled above)
  // API v1 routes use their own withAuth middleware
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.includes(".") &&
    !pathname.endsWith("/") &&
    (pathname.endsWith(".svg") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".css") ||
      pathname.endsWith(".js") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".woff2") ||
      pathname.endsWith(".woff"))
  ) {
    return NextResponse.next();
  }

  // Check for valid session token (try both secure and plain cookie names)
  const secret = "pharma-erp-dev-secret-change-in-production";
  let token = await getToken({ req: request, secret });
  if (!token) {
    token = await getToken({ req: request, secret, cookieName: "next-auth.session-token" });
  }
  if (!token) {
    token = await getToken({ req: request, secret, cookieName: "__Secure-next-auth.session-token" });
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const role = (token.role as string) || "MEDICAL_REP";

  // ADMIN always has full access
  if (role !== "ADMIN" && !isRoleAllowed(role, pathname)) {
    // Redirect to dashboard if role is not allowed on this route
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
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
