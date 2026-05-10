"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
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
// API endpoint
// ---------------------------------------------------------------------------

const NOTIFICATIONS_API = "/api/v1/notifications";
const EVENTS_API = "/api/v1/events";

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
 * to these events and adds them to the React state / API.
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized, setInitialized] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch notifications from API on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      try {
        const resp = await fetch(`${NOTIFICATIONS_API}?limit=100`, {
          headers: { "Content-Type": "application/json" },
        });
        if (resp.ok) {
          const json = await resp.json();
          const data: Notification[] = json.data ?? json ?? [];
          if (!cancelled && data.length > 0) {
            setNotifications(data);
          }
        }
      } catch {
        // API unavailable -- start with empty list
      }
      if (!cancelled) setInitialized(true);
    }

    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  // Connect to SSE endpoint for real-time updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Get userId from cookie or default
    const userId = document.cookie
      .split("; ")
      .find((c) => c.startsWith("userId="))
      ?.split("=")[1] || "current-user";

    try {
      const es = new EventSource(`${EVENTS_API}?userId=${encodeURIComponent(userId)}`);
      eventSourceRef.current = es;

      es.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data);
          const payload = data.payload || data;
          if (payload && payload.id && payload.title) {
            setNotifications((prev) => {
              // Avoid duplicates
              if (prev.some((n) => n.id === payload.id)) return prev;
              return [
                {
                  id: payload.id,
                  type: payload.type || "INFO",
                  title: payload.title,
                  message: payload.message || "",
                  module: payload.module || "SYSTEM",
                  entityType: payload.entityType,
                  entityId: payload.entityId,
                  actionUrl: payload.actionUrl,
                  isRead: false,
                  createdAt: payload.createdAt || new Date().toISOString(),
                  userId: payload.userId,
                },
                ...prev,
              ];
            });
          }
        } catch {
          // ignore malformed SSE data
        }
      });

      es.addEventListener("notification_update", (event) => {
        try {
          const data = JSON.parse(event.data);
          const payload = data.payload || data;
          if (payload.action === "mark_read" && payload.notificationId) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.notificationId ? { ...n, isRead: true } : n
              )
            );
          } else if (payload.action === "mark_all_read") {
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          }
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        // SSE connection error -- will auto-reconnect per browser behavior
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch {
      // SSE not available
      return;
    }
  }, []);

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "createdAt" | "isRead">) => {
      const newNotif: Notification = {
        ...n,
        id: `notif-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      // Persist via API (fire-and-forget)
      fetch(NOTIFICATIONS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotif),
      }).catch(() => {});
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
    // Persist via API
    fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all" }),
    }).catch(() => {});
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetch(NOTIFICATIONS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    }).catch(() => {});
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
