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

const STORAGE_KEY = "pharma-erp-audit-logs";

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SEED_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "audit-seed-001",
    timestamp: "2026-05-01T08:02:14Z",
    userId: "u-admin",
    userName: "Ahmed Hassan",
    userRole: "ADMIN",
    action: "LOGIN",
    module: "SYSTEM",
    entity: "Session",
    entityId: "SES-20260501-001",
    details: "Ahmed Hassan logged in from 192.168.1.10",
    ipAddress: "192.168.1.10",
  },
  {
    id: "audit-seed-002",
    timestamp: "2026-05-01T08:15:30Z",
    userId: "u-acc-1",
    userName: "Sara El-Masry",
    userRole: "ACCOUNTANT",
    action: "CREATE",
    module: "ERP",
    entity: "Invoice",
    entityId: "INV-2025-007",
    entityName: "Invoice INV-2025-007",
    details: "Sara El-Masry created Invoice INV-2025-007 for Pharma Egypt Ltd - EGP 125,000",
    newValues: { customer: "Pharma Egypt Ltd", amount: 125000, currency: "EGP", status: "Draft" },
  },
  {
    id: "audit-seed-003",
    timestamp: "2026-05-01T08:32:00Z",
    userId: "u-mkt-1",
    userName: "Nadia Rizk",
    userRole: "MARKETEER",
    action: "APPROVE",
    module: "CRM",
    entity: "Expense",
    entityId: "EXP-042",
    entityName: "Expense EXP-042",
    details: "Nadia Rizk approved Expense EXP-042 - Travel to Alexandria for field visit - EGP 3,500",
    oldValues: { status: "Pending" },
    newValues: { status: "Approved", approvedBy: "Nadia Rizk" },
  },
  {
    id: "audit-seed-004",
    timestamp: "2026-05-01T09:10:22Z",
    userId: "u-wh-1",
    userName: "Omar Farouk",
    userRole: "WAREHOUSE",
    action: "UPDATE",
    module: "ERP",
    entity: "Product",
    entityId: "PRD-AUG-1G",
    entityName: "Augmentin 1g",
    details: "Omar Farouk updated Product Augmentin 1g - quantity 5000 to 4500",
    oldValues: { quantity: 5000, lastUpdated: "2026-04-28" },
    newValues: { quantity: 4500, lastUpdated: "2026-05-01" },
  },
  {
    id: "audit-seed-005",
    timestamp: "2026-05-01T09:25:00Z",
    userId: "u-dm-1",
    userName: "Khaled Mansour",
    userRole: "DISTRICT_MANAGER",
    action: "EXPORT",
    module: "CRM",
    entity: "Report",
    entityId: "RPT-SALES-Q1-2026",
    entityName: "Q1 2026 Sales Report",
    details: "Khaled Mansour exported Sales Report for Q1 2026 - North Cairo District",
    ipAddress: "10.0.0.55",
  },
  {
    id: "audit-seed-006",
    timestamp: "2026-05-01T09:45:11Z",
    userId: "u-admin",
    userName: "System Administrator",
    userRole: "ADMIN",
    action: "UPDATE",
    module: "ADMIN",
    entity: "User",
    entityId: "u-rep-2",
    entityName: "Mona Abdel-Nour",
    details: "Admin changed user role: Mona Abdel-Nour EMPLOYEE to MEDICAL_REP",
    oldValues: { role: "EMPLOYEE", department: "General" },
    newValues: { role: "MEDICAL_REP", department: "Sales" },
  },
  {
    id: "audit-seed-007",
    timestamp: "2026-05-01T10:00:00Z",
    userId: "system",
    userName: "System",
    userRole: "SYSTEM",
    action: "CREATE",
    module: "ERP",
    entity: "Product",
    entityId: "PRD-CARD-10",
    entityName: "Cardioprex 10mg",
    details: "System: Low stock alert triggered for Cardioprex 10mg - 120 units remaining (threshold: 200)",
  },
  {
    id: "audit-seed-008",
    timestamp: "2026-05-01T10:22:44Z",
    userId: "u-rep-1",
    userName: "Mohamed El-Sayed",
    userRole: "MEDICAL_REP",
    action: "CREATE",
    module: "CRM",
    entity: "Lead",
    entityId: "LEAD-2026-145",
    entityName: "Dr. Amira Shawky - Cardiology Clinic",
    details: "Mohamed El-Sayed created new lead - Dr. Amira Shawky, Cardiology Clinic, Heliopolis",
    newValues: { name: "Dr. Amira Shawky", specialty: "Cardiology", location: "Heliopolis", status: "New" },
  },
  {
    id: "audit-seed-009",
    timestamp: "2026-05-01T10:45:00Z",
    userId: "u-hr-1",
    userName: "Laila Abdel-Rahman",
    userRole: "HR",
    action: "CREATE",
    module: "HR",
    entity: "Employee",
    entityId: "EMP-2026-089",
    entityName: "Youssef Kamal",
    details: "Laila Abdel-Rahman onboarded new employee Youssef Kamal - Warehouse Assistant",
    newValues: { name: "Youssef Kamal", position: "Warehouse Assistant", department: "Warehouse", startDate: "2026-05-05" },
  },
  {
    id: "audit-seed-010",
    timestamp: "2026-05-01T11:05:33Z",
    userId: "u-bum",
    userName: "Dr. Hossam Tarek",
    userRole: "BUM",
    action: "APPROVE",
    module: "CRM",
    entity: "WeeklyPlan",
    entityId: "WP-2026-W18-DM1",
    entityName: "Weekly Plan W18 - Ahmed Mostafa",
    details: "Dr. Hossam Tarek approved Weekly Plan W18 for Ahmed Mostafa - 22 visits planned",
    oldValues: { status: "Submitted" },
    newValues: { status: "Approved", approvedBy: "Dr. Hossam Tarek", approvedAt: "2026-05-01T11:05:33Z" },
  },
  {
    id: "audit-seed-011",
    timestamp: "2026-05-01T11:20:00Z",
    userId: "u-acc-1",
    userName: "Sara El-Masry",
    userRole: "ACCOUNTANT",
    action: "UPDATE",
    module: "ERP",
    entity: "Invoice",
    entityId: "INV-2025-003",
    entityName: "Invoice INV-2025-003",
    details: "Sara El-Masry updated payment status for Invoice INV-2025-003 - EGP 78,500",
    oldValues: { paymentStatus: "Pending", paidAmount: 0 },
    newValues: { paymentStatus: "Partial", paidAmount: 40000 },
  },
  {
    id: "audit-seed-012",
    timestamp: "2026-05-01T11:40:15Z",
    userId: "u-wh-1",
    userName: "Khaled Farouk",
    userRole: "WAREHOUSE",
    action: "IMPORT",
    module: "ERP",
    entity: "Product",
    entityId: "BATCH-IMP-2026-05",
    entityName: "Stock Import May 2026",
    details: "Khaled Farouk imported stock data - 147 products updated from supplier shipment",
    newValues: { productsUpdated: 147, supplier: "MedPharma International", batchNo: "BATCH-IMP-2026-05" },
  },
  {
    id: "audit-seed-013",
    timestamp: "2026-05-01T12:00:00Z",
    userId: "u-dm-1",
    userName: "Ahmed Mostafa",
    userRole: "DISTRICT_MANAGER",
    action: "REJECT",
    module: "CRM",
    entity: "MarketRequest",
    entityId: "MR-2026-033",
    entityName: "Market Request MR-2026-033",
    details: "Ahmed Mostafa rejected Market Request MR-2026-033 - Sample request exceeds monthly quota",
    oldValues: { status: "Pending", requestedBy: "Mohamed El-Sayed" },
    newValues: { status: "Rejected", rejectionReason: "Exceeds monthly sample quota" },
  },
  {
    id: "audit-seed-014",
    timestamp: "2026-05-01T12:15:00Z",
    userId: "u-admin",
    userName: "System Administrator",
    userRole: "ADMIN",
    action: "UPDATE",
    module: "ADMIN",
    entity: "Settings",
    entityId: "SYS-CONFIG-001",
    entityName: "System Configuration",
    details: "Admin updated system settings - enabled two-factor authentication requirement",
    oldValues: { twoFactorRequired: false },
    newValues: { twoFactorRequired: true },
  },
  {
    id: "audit-seed-015",
    timestamp: "2026-05-01T12:30:00Z",
    userId: "u-rep-1",
    userName: "Mohamed El-Sayed",
    userRole: "MEDICAL_REP",
    action: "CREATE",
    module: "CRM",
    entity: "Visit",
    entityId: "VIS-2026-0501-001",
    entityName: "Visit to Dr. Samir Fahmy",
    details: "Mohamed El-Sayed logged visit to Dr. Samir Fahmy at Giza General Hospital - presented Augmentin 1g",
    newValues: { doctor: "Dr. Samir Fahmy", hospital: "Giza General Hospital", products: ["Augmentin 1g", "Cardioprex 10mg"] },
  },
  {
    id: "audit-seed-016",
    timestamp: "2026-04-30T16:45:00Z",
    userId: "u-mkt-1",
    userName: "Dr. Yasmin Salem",
    userRole: "MARKETEER",
    action: "CREATE",
    module: "CRM",
    entity: "Campaign",
    entityId: "CMP-2026-012",
    entityName: "Cardioprex Launch Campaign",
    details: "Dr. Yasmin Salem created campaign Cardioprex Launch Campaign - North Region, budget EGP 50,000",
    newValues: { name: "Cardioprex Launch Campaign", region: "North Region", budget: 50000, startDate: "2026-05-15" },
  },
  {
    id: "audit-seed-017",
    timestamp: "2026-04-30T15:30:00Z",
    userId: "u-acc-1",
    userName: "Fatima El-Masry",
    userRole: "ACCOUNTANT",
    action: "DELETE",
    module: "ERP",
    entity: "Invoice",
    entityId: "INV-2025-DRAFT-09",
    entityName: "Draft Invoice INV-2025-DRAFT-09",
    details: "Fatima El-Masry deleted draft Invoice INV-2025-DRAFT-09 - duplicate entry - EGP 12,000",
    oldValues: { customer: "Al-Nile Pharmacy", amount: 12000, status: "Draft" },
  },
  {
    id: "audit-seed-018",
    timestamp: "2026-04-30T14:20:00Z",
    userId: "u-hr-1",
    userName: "Laila Abdel-Rahman",
    userRole: "HR",
    action: "UPDATE",
    module: "HR",
    entity: "Employee",
    entityId: "EMP-2025-045",
    entityName: "Tarek Mahmoud",
    details: "Laila Abdel-Rahman updated employee record - Tarek Mahmoud promoted to Senior Medical Rep",
    oldValues: { title: "Medical Representative", salary: 15000 },
    newValues: { title: "Senior Medical Representative", salary: 18500, promotionDate: "2026-05-01" },
  },
  {
    id: "audit-seed-019",
    timestamp: "2026-04-30T13:00:00Z",
    userId: "u-bum",
    userName: "Dr. Hossam Tarek",
    userRole: "BUM",
    action: "ESCALATE",
    module: "CRM",
    entity: "Ticket",
    entityId: "TKT-2026-078",
    entityName: "Ticket TKT-2026-078",
    details: "Dr. Hossam Tarek escalated support ticket TKT-2026-078 - Product quality complaint from Cairo East Pharmacy",
    oldValues: { priority: "Medium", assignedTo: "Support Team" },
    newValues: { priority: "Critical", assignedTo: "Quality Assurance Director", escalatedBy: "Dr. Hossam Tarek" },
  },
  {
    id: "audit-seed-020",
    timestamp: "2026-04-30T11:45:00Z",
    userId: "u-wh-1",
    userName: "Khaled Farouk",
    userRole: "WAREHOUSE",
    action: "UPDATE",
    module: "ERP",
    entity: "Product",
    entityId: "PRD-AMX-500",
    entityName: "Amoxicillin 500mg",
    details: "Khaled Farouk received shipment - Amoxicillin 500mg - 10,000 units added to warehouse",
    oldValues: { quantity: 2500, lastReceived: "2026-04-15" },
    newValues: { quantity: 12500, lastReceived: "2026-04-30" },
  },
  {
    id: "audit-seed-021",
    timestamp: "2026-04-30T10:30:00Z",
    userId: "u-rep-1",
    userName: "Mohamed El-Sayed",
    userRole: "MEDICAL_REP",
    action: "UPDATE",
    module: "CRM",
    entity: "Lead",
    entityId: "LEAD-2026-098",
    entityName: "Dr. Fatma El-Zahri - Pediatrics",
    details: "Mohamed El-Sayed updated lead status - Dr. Fatma El-Zahri moved to Qualified",
    oldValues: { status: "Contacted", followUpDate: "2026-04-30" },
    newValues: { status: "Qualified", followUpDate: "2026-05-07", notes: "Interested in Augmentin pediatric formulation" },
  },
  {
    id: "audit-seed-022",
    timestamp: "2026-04-30T09:15:00Z",
    userId: "u-admin",
    userName: "System Administrator",
    userRole: "ADMIN",
    action: "CREATE",
    module: "ADMIN",
    entity: "User",
    entityId: "u-rep-3",
    entityName: "Rania Mostafa",
    details: "Admin created new user account - Rania Mostafa, Medical Representative, Alexandria District",
    newValues: { name: "Rania Mostafa", role: "MEDICAL_REP", department: "Sales", territory: "Alexandria" },
  },
  {
    id: "audit-seed-023",
    timestamp: "2026-04-30T08:05:00Z",
    userId: "u-mkt-1",
    userName: "Dr. Yasmin Salem",
    userRole: "MARKETEER",
    action: "LOGIN",
    module: "SYSTEM",
    entity: "Session",
    entityId: "SES-20260430-005",
    details: "Dr. Yasmin Salem logged in from mobile device",
    ipAddress: "172.16.0.88",
  },
  {
    id: "audit-seed-024",
    timestamp: "2026-04-29T17:00:00Z",
    userId: "u-acc-1",
    userName: "Fatima El-Masry",
    userRole: "ACCOUNTANT",
    action: "EXPORT",
    module: "ERP",
    entity: "Report",
    entityId: "RPT-FIN-APR-2026",
    entityName: "April 2026 Financial Report",
    details: "Fatima El-Masry exported April 2026 Financial Report - includes P&L and balance sheet",
    ipAddress: "192.168.1.22",
  },
  {
    id: "audit-seed-025",
    timestamp: "2026-04-29T15:30:00Z",
    userId: "u-dm-1",
    userName: "Ahmed Mostafa",
    userRole: "DISTRICT_MANAGER",
    action: "APPROVE",
    module: "CRM",
    entity: "Expense",
    entityId: "EXP-038",
    entityName: "Expense EXP-038",
    details: "Ahmed Mostafa approved Expense EXP-038 - Mohamed El-Sayed fuel reimbursement EGP 850",
    oldValues: { status: "Pending", submittedBy: "Mohamed El-Sayed" },
    newValues: { status: "Approved", approvedBy: "Ahmed Mostafa" },
  },
  {
    id: "audit-seed-026",
    timestamp: "2026-04-29T14:00:00Z",
    userId: "u-hr-1",
    userName: "Laila Abdel-Rahman",
    userRole: "HR",
    action: "CREATE",
    module: "ATS",
    entity: "Job",
    entityId: "JOB-2026-015",
    entityName: "Senior Pharmacist - Quality Control",
    details: "Laila Abdel-Rahman posted new job opening - Senior Pharmacist for Quality Control department",
    newValues: { title: "Senior Pharmacist", department: "Quality Control", type: "Full-Time", salary: "25000-35000 EGP" },
  },
  {
    id: "audit-seed-027",
    timestamp: "2026-04-29T12:00:00Z",
    userId: "u-wh-1",
    userName: "Khaled Farouk",
    userRole: "WAREHOUSE",
    action: "DELETE",
    module: "ERP",
    entity: "Product",
    entityId: "PRD-EXP-BATCH-22",
    entityName: "Expired Batch BATCH-22",
    details: "Khaled Farouk removed expired batch BATCH-22 - Omeprazole 20mg - 340 units disposed",
    oldValues: { product: "Omeprazole 20mg", quantity: 340, expiryDate: "2026-04-15", status: "Active" },
  },
  {
    id: "audit-seed-028",
    timestamp: "2026-04-29T10:30:00Z",
    userId: "u-bum",
    userName: "Dr. Hossam Tarek",
    userRole: "BUM",
    action: "READ",
    module: "CRM",
    entity: "Report",
    entityId: "RPT-KPI-Q1-2026",
    entityName: "Q1 2026 KPI Dashboard",
    details: "Dr. Hossam Tarek viewed Q1 2026 KPI Dashboard - team performance review",
  },
  {
    id: "audit-seed-029",
    timestamp: "2026-04-29T09:00:00Z",
    userId: "system",
    userName: "System",
    userRole: "SYSTEM",
    action: "IMPORT",
    module: "ERP",
    entity: "Product",
    entityId: "SYNC-2026-04-29",
    entityName: "Daily Price Sync",
    details: "System: Automated daily price sync completed - 89 product prices updated from supplier feed",
    newValues: { productsUpdated: 89, source: "Supplier API", syncDuration: "12s" },
  },
  {
    id: "audit-seed-030",
    timestamp: "2026-04-28T16:00:00Z",
    userId: "u-admin",
    userName: "System Administrator",
    userRole: "ADMIN",
    action: "UPDATE",
    module: "ADMIN",
    entity: "Settings",
    entityId: "SYS-BACKUP-001",
    entityName: "Backup Configuration",
    details: "Admin updated backup schedule - changed from weekly to daily backups",
    oldValues: { backupFrequency: "weekly", retentionDays: 30 },
    newValues: { backupFrequency: "daily", retentionDays: 90 },
  },
  {
    id: "audit-seed-031",
    timestamp: "2026-04-28T14:30:00Z",
    userId: "u-rep-1",
    userName: "Mohamed El-Sayed",
    userRole: "MEDICAL_REP",
    action: "CREATE",
    module: "CRM",
    entity: "MarketRequest",
    entityId: "MR-2026-035",
    entityName: "Market Request MR-2026-035",
    details: "Mohamed El-Sayed submitted market request - 500 Augmentin 1g samples for Giza district",
    newValues: { product: "Augmentin 1g", quantity: 500, territory: "Giza", justification: "New doctor onboarding campaign" },
  },
  {
    id: "audit-seed-032",
    timestamp: "2026-04-28T11:00:00Z",
    userId: "u-acc-1",
    userName: "Sara El-Masry",
    userRole: "ACCOUNTANT",
    action: "CREATE",
    module: "ERP",
    entity: "Invoice",
    entityId: "INV-2025-006",
    entityName: "Invoice INV-2025-006",
    details: "Sara El-Masry created Invoice INV-2025-006 for Seif Pharmacies Chain - EGP 245,000",
    newValues: { customer: "Seif Pharmacies Chain", amount: 245000, currency: "EGP", status: "Draft", items: 12 },
  },
  {
    id: "audit-seed-033",
    timestamp: "2026-04-28T09:30:00Z",
    userId: "u-dm-1",
    userName: "Ahmed Mostafa",
    userRole: "DISTRICT_MANAGER",
    action: "LOGIN",
    module: "SYSTEM",
    entity: "Session",
    entityId: "SES-20260428-003",
    details: "Ahmed Mostafa logged in from Cairo North office",
    ipAddress: "10.0.1.15",
  },
  {
    id: "audit-seed-034",
    timestamp: "2026-04-27T15:00:00Z",
    userId: "u-mkt-1",
    userName: "Dr. Yasmin Salem",
    userRole: "MARKETEER",
    action: "APPROVE",
    module: "CRM",
    entity: "WeeklyPlan",
    entityId: "WP-2026-W17-DM1",
    entityName: "Weekly Plan W17 - Ahmed Mostafa",
    details: "Dr. Yasmin Salem approved Weekly Plan W17 for Ahmed Mostafa - 20 visits completed",
    oldValues: { status: "Submitted", visits: 20 },
    newValues: { status: "Approved", approvedBy: "Dr. Yasmin Salem", completionRate: "95%" },
  },
  {
    id: "audit-seed-035",
    timestamp: "2026-04-27T13:00:00Z",
    userId: "u-hr-1",
    userName: "Laila Abdel-Rahman",
    userRole: "HR",
    action: "UPDATE",
    module: "ATS",
    entity: "Candidate",
    entityId: "CAND-2026-042",
    entityName: "Hassan Ibrahim",
    details: "Laila Abdel-Rahman advanced candidate Hassan Ibrahim to final interview stage",
    oldValues: { stage: "Technical Interview", score: 85 },
    newValues: { stage: "Final Interview", interviewDate: "2026-05-03", interviewer: "Dr. Hossam Tarek" },
  },
];

export function AuditLoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditEntry[]>(SEED_AUDIT_ENTRIES);
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AuditEntry[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setLogs(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
    setInitialized(true);
  }, []);

  // Persist to localStorage whenever logs change (after init)
  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // ignore quota errors
    }
  }, [logs, initialized]);

  const logAction = useCallback(
    (entry: Omit<AuditEntry, "id" | "timestamp">) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newEntry, ...prev]);
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
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
 * @deprecated Use useAuditLogger().logs.length instead
 */
export function getAuditLogCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw) as AuditEntry[]).length;
  } catch {
    return 0;
  }
}

/**
 * Retrieve audit log entries from localStorage, optionally filtered.
 * Standalone function for use outside of React components.
 * @deprecated Prefer useAuditLogger().getAuditLogs() inside components
 */
export function getAuditLog(filters?: AuditFilters): AuditEntry[] {
  if (typeof window === "undefined") return [];
  let entries: AuditEntry[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    entries = JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
  if (!filters) return entries;

  return entries.filter((entry) => {
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
}

/**
 * Clear all audit entries from localStorage.
 * @deprecated Use useAuditLogger().clearLogs() instead
 */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
