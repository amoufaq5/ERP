import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

/**
 * GET /api/auth/debug
 *
 * Debug endpoint restricted to ADMIN users and non-production environments.
 * Returns minimal session info for troubleshooting authentication issues.
 */
export async function GET(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug endpoint is disabled in production" },
      { status: 404 },
    );
  }

  // Require admin authentication
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized - admin access required" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    userId: (session.user as Record<string, unknown>)?.id ?? null,
    role,
  });
}
