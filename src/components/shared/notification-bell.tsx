"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Info,
  X,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotificationCenter,
  type Notification,
  type NotificationType,
} from "@/lib/notification-context";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "SUCCESS":
      return CheckCircle;
    case "WARNING":
      return AlertTriangle;
    case "ERROR":
      return XCircle;
    case "INFO":
      return Info;
    case "APPROVAL":
      return CheckCircle;
    case "ESCALATION":
      return Clock;
    case "SLA_BREACH":
      return Shield;
    default:
      return Bell;
  }
}

function getTypeColor(type: NotificationType): string {
  switch (type) {
    case "SUCCESS":
      return "text-green-500";
    case "WARNING":
      return "text-amber-500";
    case "ERROR":
      return "text-red-500";
    case "INFO":
      return "text-blue-500";
    case "APPROVAL":
      return "text-indigo-500";
    case "ESCALATION":
      return "text-orange-500";
    case "SLA_BREACH":
      return "text-rose-600";
    default:
      return "text-slate-400";
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

type TimeGroup = "Today" | "Yesterday" | "Older";

function getTimeGroup(dateStr: string): TimeGroup {
  const now = new Date();
  const d = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const notifDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (notifDay.getTime() === today.getTime()) return "Today";
  if (notifDay.getTime() === yesterday.getTime()) return "Yesterday";
  return "Older";
}

function groupNotifications(
  notifications: Notification[]
): { group: TimeGroup; items: Notification[] }[] {
  const groups: Record<TimeGroup, Notification[]> = {
    Today: [],
    Yesterday: [],
    Older: [],
  };
  for (const n of notifications) {
    groups[getTimeGroup(n.createdAt)].push(n);
  }
  const order: TimeGroup[] = ["Today", "Yesterday", "Older"];
  return order
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, items: groups[g] }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { notifications, markAsRead, markAllRead, getUnreadCount } =
    useNotificationCenter();

  const unreadCount = getUnreadCount();
  const recent = notifications.slice(0, 20);
  const grouped = groupNotifications(recent);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markAsRead(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label={`${unreadCount} unread notifications`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-hidden rounded-lg border border-border bg-background shadow-lg z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllRead();
                  }}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline px-1.5 py-1 rounded transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">You&apos;re all caught up</p>
              </div>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-muted/50 sticky top-0 z-10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                  </div>
                  {items.map((n) => {
                    const Icon = getTypeIcon(n.type);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-b-0",
                          !n.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 mt-0.5",
                            getTypeColor(n.type)
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm leading-snug line-clamp-1",
                                !n.isRead
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground/80"
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0 text-[10px] px-1.5 py-0 font-medium">
                              {n.module}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {recent.length > 0 && (
            <div className="shrink-0 border-t border-border px-4 py-2.5 bg-muted/30">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setOpen(false);
                }}
                className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
