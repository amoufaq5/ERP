"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  plan: string;
  maxUsers: number;
  isActive: boolean;
}

interface TenantContextValue {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  setTenant: (t: TenantInfo | null) => void;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  error: null,
  setTenant: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch("/api/tenant/resolve");
        if (!res.ok) {
          if (res.status === 404) {
            setTenant(null);
            setLoading(false);
            return;
          }
          throw new Error("Failed to resolve tenant");
        }
        const data = await res.json();
        setTenant(data.tenant);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    resolve();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
