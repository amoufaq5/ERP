/**
 * Audit Trail Service
 *
 * Core audit logging infrastructure for the ERP/CRM system.
 * Stores audit entries in localStorage with auto-pruning at 10,000 entries.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum AuditAction {
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

export enum AuditEntity {
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

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ChangeRecord {
  field: string;
  from: unknown;
  to: unknown;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  changes?: ChangeRecord[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditFilters {
  userId?: string;
  entity?: AuditEntity | string;
  action?: AuditAction | string;
  dateRange?: { from?: string; to?: string };
  search?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "pharma-erp-audit-trail";
const MAX_ENTRIES = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Compute a list of field-level changes between two plain objects.
 * Returns only fields that differ.
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
    // Deep-equal via JSON for simplicity
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.push({ field: key, from: fromVal, to: toVal });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Storage layer
// ---------------------------------------------------------------------------

function readEntries(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

function writeEntries(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded — prune more aggressively
    try {
      const pruned = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      // give up silently
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create and persist a new audit entry.
 * Auto-prunes oldest entries when the log exceeds MAX_ENTRIES.
 */
export function createAuditEntry(
  entry: Omit<AuditEntry, "id" | "timestamp">
): AuditEntry {
  const newEntry: AuditEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  const entries = readEntries();
  entries.unshift(newEntry);

  // Auto-prune oldest when exceeding limit
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  writeEntries(entries);
  return newEntry;
}

/**
 * Retrieve audit log entries, optionally filtered.
 */
export function getAuditLog(filters?: AuditFilters): AuditEntry[] {
  const entries = readEntries();

  if (!filters) return entries;

  return entries.filter((entry) => {
    if (filters.userId && entry.userId !== filters.userId) return false;

    if (filters.entity && filters.entity !== "ALL" && entry.entity !== filters.entity) {
      return false;
    }

    if (filters.action && filters.action !== "ALL" && entry.action !== filters.action) {
      return false;
    }

    if (filters.dateRange) {
      const ts = new Date(entry.timestamp);
      if (filters.dateRange.from) {
        const from = new Date(filters.dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (ts < from) return false;
      }
      if (filters.dateRange.to) {
        const to = new Date(filters.dateRange.to);
        to.setHours(23, 59, 59, 999);
        if (ts > to) return false;
      }
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchable = [
        entry.userName,
        entry.userRole,
        entry.action,
        entry.entity,
        entry.entityId,
        entry.entityName ?? "",
        entry.ipAddress ?? "",
        JSON.stringify(entry.metadata ?? {}),
        JSON.stringify(entry.changes ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Get the total number of stored audit entries (no filtering).
 */
export function getAuditLogCount(): number {
  return readEntries().length;
}

/**
 * Clear all audit entries from localStorage.
 */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
