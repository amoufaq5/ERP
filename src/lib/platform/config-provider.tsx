"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type AppConfig,
  type ModuleName,
  DEFAULT_CONFIG,
} from "@/lib/config-context";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfigState {
  config: AppConfig;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

interface ConfigContextValue {
  config: AppConfig;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UpdateConfigContextValue {
  updateConfig: (path: string, value: unknown) => Promise<void>;
  updateModule: (module: ModuleName, config: Partial<AppConfig[ModuleName]>) => Promise<void>;
  resetConfig: (path?: string) => Promise<void>;
  importConfig: (config: AppConfig) => Promise<{ success: boolean; errors: string[] }>;
  exportConfig: () => Promise<unknown>;
  isUpdating: boolean;
}

// ─── Contexts ───────────────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextValue | null>(null);
const UpdateConfigContext = createContext<UpdateConfigContextValue | null>(null);

// ─── API helper ─────────────────────────────────────────────────────────────

const CONFIG_API_BASE = "/api/v1/config";

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string; details?: string[] }> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `HTTP ${res.status}`, details: json.details };
  }
  return { success: true, data: json.data };
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface ConfigProviderProps {
  children: ReactNode;
  tenantId?: string;
  /**
   * Stale time in ms before refetching on focus (default: 60000 = 1 min).
   */
  staleTime?: number;
}

export function DatabaseConfigProvider({
  children,
  tenantId,
  staleTime = 60000,
}: ConfigProviderProps) {
  const [state, setState] = useState<ConfigState>({
    config: DEFAULT_CONFIG,
    isLoading: true,
    error: null,
    lastFetchedAt: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rollbackRef = useRef<AppConfig | null>(null);

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    if (tenantId) h["x-tenant-id"] = tenantId;
    return h;
  }, [tenantId]);

  // ─── Fetch config from API ──────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await fetchApi<AppConfig>(CONFIG_API_BASE, {
        signal: controller.signal,
        headers,
      });

      if (controller.signal.aborted) return;

      if (result.success && result.data) {
        setState({
          config: result.data,
          isLoading: false,
          error: null,
          lastFetchedAt: Date.now(),
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || "Failed to fetch config",
        }));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch config",
      }));
    }
  }, [headers]);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchConfig]);

  // Re-fetch on window focus if stale
  useEffect(() => {
    function onFocus() {
      const now = Date.now();
      if (!state.lastFetchedAt || now - state.lastFetchedAt > staleTime) {
        fetchConfig();
      }
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchConfig, staleTime, state.lastFetchedAt]);

  // ─── Update config (optimistic) ────────────────────────────────────────

  const updateConfig = useCallback(
    async (path: string, value: unknown) => {
      setIsUpdating(true);
      rollbackRef.current = state.config;

      // Optimistic update
      const keys = path.split(".");
      const optimistic = applyOptimisticUpdate(state.config, keys, value);
      setState((prev) => ({ ...prev, config: optimistic }));

      try {
        const result = await fetchApi<AppConfig>(CONFIG_API_BASE, {
          method: "PUT",
          headers,
          body: JSON.stringify({ path, value }),
        });

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            config: result.data!,
            lastFetchedAt: Date.now(),
          }));
        } else {
          // Rollback
          setState((prev) => ({
            ...prev,
            config: rollbackRef.current || DEFAULT_CONFIG,
            error: result.error || "Update failed",
          }));
        }
      } catch (err) {
        // Rollback
        setState((prev) => ({
          ...prev,
          config: rollbackRef.current || DEFAULT_CONFIG,
          error: err instanceof Error ? err.message : "Update failed",
        }));
      } finally {
        setIsUpdating(false);
        rollbackRef.current = null;
      }
    },
    [state.config, headers]
  );

  // ─── Update module config (optimistic) ─────────────────────────────────

  const updateModule = useCallback(
    async (module: ModuleName, config: Partial<AppConfig[ModuleName]>) => {
      setIsUpdating(true);
      rollbackRef.current = state.config;

      // Optimistic update
      const currentModule = state.config[module];
      const mergedModule = { ...currentModule, ...config };
      const optimistic = { ...state.config, [module]: mergedModule };
      setState((prev) => ({ ...prev, config: optimistic }));

      try {
        const result = await fetchApi<{ module: string; config: AppConfig[ModuleName] }>(
          `${CONFIG_API_BASE}/${module}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(config),
          }
        );

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            config: { ...prev.config, [module]: result.data!.config },
            lastFetchedAt: Date.now(),
          }));
        } else {
          // Rollback
          setState((prev) => ({
            ...prev,
            config: rollbackRef.current || DEFAULT_CONFIG,
            error: result.error || "Update failed",
          }));
        }
      } catch (err) {
        // Rollback
        setState((prev) => ({
          ...prev,
          config: rollbackRef.current || DEFAULT_CONFIG,
          error: err instanceof Error ? err.message : "Update failed",
        }));
      } finally {
        setIsUpdating(false);
        rollbackRef.current = null;
      }
    },
    [state.config, headers]
  );

  // ─── Reset config ─────────────────────────────────────────────────────

  const resetConfig = useCallback(
    async (path?: string) => {
      setIsUpdating(true);
      try {
        const result = await fetchApi<AppConfig>(CONFIG_API_BASE, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "reset", path }),
        });

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            config: result.data!,
            lastFetchedAt: Date.now(),
          }));
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Reset failed",
        }));
      } finally {
        setIsUpdating(false);
      }
    },
    [headers]
  );

  // ─── Import config ────────────────────────────────────────────────────

  const importConfig = useCallback(
    async (config: AppConfig): Promise<{ success: boolean; errors: string[] }> => {
      setIsUpdating(true);
      try {
        const result = await fetchApi<AppConfig>(CONFIG_API_BASE, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "import", config }),
        });

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            config: result.data!,
            lastFetchedAt: Date.now(),
          }));
          return { success: true, errors: [] };
        }

        return { success: false, errors: [result.error || "Import failed"] };
      } catch (err) {
        return {
          success: false,
          errors: [err instanceof Error ? err.message : "Import failed"],
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [headers]
  );

  // ─── Export config ────────────────────────────────────────────────────

  const exportConfig = useCallback(async (): Promise<unknown> => {
    const result = await fetchApi<unknown>(CONFIG_API_BASE, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "export" }),
    });
    return result.data;
  }, [headers]);

  // ─── Context values ───────────────────────────────────────────────────

  const configValue: ConfigContextValue = useMemo(
    () => ({
      config: state.config,
      isLoading: state.isLoading,
      error: state.error,
      refetch: fetchConfig,
    }),
    [state.config, state.isLoading, state.error, fetchConfig]
  );

  const updateValue: UpdateConfigContextValue = useMemo(
    () => ({
      updateConfig,
      updateModule,
      resetConfig,
      importConfig,
      exportConfig,
      isUpdating,
    }),
    [updateConfig, updateModule, resetConfig, importConfig, exportConfig, isUpdating]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <UpdateConfigContext.Provider value={updateValue}>
        {children}
      </UpdateConfigContext.Provider>
    </ConfigContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Access the full config and loading state.
 */
export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    return {
      config: DEFAULT_CONFIG,
      isLoading: false,
      error: null,
      refetch: async () => {},
    };
  }
  return ctx;
}

/**
 * Access a specific module's config.
 */
export function useModuleConfig<M extends ModuleName>(module: M): {
  config: AppConfig[M];
  isLoading: boolean;
  error: string | null;
} {
  const { config, isLoading, error } = useConfig();
  return useMemo(
    () => ({ config: config[module], isLoading, error }),
    [config, module, isLoading, error]
  );
}

/**
 * Access config update functions.
 */
export function useUpdateConfig(): UpdateConfigContextValue {
  const ctx = useContext(UpdateConfigContext);
  if (!ctx) {
    return {
      updateConfig: async () => {},
      updateModule: async () => {},
      resetConfig: async () => {},
      importConfig: async () => ({ success: false, errors: ["No provider"] }),
      exportConfig: async () => null,
      isUpdating: false,
    };
  }
  return ctx;
}

// ─── Helper: apply optimistic update via dot-path ───────────────────────────

function applyOptimisticUpdate(
  config: AppConfig,
  keys: string[],
  value: unknown
): AppConfig {
  if (keys.length === 0) return config;

  const result = { ...config } as Record<string, unknown>;
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = current[key];
    if (next !== null && typeof next === "object" && !Array.isArray(next)) {
      current[key] = { ...(next as Record<string, unknown>) };
    } else {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result as unknown as AppConfig;
}

// Re-export the ModuleName type for convenience
export type { ModuleName } from "@/lib/config-context";
