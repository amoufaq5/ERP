"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "APPROVAL"
  | "ESCALATION"
  | "SLA_BREACH";

export type NotificationModule =
  | "EXPENSES"
  | "WEEKLY_PLAN"
  | "MARKET_REQUEST"
  | "INVENTORY"
  | "INVOICE"
  | "HR"
  | "SYSTEM"
  | "PROCUREMENT"
  | "QUALITY"
  | "MANUFACTURING"
  | "CRM"
  | "FINANCE";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  module: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  userId?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (
    n: Omit<Notification, "id" | "createdAt" | "isRead">
  ) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
  removeNotification: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "pharma-erp-notifications";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "seed-01",
    type: "SUCCESS",
    title: "Expense EXP-2025-042 approved by Nadia Rizk",
    message:
      "Your travel expense claim of EGP 4,250 for the Alexandria field visit has been approved and is pending finance disbursement.",
    module: "EXPENSES",
    entityType: "expense",
    entityId: "EXP-2025-042",
    actionUrl: "/crm/expenses",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 min ago
  },
  {
    id: "seed-02",
    type: "ESCALATION",
    title: "Weekly plan pending approval for >48 hours",
    message:
      "The weekly plan submitted by Ahmed Kamal for Upper Egypt territory has been waiting for district manager approval since Apr 28. Auto-escalation triggered.",
    module: "WEEKLY_PLAN",
    entityType: "weekly_plan",
    entityId: "WP-2025-018",
    actionUrl: "/crm/weekly-plan",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
  },
  {
    id: "seed-03",
    type: "SLA_BREACH",
    title: "Market request MR-2025-015 SLA breached",
    message:
      "Market request for Augmentin 625mg samples in Tanta zone exceeded the 72-hour fulfillment SLA. Escalated to BUM for immediate action.",
    module: "MARKET_REQUEST",
    entityType: "market_request",
    entityId: "MR-2025-015",
    actionUrl: "/crm/market-requests",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "seed-04",
    type: "WARNING",
    title: "Low stock alert: Augmentin 1g below reorder level",
    message:
      "Augmentin 1g (SKU: AUG-1G-30) current stock is 142 units, below the reorder point of 500 units. Lead time is 14 days.",
    module: "INVENTORY",
    entityType: "product",
    entityId: "AUG-1G-30",
    actionUrl: "/erp/inventory",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    id: "seed-05",
    type: "WARNING",
    title: "Invoice INV-2025-005 is overdue",
    message:
      "Invoice for Al-Shifa Pharmacy (EGP 28,750) was due on Apr 20. Currently 10 days overdue. Collections team has been notified.",
    module: "INVOICE",
    entityType: "invoice",
    entityId: "INV-2025-005",
    actionUrl: "/erp/finance",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: "seed-06",
    type: "INFO",
    title: "New candidate application for QC Analyst position",
    message:
      "Fatma El-Sayed applied for the Quality Control Analyst role. She has 3 years of pharma QC experience and a B.Sc. in Pharmaceutical Sciences.",
    module: "HR",
    entityType: "candidate",
    entityId: "CAND-2025-089",
    actionUrl: "/ats/candidates",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
  },
  {
    id: "seed-07",
    type: "APPROVAL",
    title: "Purchase order PO-2025-031 requires your approval",
    message:
      "Procurement raised PO for raw materials (Amoxicillin trihydrate, 500kg) from Delta Pharma Trading. Total value: EGP 185,000.",
    module: "PROCUREMENT",
    entityType: "purchase_order",
    entityId: "PO-2025-031",
    actionUrl: "/erp/procurement",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    id: "seed-08",
    type: "ERROR",
    title: "QA batch #B-2025-112 failed stability testing",
    message:
      "Batch B-2025-112 of Clavulanate tablets failed 3-month accelerated stability test. Non-conformance report NCR-045 has been opened.",
    module: "QUALITY",
    entityType: "batch",
    entityId: "B-2025-112",
    actionUrl: "/qaqc",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
  },
  {
    id: "seed-09",
    type: "SUCCESS",
    title: "Manufacturing order MO-2025-078 completed",
    message:
      "Production of 10,000 units of Omeprazole 20mg capsules completed. Batch has been transferred to QC for release testing.",
    module: "MANUFACTURING",
    entityType: "manufacturing_order",
    entityId: "MO-2025-078",
    actionUrl: "/erp/manufacturing",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // yesterday
  },
  {
    id: "seed-10",
    type: "INFO",
    title: "System maintenance scheduled for Friday 2 AM",
    message:
      "The ERP system will undergo scheduled maintenance on Friday, May 2 from 2:00 AM to 4:00 AM EET. Please save all work before that time.",
    module: "SYSTEM",
    entityType: "system",
    entityId: "MAINT-2025-05",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: "seed-11",
    type: "APPROVAL",
    title: "Leave request pending: Dr. Hossam (May 5-9)",
    message:
      "Dr. Hossam Ibrahim submitted annual leave for May 5-9. His coverage assignments need to be confirmed before approval.",
    module: "HR",
    entityType: "leave_request",
    entityId: "LR-2025-034",
    actionUrl: "/erp/hr",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), // 2 days ago
  },
  {
    id: "seed-12",
    type: "WARNING",
    title: "Expiry alert: Metformin 500mg batch nearing expiry",
    message:
      "Batch MET-2024-056 (2,340 units) expires on Jun 30, 2025. Consider prioritizing distribution or initiating return-to-vendor process.",
    module: "INVENTORY",
    entityType: "product",
    entityId: "MET-500-60",
    actionUrl: "/erp/inventory",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
  },
];

// ---------------------------------------------------------------------------
// Helper: load from localStorage
// ---------------------------------------------------------------------------

function loadFromStorage(): Notification[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Notification[];
  } catch {
    // corrupted data – fall through
  }
  return null;
}

function saveToStorage(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // quota exceeded – silently ignore
  }
}

// ---------------------------------------------------------------------------
// Global notification emitter (usable outside React components)
// ---------------------------------------------------------------------------

type NotificationPayload = Omit<Notification, "id" | "createdAt" | "isRead">;
type NotificationListener = (n: NotificationPayload) => void;

const _listeners = new Set<NotificationListener>();

/**
 * Register a listener that will be called whenever `emitNotification` is invoked.
 * Returns an unsubscribe function.
 */
export function subscribeNotifications(listener: NotificationListener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/**
 * Fire a notification from anywhere (including non-React code such as
 * cross-module-actions.ts).  The EnhancedNotificationProvider subscribes
 * to these events and adds them to the React state / localStorage.
 */
export function emitNotification(n: NotificationPayload): void {
  for (const listener of _listeners) {
    try { listener(n); } catch { /* ignore broken listeners */ }
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationCtx = createContext<NotificationContextValue | null>(null);

export function EnhancedNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = loadFromStorage();
    return stored ?? SEED_NOTIFICATIONS;
  });

  // Persist to localStorage whenever notifications change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "createdAt" | "isRead">) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
        ...prev,
      ]);
    },
    []
  );

  // Bridge: subscribe to the global emitter so that notifications fired from
  // non-React code (e.g. cross-module-actions.ts) appear in the React state.
  useEffect(() => {
    return subscribeNotifications((payload) => {
      addNotification(payload);
    });
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getUnreadCount = useCallback(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  return (
    <NotificationCtx.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllRead,
        clearAll,
        getUnreadCount,
        removeNotification,
      }}
    >
      {children}
    </NotificationCtx.Provider>
  );
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCtx);
  if (!ctx)
    throw new Error(
      "useNotificationCenter must be used inside EnhancedNotificationProvider"
    );
  return ctx;
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases for consolidated notification system
// (originally from notifications.tsx)
// ---------------------------------------------------------------------------

/** @deprecated Use EnhancedNotificationProvider instead */
export const NotificationProvider = EnhancedNotificationProvider;

/** Lowercase notification type alias used by the old notifications.tsx */
export type SimpleNotificationType = "info" | "success" | "warning" | "error";

/**
 * Backward-compatible hook matching the old notifications.tsx interface.
 * Maps the old property names (read, timestamp, add, remove, clear, unreadCount)
 * onto the enhanced notification system.
 * @deprecated Use useNotificationCenter instead
 */
export function useNotifications() {
  const ctx = useNotificationCenter();

  // Map notifications to the old shape (read instead of isRead, timestamp instead of createdAt)
  const notifications = ctx.notifications.map((n) => ({
    id: n.id,
    type: n.type.toLowerCase() as SimpleNotificationType,
    title: n.title,
    message: n.message,
    timestamp: n.createdAt,
    read: n.isRead,
    module: n.module,
    actionUrl: n.actionUrl,
  }));

  const unreadCount = ctx.getUnreadCount();

  return {
    notifications,
    unreadCount,
    add: (n: Omit<{ type: SimpleNotificationType; title: string; message: string; module?: string; actionUrl?: string }, never>) => {
      ctx.addNotification({
        type: n.type.toUpperCase() as NotificationType,
        title: n.title,
        message: n.message,
        module: n.module || "SYSTEM",
        actionUrl: n.actionUrl,
      });
    },
    markRead: (id: string) => ctx.markAsRead(id),
    markAllRead: () => ctx.markAllRead(),
    remove: (id: string) => ctx.removeNotification(id),
    clear: () => ctx.clearAll(),
  };
}
