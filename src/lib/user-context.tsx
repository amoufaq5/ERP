"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "ADMIN" | "BUM" | "MARKETEER" | "DISTRICT_MANAGER" | "MEDICAL_REP" | "ACCOUNTANT" | "WAREHOUSE" | "HR";

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
  BUM: [
    "/dashboard", "/messages", "/tasks",
    "/crm/bum", "/crm/marketeer", "/crm/district-manager", "/crm/medical-rep",
    "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports",
    "/erp/finance", "/erp/accounting", "/erp/collections", "/erp/returns",
    "/reports", "/settings/profile",
  ],
  MARKETEER: [
    "/dashboard", "/messages", "/tasks",
    "/crm/marketeer", "/crm/district-manager", "/crm/medical-rep",
    "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports",
    "/settings/profile",
  ],
  DISTRICT_MANAGER: [
    "/dashboard", "/messages", "/tasks",
    "/crm/district-manager", "/crm/medical-rep",
    "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports",
    "/settings/profile",
  ],
  MEDICAL_REP: [
    "/dashboard", "/messages", "/tasks",
    "/crm/medical-rep", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests",
    "/settings/profile",
  ],
  ACCOUNTANT: [
    "/dashboard", "/messages", "/tasks",
    "/erp/finance", "/erp/accounting", "/erp/collections", "/erp/returns",
    "/reports", "/settings/profile",
  ],
  WAREHOUSE: [
    "/dashboard", "/messages", "/tasks",
    "/erp/inventory", "/erp/procurement", "/erp/returns",
    "/settings/profile",
  ],
  HR: [
    "/dashboard", "/messages", "/tasks",
    "/erp/hr",
    "/ats/jobs", "/ats/candidates", "/ats/interviews", "/ats/onboarding", "/ats/training",
    "/settings/profile",
  ],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrator",
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
}

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_USER = "pharma.currentUser";
const STORAGE_OVERRIDES = "pharma.navOverrides";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser>(DEMO_USERS[0]);
  const [navOverrides, setNavOverrides] = useState<Record<string, string[] | null>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER);
      if (saved) setUserState(JSON.parse(saved));
      const overrides = localStorage.getItem(STORAGE_OVERRIDES);
      if (overrides) setNavOverrides(JSON.parse(overrides));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

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

  // Compute allowed routes — user's override takes precedence over role defaults
  const override = navOverrides[user.id];
  const roleRoutes = ROLE_ROUTES[user.role] ?? [];
  const allowedRoutes = override ?? roleRoutes;
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
        allUsers: DEMO_USERS,
        navOverrides,
        setNavOverride,
        canAccess,
        allowedRoutes,
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
    };
  }
  return ctx;
}
