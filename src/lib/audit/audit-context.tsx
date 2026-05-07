"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useCurrentUser } from "@/lib/user-context";
import {
  type AuditAction,
  type AuditEntity,
  type AuditEntry,
  type AuditFilters,
  type ChangeRecord,
  createAuditEntry,
  getAuditLog,
} from "./audit-service";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuditContextValue {
  /** Log an action, auto-filling user info from the current session. */
  logAction: (
    action: AuditAction,
    entity: AuditEntity,
    entityId: string,
    entityName?: string,
    changes?: ChangeRecord[],
    metadata?: Record<string, unknown>
  ) => AuditEntry;

  /** Retrieve filtered audit log. */
  getLog: (filters?: AuditFilters) => AuditEntry[];
}

const AuditCtx = createContext<AuditContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuditServiceProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();

  const logAction = useCallback(
    (
      action: AuditAction,
      entity: AuditEntity,
      entityId: string,
      entityName?: string,
      changes?: ChangeRecord[],
      metadata?: Record<string, unknown>
    ): AuditEntry => {
      return createAuditEntry({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        entity,
        entityId,
        entityName,
        changes,
        ipAddress: undefined, // not available client-side without an API call
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        metadata,
      });
    },
    [user]
  );

  const getLog = useCallback(
    (filters?: AuditFilters): AuditEntry[] => {
      return getAuditLog(filters);
    },
    []
  );

  return (
    <AuditCtx.Provider value={{ logAction, getLog }}>
      {children}
    </AuditCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the audit trail from any component within the AuditServiceProvider.
 */
export function useAudit(): AuditContextValue {
  const ctx = useContext(AuditCtx);
  if (!ctx) {
    throw new Error("useAudit must be used inside <AuditServiceProvider>");
  }
  return ctx;
}
