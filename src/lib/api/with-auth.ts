import { NextRequest } from "next/server";
import { requirePermission } from "./rbac";
import { apiError } from "./api-helpers";

export function withAuth(
  handler: (req: NextRequest, context: { role: string; userId: string }) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    const auth = await requirePermission(req);
    if ("error" in auth) {
      return apiError(auth.error as string, auth.status as number);
    }
    return handler(req, { role: auth.role || "ADMIN", userId: auth.userId || "system" });
  };
}
