"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/lib/data-store";
import {
  generateInsights,
  type Insight,
  type InsightType,
  type InsightSeverity,
} from "@/lib/ai/insights-engine";
import type { UserRole } from "@/lib/auth/role-routes";

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICON: Record<InsightType, LucideIcon> = {
  anomaly: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
  alert: Bell,
  forecast: BarChart3,
};

const SEVERITY_CLASSES: Record<InsightSeverity, string> = {
  info: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  critical: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
  success: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
};

const SEVERITY_ICON_CLASSES: Record<InsightSeverity, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
};

const SEVERITY_BADGE: Record<InsightSeverity, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  info: "secondary",
  warning: "warning",
  critical: "destructive",
  success: "success",
};

const STORAGE_KEY = "pharma.dismissedInsights";

// ─── Props ──────────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  userId: string;
  role: string;
  maxItems?: number;
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InsightsPanel({
  userId,
  role,
  maxItems,
  compact = false,
}: InsightsPanelProps) {
  const store = useDataStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("all");

  // Load dismissed from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setDismissedIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  // Generate insights from store data
  const insights = useMemo(
    () => generateInsights(store, role as UserRole, userId),
    [store, role, userId]
  );

  // Filter out dismissed
  const visibleInsights = useMemo(() => {
    let filtered = insights.filter((i) => !dismissedIds.has(i.id));

    // Filter by tab
    if (activeTab !== "all") {
      const typeMap: Record<string, InsightType> = {
        anomalies: "anomaly",
        trends: "trend",
        recommendations: "recommendation",
        alerts: "alert",
      };
      const targetType = typeMap[activeTab];
      if (targetType) {
        filtered = filtered.filter((i) => i.type === targetType);
      }
    }

    // Limit
    if (maxItems) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [insights, dismissedIds, activeTab, maxItems]);

  function dismiss(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Compact mode — minimal card list
  if (compact) {
    const topInsights = visibleInsights.slice(0, maxItems ?? 5);
    return (
      <div className="space-y-2">
        {topInsights.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No insights available
          </p>
        )}
        {topInsights.map((insight) => {
          const Icon = TYPE_ICON[insight.type];
          return (
            <div
              key={insight.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                SEVERITY_CLASSES[insight.severity]
              )}
            >
              <Icon
                className={cn("h-4 w-4 mt-0.5 shrink-0", SEVERITY_ICON_CLASSES[insight.severity])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {insight.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {insight.description}
                </p>
              </div>
              <Badge variant={SEVERITY_BADGE[insight.severity]} className="shrink-0 text-[10px]">
                {insight.severity}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  // Full mode — tabs + expandable cards
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({insights.filter((i) => !dismissedIds.has(i.id)).length})
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="trends">
            Trends
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Content area — same for all tabs since filtering happens in useMemo */}
        <TabsContent value={activeTab} className="mt-4">
          {visibleInsights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No insights in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  expanded={expandedId === insight.id}
                  onToggle={() => toggleExpand(insight.id)}
                  onDismiss={() => dismiss(insight.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────────────

function InsightCard({
  insight,
  expanded,
  onToggle,
  onDismiss,
}: {
  insight: Insight;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  const Icon = TYPE_ICON[insight.type];

  return (
    <Card
      className={cn(
        "transition-all",
        SEVERITY_CLASSES[insight.severity]
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80",
                SEVERITY_ICON_CLASSES[insight.severity]
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold leading-tight">
                {insight.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {insight.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={SEVERITY_BADGE[insight.severity]} className="text-[10px]">
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {insight.type}
            </Badge>
          </div>
        </div>

        {/* Metric pill */}
        {insight.metric && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium">
              {insight.metric.label}:{" "}
              <span className="font-bold">
                {typeof insight.metric.value === "number"
                  ? insight.metric.value.toLocaleString()
                  : insight.metric.value}
                {insight.metric.unit ? ` ${insight.metric.unit}` : ""}
              </span>
              {insight.metric.change != null && (
                <span
                  className={cn(
                    "ml-1",
                    insight.metric.change > 0
                      ? "text-green-600"
                      : insight.metric.change < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {insight.metric.change > 0 ? "+" : ""}
                  {insight.metric.change}
                </span>
              )}
            </span>
          </div>
        )}
      </CardHeader>

      {/* Expandable section */}
      {expanded && (
        <CardContent className="pt-0 pb-3">
          <div className="border-t border-border/50 pt-3 mt-1 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Recommendation
              </p>
              <p className="text-sm">{insight.recommendation}</p>
            </div>

            {insight.relatedEntities && insight.relatedEntities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Related
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {insight.relatedEntities.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {e.type}: {e.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onToggle}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> More
            </>
          )}
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" /> Dismiss
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1"
          >
            <Zap className="h-3 w-3" /> Act on it
          </Button>
        </div>
      </div>
    </Card>
  );
}
