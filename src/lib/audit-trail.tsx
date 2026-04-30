"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "EXPORT" | "LOGIN" | "LOGOUT" | "APPROVE" | "REJECT";
  module: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

interface AuditContextValue {
  entries: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
  getByModule: (module: string) => AuditEntry[];
  getByUser: (userId: string) => AuditEntry[];
  getRecent: (count: number) => AuditEntry[];
}

const AuditContext = createContext<AuditContextValue | null>(null);

const SEED_ENTRIES: AuditEntry[] = [
  { id: "aud-001", userId: "admin-001", userName: "Admin User", action: "CREATE", module: "Finance", entity: "Invoice", entityId: "INV-2024-015", details: "Created invoice for TechCorp Solutions - EGP 45,000", timestamp: "2026-04-24T10:30:00Z" },
  { id: "aud-002", userId: "acc-001", userName: "Fatma Ali", action: "APPROVE", module: "Procurement", entity: "Purchase Order", entityId: "PO-2026-047", details: "Approved PO for API raw materials - EGP 120,000", timestamp: "2026-04-24T09:15:00Z" },
  { id: "aud-003", userId: "hr-001", userName: "Noura Saeed", action: "UPDATE", module: "HR", entity: "Employee", entityId: "EMP-042", details: "Updated salary for Ahmed Hassan", timestamp: "2026-04-23T16:45:00Z" },
  { id: "aud-004", userId: "admin-001", userName: "Admin User", action: "EXPORT", module: "Reports", entity: "Financial Report", entityId: "RPT-Q1-2026", details: "Exported Q1 2026 financial summary", timestamp: "2026-04-23T14:20:00Z" },
  { id: "aud-005", userId: "mkt-001", userName: "Dina Mostafa", action: "CREATE", module: "CRM", entity: "Lead", entityId: "LEAD-789", details: "Created new lead - Pharma International Corp", timestamp: "2026-04-23T11:30:00Z" },
  { id: "aud-006", userId: "wh-001", userName: "Karim Tawfik", action: "UPDATE", module: "Inventory", entity: "Stock Movement", entityId: "SM-2026-334", details: "Received 5000 units of Amoxicillin 500mg", timestamp: "2026-04-22T15:00:00Z" },
  { id: "aud-007", userId: "rep-001", userName: "Omar Youssef", action: "CREATE", module: "CRM", entity: "Visit", entityId: "V-2026-1201", details: "Logged visit to Dr. Sarah Ahmed at Cairo University Hospital", timestamp: "2026-04-22T12:30:00Z" },
  { id: "aud-008", userId: "admin-001", userName: "Admin User", action: "DELETE", module: "System", entity: "User", entityId: "USR-TEMP-01", details: "Removed temporary test account", timestamp: "2026-04-21T09:00:00Z" },
];

export function AuditProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>(SEED_ENTRIES);

  const log = useCallback((entry: Omit<AuditEntry, "id" | "timestamp">) => {
    setEntries((prev) => [
      { ...entry, id: `aud-${Date.now()}`, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const getByModule = useCallback(
    (module: string) => entries.filter((e) => e.module === module),
    [entries]
  );

  const getByUser = useCallback(
    (userId: string) => entries.filter((e) => e.userId === userId),
    [entries]
  );

  const getRecent = useCallback(
    (count: number) => entries.slice(0, count),
    [entries]
  );

  return (
    <AuditContext.Provider value={{ entries, log, getByModule, getByUser, getRecent }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAuditTrail() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("useAuditTrail must be used inside AuditProvider");
  return ctx;
}
