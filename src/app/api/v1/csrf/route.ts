import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf-token";

/**
 * GET /api/v1/csrf
 *
 * Returns the current CSRF token from the cookie. If no token exists yet, the
 * middleware will have already generated one and set it on the response, so we
 * read the cookie from the incoming request. As a fallback, we generate a new
 * token here and set the cookie explicitly.
 */
export async function GET(request: NextRequest) {
  let csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  const isProduction = process.env.NODE_ENV === "production";

  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
  }

  const response = NextResponse.json(
    { success: true, data: { csrfToken } },
    { status: 200 },
  );

  // Ensure the cookie is set/refreshed
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
  });

  return response;
}
