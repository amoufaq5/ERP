import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static/API routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css")
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

  // --- Role-based route protection for admin routes ---
  if (pathname.startsWith("/admin/")) {
    const role = request.cookies.get("user-role")?.value;
    if (role && role !== "ADMIN") {
      const dashUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashUrl);
    }
  }

  const response = NextResponse.next();
  if (tenantSlug) response.headers.set("x-tenant-slug", tenantSlug);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
