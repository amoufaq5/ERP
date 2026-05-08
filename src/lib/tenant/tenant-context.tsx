"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Tenant } from "./tenant-types";
import { tenantStore } from "./tenant-store";

// ─── Context Shape ──────────────────────────────────────────────────

interface TenantContextValue {
  /** Currently active tenant (null while loading) */
  tenant: Tenant | null;
  /** Manually override the active tenant */
  setTenant: (tenant: Tenant | null) => void;
  /** True during initial tenant resolution */
  isLoading: boolean;
  /** All available tenants */
  tenants: Tenant[];
  /** Switch to a different tenant by slug */
  switchTenant: (slug: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

// ─── Subdomain Extraction ───────────────────────────────────────────

function extractSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== "www" && sub !== "app") return sub;
  }
  return null;
}

// ─── CSS Variable Application ───────────────────────────────────────

function applyTenantTheme(tenant: Tenant | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (tenant?.primaryColor) {
    root.style.setProperty("--tenant-primary", tenant.primaryColor);

    // Convert hex to HSL values for shadcn compatibility
    const hex = tenant.primaryColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    root.style.setProperty(
      "--tenant-primary-hsl",
      `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    );
  } else {
    root.style.removeProperty("--tenant-primary");
    root.style.removeProperty("--tenant-primary-hsl");
  }
}

// ─── localStorage key for persisted selection ───────────────────────

const SELECTED_TENANT_KEY = "pharma.selected-tenant-slug";

// ─── Provider ───────────────────────────────────────────────────────

interface TenantProviderProps {
  children: ReactNode;
  /** Optional initial slug (e.g. from server-side resolution) */
  initialSlug?: string;
}

export function TenantProvider({ children, initialSlug }: TenantProviderProps) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Load all tenants and resolve the current one
  useEffect(() => {
    const allTenants = tenantStore.getTenants();
    setTenants(allTenants);

    let resolved: Tenant | undefined;

    // 1. Try initialSlug prop
    if (initialSlug) {
      resolved = tenantStore.getTenantBySlug(initialSlug);
    }

    // 2. Try URL subdomain
    if (!resolved) {
      const subdomain = extractSubdomain();
      if (subdomain) {
        resolved = tenantStore.getTenantBySlug(subdomain);
      }
    }

    // 3. Try persisted selection from localStorage
    if (!resolved) {
      try {
        const stored = localStorage.getItem(SELECTED_TENANT_KEY);
        if (stored) {
          resolved = tenantStore.getTenantBySlug(stored);
        }
      } catch {
        // localStorage unavailable
      }
    }

    // 4. Fall back to first active tenant
    if (!resolved) {
      resolved = allTenants.find((t) => t.isActive);
    }

    if (resolved) {
      setTenantState(resolved);
      applyTenantTheme(resolved);
    }

    setIsLoading(false);
  }, [initialSlug]);

  const setTenant = useCallback((t: Tenant | null) => {
    setTenantState(t);
    applyTenantTheme(t);
    if (t) {
      try {
        localStorage.setItem(SELECTED_TENANT_KEY, t.slug);
      } catch {
        // ignore
      }
    }
  }, []);

  const switchTenant = useCallback(
    (slug: string) => {
      const target = tenantStore.getTenantBySlug(slug);
      if (target) {
        setTenant(target);
        // Refresh tenant list in case data changed
        setTenants(tenantStore.getTenants());
      }
    },
    [setTenant]
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      setTenant,
      isLoading,
      tenants,
      switchTenant,
    }),
    [tenant, setTenant, isLoading, tenants, switchTenant]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within a <TenantProvider>");
  }
  return ctx;
}
