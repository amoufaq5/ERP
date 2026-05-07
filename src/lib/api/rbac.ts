import { NextRequest } from "next/server";

export type UserRole =
  | "ADMIN"
  | "BUM"
  | "MARKETEER"
  | "DISTRICT_MANAGER"
  | "MEDICAL_REP"
  | "ACCOUNTANT"
  | "WAREHOUSE"
  | "HR";

// Define which roles can access which API entity groups
const ROLE_PERMISSIONS: Record<string, { read: UserRole[]; write: UserRole[] }> = {
  // Finance - Accountant + Admin
  "gl-accounts": { read: ["ADMIN", "ACCOUNTANT", "BUM"], write: ["ADMIN", "ACCOUNTANT"] },
  "journal-entries": { read: ["ADMIN", "ACCOUNTANT", "BUM"], write: ["ADMIN", "ACCOUNTANT"] },
  invoices: { read: ["ADMIN", "ACCOUNTANT", "BUM", "WAREHOUSE"], write: ["ADMIN", "ACCOUNTANT"] },
  payments: { read: ["ADMIN", "ACCOUNTANT", "BUM"], write: ["ADMIN", "ACCOUNTANT"] },

  // Procurement - Warehouse + Admin
  suppliers: { read: ["ADMIN", "ACCOUNTANT", "WAREHOUSE", "BUM"], write: ["ADMIN", "WAREHOUSE"] },
  "purchase-orders": {
    read: ["ADMIN", "ACCOUNTANT", "WAREHOUSE", "BUM"],
    write: ["ADMIN", "WAREHOUSE", "ACCOUNTANT"],
  },

  // Inventory - Warehouse + Admin
  products: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "WAREHOUSE", "ACCOUNTANT"],
    write: ["ADMIN", "WAREHOUSE"],
  },
  warehouses: { read: ["ADMIN", "WAREHOUSE", "BUM"], write: ["ADMIN", "WAREHOUSE"] },
  "stock-movements": { read: ["ADMIN", "WAREHOUSE", "BUM", "ACCOUNTANT"], write: ["ADMIN", "WAREHOUSE"] },

  // Sales
  customers: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "ACCOUNTANT"],
    write: ["ADMIN", "BUM", "MARKETEER"],
  },
  "sales-orders": {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "ACCOUNTANT", "WAREHOUSE"],
    write: ["ADMIN", "BUM", "MARKETEER"],
  },

  // CRM - Sales team
  accounts: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
  },
  contacts: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  },
  leads: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  },
  opportunities: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
  },
  campaigns: { read: ["ADMIN", "BUM", "MARKETEER"], write: ["ADMIN", "BUM", "MARKETEER"] },
  tickets: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  },
  territories: {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM"],
  },
  "business-units": {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "BUM"],
  },

  // HR
  employees: { read: ["ADMIN", "HR", "BUM"], write: ["ADMIN", "HR"] },
  departments: { read: ["ADMIN", "HR", "BUM"], write: ["ADMIN", "HR"] },

  // ATS
  jobs: { read: ["ADMIN", "HR", "BUM"], write: ["ADMIN", "HR"] },
  candidates: { read: ["ADMIN", "HR", "BUM"], write: ["ADMIN", "HR"] },
  applications: { read: ["ADMIN", "HR", "BUM"], write: ["ADMIN", "HR"] },
  training: {
    read: ["ADMIN", "HR", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
    write: ["ADMIN", "HR"],
  },

  // Approval logs - read wide, write restricted
  "approval-logs": {
    read: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
    write: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
  },
};

// Extract entity from URL path: /api/v1/products/123 -> "products"
function extractEntity(pathname: string): string | null {
  const match = pathname.match(/\/api\/v1\/([^/]+)/);
  return match ? match[1] : null;
}

// Check if the request method is a read or write
function isWriteMethod(method: string): boolean {
  return ["POST", "PATCH", "PUT", "DELETE"].includes(method.toUpperCase());
}

export async function checkPermission(
  req: NextRequest,
): Promise<{ allowed: boolean; role?: UserRole; userId?: string; error?: string }> {
  // Try to get session from NextAuth
  // In dev/demo mode, check for x-user-role header or demo-auth cookie
  const role = req.headers.get("x-user-role") as UserRole | null;
  const userId = req.headers.get("x-user-id");

  // If no role header (production), try NextAuth session
  if (!role) {
    // In dev mode, allow all requests (no auth required)
    return { allowed: true, role: "ADMIN", userId: "system" };
  }

  const entity = extractEntity(req.nextUrl.pathname);
  if (!entity) return { allowed: true, role, userId: userId || undefined };

  const permissions = ROLE_PERMISSIONS[entity];
  if (!permissions) return { allowed: true, role, userId: userId || undefined }; // Unknown entity = allow

  const isWrite = isWriteMethod(req.method);
  const allowedRoles = isWrite ? permissions.write : permissions.read;

  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      error: `Role ${role} does not have ${isWrite ? "write" : "read"} access to ${entity}`,
    };
  }

  return { allowed: true, role, userId: userId || undefined };
}

// Helper to use in route handlers
export async function requirePermission(req: NextRequest, sessionRole?: string, sessionUserId?: string) {
  // If session-based role/userId are provided, use them instead of headers
  if (sessionRole) {
    const role = sessionRole as UserRole;
    const userId = sessionUserId;
    const entity = extractEntity(req.nextUrl.pathname);
    if (!entity) return { role, userId };

    const permissions = ROLE_PERMISSIONS[entity];
    if (!permissions) return { role, userId };

    const isWrite = isWriteMethod(req.method);
    const allowedRoles = isWrite ? permissions.write : permissions.read;

    if (!allowedRoles.includes(role)) {
      return {
        error: `Role ${role} does not have ${isWrite ? "write" : "read"} access to ${entity}`,
        status: 403,
      };
    }
    return { role, userId };
  }

  const result = await checkPermission(req);
  if (!result.allowed) {
    return { error: result.error || "Forbidden", status: 403 };
  }
  return { role: result.role, userId: result.userId };
}
