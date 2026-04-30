import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const response = NextResponse.next();

  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
