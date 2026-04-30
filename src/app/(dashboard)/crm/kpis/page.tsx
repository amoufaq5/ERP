"use client";

import { useMemo, useState } from "react";
import { Target, TrendingUp, Users, BarChart3, Plus, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// ─── Tab 1: KPI Dashboard ───────────────────────────────────────────────────

function KPIDashboardTab() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useDataStore();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});

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
    // MEDICAL_REP sees own KPIs
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

  // Filtered KPIs
  const filteredKpis = useMemo(() => {
    const userIds = new Set(visibleUsers.map((u) => u.id));
    return store.kpis.filter((kpi) => {
      if (!userIds.has(kpi.userId)) return false;
      if (filters.period && filters.period !== "ALL" && kpi.period !== filters.period) return false;
      if (filters.metric && filters.metric !== "ALL" && kpi.metric !== filters.metric) return false;
      if (filters.user && filters.user !== "ALL" && kpi.userId !== filters.user) return false;
      const userName = allUsers.find((u) => u.id === kpi.userId)?.name ?? "";
      if (search && !userName.toLowerCase().includes(search.toLowerCase()) && !kpi.metric.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [store.kpis, visibleUsers, filters, search, allUsers]);

  // Stats
  const totalKpis = filteredKpis.length;
  const onTarget = filteredKpis.filter((k) => k.target > 0 && k.actual >= k.target).length;
  const belowTarget = filteredKpis.filter((k) => k.target > 0 && k.actual < k.target * 0.8).length;
  const avgAchievement = filteredKpis.length > 0
    ? Math.round(filteredKpis.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) / filteredKpis.length)
    : 0;

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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Target} title="Total KPIs" value={totalKpis} iconColor="text-blue-600" />
        <StatsCard icon={TrendingUp} title="On Target" value={onTarget} subtitle={`${totalKpis > 0 ? Math.round((onTarget / totalKpis) * 100) : 0}%`} iconColor="text-green-600" />
        <StatsCard icon={BarChart3} title="Below Target" value={belowTarget} subtitle={`< 80% achievement`} iconColor="text-red-600" />
        <StatsCard icon={Target} title="Avg Achievement" value={`${avgAchievement}%`} iconColor="text-purple-600" />
      </div>

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
          {kpisByUser.map(({ user: u, kpis }) => (
            <Card key={u!.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{u!.name}</CardTitle>
                    <CardDescription>{u!.role.replace("_", " ")} {u!.territory ? `- ${u!.territory}` : ""}</CardDescription>
                  </div>
                  <Badge variant="secondary">{kpis.length} KPIs</Badge>
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
          ))}
        </div>
      )}
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

  const columns: Column[] = useMemo(() => [
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

  const summaryColumns: Column[] = useMemo(() => [
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

        <TabsContent value="reports" className="mt-6">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
