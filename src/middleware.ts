import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static/API routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // --- Tenant resolution ---
  const host = request.headers.get("host") || "";
  const parts = host.split(".");
  let tenantSlug: string | null = null;

  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== "www" && sub !== "app") {
      tenantSlug = sub;
    }
  }

  const headerSlug = request.headers.get("x-tenant-slug");
  if (headerSlug) tenantSlug = headerSlug;

  // --- Auth check (NextAuth JWT) ---
  // Login page is always accessible
  if (pathname === "/login" || pathname === "/") {
    const response = NextResponse.next();
    if (tenantSlug) response.headers.set("x-tenant-slug", tenantSlug);
    return response;
  }

  // Check for NextAuth session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "pharma-erp-dev-secret-change-in-production",
  });

  // Also check legacy localStorage token via cookie (backwards compat with demo login)
  const hasLegacyToken = request.cookies.get("demo-auth")?.value;

  // If no session and no legacy auth, allow through (the app handles its own auth redirect via localStorage)
  // In production, uncomment the redirect below:
  // if (!token && !hasLegacyToken) {
  //   const loginUrl = new URL("/login", request.url);
  //   return NextResponse.redirect(loginUrl);
  // }

  // --- Role-based route protection for admin routes ---
  if (pathname.startsWith("/admin/")) {
    if (token && token.role !== "ADMIN") {
      const dashUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashUrl);
    }
  }

  const response = NextResponse.next();
  if (tenantSlug) response.headers.set("x-tenant-slug", tenantSlug);
  if (token) {
    response.headers.set("x-user-role", token.role as string || "");
    response.headers.set("x-user-id", token.id as string || "");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
