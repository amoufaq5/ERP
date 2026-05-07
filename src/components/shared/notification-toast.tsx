"use client";

// ---------------------------------------------------------------------------
// NotificationToast – Floating toasts for real-time SSE events
// ---------------------------------------------------------------------------
// Renders in the bottom-right corner. Stacks up to 3 toasts, auto-dismisses
// after 5 seconds. Color-coded by event type.
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ShieldAlert,
  Clock,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSSE, type ServerEvent } from "@/lib/notifications/use-sse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Toast {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: number;
  /** Whether the toast is currently visible (for exit animation) */
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  INFO: { bg: "bg-blue-50 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800", icon: "text-blue-500" },
  SUCCESS: { bg: "bg-green-50 dark:bg-green-950/60", border: "border-green-200 dark:border-green-800", icon: "text-green-500" },
  WARNING: { bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-amber-200 dark:border-amber-800", icon: "text-amber-500" },
  ERROR: { bg: "bg-red-50 dark:bg-red-950/60", border: "border-red-200 dark:border-red-800", icon: "text-red-500" },
  APPROVAL: { bg: "bg-purple-50 dark:bg-purple-950/60", border: "border-purple-200 dark:border-purple-800", icon: "text-purple-500" },
  ESCALATION: { bg: "bg-orange-50 dark:bg-orange-950/60", border: "border-orange-200 dark:border-orange-800", icon: "text-orange-500" },
  SLA_BREACH: { bg: "bg-rose-50 dark:bg-rose-950/60", border: "border-rose-200 dark:border-rose-800", icon: "text-rose-600" },
  notification: { bg: "bg-blue-50 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800", icon: "text-blue-500" },
  approval_required: { bg: "bg-purple-50 dark:bg-purple-950/60", border: "border-purple-200 dark:border-purple-800", icon: "text-purple-500" },
  sla_warning: { bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-amber-200 dark:border-amber-800", icon: "text-amber-500" },
  escalation: { bg: "bg-orange-50 dark:bg-orange-950/60", border: "border-orange-200 dark:border-orange-800", icon: "text-orange-500" },
  message: { bg: "bg-blue-50 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800", icon: "text-blue-500" },
};

const DEFAULT_STYLE = { bg: "bg-slate-50 dark:bg-slate-900", border: "border-slate-200 dark:border-slate-700", icon: "text-slate-500" };

function getTypeStyle(type: string) {
  return TYPE_STYLES[type] ?? DEFAULT_STYLE;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "SUCCESS":
      return CheckCircle;
    case "WARNING":
    case "sla_warning":
      return AlertTriangle;
    case "ERROR":
      return XCircle;
    case "INFO":
    case "notification":
    case "message":
      return Info;
    case "APPROVAL":
    case "approval_required":
      return Check;
    case "ESCALATION":
    case "escalation":
      return Clock;
    case "SLA_BREACH":
      return ShieldAlert;
    default:
      return Bell;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5_000;
const EXIT_ANIMATION_MS = 300;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NotificationToastProps {
  /** User ID for the SSE connection */
  userId?: string;
}

export function NotificationToast({ userId }: NotificationToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const router = useRouter();

  // Dismiss a toast (with exit animation)
  const dismissToast = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
    // Clear auto-dismiss timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  // Add a new toast
  const addToast = useCallback(
    (event: ServerEvent) => {
      const payload = event.payload;
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = {
        id,
        type: (payload.type as string) ?? event.type,
        title: (payload.title as string) ?? "Notification",
        message: (payload.message as string) ?? "",
        actionUrl: payload.actionUrl as string | undefined,
        timestamp: Date.now(),
        visible: true,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // Dismiss oldest if over limit
        if (updated.length > MAX_TOASTS) {
          const oldest = updated[updated.length - 1];
          setTimeout(() => dismissToast(oldest.id), 0);
        }
        return updated.slice(0, MAX_TOASTS + 1); // Keep one extra briefly for exit
      });

      // Auto-dismiss after timeout
      const timer = setTimeout(() => {
        dismissToast(id);
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  // SSE event handler
  const handleSSEEvent = useCallback(
    (event: ServerEvent) => {
      // Skip system-level events
      if (event.type === "connected" || event.type === "notification_update") {
        return;
      }
      addToast(event);
    },
    [addToast]
  );

  useSSE(userId ?? "", {
    onEvent: handleSSEEvent,
    enabled: !!userId,
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  function handleToastClick(toast: Toast) {
    dismissToast(toast.id);
    if (toast.actionUrl) {
      router.push(toast.actionUrl);
    }
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = getTypeStyle(toast.type);
        const Icon = getTypeIcon(toast.type);

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto w-80 rounded-lg border shadow-lg p-3 transition-all duration-300 ease-in-out cursor-pointer",
              style.bg,
              style.border,
              toast.visible
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
            )}
            onClick={() => handleToastClick(toast)}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className={cn("shrink-0 mt-0.5", style.icon)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  {toast.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(toast.id);
                }}
                className="shrink-0 flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:bg-background/50 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
