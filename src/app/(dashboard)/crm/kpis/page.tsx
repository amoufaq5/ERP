"use client";

import { useMemo, useState } from "react";
import { Target, TrendingUp, Users, BarChart3, Plus, Download, Calendar, ChevronDown, ChevronUp, Eye, Award, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";
import { downloadCSV } from "@/lib/download";

// ─── Constants ──────────────────────────────────────────────────────────────

const STANDARD_METRICS = [
  "Visits",
  "New Doctor Listings",
  "Coverage %",
  "Plan Completion %",
  "Call Rate",
  "Samples Distributed",
  "Market Requests Completed",
  "District achievement %",
  "Revenue per Visit",
  "Customer Retention Rate",
  "New Account Acquisition",
  "Market Share %",
] as const;

const TIME_PERIODS = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Quarter", value: "quarter" },
  { label: "YTD", value: "ytd" },
] as const;

function getColorForPct(pct: number): string {
  if (pct >= 100) return "text-green-600";
  if (pct >= 80) return "text-amber-600";
  return "text-red-600";
}

function getBgColorForPct(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function getBadgeVariant(pct: number): "success" | "secondary" | "destructive" {
  if (pct >= 100) return "success";
  if (pct >= 80) return "secondary";
  return "destructive";
}

function getPerformanceColor(pct: number): string {
  if (pct >= 100) return "border-green-500 bg-green-50 dark:bg-green-900/10";
  if (pct >= 80) return "border-amber-500 bg-amber-50 dark:bg-amber-900/10";
  return "border-red-500 bg-red-50 dark:bg-red-900/10";
}

function getProgressBarColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-red-500";
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// Generate sparkline CSS path from values
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  return (
    <svg width={width} height={height} className="inline-block" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(values.length - 1) / (values.length - 1) * width}
        cy={height - ((values[values.length - 1] - min) / range) * height}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── Tab 1: KPI Dashboard (Enhanced) ───────────────────────────────────────

function KPIDashboardTab() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useDataStore();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [timePeriod, setTimePeriod] = useState<string>("month");
  const [drillDownMetric, setDrillDownMetric] = useState<string | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  // Determine visible users based on role
  const visibleUsers = useMemo(() => {
    if (user.role === "ADMIN" || user.role === "BUM") {
      return allUsers.filter((u) =>
        u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER" || u.role === "MARKETEER"
      );
    }
    if (user.role === "MARKETEER") {
      const reports = getReportsOf(user.id);
      return reports.filter((u) => u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP");
    }
    if (user.role === "DISTRICT_MANAGER") {
      return getReportsOf(user.id);
    }
    return [user];
  }, [user, allUsers, getReportsOf]);

  // Unique BUs
  const buOptions = useMemo(() => {
    return store.businessUnits.map((bu) => ({ label: bu.name, value: bu.id }));
  }, [store.businessUnits]);

  // Unique metrics
  const metricOptions = useMemo(() => {
    const metrics = new Set(store.kpis.map((k) => k.metric));
    return Array.from(metrics).map((m) => ({ label: m, value: m }));
  }, [store.kpis]);

  // Period options
  const periodOptions = useMemo(() => {
    const periods = new Set(store.kpis.map((k) => k.period));
    if (!periods.has(getCurrentPeriod())) periods.add(getCurrentPeriod());
    return Array.from(periods).sort().reverse().map((p) => ({ label: formatPeriod(p), value: p }));
  }, [store.kpis]);

  // Time period filter logic
  const timeFilteredPeriods = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentWeek = Math.ceil(now.getDate() / 7);
    const currentQuarter = Math.floor(currentMonth / 3);

    switch (timePeriod) {
      case "week":
        return [getCurrentPeriod()]; // current month only
      case "month":
        return [getCurrentPeriod()];
      case "quarter": {
        const qStart = currentQuarter * 3;
        const months: string[] = [];
        for (let m = qStart; m <= currentMonth; m++) {
          months.push(`${currentYear}-${String(m + 1).padStart(2, "0")}`);
        }
        return months;
      }
      case "ytd": {
        const months: string[] = [];
        for (let m = 0; m <= currentMonth; m++) {
          months.push(`${currentYear}-${String(m + 1).padStart(2, "0")}`);
        }
        return months;
      }
      default:
        return [getCurrentPeriod()];
    }
  }, [timePeriod]);

  // Filtered KPIs
  const filteredKpis = useMemo(() => {
    const userIds = new Set(visibleUsers.map((u) => u.id));
    const periodSet = new Set(timeFilteredPeriods);
    return store.kpis.filter((kpi) => {
      if (!userIds.has(kpi.userId)) return false;
      if (filters.period && filters.period !== "ALL") {
        if (kpi.period !== filters.period) return false;
      } else {
        if (!periodSet.has(kpi.period)) return false;
      }
      if (filters.metric && filters.metric !== "ALL" && kpi.metric !== filters.metric) return false;
      if (filters.user && filters.user !== "ALL" && kpi.userId !== filters.user) return false;
      const userName = allUsers.find((u) => u.id === kpi.userId)?.name ?? "";
      if (search && !userName.toLowerCase().includes(search.toLowerCase()) && !kpi.metric.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [store.kpis, visibleUsers, filters, search, allUsers, timeFilteredPeriods]);

  // Stats
  const totalKpis = filteredKpis.length;
  const onTarget = filteredKpis.filter((k) => k.target > 0 && k.actual >= k.target).length;
  const belowTarget = filteredKpis.filter((k) => k.target > 0 && k.actual < k.target * 0.8).length;
  const avgAchievement = filteredKpis.length > 0
    ? Math.round(filteredKpis.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) / filteredKpis.length)
    : 0;

  // KPI summary cards (grouped by metric)
  const kpiSummaryByMetric = useMemo(() => {
    const map = new Map<string, { metric: string; totalTarget: number; totalActual: number; count: number; values: number[] }>();
    filteredKpis.forEach((kpi) => {
      const existing = map.get(kpi.metric) ?? { metric: kpi.metric, totalTarget: 0, totalActual: 0, count: 0, values: [] };
      existing.totalTarget += kpi.target;
      existing.totalActual += kpi.actual;
      existing.count++;
      existing.values.push(kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : 0);
      map.set(kpi.metric, existing);
    });
    return Array.from(map.values()).map((m) => ({
      ...m,
      pct: m.totalTarget > 0 ? Math.round((m.totalActual / m.totalTarget) * 100) : 0,
    }));
  }, [filteredKpis]);

  // Generate sparkline trend data for each metric (last 6 months)
  const last6 = getLast6Months();
  const sparklineByMetric = useMemo(() => {
    const userIds = new Set(visibleUsers.map((u) => u.id));
    const map = new Map<string, number[]>();
    const metrics = new Set(store.kpis.filter((k) => userIds.has(k.userId)).map((k) => k.metric));
    metrics.forEach((metric) => {
      const values = last6.map((period) => {
        const kpis = store.kpis.filter((k) => userIds.has(k.userId) && k.metric === metric && k.period === period);
        const totalTarget = kpis.reduce((s, k) => s + k.target, 0);
        const totalActual = kpis.reduce((s, k) => s + k.actual, 0);
        return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
      });
      map.set(metric, values);
    });
    return map;
  }, [store.kpis, visibleUsers, last6]);

  // Drill-down data: breakdown by rep/territory for selected metric
  const drillDownData = useMemo(() => {
    if (!drillDownMetric) return [];
    const userIds = new Set(visibleUsers.map((u) => u.id));
    const relevant = store.kpis.filter((k) => userIds.has(k.userId) && k.metric === drillDownMetric);
    return relevant.map((kpi) => {
      const u = allUsers.find((usr) => usr.id === kpi.userId);
      const pct = kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : 0;
      return {
        id: kpi.id,
        name: u?.name ?? kpi.userId,
        role: u?.role?.replace("_", " ") ?? "---",
        territory: u?.territory ?? "---",
        target: kpi.target,
        actual: kpi.actual,
        pct,
        period: kpi.period,
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [drillDownMetric, store.kpis, visibleUsers, allUsers]);

  const drillDownColumns: Column<Record<string, unknown>>[] = useMemo(() => [
    { key: "name", label: "Rep / Manager", sortable: true, render: (v: unknown) => <span className="font-medium">{v as string}</span> },
    { key: "role", label: "Role", sortable: true },
    { key: "territory", label: "Territory", sortable: true },
    { key: "period", label: "Period", sortable: true, render: (v: unknown) => formatPeriod(String(v)) },
    { key: "target", label: "Target", sortable: true },
    { key: "actual", label: "Actual", sortable: true },
    {
      key: "pct",
      label: "Achievement",
      sortable: true,
      render: (v: unknown) => {
        const pct = v as number;
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getProgressBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <Badge variant={getBadgeVariant(pct)}>{pct}%</Badge>
          </div>
        );
      },
    },
  ], []);

  // Group KPIs by user for display
  const kpisByUser = useMemo(() => {
    const map = new Map<string, typeof filteredKpis>();
    filteredKpis.forEach((kpi) => {
      const existing = map.get(kpi.userId) ?? [];
      existing.push(kpi);
      map.set(kpi.userId, existing);
    });
    return Array.from(map.entries()).map(([userId, kpis]) => ({
      user: allUsers.find((u) => u.id === userId),
      kpis,
    })).filter((e) => e.user);
  }, [filteredKpis, allUsers]);

  function handleKpiCardClick(metric: string) {
    setDrillDownMetric(metric);
    setShowDrillDown(true);
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
        {TIME_PERIODS.map((tp) => (
          <Button
            key={tp.value}
            variant={timePeriod === tp.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimePeriod(tp.value)}
          >
            {tp.label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Target} title="Total KPIs" value={totalKpis} iconColor="text-blue-600" />
        <StatsCard icon={TrendingUp} title="On Target" value={onTarget} subtitle={`${totalKpis > 0 ? Math.round((onTarget / totalKpis) * 100) : 0}%`} iconColor="text-green-600" />
        <StatsCard icon={BarChart3} title="Below Target" value={belowTarget} subtitle={`< 80% achievement`} iconColor="text-red-600" />
        <StatsCard icon={Target} title="Avg Achievement" value={`${avgAchievement}%`} iconColor="text-purple-600" />
      </div>

      {/* Interactive KPI Cards with Sparklines */}
      {kpiSummaryByMetric.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">KPI Summary by Metric (click to drill down)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiSummaryByMetric.map((m) => {
              const sparkData = sparklineByMetric.get(m.metric) ?? [];
              const sparkColor = m.pct >= 100 ? "#22c55e" : m.pct >= 80 ? "#f59e0b" : "#ef4444";
              return (
                <Card
                  key={m.metric}
                  className={`cursor-pointer border-l-4 transition-all hover:shadow-md ${getPerformanceColor(m.pct)}`}
                  onClick={() => handleKpiCardClick(m.metric)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{m.metric}</span>
                      <Badge variant={getBadgeVariant(m.pct)} className="text-xs">{m.pct}%</Badge>
                    </div>
                    {/* Target vs Actual Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Actual: {m.totalActual}</span>
                        <span>Target: {m.totalTarget}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressBarColor(m.pct)}`}
                          style={{ width: `${Math.min(m.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Sparkline */}
                    {sparkData.length >= 2 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">6-month trend</span>
                        <Sparkline values={sparkData} color={sparkColor} />
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">{m.count} rep{m.count !== 1 ? "s" : ""} tracked</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by user or metric..."
        searchValue={search}
        onSearchChange={setSearch}
        fields={[
          { key: "period", label: "Period", type: "select", options: [{ label: "All Periods", value: "ALL" }, ...periodOptions] },
          { key: "metric", label: "Metric", type: "select", options: [{ label: "All Metrics", value: "ALL" }, ...metricOptions] },
          { key: "user", label: "User", type: "select", options: [{ label: "All Users", value: "ALL" }, ...visibleUsers.map((u) => ({ label: u.name, value: u.id }))] },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />

      {/* KPI Cards by User */}
      {kpisByUser.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No KPIs found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {kpisByUser.map(({ user: u, kpis }) => {
            const userAvg = kpis.length > 0
              ? Math.round(kpis.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) / kpis.length)
              : 0;
            return (
              <Card key={u!.id} className={`border-l-4 ${getPerformanceColor(userAvg)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{u!.name}</CardTitle>
                      <CardDescription>{u!.role.replace("_", " ")} {u!.territory ? `- ${u!.territory}` : ""}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(userAvg)}>Avg: {userAvg}%</Badge>
                      <Badge variant="secondary">{kpis.length} KPIs</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {kpis.map((kpi) => {
                      const pct = kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : 0;
                      return (
                        <div key={kpi.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${getBgColorForPct(pct)}`} />
                              <span className="font-medium">{kpi.metric}</span>
                              <Badge variant="outline" className="text-[10px]">{formatPeriod(kpi.period)}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${getColorForPct(pct)}`}>{kpi.actual}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground">{kpi.target}</span>
                              <Badge variant={getBadgeVariant(pct)} className="ml-1">{pct}%</Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getBgColorForPct(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drill-Down Dialog */}
      <Dialog open={showDrillDown} onOpenChange={(open) => { if (!open) { setShowDrillDown(false); setDrillDownMetric(null); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KPI Drill-Down: {drillDownMetric}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <DataTable
              columns={drillDownColumns}
              data={drillDownData as unknown as Record<string, unknown>[]}
              searchable
              searchKeys={["name", "territory"]}
              exportable
              exportFilename={`kpi-drilldown-${drillDownMetric?.toLowerCase().replace(/\s+/g, "-")}.csv`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: Set Targets ─────────────────────────────────────────────────────

function SetTargetsTab() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useDataStore();
  const [showModal, setShowModal] = useState(false);

  // Can this user set targets?
  const canSetTargets = ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"].includes(user.role);

  // Subordinates to set targets for
  const subordinates = useMemo(() => {
    if (user.role === "ADMIN") {
      return allUsers.filter((u) => u.id !== user.id);
    }
    return getReportsOf(user.id);
  }, [user, allUsers, getReportsOf]);

  const formFields: EntityField[] = useMemo(() => [
    {
      name: "userId",
      label: "User",
      type: "select",
      required: true,
      options: subordinates.map((u) => ({ label: `${u.name} (${u.role.replace("_", " ")})`, value: u.id })),
    },
    {
      name: "metric",
      label: "Metric",
      type: "select",
      required: true,
      options: STANDARD_METRICS.map((m) => ({ label: m, value: m })),
    },
    {
      name: "target",
      label: "Target Value",
      type: "number",
      required: true,
      min: 0,
      placeholder: "e.g. 160",
    },
    {
      name: "actual",
      label: "Current Actual",
      type: "number",
      required: false,
      min: 0,
      defaultValue: 0,
      placeholder: "0",
    },
    {
      name: "period",
      label: "Period (YYYY-MM)",
      type: "text",
      required: true,
      defaultValue: getCurrentPeriod(),
      placeholder: "2026-04",
    },
  ], [subordinates]);

  function handleSubmit(data: EntityFormData) {
    const id = store.genId("kpi");
    store.add("kpis", {
      id,
      userId: data.userId as string,
      period: data.period as string,
      metric: data.metric as string,
      target: data.target as number,
      actual: (data.actual as number) || 0,
      setBy: user.id,
    });
    setShowModal(false);
  }

  // Existing targets set by this user
  const myTargets = useMemo(() => {
    return store.kpis.filter((k) => k.setBy === user.id || user.role === "ADMIN");
  }, [store.kpis, user]);

  const columns: Column<Record<string, unknown>>[] = useMemo(() => [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_: unknown, row: Record<string, unknown>) => {
        const u = allUsers.find((u) => u.id === row.userId);
        return u?.name ?? String(row.userId);
      },
    },
    { key: "metric", label: "Metric", sortable: true },
    { key: "period", label: "Period", sortable: true, render: (v: unknown) => formatPeriod(String(v)) },
    { key: "target", label: "Target", sortable: true },
    { key: "actual", label: "Actual", sortable: true },
    {
      key: "achievement",
      label: "Achievement",
      sortable: true,
      render: (_: unknown, row: Record<string, unknown>) => {
        const target = row.target as number;
        const actual = row.actual as number;
        const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
        return <Badge variant={getBadgeVariant(pct)}>{pct}%</Badge>;
      },
    },
    {
      key: "setByName",
      label: "Set By",
      render: (_: unknown, row: Record<string, unknown>) => {
        const u = allUsers.find((u) => u.id === row.setBy);
        return u?.name ?? "---";
      },
    },
  ], [allUsers]);

  return (
    <div className="space-y-6">
      {!canSetTargets ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Only managers (DM, Marketeer, BUM) can set KPI targets.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Set KPI Targets</h3>
              <p className="text-sm text-muted-foreground">Define targets for your subordinates</p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Target
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={myTargets as unknown as Record<string, unknown>[]}
            searchable
            searchKeys={["metric", "period"]}
            exportable
            exportFilename="kpi-targets.csv"
          />

          <EntityFormModal
            open={showModal}
            onOpenChange={setShowModal}
            title="Set KPI Target"
            description="Define a performance target for a team member"
            fields={formFields}
            onSubmit={handleSubmit}
            submitLabel="Save Target"
          />
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Reports ─────────────────────────────────────────────────────────

function ReportsTab() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useDataStore();

  // Determine visible users
  const visibleUsers = useMemo(() => {
    if (user.role === "ADMIN" || user.role === "BUM") {
      return allUsers.filter((u) =>
        u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER" || u.role === "MARKETEER"
      );
    }
    if (user.role === "MARKETEER") {
      return getReportsOf(user.id);
    }
    if (user.role === "DISTRICT_MANAGER") {
      return getReportsOf(user.id);
    }
    return [user];
  }, [user, allUsers, getReportsOf]);

  const visibleUserIds = useMemo(() => new Set(visibleUsers.map((u) => u.id)), [visibleUsers]);

  // Summary table data
  const summaryData = useMemo(() => {
    return visibleUsers.map((u) => {
      const userKpis = store.kpis.filter((k) => k.userId === u.id);
      const totalTarget = userKpis.reduce((s, k) => s + k.target, 0);
      const totalActual = userKpis.reduce((s, k) => s + k.actual, 0);
      const avgPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
      const kpiCount = userKpis.length;
      const onTarget = userKpis.filter((k) => k.target > 0 && k.actual >= k.target).length;
      return {
        id: u.id,
        name: u.name,
        role: u.role.replace("_", " "),
        territory: u.territory ?? "---",
        kpiCount,
        onTarget,
        avgAchievement: avgPct,
        totalTarget,
        totalActual,
      };
    }).sort((a, b) => b.avgAchievement - a.avgAchievement);
  }, [visibleUsers, store.kpis]);

  const summaryColumns: Column<Record<string, unknown>>[] = useMemo(() => [
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "territory", label: "Territory", sortable: true },
    { key: "kpiCount", label: "KPIs", sortable: true },
    { key: "onTarget", label: "On Target", sortable: true },
    {
      key: "avgAchievement",
      label: "Avg Achievement",
      sortable: true,
      render: (v: unknown) => {
        const pct = v as number;
        return <Badge variant={getBadgeVariant(pct)}>{pct}%</Badge>;
      },
    },
  ], []);

  // Trend data: last 6 months, by metric
  const last6 = getLast6Months();

  const trendData = useMemo(() => {
    const metrics = new Set<string>();
    store.kpis
      .filter((k) => visibleUserIds.has(k.userId))
      .forEach((k) => metrics.add(k.metric));

    return Array.from(metrics).map((metric) => {
      const byMonth = last6.map((period) => {
        const kpis = store.kpis.filter(
          (k) => visibleUserIds.has(k.userId) && k.metric === metric && k.period === period
        );
        const totalTarget = kpis.reduce((s, k) => s + k.target, 0);
        const totalActual = kpis.reduce((s, k) => s + k.actual, 0);
        const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
        return { period, target: totalTarget, actual: totalActual, pct };
      });
      return { metric, months: byMonth };
    });
  }, [store.kpis, visibleUserIds, last6]);

  // Export handler
  const handleExport = () => {
    const rows = store.kpis
      .filter((k) => visibleUserIds.has(k.userId))
      .map((k) => {
        const u = allUsers.find((u) => u.id === k.userId);
        const setter = allUsers.find((u) => u.id === k.setBy);
        return {
          User: u?.name ?? k.userId,
          Role: u?.role ?? "---",
          Period: k.period,
          Metric: k.metric,
          Target: k.target,
          Actual: k.actual,
          "Achievement %": k.target > 0 ? Math.round((k.actual / k.target) * 100) : 0,
          "Set By": setter?.name ?? k.setBy,
        };
      });
    downloadCSV("kpi-report.csv", rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">KPI Achievement Report</h3>
          <p className="text-sm text-muted-foreground">Team performance summary and trends</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Achievement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={summaryColumns}
            data={summaryData as unknown as Record<string, unknown>[]}
            searchable
            searchKeys={["name", "role", "territory"]}
          />
        </CardContent>
      </Card>

      {/* Trend Charts (CSS Bar Charts) */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Over Time (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {trendData.map((trend) => (
              <div key={trend.metric} className="space-y-2">
                <h4 className="font-medium text-sm">{trend.metric}</h4>
                <div className="flex items-end gap-2 h-24">
                  {trend.months.map((m) => {
                    const barHeight = Math.max(m.pct, 2);
                    return (
                      <div key={m.period} className="flex-1 flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-semibold ${getColorForPct(m.pct)}`}>
                          {m.pct > 0 ? `${m.pct}%` : "---"}
                        </span>
                        <div className="w-full flex items-end" style={{ height: "64px" }}>
                          <div
                            className={`w-full rounded-t ${getBgColorForPct(m.pct)} opacity-80 transition-all`}
                            style={{ height: `${Math.min(barHeight, 100) * 0.64}px` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatPeriod(m.period).slice(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> On Target (100%+)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Near (80-99%)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Below (&lt;80%)</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 4: KPI Rankings ────────────────────────────────────────────────────

function RankingsTab() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useDataStore();
  const [selectedMetric, setSelectedMetric] = useState<string>("ALL");

  // Determine visible users
  const visibleUsers = useMemo(() => {
    if (user.role === "ADMIN" || user.role === "BUM") {
      return allUsers.filter((u) =>
        u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER" || u.role === "MARKETEER"
      );
    }
    if (user.role === "MARKETEER") {
      return getReportsOf(user.id);
    }
    if (user.role === "DISTRICT_MANAGER") {
      return getReportsOf(user.id);
    }
    return [user];
  }, [user, allUsers, getReportsOf]);

  const visibleUserIds = useMemo(() => new Set(visibleUsers.map((u) => u.id)), [visibleUsers]);

  // Get unique metrics from visible KPIs
  const availableMetrics = useMemo(() => {
    const metrics = new Set(store.kpis.filter((k) => visibleUserIds.has(k.userId)).map((k) => k.metric));
    return Array.from(metrics);
  }, [store.kpis, visibleUserIds]);

  // Rankings data
  const rankingsData = useMemo(() => {
    const relevantKpis = store.kpis.filter((k) => {
      if (!visibleUserIds.has(k.userId)) return false;
      if (selectedMetric !== "ALL" && k.metric !== selectedMetric) return false;
      return true;
    });

    // Group by user
    const userMap = new Map<string, { totalTarget: number; totalActual: number; kpiCount: number }>();
    relevantKpis.forEach((k) => {
      const existing = userMap.get(k.userId) ?? { totalTarget: 0, totalActual: 0, kpiCount: 0 };
      existing.totalTarget += k.target;
      existing.totalActual += k.actual;
      existing.kpiCount++;
      userMap.set(k.userId, existing);
    });

    return Array.from(userMap.entries()).map(([userId, data]) => {
      const u = allUsers.find((usr) => usr.id === userId);
      const pct = data.totalTarget > 0 ? Math.round((data.totalActual / data.totalTarget) * 100) : 0;
      return {
        id: userId,
        rank: 0,
        name: u?.name ?? userId,
        role: u?.role?.replace("_", " ") ?? "---",
        territory: u?.territory ?? "---",
        kpiCount: data.kpiCount,
        totalTarget: data.totalTarget,
        totalActual: data.totalActual,
        achievement: pct,
      };
    }).sort((a, b) => b.achievement - a.achievement).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [store.kpis, visibleUserIds, selectedMetric, allUsers]);

  const rankColumns: Column<Record<string, unknown>>[] = useMemo(() => [
    {
      key: "rank",
      label: "#",
      sortable: true,
      render: (v: unknown) => {
        const rank = v as number;
        const icon = rank === 1 ? <Award className="h-4 w-4 text-yellow-500 inline mr-1" /> :
                     rank === 2 ? <Award className="h-4 w-4 text-gray-400 inline mr-1" /> :
                     rank === 3 ? <Award className="h-4 w-4 text-amber-700 inline mr-1" /> : null;
        return <span className="font-bold">{icon}{rank}</span>;
      },
    },
    { key: "name", label: "Name", sortable: true, render: (v: unknown) => <span className="font-medium">{v as string}</span> },
    { key: "role", label: "Role", sortable: true },
    { key: "territory", label: "Territory", sortable: true },
    { key: "kpiCount", label: "KPIs", sortable: true },
    { key: "totalTarget", label: "Total Target", sortable: true },
    { key: "totalActual", label: "Total Actual", sortable: true },
    {
      key: "achievement",
      label: "Achievement",
      sortable: true,
      render: (v: unknown) => {
        const pct = v as number;
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getProgressBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <Badge variant={getBadgeVariant(pct)}>{pct}%</Badge>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">KPI Ranking Table</h3>
          <p className="text-sm text-muted-foreground">Rank team members by KPI achievement</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Metric:</span>
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={selectedMetric === "ALL" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedMetric("ALL")}
            >
              All Metrics
            </Button>
            {availableMetrics.map((m) => (
              <Button
                key={m}
                variant={selectedMetric === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedMetric(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {rankingsData.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {rankingsData.slice(0, 3).map((item, idx) => {
            const medals = ["bg-yellow-100 border-yellow-400 dark:bg-yellow-900/20", "bg-gray-100 border-gray-400 dark:bg-gray-800/30", "bg-amber-100 border-amber-600 dark:bg-amber-900/20"];
            const labels = ["1st Place", "2nd Place", "3rd Place"];
            return (
              <Card key={item.id} className={`border-2 ${medals[idx]}`}>
                <CardContent className="p-4 text-center space-y-2">
                  <Award className={`h-8 w-8 mx-auto ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-700"}`} />
                  <div className="text-xs text-muted-foreground">{labels[idx]}</div>
                  <div className="font-bold text-lg">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.territory}</div>
                  <Badge variant={getBadgeVariant(item.achievement)} className="text-base px-3 py-1">{item.achievement}%</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Ranking Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={rankColumns}
            data={rankingsData as unknown as Record<string, unknown>[]}
            searchable
            searchKeys={["name", "role", "territory"]}
            exportable
            exportFilename="kpi-rankings.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function KPIsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="KPI Management"
        description="Track, set, and report on key performance indicators across your team"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <Target className="h-4 w-4 mr-2" />
            KPI Dashboard
          </TabsTrigger>
          <TabsTrigger value="targets">
            <Plus className="h-4 w-4 mr-2" />
            Set Targets
          </TabsTrigger>
          <TabsTrigger value="rankings">
            <Award className="h-4 w-4 mr-2" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <KPIDashboardTab />
        </TabsContent>

        <TabsContent value="targets" className="mt-6">
          <SetTargetsTab />
        </TabsContent>

        <TabsContent value="rankings" className="mt-6">
          <RankingsTab />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
