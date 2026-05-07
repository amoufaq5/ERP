"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";

export type UserRole = "ADMIN" | "NSM" | "BUM" | "MARKETEER" | "DISTRICT_MANAGER" | "MEDICAL_REP" | "ACCOUNTANT" | "WAREHOUSE" | "HR";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  territory?: string;
}

// Default demo users — admin can edit per-user nav overrides via settings
export const DEMO_USERS: AppUser[] = [
  { id: "u-admin", name: "System Administrator", email: "admin@pharma.com", role: "ADMIN", department: "IT" },
  { id: "u-nsm", name: "Eng. Tarek Mansour", email: "tarek@pharma.com", role: "NSM", department: "Sales & Marketing" },
  { id: "u-bum", name: "Dr. Hossam Tarek", email: "hossam@pharma.com", role: "BUM", department: "Executive" },
  { id: "u-mkt-1", name: "Dr. Yasmin Salem", email: "yasmin@pharma.com", role: "MARKETEER", department: "Marketing", territory: "North Region" },
  { id: "u-dm-1", name: "Ahmed Mostafa", email: "ahmed.m@pharma.com", role: "DISTRICT_MANAGER", department: "Sales", territory: "Cairo North" },
  { id: "u-rep-1", name: "Mohamed El-Sayed", email: "mohamed@pharma.com", role: "MEDICAL_REP", department: "Sales", territory: "Giza" },
  { id: "u-acc-1", name: "Fatima El-Masry", email: "fatima@pharma.com", role: "ACCOUNTANT", department: "Finance" },
  { id: "u-wh-1", name: "Khaled Farouk", email: "khaled@pharma.com", role: "WAREHOUSE", department: "Warehouse" },
  { id: "u-hr-1", name: "Laila Abdel-Rahman", email: "laila@pharma.com", role: "HR", department: "Human Resources" },
];

// Each route is identified by href; these are the ACLs per role.
// ADMIN always has full access and can override per-user in settings.
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  NSM: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/bum", "/crm/my-team", "/crm/district-manager", "/crm/medical-rep",
    "/crm/business-units", "/crm/territories", "/crm/weekly-plan", "/crm/doctors",
    "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis",
    "/crm/call-analysis", "/crm/expenses", "/crm/product-guide",
    "/ats/training",
    "/reports", "/settings", "/settings/profile",
  ],
  BUM: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/bum", "/crm/my-team", "/crm/district-manager", "/crm/medical-rep",
    "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses", "/crm/product-guide",
    "/ats/training",
    "/reports", "/settings", "/settings/profile",
  ],
  MARKETEER: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/marketeer", "/crm/district-manager", "/crm/medical-rep",
    "/crm/business-units", "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  DISTRICT_MANAGER: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/tickets",
    "/crm/district-manager", "/crm/medical-rep",
    "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  MEDICAL_REP: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/tickets",
    "/crm/medical-rep", "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/kpis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  ACCOUNTANT: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/finance", "/hubs/supply-chain",
    "/erp/finance", "/erp/accounting", "/erp/collections", "/erp/returns", "/erp/partner-ledger", "/erp/partner-detail",
    "/erp/procurement", "/erp/sales-order", "/erp/products",
    "/reports", "/settings/profile",
  ],
  WAREHOUSE: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/supply-chain",
    "/erp/inventory", "/erp/products", "/erp/procurement", "/erp/sales-order", "/erp/returns",
    "/supply-chain",
    "/settings/profile",
  ],
  HR: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/hr",
    "/erp/hr",
    "/ats/jobs", "/ats/candidates", "/ats/interviews", "/ats/onboarding", "/ats/training",
    "/crm/expenses",
    "/settings", "/settings/profile",
  ],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrator",
  NSM: "National Sales Manager",
  BUM: "Business Unit Manager",
  MARKETEER: "Marketeer",
  DISTRICT_MANAGER: "District Manager",
  MEDICAL_REP: "Medical Representative",
  ACCOUNTANT: "Accountant",
  WAREHOUSE: "Warehouse Manager",
  HR: "HR Manager",
};

interface UserContextValue {
  user: AppUser;
  setUser: (u: AppUser) => void;
  allUsers: AppUser[];
  // Per-user nav overrides: userId -> array of allowed hrefs (null = use role default)
  navOverrides: Record<string, string[] | null>;
  setNavOverride: (userId: string, allowedHrefs: string[] | null) => void;
  canAccess: (href: string) => boolean;
  allowedRoutes: string[];
  // User CRUD (admin only)
  createUser: (u: Omit<AppUser, "id"> & { id?: string }) => AppUser;
  updateUser: (userId: string, patch: Partial<AppUser>) => void;
  deleteUser: (userId: string) => void;
  // Helpers for scoping
  getReportsOf: (managerId: string) => AppUser[];
}

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_USER = "pharma.currentUser";
const STORAGE_OVERRIDES = "pharma.navOverrides";
const STORAGE_ALL_USERS = "pharma.allUsers";

function genUserId(): string {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [user, setUserState] = useState<AppUser>(DEMO_USERS[0]);
  const [allUsers, setAllUsers] = useState<AppUser[]>(DEMO_USERS);
  const [navOverrides, setNavOverrides] = useState<Record<string, string[] | null>>({});
  const [ready, setReady] = useState(false);

  // Sync from NextAuth session when it becomes available
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const sessionUser = session.user;
      // Find matching demo user or construct from session
      const matchedDemo = DEMO_USERS.find((u) => u.id === sessionUser.id || u.email === sessionUser.email);
      const resolvedUser: AppUser = matchedDemo ?? {
        id: sessionUser.id || "u-session",
        name: sessionUser.name || "User",
        email: sessionUser.email || "",
        role: (sessionUser.role as UserRole) || "MEDICAL_REP",
        department: sessionUser.department || "",
        territory: sessionUser.territory,
      };
      setUserState(resolvedUser);
      try {
        localStorage.setItem(STORAGE_USER, JSON.stringify(resolvedUser));
      } catch {
        // ignore
      }
    }
  }, [session, sessionStatus]);

  useEffect(() => {
    try {
      // Only read localStorage user if we don't have a NextAuth session
      if (sessionStatus !== "authenticated") {
        const saved = localStorage.getItem(STORAGE_USER);
        if (saved) setUserState(JSON.parse(saved));
      }
      const overrides = localStorage.getItem(STORAGE_OVERRIDES);
      if (overrides) setNavOverrides(JSON.parse(overrides));
      const savedUsers = localStorage.getItem(STORAGE_ALL_USERS);
      if (savedUsers) {
        const parsed: AppUser[] = JSON.parse(savedUsers);
        // Merge with demo users so seed user list is always present
        const merged = [...DEMO_USERS];
        parsed.forEach((u) => {
          const existing = merged.findIndex((m) => m.id === u.id);
          if (existing >= 0) {
            merged[existing] = u;
          } else {
            merged.push(u);
          }
        });
        setAllUsers(merged);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, [sessionStatus]);

  function persistUsers(next: AppUser[]) {
    try {
      localStorage.setItem(STORAGE_ALL_USERS, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function setUser(u: AppUser) {
    setUserState(u);
    try {
      localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    } catch {
      // ignore
    }
  }

  function setNavOverride(userId: string, allowedHrefs: string[] | null) {
    setNavOverrides((prev) => {
      const next = { ...prev, [userId]: allowedHrefs };
      try {
        localStorage.setItem(STORAGE_OVERRIDES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function createUser(u: Omit<AppUser, "id"> & { id?: string }): AppUser {
    const newUser: AppUser = { ...u, id: u.id ?? genUserId() } as AppUser;
    setAllUsers((prev) => {
      const next = [...prev, newUser];
      persistUsers(next);
      return next;
    });
    return newUser;
  }

  function updateUser(userId: string, patch: Partial<AppUser>) {
    setAllUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? { ...u, ...patch } : u));
      persistUsers(next);
      return next;
    });
    // If editing current user, update the active user too
    if (user.id === userId) {
      const updated = { ...user, ...patch };
      setUserState(updated);
      try {
        localStorage.setItem(STORAGE_USER, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }

  function deleteUser(userId: string) {
    // Don't allow deleting the admin seed user
    if (userId === "u-admin") return;
    setAllUsers((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      persistUsers(next);
      return next;
    });
  }

  function getReportsOf(managerId: string): AppUser[] {
    const manager = allUsers.find((u) => u.id === managerId);
    if (!manager) return [];
    // Simple hierarchy: DM manages reps in same territory/region;
    // Marketeer manages DMs; BUM manages marketeers & DMs in their BU.
    // NSM oversees all BUMs, DMs, and reps.
    if (manager.role === "NSM") {
      return allUsers.filter(
        (u) => u.role === "BUM" || u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP"
      );
    }
    if (manager.role === "DISTRICT_MANAGER") {
      return allUsers.filter((u) => u.role === "MEDICAL_REP" && u.department === manager.department);
    }
    if (manager.role === "MARKETEER") {
      return allUsers.filter(
        (u) => u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP"
      );
    }
    if (manager.role === "BUM") {
      return allUsers.filter(
        (u) => u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP"
      );
    }
    return [];
  }

  // Compute allowed routes — merge overrides with role defaults so new routes are never hidden
  const roleRoutes = ROLE_ROUTES[user.role] ?? [];
  const override = navOverrides[user.id];
  const allowedRoutes = override
    ? Array.from(new Set([...roleRoutes, ...override]))
    : roleRoutes;
  const hasFullAccess = allowedRoutes.includes("*") || user.role === "ADMIN";

  function canAccess(href: string): boolean {
    if (hasFullAccess) return true;
    return allowedRoutes.some((r) => href === r || href.startsWith(r + "/"));
  }

  // Avoid hydration mismatch by rendering children only after localStorage read
  if (!ready) {
    return <>{children}</>;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        allUsers,
        navOverrides,
        setNavOverride,
        canAccess,
        allowedRoutes,
        createUser,
        updateUser,
        deleteUser,
        getReportsOf,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    // Safe fallback when used outside provider — return full-access admin
    return {
      user: DEMO_USERS[0],
      setUser: () => {},
      allUsers: DEMO_USERS,
      navOverrides: {},
      setNavOverride: () => {},
      canAccess: () => true,
      allowedRoutes: ["*"],
      createUser: (u) => ({ ...u, id: u.id ?? "u-stub" } as AppUser),
      updateUser: () => {},
      deleteUser: () => {},
      getReportsOf: () => [],
    };
  }
  return ctx;
}
