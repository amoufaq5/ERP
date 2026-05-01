"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Info,
  CheckCheck,
  Trash2,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useNotificationCenter,
  type Notification,
  type NotificationType,
} from "@/lib/notification-context";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_OPTIONS = [
  "ALL",
  "EXPENSES",
  "WEEKLY_PLAN",
  "MARKET_REQUEST",
  "INVENTORY",
  "INVOICE",
  "HR",
  "PROCUREMENT",
  "QUALITY",
  "MANUFACTURING",
  "CRM",
  "FINANCE",
  "SYSTEM",
] as const;

type TabFilter = "all" | "unread" | "approvals" | "alerts" | "system";

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

function getTypeBgColor(type: NotificationType): string {
  switch (type) {
    case "SUCCESS":
      return "bg-green-50 dark:bg-green-950/30";
    case "WARNING":
      return "bg-amber-50 dark:bg-amber-950/30";
    case "ERROR":
      return "bg-red-50 dark:bg-red-950/30";
    case "INFO":
      return "bg-blue-50 dark:bg-blue-950/30";
    case "APPROVAL":
      return "bg-indigo-50 dark:bg-indigo-950/30";
    case "ESCALATION":
      return "bg-orange-50 dark:bg-orange-950/30";
    case "SLA_BREACH":
      return "bg-rose-50 dark:bg-rose-950/30";
    default:
      return "bg-slate-50 dark:bg-slate-900";
  }
}

function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case "SUCCESS":
      return "Success";
    case "WARNING":
      return "Warning";
    case "ERROR":
      return "Error";
    case "INFO":
      return "Info";
    case "APPROVAL":
      return "Approval";
    case "ESCALATION":
      return "Escalation";
    case "SLA_BREACH":
      return "SLA Breach";
    default:
      return type;
  }
}

function getTypeBadgeClass(type: NotificationType): string {
  switch (type) {
    case "SUCCESS":
      return "bg-green-100 text-green-700 border-green-200";
    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "ERROR":
      return "bg-red-100 text-red-700 border-red-200";
    case "INFO":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "APPROVAL":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "ESCALATION":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "SLA_BREACH":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
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

function formatModuleLabel(module: string): string {
  return module
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

function filterByTab(
  notifications: Notification[],
  tab: TabFilter
): Notification[] {
  switch (tab) {
    case "unread":
      return notifications.filter((n) => !n.isRead);
    case "approvals":
      return notifications.filter(
        (n) => n.type === "APPROVAL" || n.type === "ESCALATION"
      );
    case "alerts":
      return notifications.filter(
        (n) =>
          n.type === "WARNING" ||
          n.type === "ERROR" ||
          n.type === "SLA_BREACH"
      );
    case "system":
      return notifications.filter((n) => n.module === "SYSTEM");
    default:
      return notifications;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    markAsRead,
    markAllRead,
    clearAll,
    getUnreadCount,
    removeNotification,
  } = useNotificationCenter();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const unreadCount = getUnreadCount();

  const filtered = useMemo(() => {
    let result = filterByTab(notifications, activeTab);
    if (moduleFilter !== "ALL") {
      result = result.filter((n) => n.module === moduleFilter);
    }
    return result;
  }, [notifications, activeTab, moduleFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }

  function markSelectedRead() {
    for (const id of selected) {
      markAsRead(id);
    }
    setSelected(new Set());
  }

  function clearRead() {
    const readIds = notifications.filter((n) => n.isRead).map((n) => n.id);
    for (const id of readIds) {
      removeNotification(id);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {notifications.some((n) => n.isRead) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearRead}
              className="gap-1.5 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and filter */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabFilter);
          setSelected(new Set());
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Module filter */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MODULE_OPTIONS.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === "ALL" ? "All Modules" : formatModuleLabel(mod)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk actions (when items selected) */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              {selected.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={markSelectedRead}
              className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* All tabs share the same content area */}
        {(
          ["all", "unread", "approvals", "alerts", "system"] as TabFilter[]
        ).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    No notifications
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tab === "unread"
                      ? "All caught up! No unread notifications."
                      : tab === "approvals"
                        ? "No pending approvals or escalations."
                        : tab === "alerts"
                          ? "No active alerts or warnings."
                          : tab === "system"
                            ? "No system notifications."
                            : "Your notification center is empty."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Select all toggle */}
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={selectAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selected.size === filtered.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <span className="text-xs text-muted-foreground/50">
                    {filtered.length} notification
                    {filtered.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {filtered.map((n) => {
                  const Icon = getTypeIcon(n.type);
                  const isSelected = selected.has(n.id);

                  return (
                    <Card
                      key={n.id}
                      className={cn(
                        "transition-all duration-150",
                        !n.isRead &&
                          "border-l-4 border-l-blue-500",
                        isSelected &&
                          "ring-2 ring-blue-400 ring-offset-1"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(n.id)}
                            className={cn(
                              "shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-slate-300 dark:border-slate-600 hover:border-blue-400"
                            )}
                          >
                            {isSelected && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </button>

                          {/* Type icon */}
                          <div
                            className={cn(
                              "shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-lg",
                              getTypeBgColor(n.type)
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4.5 w-4.5",
                                getTypeColor(n.type)
                              )}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "text-sm leading-snug",
                                    !n.isRead
                                      ? "font-semibold text-foreground"
                                      : "font-medium text-foreground/80"
                                  )}
                                >
                                  {n.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>

                              {/* Unread dot */}
                              {!n.isRead && (
                                <span className="shrink-0 mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center flex-wrap gap-2 mt-2.5">
                              <Badge
                                className={cn(
                                  "text-[10px] px-1.5 py-0 font-medium",
                                  getTypeBadgeClass(n.type)
                                )}
                              >
                                {getTypeLabel(n.type)}
                              </Badge>
                              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0 text-[10px] px-1.5 py-0 font-medium">
                                {formatModuleLabel(n.module)}
                              </Badge>
                              {n.entityId && (
                                <span className="text-[11px] text-muted-foreground/60 font-mono">
                                  {n.entityId}
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground/60 ml-auto">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              {n.actionUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (!n.isRead) markAsRead(n.id);
                                    router.push(n.actionUrl!);
                                  }}
                                  className="h-7 text-xs gap-1.5"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View details
                                </Button>
                              )}
                              {!n.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(n.id)}
                                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Mark read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  removeNotification(n.id);
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    next.delete(n.id);
                                    return next;
                                  });
                                }}
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
