import { NextRequest, NextResponse } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes
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

  // Check for session cookie presence (either variant)
  const hasPlain = request.cookies.has("next-auth.session-token");
  const hasSecure = request.cookies.has("__Secure-next-auth.session-token");

  if (!hasPlain && !hasSecure) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // JWT verification and role checks happen in the dashboard layout
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
