import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { requirePermission } from "./rbac";
import { apiError } from "./api-helpers";

export function withAuth(
  handler: (req: NextRequest, context: { role: string; userId: string }) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    // Try NextAuth session first
    const session = await getServerSession(authOptions);

    if (session?.user) {
      // Session-based auth: validate RBAC permissions
      const auth = await requirePermission(req, session.user.role, session.user.id);
      if ("error" in auth) {
        return apiError(auth.error as string, auth.status as number);
      }
      return handler(req, {
        role: session.user.role || "ADMIN",
        userId: session.user.id || "system",
      });
    }

    // Fallback: use header-based auth (for API clients / dev mode)
    const auth = await requirePermission(req);
    if ("error" in auth) {
      return apiError(auth.error as string, auth.status as number);
    }
    return handler(req, { role: auth.role || "ADMIN", userId: auth.userId || "system" });
  };
}

/**
 * withAuth variant for dynamic [id] route handlers that receive Next.js route params
 * as a second argument. Checks auth then calls the handler with (req, params, authContext).
 */
export function withAuthParams<P>(
  handler: (
    req: NextRequest,
    params: P,
    context: { role: string; userId: string },
  ) => Promise<Response>,
) {
  return async (req: NextRequest, params: P) => {
    // Try NextAuth session first
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const auth = await requirePermission(req, session.user.role, session.user.id);
      if ("error" in auth) {
        return apiError(auth.error as string, auth.status as number);
      }
      return handler(req, params, {
        role: session.user.role || "ADMIN",
        userId: session.user.id || "system",
      });
    }

    // Fallback: use header-based auth (for API clients / dev mode)
    const auth = await requirePermission(req);
    if ("error" in auth) {
      return apiError(auth.error as string, auth.status as number);
    }
    return handler(req, params, { role: auth.role || "ADMIN", userId: auth.userId || "system" });
  };
}
