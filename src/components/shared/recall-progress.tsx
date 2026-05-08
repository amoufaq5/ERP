"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Bell,
  Package,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RecallRecord,
  RecallStatus,
  RecallNotification,
  RecallRetrieval,
} from "@/lib/quality/recall-types";

// ─── Workflow Stepper ────────────────────────────────────────────────────────

const WORKFLOW_STEPS: { status: RecallStatus; label: string }[] = [
  { status: "initiated", label: "Initiated" },
  { status: "risk-assessment", label: "Risk Assessment" },
  { status: "notification", label: "Notification" },
  { status: "retrieval", label: "Retrieval" },
  { status: "reconciliation", label: "Reconciliation" },
  { status: "effectiveness-check", label: "Effectiveness Check" },
  { status: "closed", label: "Closed" },
];

const STATUS_ORDER: Record<RecallStatus, number> = {
  initiated: 0,
  "risk-assessment": 1,
  notification: 2,
  retrieval: 3,
  reconciliation: 4,
  "effectiveness-check": 5,
  closed: 6,
};

interface RecallProgressProps {
  recall: RecallRecord;
  className?: string;
}

export default function RecallProgress({
  recall,
  className,
}: RecallProgressProps) {
  const currentIndex = STATUS_ORDER[recall.status];

  // Recovery rate calculation
  const totalShipped = recall.retrievals.reduce(
    (s, r) => s + r.quantityShipped,
    0
  );
  const totalReturned = recall.retrievals.reduce(
    (s, r) => s + r.quantityReturned,
    0
  );
  const recoveryRate =
    totalShipped > 0 ? Math.round((totalReturned / totalShipped) * 1000) / 10 : 0;

  // Notification stats
  const totalNotifications = recall.notifications.length;
  const acknowledgedNotifications = recall.notifications.filter(
    (n) => n.acknowledged
  ).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Visual Workflow Stepper ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Recall Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
            <div className="relative flex justify-between">
              {WORKFLOW_STEPS.map((step, idx) => {
                const stepOrder = STATUS_ORDER[step.status];
                const isCompleted = currentIndex > stepOrder;
                const isCurrent = currentIndex === stepOrder;
                const isFuture = currentIndex < stepOrder;

                return (
                  <div
                    key={step.status}
                    className="flex flex-col items-center relative"
                    style={{ flex: 1 }}
                  >
                    <div
                      className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        isCompleted &&
                          "border-green-500 bg-green-500 text-white",
                        isCurrent &&
                          "border-blue-500 bg-blue-500 text-white animate-pulse",
                        isFuture && "border-gray-300 bg-white text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[80px]",
                        isCompleted && "text-green-700",
                        isCurrent && "text-blue-700 font-semibold",
                        isFuture && "text-gray-400"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Recovery Rate Gauge ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recovery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {/* Circular progress indicator */}
              <div className="relative w-32 h-32">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 120 120"
                >
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-gray-200"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - recoveryRate / 100)}`}
                    className={cn(
                      "transition-all duration-700",
                      recoveryRate >= 90
                        ? "text-green-500"
                        : recoveryRate >= 70
                        ? "text-amber-500"
                        : recoveryRate >= 50
                        ? "text-orange-500"
                        : "text-red-500"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{recoveryRate}%</span>
                  <span className="text-xs text-muted-foreground">recovered</span>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="w-full grid grid-cols-2 gap-2 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Shipped</p>
                  <p className="font-semibold">{totalShipped.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Returned</p>
                  <p className="font-semibold">{totalReturned.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Notification Status Grid ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Status ({acknowledgedNotifications}/{totalNotifications})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recall.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notifications sent yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recall.notifications.map((notif) => (
                  <NotificationRow key={notif.id} notification={notif} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Distribution Map (Affected Locations) ────────────────────── */}
      {recall.retrievals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Distribution Map - Affected Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recall.retrievals.map((retrieval) => (
                <RetrievalCard key={retrieval.id} retrieval={retrieval} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Notification Row ────────────────────────────────────────────────────────

const RECIPIENT_COLORS: Record<string, string> = {
  regulatory: "bg-red-100 text-red-800",
  distributors: "bg-blue-100 text-blue-800",
  pharmacies: "bg-green-100 text-green-800",
  hospitals: "bg-purple-100 text-purple-800",
  public: "bg-amber-100 text-amber-800",
};

function NotificationRow({ notification }: { notification: RecallNotification }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
        notification.acknowledged ? "bg-green-50/50" : "bg-amber-50/50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0",
              RECIPIENT_COLORS[notification.recipientType] || "bg-gray-100 text-gray-800"
            )}
          >
            {notification.recipientType}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            {notification.method}
          </span>
        </div>
        <p className="text-xs font-medium truncate">
          {notification.recipientName}
        </p>
      </div>
      <div className="shrink-0">
        {notification.acknowledged ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>
    </div>
  );
}

// ─── Retrieval Card ──────────────────────────────────────────────────────────

const RETRIEVAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

function RetrievalCard({ retrieval }: { retrieval: RecallRetrieval }) {
  const localRate =
    retrieval.quantityShipped > 0
      ? Math.round(
          (retrieval.quantityReturned / retrieval.quantityShipped) * 100
        )
      : 0;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{retrieval.location}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {retrieval.region}
          </p>
        </div>
        <Badge
          className={cn(
            "text-[10px] shrink-0",
            RETRIEVAL_STATUS_COLORS[retrieval.status] || "bg-gray-100 text-gray-800"
          )}
        >
          {retrieval.status}
        </Badge>
      </div>
      <Progress value={localRate} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {retrieval.quantityReturned.toLocaleString()} /{" "}
          {retrieval.quantityShipped.toLocaleString()}
        </span>
        <span className="font-medium">{localRate}%</span>
      </div>
    </div>
  );
}
