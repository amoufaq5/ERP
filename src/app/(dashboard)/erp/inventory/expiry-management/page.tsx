"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  AlertTriangle,
  Clock,
  CalendarDays,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import ExpiryCalendar from "@/components/shared/expiry-calendar";
import FEFOPicker from "@/components/shared/fefo-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ExpiryItem,
  ExpiryAlert,
  ExpiryPolicy,
  ExpiryReport,
} from "@/lib/expiry/expiry-types";
import { EXPIRY_THRESHOLDS } from "@/lib/expiry/expiry-types";

// ── Helper: lazy store access (SSR-safe) ───────────────────────────────
function getStore() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/lib/expiry/expiry-store");
  return mod.expiryStore as import("@/lib/expiry/expiry-store").ExpiryStore;
}

// ── Product list (for selectors) ───────────────────────────────────────
const PRODUCTS = [
  { id: "PRD-001", name: "Amoxicillin 500mg" },
  { id: "PRD-002", name: "Omeprazole 20mg" },
  { id: "PRD-003", name: "Metformin 850mg" },
  { id: "PRD-004", name: "Atorvastatin 10mg" },
  { id: "PRD-005", name: "Losartan 50mg" },
  { id: "PRD-006", name: "Paracetamol 500mg" },
  { id: "PRD-007", name: "Ibuprofen 400mg" },
  { id: "PRD-008", name: "Ciprofloxacin 500mg" },
];

// ── Status badge rendering ─────────────────────────────────────────────
function StatusBadge({ status }: { status: ExpiryItem["status"] }) {
  const config: Record<
    ExpiryItem["status"],
    { label: string; className: string }
  > = {
    active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    "near-expiry": { label: "Near Expiry", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    "expiring-soon": { label: "Expiring Soon", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
    expired: { label: "Expired", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    quarantined: { label: "Quarantined", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
    destroyed: { label: "Destroyed", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
  };
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: ExpiryAlert["severity"] }) {
  const v: Record<ExpiryAlert["severity"], "destructive" | "warning" | "default"> = {
    critical: "destructive",
    warning: "warning",
    info: "default",
  };
  return <Badge variant={v[severity]}>{severity.toUpperCase()}</Badge>;
}

// ── Format EGP ─────────────────────────────────────────────────────────
function formatEGP(value: number): string {
  return `EGP ${value.toLocaleString("en-EG", { minimumFractionDigits: 0 })}`;
}

// ════════════════════════════════════════════════════════════════════════
// Page Component
// ════════════════════════════════════════════════════════════════════════
export default function ExpiryManagementPage() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [policies, setPolicies] = useState<ExpiryPolicy[]>([]);
  const [report, setReport] = useState<ExpiryReport | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mounted, setMounted] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState("all");
  const [alertAckFilter, setAlertAckFilter] = useState("all");

  // FEFO
  const [fefoProductId, setFefoProductId] = useState("");

  // Policy editing
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [policyDraft, setPolicyDraft] = useState<Partial<ExpiryPolicy>>({});

  // ── Load data ──────────────────────────────────────────────────────
  const reload = useCallback(() => {
    const store = getStore();
    if (!store) return;
    setItems(store.getItems());
    setAlerts(store.getAlerts());
    setPolicies(store.getPolicies());
    setReport(store.getExpiryReport());
  }, []);

  useEffect(() => {
    setMounted(true);
    reload();
  }, [reload]);

  // ── Derived data ───────────────────────────────────────────────────
  const expiredCount = useMemo(() => items.filter((i) => i.status === "expired").length, [items]);
  const critical30 = useMemo(
    () => items.filter((i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= EXPIRY_THRESHOLDS.critical && i.status !== "quarantined" && i.status !== "destroyed").length,
    [items]
  );
  const near90 = useMemo(
    () => items.filter((i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= EXPIRY_THRESHOLDS.notice && i.status !== "quarantined" && i.status !== "destroyed").length,
    [items]
  );

  const soonestItems = useMemo(
    () =>
      [...items]
        .filter((i) => i.status !== "quarantined" && i.status !== "destroyed")
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 10),
    [items]
  );

  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location.warehouse));
    return Array.from(set);
  }, [items]);

  // ── Filtered items for Inventory tab ───────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (locationFilter !== "all" && i.location.warehouse !== locationFilter) return false;
      if (productFilter !== "all" && i.productId !== productFilter) return false;
      return true;
    });
  }, [items, statusFilter, locationFilter, productFilter]);

  // ── Filtered alerts ────────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertSeverityFilter !== "all" && a.severity !== alertSeverityFilter) return false;
      if (alertAckFilter === "acknowledged" && !a.acknowledged) return false;
      if (alertAckFilter === "unacknowledged" && a.acknowledged) return false;
      return true;
    });
  }, [alerts, alertSeverityFilter, alertAckFilter]);

  // ── Status breakdown for dashboard ─────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; color: string; label: string }> = {
      expired: { count: 0, color: "bg-red-500", label: "Expired" },
      "expiring-soon": { count: 0, color: "bg-orange-500", label: "Expiring Soon (<30d)" },
      "near-expiry": { count: 0, color: "bg-yellow-500", label: "Near Expiry (<90d)" },
      active: { count: 0, color: "bg-green-500", label: "Active" },
      quarantined: { count: 0, color: "bg-purple-500", label: "Quarantined" },
      destroyed: { count: 0, color: "bg-gray-500", label: "Destroyed" },
    };
    for (const item of items) {
      if (counts[item.status]) counts[item.status].count++;
    }
    return Object.values(counts).filter((c) => c.count > 0);
  }, [items]);

  // FEFO compliance score
  const fefoScore = useMemo(() => {
    const policiesWithFefo = policies.filter((p) => p.fefoEnabled).length;
    return policies.length > 0 ? Math.round((policiesWithFefo / policies.length) * 100) : 0;
  }, [policies]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleAutoQuarantine = useCallback(() => {
    const store = getStore();
    if (!store) return;
    const count = store.quarantineExpired();
    alert(`${count} expired item(s) quarantined.`);
    reload();
  }, [reload]);

  const handleAcknowledgeAlert = useCallback(
    (alertId: string) => {
      const store = getStore();
      if (!store) return;
      store.acknowledgeAlert(alertId, "Admin");
      reload();
    },
    [reload]
  );

  const handleAcknowledgeAll = useCallback(() => {
    const store = getStore();
    if (!store) return;
    for (const a of alerts.filter((x) => !x.acknowledged)) {
      store.acknowledgeAlert(a.id, "Admin");
    }
    reload();
  }, [alerts, reload]);

  const handleBulkAction = useCallback(
    (action: string, selectedRows: ExpiryItem[]) => {
      const store = getStore();
      if (!store) return;
      for (const row of selectedRows) {
        if (action === "quarantine") {
          store.updateItem(row.id, { status: "quarantined", lastCheckedAt: new Date().toISOString(), notes: "Manually quarantined" });
        } else if (action === "destroy") {
          store.updateItem(row.id, { status: "destroyed", lastCheckedAt: new Date().toISOString(), notes: "Marked as destroyed" });
        }
      }
      reload();
    },
    [reload]
  );

  const handleSavePolicy = useCallback(
    (productId: string) => {
      const store = getStore();
      if (!store) return;
      store.updatePolicy(productId, policyDraft);
      setEditingPolicy(null);
      setPolicyDraft({});
      reload();
    },
    [policyDraft, reload]
  );

  const handleApplyDefaultPolicy = useCallback(() => {
    const store = getStore();
    if (!store) return;
    for (const p of policies) {
      if (p.productId) {
        store.updatePolicy(p.productId, {
          nearExpiryDays: 90,
          expiryWarningDays: 60,
          criticalExpiryDays: 30,
          autoQuarantineDays: 0,
          fefoEnabled: true,
        });
      }
    }
    reload();
  }, [policies, reload]);

  // ── Table columns ──────────────────────────────────────────────────
  const inventoryColumns: Column<ExpiryItem>[] = [
    { key: "productName", label: "Product", sortable: true },
    { key: "batchNumber", label: "Batch #", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    {
      key: "location",
      label: "Location",
      render: (_: unknown, row: ExpiryItem) =>
        `${row.location.warehouse} / ${row.location.zone} / ${row.location.shelf}`,
    },
    { key: "expiryDate", label: "Expiry Date", sortable: true },
    {
      key: "daysUntilExpiry",
      label: "Days Left",
      sortable: true,
      render: (v: number) => (
        <span
          className={cn(
            "font-semibold",
            v <= 0 ? "text-red-600" : v <= 30 ? "text-orange-600" : v <= 90 ? "text-yellow-600" : "text-green-600"
          )}
        >
          {v <= 0 ? `${Math.abs(v)}d overdue` : `${v}d`}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: ExpiryItem["status"]) => <StatusBadge status={v} />,
    },
    {
      key: "id",
      label: "Actions",
      render: (_: unknown, row: ExpiryItem) => {
        const store = getStore();
        if (!store) return null;
        return (
          <div className="flex items-center gap-1">
            {row.status !== "quarantined" && row.status !== "destroyed" && (
              <button className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200" onClick={() => { store.updateItem(row.id, { status: "quarantined", lastCheckedAt: new Date().toISOString(), notes: "Manually quarantined" }); reload(); }}>Quarantine</button>
            )}
            {row.status === "quarantined" && (
              <button className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200" onClick={() => { store.updateItem(row.id, { status: "destroyed", lastCheckedAt: new Date().toISOString(), notes: "Destroyed" }); reload(); }}>Destroy</button>
            )}
          </div>
        );
      },
    },
  ];

  const soonestColumns: Column<ExpiryItem>[] = [
    { key: "productName", label: "Product" },
    { key: "batchNumber", label: "Batch #" },
    { key: "quantity", label: "Qty" },
    { key: "expiryDate", label: "Expiry Date" },
    {
      key: "daysUntilExpiry",
      label: "Days",
      render: (v: number) => (
        <span
          className={cn(
            "font-bold",
            v <= 0 ? "text-red-600" : v <= 30 ? "text-orange-600" : "text-yellow-600"
          )}
        >
          {v <= 0 ? "EXPIRED" : `${v}d`}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: ExpiryItem["status"]) => <StatusBadge status={v} />,
    },
  ];

  const policyColumns: Column<ExpiryPolicy>[] = [
    {
      key: "productId",
      label: "Product",
      render: (v: string) => PRODUCTS.find((p) => p.id === v)?.name ?? v,
    },
    { key: "category", label: "Category" },
    { key: "nearExpiryDays", label: "Near Expiry (days)", sortable: true },
    { key: "expiryWarningDays", label: "Warning (days)", sortable: true },
    { key: "criticalExpiryDays", label: "Critical (days)", sortable: true },
    { key: "autoQuarantineDays", label: "Auto-Quarantine (days)" },
    {
      key: "fefoEnabled",
      label: "FEFO",
      render: (v: boolean) =>
        v ? (
          <span className="text-green-600 font-semibold flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Enabled
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Disabled
          </span>
        ),
    },
    {
      key: "_actions" as keyof ExpiryPolicy,
      label: "Actions",
      render: (_: unknown, row: ExpiryPolicy) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingPolicy(row.productId ?? null);
            setPolicyDraft(row);
          }}
          className="text-xs text-primary hover:underline font-medium"
        >
          Edit
        </button>
      ),
    },
  ];

  if (!mounted) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Expiry Date Management" description="Loading..." />
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Expiry Date Management"
        description="Monitor and manage pharmaceutical product expiry dates with FEFO compliance"
        icon={<CalendarDays className="h-6 w-6 text-primary" />}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Package}
          title="Total Items"
          value={items.length}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <StatsCard
          icon={XCircle}
          title="Expired"
          value={expiredCount}
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Expiring <30 Days"
          value={critical30}
          iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
        />
        <StatsCard
          icon={Clock}
          title="Expiring <90 Days"
          value={near90}
          iconColor="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400"
        />
        <StatsCard
          icon={Shield}
          title="Value at Risk"
          value={report ? formatEGP(report.valueAtRisk) : "EGP 0"}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="fefo" className="gap-1.5">
            <ArrowDown className="h-4 w-4" /> FEFO Picker
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5">
            <Shield className="h-4 w-4" /> Policies
          </TabsTrigger>
        </TabsList>

        {/* ──────────────── Dashboard Tab ──────────────── */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Calendar */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Expiry Calendar (Next 3 Months)
            </h3>
            <ExpiryCalendar items={items} months={3} />
          </div>

          {/* Status Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Expiry Status Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {statusBreakdown.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className={cn("h-3 w-3 rounded-full shrink-0", s.color)} />
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 10 Soonest */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Top 10 Items Expiring Soonest
              </h3>
              <button
                onClick={handleAutoQuarantine}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Run Auto-Quarantine
              </button>
            </div>
            <DataTable columns={soonestColumns} data={soonestItems} pagination={false} />
          </div>
        </TabsContent>

        {/* ──────────────── Inventory Tab ──────────────── */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="near-expiry">Near Expiry</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="quarantined">Quarantined</SelectItem>
                <SelectItem value="destroyed">Destroyed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={inventoryColumns}
            data={filteredItems}
            searchable
            searchKeys={["productName", "batchNumber"]}
            pagination
            selectable
            bulkActions={[
              { key: "quarantine", label: "Quarantine Selected", variant: "destructive" },
              { key: "destroy", label: "Mark Destroyed", variant: "destructive" },
            ]}
            onBulkAction={(action, rows) => handleBulkAction(action, rows as unknown as ExpiryItem[])}
            exportable
            exportFilename="expiry-inventory.csv"
          />
        </TabsContent>

        {/* ──────────────── Alerts Tab ──────────────── */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={alertSeverityFilter} onValueChange={setAlertSeverityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={alertAckFilter} onValueChange={setAlertAckFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={handleAcknowledgeAll}
              className="ml-auto inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Acknowledge All
            </button>
          </div>

          <div className="space-y-2">
            {filteredAlerts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No alerts found.
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3",
                    alert.acknowledged
                      ? "border-border bg-card opacity-60"
                      : alert.severity === "critical"
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                      : alert.severity === "warning"
                      ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
                      : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {alert.batchNumber}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.createdAt).toLocaleDateString("en-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Acknowledged
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ──────────────── FEFO Picker Tab ──────────────── */}
        <TabsContent value="fefo" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowDown className="h-5 w-5 text-primary" />
                FEFO Picking Assistant
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">FEFO Compliance Score:</span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    fefoScore >= 80 ? "text-green-600" : fefoScore >= 50 ? "text-yellow-600" : "text-red-600"
                  )}
                >
                  {fefoScore}%
                </span>
              </div>
            </div>

            {/* Product selector */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Select Product
              </label>
              <Select value={fefoProductId} onValueChange={setFefoProductId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fefoProductId ? (
              <FEFOPicker productId={fefoProductId} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select a product above to begin FEFO picking.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ──────────────── Policies Tab ──────────────── */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Expiry Policies</h3>
            <button
              onClick={handleApplyDefaultPolicy}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Apply Default Policy
            </button>
          </div>

          <DataTable columns={policyColumns} data={policies} pagination={false} />

          {/* Policy edit modal (inline) */}
          {editingPolicy && (
            <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
              <h4 className="text-base font-semibold text-foreground">
                Edit Policy: {PRODUCTS.find((p) => p.id === editingPolicy)?.name}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Near Expiry Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={policyDraft.nearExpiryDays ?? ""}
                    onChange={(e) =>
                      setPolicyDraft((d) => ({ ...d, nearExpiryDays: Number(e.target.value) }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Warning Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={policyDraft.expiryWarningDays ?? ""}
                    onChange={(e) =>
                      setPolicyDraft((d) => ({ ...d, expiryWarningDays: Number(e.target.value) }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Critical Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={policyDraft.criticalExpiryDays ?? ""}
                    onChange={(e) =>
                      setPolicyDraft((d) => ({ ...d, criticalExpiryDays: Number(e.target.value) }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Auto-Quarantine Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={policyDraft.autoQuarantineDays ?? ""}
                    onChange={(e) =>
                      setPolicyDraft((d) => ({ ...d, autoQuarantineDays: Number(e.target.value) }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={policyDraft.fefoEnabled ?? false}
                    onChange={(e) =>
                      setPolicyDraft((d) => ({ ...d, fefoEnabled: e.target.checked }))
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <label className="text-sm font-medium text-foreground">FEFO Enabled</label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSavePolicy(editingPolicy)}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Policy
                </button>
                <button
                  onClick={() => {
                    setEditingPolicy(null);
                    setPolicyDraft({});
                  }}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
