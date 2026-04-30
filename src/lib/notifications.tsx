"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  module?: string;
  actionUrl?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  add: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "warning", title: "Invoice Overdue", message: "Invoice INV-2024-003 for TechCorp Solutions is 15 days overdue", timestamp: "2026-04-24T09:30:00Z", read: false, module: "Finance", actionUrl: "/erp/finance" },
  { id: "n2", type: "info", title: "New Candidate", message: "Alexandra Chen applied for Senior Developer position", timestamp: "2026-04-24T08:15:00Z", read: false, module: "ATS", actionUrl: "/ats/candidates" },
  { id: "n3", type: "success", title: "PO Approved", message: "Purchase Order PO-2026-047 has been approved by management", timestamp: "2026-04-23T16:45:00Z", read: false, module: "Procurement", actionUrl: "/erp/procurement" },
  { id: "n4", type: "error", title: "QA Batch Failed", message: "Batch #B-2026-112 failed quality inspection - NCR raised", timestamp: "2026-04-23T14:20:00Z", read: true, module: "Quality", actionUrl: "/qaqc" },
  { id: "n5", type: "info", title: "Leave Request", message: "Ahmed Hassan requested annual leave from May 1-5", timestamp: "2026-04-23T11:00:00Z", read: true, module: "HR", actionUrl: "/erp/hr" },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const add = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications((prev) => [
      { ...n, id: `n-${Date.now()}`, timestamp: new Date().toISOString(), read: false },
      ...prev,
    ]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, add, markRead, markAllRead, remove, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
