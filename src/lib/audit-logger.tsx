"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface ChangeRecord {
  field: string;
  from: unknown;
  to: unknown;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  details?: string;
  /** Field-level changes (from audit-service) */
  changes?: ChangeRecord[];
  /** Arbitrary metadata (from audit-service) */
  metadata?: Record<string, unknown>;
  /** User agent string (from audit-service) */
  userAgent?: string;
}

export type AuditActionType =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "ESCALATE"
  | "LOGIN"
  | "EXPORT"
  | "IMPORT";

export type AuditModule = "ERP" | "CRM" | "HR" | "ATS" | "ADMIN" | "SYSTEM";

export interface AuditFilters {
  module?: string;
  entity?: string;
  action?: string;
  userId?: string;
  userName?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface AuditLoggerContextValue {
  logs: AuditEntry[];
  logAction: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
  getAuditLogs: (filters?: AuditFilters) => AuditEntry[];
  clearLogs: () => void;
}

const AuditLoggerContext = createContext<AuditLoggerContextValue | null>(null);

const AUDIT_API = "/api/v1/audit";

export function AuditLoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Fetch audit logs from API on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      try {
        const resp = await fetch(`${AUDIT_API}?limit=500`, {
          headers: { "Content-Type": "application/json" },
        });
        if (resp.ok) {
          const json = await resp.json();
          const data: AuditEntry[] = json.data ?? json ?? [];
          if (!cancelled && data.length > 0) {
            setLogs(data);
          }
        }
      } catch {
        // API unavailable -- logs remain empty until entries are created
      }
      if (!cancelled) setInitialized(true);
    }

    fetchLogs();
    return () => { cancelled = true; };
  }, []);

  const logAction = useCallback(
    (entry: Omit<AuditEntry, "id" | "timestamp">) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: `audit-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newEntry, ...prev]);

      // Persist to API (fire-and-forget)
      fetch(AUDIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      }).catch(() => {});
    },
    []
  );

  const getAuditLogs = useCallback(
    (filters?: AuditFilters): AuditEntry[] => {
      if (!filters) return logs;

      return logs.filter((entry) => {
        if (filters.module && filters.module !== "All" && entry.module !== filters.module) return false;
        if (filters.entity && filters.entity !== "All" && entry.entity !== filters.entity) return false;
        if (filters.action && filters.action !== "All" && entry.action !== filters.action) return false;
        if (filters.userId && entry.userId !== filters.userId) return false;
        if (filters.userName) {
          const nameQuery = filters.userName.toLowerCase();
          if (!entry.userName.toLowerCase().includes(nameQuery)) return false;
        }
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          from.setHours(0, 0, 0, 0);
          if (new Date(entry.timestamp) < from) return false;
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(entry.timestamp) > to) return false;
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const searchable = [
            entry.userName,
            entry.action,
            entry.module,
            entry.entity,
            entry.entityId,
            entry.entityName || "",
            entry.details || "",
            entry.userRole,
          ]
            .join(" ")
            .toLowerCase();
          if (!searchable.includes(q)) return false;
        }
        return true;
      });
    },
    [logs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    // Clear via API
    fetch(AUDIT_API, { method: "DELETE" }).catch(() => {});
  }, []);

  return (
    <AuditLoggerContext.Provider value={{ logs, logAction, getAuditLogs, clearLogs }}>
      {children}
    </AuditLoggerContext.Provider>
  );
}

export function useAuditLogger(): AuditLoggerContextValue {
  const ctx = useContext(AuditLoggerContext);
  if (!ctx) {
    throw new Error("useAuditLogger must be used inside AuditLoggerProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases for consolidated audit systems
// ---------------------------------------------------------------------------

// --- From audit-trail.tsx (AuditProvider / useAuditTrail) ---

/** @deprecated Use AuditLoggerProvider instead */
export const AuditProvider = AuditLoggerProvider;

/**
 * Backward-compatible hook matching the old audit-trail.tsx interface.
 * Maps `log`, `getByModule`, `getByUser`, `getRecent` onto AuditLoggerProvider.
 * @deprecated Use useAuditLogger instead
 */
export function useAuditTrail() {
  const { logs, logAction, getAuditLogs } = useAuditLogger();

  return {
    entries: logs,
    log: (entry: Omit<AuditEntry, "id" | "timestamp" | "userRole"> & { userRole?: string }) => {
      logAction({ ...entry, userRole: entry.userRole ?? "" });
    },
    getByModule: (module: string) =>
      logs.filter((e) => e.module === module),
    getByUser: (userId: string) =>
      logs.filter((e) => e.userId === userId),
    getRecent: (count: number) => logs.slice(0, count),
  };
}

// --- From audit/audit-context.tsx (AuditServiceProvider / useAudit) ---

/** @deprecated Use AuditLoggerProvider instead */
export const AuditServiceProvider = AuditLoggerProvider;

/**
 * Backward-compatible hook matching the old audit/audit-context.tsx interface.
 * @deprecated Use useAuditLogger instead
 */
export function useAudit() {
  const { logAction, getAuditLogs } = useAuditLogger();

  return {
    logAction: (
      action: string,
      entity: string,
      entityId: string,
      entityName?: string,
      changes?: { field: string; from: unknown; to: unknown }[],
      metadata?: Record<string, unknown>
    ): AuditEntry => {
      const entry: Omit<AuditEntry, "id" | "timestamp"> = {
        userId: "",
        userName: "",
        userRole: "",
        action,
        module: "",
        entity,
        entityId,
        entityName,
        details: entityName
          ? `${action} on ${entity} "${entityName}"`
          : `${action} on ${entity} ${entityId}`,
      };
      logAction(entry);
      // Return a synthetic entry to match the old interface
      return {
        ...entry,
        id: `audit-compat-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    },
    getLog: (filters?: AuditFilters) => getAuditLogs(filters),
  };
}

// --- From audit/audit-service.ts (enums, types, functions) ---

export enum AuditActionEnum {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  ESCALATE = "ESCALATE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  EXPORT = "EXPORT",
  VIEW_SENSITIVE = "VIEW_SENSITIVE",
  ROLE_CHANGE = "ROLE_CHANGE",
  SETTINGS_CHANGE = "SETTINGS_CHANGE",
}

export enum AuditEntityEnum {
  USER = "USER",
  DOCTOR = "DOCTOR",
  VISIT = "VISIT",
  WEEKLY_PLAN = "WEEKLY_PLAN",
  MARKET_REQUEST = "MARKET_REQUEST",
  EXPENSE = "EXPENSE",
  BUSINESS_UNIT = "BUSINESS_UNIT",
  TERRITORY = "TERRITORY",
  ACCOUNT = "ACCOUNT",
  LEAD = "LEAD",
  CAMPAIGN = "CAMPAIGN",
  KPI = "KPI",
  SETTINGS = "SETTINGS",
  REPORT = "REPORT",
}

// Re-export enums under their original names for backward compatibility
export { AuditActionEnum as AuditAction, AuditEntityEnum as AuditEntity };

/**
 * Compute a list of field-level changes between two plain objects.
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): ChangeRecord[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: ChangeRecord[] = [];

  for (const key of allKeys) {
    const fromVal = before[key];
    const toVal = after[key];
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.push({ field: key, from: fromVal, to: toVal });
    }
  }

  return changes;
}

/**
 * Get the total number of stored audit entries.
 * Fetches from the API.
 * @deprecated Use useAuditLogger().logs.length instead
 */
export function getAuditLogCount(): number {
  // This is a sync function for backward compat -- returns 0 immediately.
  // In the new architecture, count is obtained from the React context.
  return 0;
}

/**
 * Retrieve audit log entries, optionally filtered.
 * Standalone function for use outside of React components.
 * Fetches from the API synchronously via the in-memory approach.
 * @deprecated Prefer useAuditLogger().getAuditLogs() inside components
 */
export function getAuditLog(filters?: AuditFilters): AuditEntry[] {
  // This sync function cannot call fetch, so return empty array.
  // Use the React hook useAuditLogger().getAuditLogs() instead.
  return [];
}

/**
 * Clear all audit entries via API.
 * @deprecated Use useAuditLogger().clearLogs() instead
 */
export function clearAuditLog(): void {
  fetch(AUDIT_API, { method: "DELETE" }).catch(() => {});
}
