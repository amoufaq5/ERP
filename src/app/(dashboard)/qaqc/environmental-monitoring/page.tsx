"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import EnvMonitoringDashboard from "@/components/shared/env-monitoring-dashboard";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  Thermometer,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Plus,
  Search,
  Download,
  Filter,
  MapPin,
  Eye,
  FileText,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import type {
  MonitoringLocation,
  MonitoringPoint,
  MonitoringReading,
  ExcursionRecord,
  TrendData,
  EMMetrics,
  ZoneClassification,
  ParameterType,
  ReadingResult,
  ExcursionStatus,
} from "@/lib/quality/env-monitoring-types";
import {
  PARAMETER_LABELS,
  PARAMETER_UNITS,
  ZONE_LABELS,
} from "@/lib/quality/env-monitoring-types";
import { envMonitoringStore } from "@/lib/quality/env-monitoring-store";

// ─── Constants ─────────────────────────────────────────────────────────────

type TabId = "dashboard" | "readings" | "excursions" | "trends";

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: "dashboard", label: "Dashboard", icon: MapPin },
  { id: "readings", label: "Readings", icon: Activity },
  { id: "excursions", label: "Excursions", icon: ShieldAlert },
  { id: "trends", label: "Trends", icon: TrendingUp },
];

const RESULT_STYLES: Record<ReadingResult, string> = {
  pass: "bg-green-100 text-green-800",
  alert: "bg-yellow-100 text-yellow-800",
  action: "bg-red-100 text-red-800",
  fail: "bg-red-200 text-red-900",
};

const EXCURSION_STATUS_STYLES: Record<ExcursionStatus, string> = {
  open: "bg-red-100 text-red-800",
  investigating: "bg-orange-100 text-orange-800",
  resolved: "bg-blue-100 text-blue-800",
  closed: "bg-green-100 text-green-800",
};

const PAGE_SIZE = 25;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatValue(value: number, unit: string): string {
  if (unit === "particles/m³" && value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value < 10 ? 2 : 0);
}

function isoDate(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ─── Tab Button ────────────────────────────────────────────────────────────

function TabButton({
  tab,
  active,
  onClick,
  count,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
      {tab.label}
      {count != null && count > 0 && (
        <span
          className={cn(
            "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
            active ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── CSS Trend Chart ───────────────────────────────────────────────────────

function TrendChart({
  trend,
  height = 200,
}: {
  trend: TrendData;
  height?: number;
}) {
  if (trend.data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground border rounded-lg"
        style={{ height }}
      >
        Insufficient data for trend chart
      </div>
    );
  }

  const values = trend.data.map((d) => d.value);
  const maxDataVal = Math.max(...values);
  const maxVal = Math.max(maxDataVal, trend.actionLimit * 1.15);
  const minVal = Math.min(0, ...values);
  const range = maxVal - minVal || 1;

  const alertY = ((trend.alertLimit - minVal) / range) * 100;
  const actionY = ((trend.actionLimit - minVal) / range) * 100;

  const barWidth = Math.max(2, Math.min(12, 600 / trend.data.length));

  return (
    <div className="relative border rounded-lg p-4" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-4 bottom-8 w-12 flex flex-col justify-between text-[9px] text-muted-foreground">
        <span>{maxVal.toFixed(0)}</span>
        <span>{((maxVal + minVal) / 2).toFixed(0)}</span>
        <span>{minVal.toFixed(0)}</span>
      </div>

      {/* Chart area */}
      <div className="ml-14 mr-2 relative" style={{ height: height - 60 }}>
        {/* Alert limit line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-400 z-10"
          style={{ bottom: `${alertY}%` }}
        >
          <span className="absolute -top-3 right-0 text-[8px] text-yellow-600 bg-white px-1">
            Alert: {trend.alertLimit}
          </span>
        </div>

        {/* Action limit line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
          style={{ bottom: `${actionY}%` }}
        >
          <span className="absolute -top-3 right-0 text-[8px] text-red-600 bg-white px-1">
            Action: {trend.actionLimit}
          </span>
        </div>

        {/* Data bars */}
        <div className="absolute inset-0 flex items-end gap-px">
          {trend.data.map((point, i) => {
            const pct = ((point.value - minVal) / range) * 100;
            return (
              <div
                key={i}
                className="relative group flex-1"
                style={{ maxWidth: barWidth }}
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors",
                    point.result === "action"
                      ? "bg-red-500"
                      : point.result === "alert"
                        ? "bg-yellow-500"
                        : "bg-blue-400"
                  )}
                  style={{ height: `${Math.max(1, pct)}%` }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                  <div className="bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
                    {point.value} {trend.unit}
                    <br />
                    {formatDate(point.date)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis */}
      <div className="ml-14 mr-2 mt-1 flex justify-between text-[8px] text-muted-foreground">
        {trend.data.length > 0 && (
          <>
            <span>{formatDate(trend.data[0].date)}</span>
            {trend.data.length > 4 && (
              <span>{formatDate(trend.data[Math.floor(trend.data.length / 2)].date)}</span>
            )}
            <span>{formatDate(trend.data[trend.data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Reading Form ──────────────────────────────────────────────────────────

function ReadingForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reading: Omit<MonitoringReading, "id">) => void;
  onCancel: () => void;
}) {
  const [locationId, setLocationId] = useState("");
  const [pointId, setPointId] = useState("");
  const [value, setValue] = useState("");
  const [operator, setOperator] = useState("");
  const [notes, setNotes] = useState("");

  const locations = useMemo(() => envMonitoringStore.getAllLocations(), []);
  const points = useMemo(
    () => (locationId ? envMonitoringStore.getPointsByLocation(locationId) : []),
    [locationId]
  );

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === pointId),
    [points, pointId]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!pointId || !value || !operator || !selectedPoint) return;

      const numVal = parseFloat(value);
      const isDP = selectedPoint.parameter === "differential-pressure";
      let result: ReadingResult = "pass";
      if (isDP) {
        if (numVal < selectedPoint.actionLimit.value) result = "action";
        else if (numVal < selectedPoint.alertLimit.value) result = "alert";
      } else {
        if (numVal >= selectedPoint.actionLimit.value) result = "action";
        else if (numVal >= selectedPoint.alertLimit.value) result = "alert";
      }

      onSubmit({
        pointId,
        locationId,
        timestamp: new Date().toISOString(),
        value: numVal,
        unit: selectedPoint.unit,
        result,
        operator,
        notes: notes || undefined,
      });
    },
    [pointId, locationId, value, operator, notes, selectedPoint, onSubmit]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log New Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location */}
            <div>
              <label className="block text-xs font-medium mb-1">Location *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setPointId("");
                }}
                required
              >
                <option value="">Select location...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* Point */}
            <div>
              <label className="block text-xs font-medium mb-1">Monitoring Point *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                required
                disabled={!locationId}
              >
                <option value="">Select point...</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {PARAMETER_LABELS[p.parameter]}
                  </option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Value * {selectedPoint ? `(${selectedPoint.unit})` : ""}
              </label>
              <input
                type="number"
                step="any"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  selectedPoint
                    ? `Alert: ${selectedPoint.alertLimit.value} / Action: ${selectedPoint.actionLimit.value}`
                    : "Enter value"
                }
                required
              />
            </div>

            {/* Operator */}
            <div>
              <label className="block text-xs font-medium mb-1">Operator *</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Operator name"
                required
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* Limit info */}
          {selectedPoint && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <span>
                <strong>Alert Limit:</strong> {selectedPoint.alertLimit.value}{" "}
                {selectedPoint.alertLimit.unit}
              </span>
              <span>
                <strong>Action Limit:</strong> {selectedPoint.actionLimit.value}{" "}
                {selectedPoint.actionLimit.unit}
              </span>
              <span>
                <strong>Method:</strong> {selectedPoint.method}
              </span>
              <span>
                <strong>Frequency:</strong> {selectedPoint.samplingFrequency}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Record Reading
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Excursion Resolution Form ─────────────────────────────────────────────

function ExcursionResolutionForm({
  excursion,
  onResolve,
  onCancel,
}: {
  excursion: ExcursionRecord;
  onResolve: (data: {
    investigationNotes: string;
    rootCause: string;
    capaRef?: string;
    resolvedBy: string;
  }) => void;
  onCancel: () => void;
}) {
  const [investigationNotes, setInvestigationNotes] = useState(
    excursion.investigationNotes || ""
  );
  const [rootCause, setRootCause] = useState(excursion.rootCause || "");
  const [capaRef, setCapaRef] = useState(excursion.capaRef || "");
  const [resolvedBy, setResolvedBy] = useState("");

  const location = useMemo(
    () => envMonitoringStore.getLocationById(excursion.locationId),
    [excursion.locationId]
  );

  const point = useMemo(
    () => envMonitoringStore.getPointById(excursion.pointId),
    [excursion.pointId]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!investigationNotes || !rootCause || !resolvedBy) return;
      onResolve({
        investigationNotes,
        rootCause,
        capaRef: capaRef || undefined,
        resolvedBy,
      });
    },
    [investigationNotes, rootCause, capaRef, resolvedBy, onResolve]
  );

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" /> Resolve Excursion: {excursion.id}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">{location?.name ?? "Unknown"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Point:</span>
            <p className="font-medium">{point?.name ?? "Unknown"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Value:</span>
            <p className="font-medium text-red-600">
              {excursion.value} (Limit: {excursion.limit})
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Detected:</span>
            <p className="font-medium">{formatDateTime(excursion.detectedAt)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Investigation Notes *</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
              value={investigationNotes}
              onChange={(e) => setInvestigationNotes(e.target.value)}
              placeholder="Describe investigation findings per SOP-EM-003..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Root Cause *</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Identified root cause"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">CAPA Reference</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={capaRef}
                onChange={(e) => setCapaRef(e.target.value)}
                placeholder="e.g., CAPA-2026-0001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Resolved By *</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve Excursion
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────

function DashboardTab({ metrics }: { metrics: EMMetrics }) {
  const recentExcursions = useMemo(() => {
    return envMonitoringStore
      .getOpenExcursions()
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 10);
  }, []);

  return (
    <div className="space-y-6">
      {/* Facility Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Facility Environmental Monitoring Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnvMonitoringDashboard />
        </CardContent>
      </Card>

      {/* Zone Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {(
          ["Grade A", "Grade B", "Grade C", "Grade D", "Unclassified"] as ZoneClassification[]
        ).map((zone) => {
          const summary = metrics.locationStatusSummary[zone];
          if (!summary) return null;
          const hasIssues = summary.alert > 0 || summary.action > 0;
          return (
            <Card
              key={zone}
              className={cn(
                "border",
                summary.action > 0
                  ? "border-red-200 bg-red-50/50"
                  : summary.alert > 0
                    ? "border-yellow-200 bg-yellow-50/50"
                    : "border-green-200 bg-green-50/50"
              )}
            >
              <CardContent className="p-3">
                <div className="text-xs font-semibold mb-1">{zone}</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-green-600">{summary.normal} OK</span>
                  {summary.alert > 0 && (
                    <span className="text-yellow-600">{summary.alert} Alert</span>
                  )}
                  {summary.action > 0 && (
                    <span className="text-red-600">{summary.action} Action</span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {summary.total} location{summary.total !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Excursions */}
      {recentExcursions.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" /> Open Excursions Requiring Investigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Parameter</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs">Limit</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Detected</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExcursions.map((exc) => {
                    const loc = envMonitoringStore.getLocationById(exc.locationId);
                    return (
                      <TableRow key={exc.id}>
                        <TableCell className="text-xs font-mono">{exc.id}</TableCell>
                        <TableCell className="text-xs">{loc?.name ?? "Unknown"}</TableCell>
                        <TableCell className="text-xs">
                          {PARAMETER_LABELS[exc.parameter]}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-red-600">
                          {exc.value}
                        </TableCell>
                        <TableCell className="text-xs">{exc.limit}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[9px]",
                              exc.limitType === "action"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            )}
                          >
                            {exc.limitType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateTime(exc.detectedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[9px]", EXCURSION_STATUS_STYLES[exc.status])}>
                            {exc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{exc.assignedTo}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Readings Tab ──────────────────────────────────────────────────────────

function ReadingsTab() {
  const [showForm, setShowForm] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterParameter, setFilterParameter] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshKey, setRefreshKey] = useState(0);

  const locations = useMemo(() => envMonitoringStore.getAllLocations(), []);
  const allPoints = useMemo(() => envMonitoringStore.getAllPoints(), []);
  const parameters = useMemo(() => envMonitoringStore.getUniqueParameters(), []);

  const allReadings = useMemo(() => {
    void refreshKey; // dependency
    return envMonitoringStore.getAllReadings();
  }, [refreshKey]);

  const filteredReadings = useMemo(() => {
    let result = allReadings;

    if (filterLocation) {
      result = result.filter((r) => r.locationId === filterLocation);
    }
    if (filterParameter) {
      const pointIds = new Set(
        allPoints
          .filter((p) => p.parameter === filterParameter)
          .map((p) => p.id)
      );
      result = result.filter((r) => pointIds.has(r.pointId));
    }
    if (filterResult) {
      result = result.filter((r) => r.result === filterResult);
    }
    if (filterDateFrom) {
      result = result.filter((r) => r.timestamp >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((r) => r.timestamp <= filterDateTo + "T23:59:59");
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.operator.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) =>
      sortDir === "desc"
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    );

    return result;
  }, [
    allReadings,
    filterLocation,
    filterParameter,
    filterResult,
    filterDateFrom,
    filterDateTo,
    searchText,
    allPoints,
    sortDir,
  ]);

  const paginatedReadings = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredReadings.slice(start, start + PAGE_SIZE);
  }, [filteredReadings, page]);

  const totalPages = Math.ceil(filteredReadings.length / PAGE_SIZE);

  const handleAddReading = useCallback(
    (data: Omit<MonitoringReading, "id">) => {
      const reading = envMonitoringStore.addReading(data);

      // Auto-create excursion for action-level readings
      if (reading.result === "action") {
        const point = envMonitoringStore.getPointById(reading.pointId);
        if (point) {
          envMonitoringStore.createExcursion({
            readingId: reading.id,
            pointId: reading.pointId,
            locationId: reading.locationId,
            status: "open",
            detectedAt: reading.timestamp,
            value: reading.value,
            limit: point.actionLimit.value,
            limitType: "action",
            parameter: point.parameter,
            investigationNotes: "",
            assignedTo: reading.operator,
          });
        }
      }

      setShowForm(false);
      setRefreshKey((k) => k + 1);
    },
    []
  );

  const handleExport = useCallback(() => {
    const header =
      "ID,Point ID,Location,Timestamp,Value,Unit,Result,Operator,Notes\n";
    const rows = filteredReadings
      .map((r) => {
        const loc = locations.find((l) => l.id === r.locationId);
        return `${r.id},${r.pointId},${loc?.name ?? ""},${r.timestamp},${r.value},${r.unit},${r.result},${r.operator},"${r.notes ?? ""}"`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `em-readings-${isoDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredReadings, locations]);

  const clearFilters = useCallback(() => {
    setFilterLocation("");
    setFilterParameter("");
    setFilterResult("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchText("");
    setPage(0);
  }, []);

  const hasFilters =
    filterLocation ||
    filterParameter ||
    filterResult ||
    filterDateFrom ||
    filterDateTo ||
    searchText;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Hide Form" : "Log Reading"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <XCircle className="w-3.5 h-3.5 mr-1" /> Clear Filters
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredReadings.length} reading{filteredReadings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Form */}
      {showForm && (
        <ReadingForm
          onSubmit={handleAddReading}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <select
              className="border rounded-md px-2 py-1.5 text-xs bg-background"
              value={filterLocation}
              onChange={(e) => {
                setFilterLocation(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <select
              className="border rounded-md px-2 py-1.5 text-xs bg-background"
              value={filterParameter}
              onChange={(e) => {
                setFilterParameter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Parameters</option>
              {parameters.map((p) => (
                <option key={p} value={p}>
                  {PARAMETER_LABELS[p]}
                </option>
              ))}
            </select>

            <select
              className="border rounded-md px-2 py-1.5 text-xs bg-background"
              value={filterResult}
              onChange={(e) => {
                setFilterResult(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Results</option>
              <option value="pass">Pass</option>
              <option value="alert">Alert</option>
              <option value="action">Action</option>
            </select>

            <input
              type="date"
              className="border rounded-md px-2 py-1.5 text-xs bg-background"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setPage(0);
              }}
              placeholder="From date"
            />

            <input
              type="date"
              className="border rounded-md px-2 py-1.5 text-xs bg-background"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setPage(0);
              }}
              placeholder="To date"
            />

            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="w-full border rounded-md pl-7 pr-2 py-1.5 text-xs bg-background"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(0);
                }}
                placeholder="Search operator..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Point</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Parameter</TableHead>
                  <TableHead className="text-xs">
                    <button
                      className="flex items-center gap-1"
                      onClick={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                      }
                    >
                      Timestamp
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs text-right">Value</TableHead>
                  <TableHead className="text-xs">Result</TableHead>
                  <TableHead className="text-xs">Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReadings.map((reading) => {
                  const point = allPoints.find((p) => p.id === reading.pointId);
                  const location = locations.find(
                    (l) => l.id === reading.locationId
                  );
                  return (
                    <TableRow key={reading.id}>
                      <TableCell className="text-xs font-mono">
                        {reading.id}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {point?.name ?? reading.pointId}
                      </TableCell>
                      <TableCell className="text-xs">
                        {location?.name ?? reading.locationId}
                      </TableCell>
                      <TableCell className="text-xs">
                        {point
                          ? PARAMETER_LABELS[point.parameter]
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(reading.timestamp)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatValue(reading.value, reading.unit)}{" "}
                        <span className="text-muted-foreground">
                          {reading.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[9px] uppercase",
                            RESULT_STYLES[reading.result]
                          )}
                        >
                          {reading.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {reading.operator}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedReadings.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-xs text-muted-foreground py-8"
                    >
                      No readings found matching current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Excursions Tab ────────────────────────────────────────────────────────

function ExcursionsTab() {
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allExcursions = useMemo(() => {
    void refreshKey;
    return envMonitoringStore.getAllExcursions();
  }, [refreshKey]);

  const filteredExcursions = useMemo(() => {
    let result = allExcursions;
    if (filterStatus && filterStatus !== "all") {
      if (filterStatus === "open") {
        result = result.filter(
          (e) => e.status === "open" || e.status === "investigating"
        );
      } else {
        result = result.filter((e) => e.status === filterStatus);
      }
    }
    return result.sort((a, b) =>
      b.detectedAt.localeCompare(a.detectedAt)
    );
  }, [allExcursions, filterStatus]);

  const resolvingExcursion = useMemo(
    () => (resolvingId ? allExcursions.find((e) => e.id === resolvingId) : undefined),
    [allExcursions, resolvingId]
  );

  const handleResolve = useCallback(
    (data: {
      investigationNotes: string;
      rootCause: string;
      capaRef?: string;
      resolvedBy: string;
    }) => {
      if (!resolvingId) return;
      envMonitoringStore.resolveExcursion(resolvingId, data);
      setResolvingId(null);
      setRefreshKey((k) => k + 1);
    },
    [resolvingId]
  );

  const handleUpdateStatus = useCallback(
    (id: string, status: ExcursionStatus) => {
      envMonitoringStore.updateExcursion(id, { status });
      setRefreshKey((k) => k + 1);
    },
    []
  );

  const openCount = allExcursions.filter(
    (e) => e.status === "open" || e.status === "investigating"
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            filterStatus === "open" && "ring-2 ring-primary"
          )}
          onClick={() => setFilterStatus("open")}
        >
          <CardContent className="p-3">
            <div className="text-lg font-bold text-red-600">{openCount}</div>
            <div className="text-xs text-muted-foreground">Open / Investigating</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            filterStatus === "resolved" && "ring-2 ring-primary"
          )}
          onClick={() => setFilterStatus("resolved")}
        >
          <CardContent className="p-3">
            <div className="text-lg font-bold text-blue-600">
              {allExcursions.filter((e) => e.status === "resolved").length}
            </div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            filterStatus === "closed" && "ring-2 ring-primary"
          )}
          onClick={() => setFilterStatus("closed")}
        >
          <CardContent className="p-3">
            <div className="text-lg font-bold text-green-600">
              {allExcursions.filter((e) => e.status === "closed").length}
            </div>
            <div className="text-xs text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            filterStatus === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setFilterStatus("all")}
        >
          <CardContent className="p-3">
            <div className="text-lg font-bold">{allExcursions.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Form */}
      {resolvingExcursion && (
        <ExcursionResolutionForm
          excursion={resolvingExcursion}
          onResolve={handleResolve}
          onCancel={() => setResolvingId(null)}
        />
      )}

      {/* Excursions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Excursion Records
            {openCount > 0 && (
              <Badge className="bg-red-100 text-red-800 text-[9px] ml-1">
                {openCount} open
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Parameter</TableHead>
                  <TableHead className="text-xs">Value / Limit</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Detected</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">CAPA</TableHead>
                  <TableHead className="text-xs">Assigned</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExcursions.map((exc) => {
                  const loc = envMonitoringStore.getLocationById(
                    exc.locationId
                  );
                  const point = envMonitoringStore.getPointById(exc.pointId);
                  return (
                    <TableRow
                      key={exc.id}
                      className={cn(
                        exc.status === "open" && "bg-red-50/50",
                        exc.status === "investigating" && "bg-orange-50/50"
                      )}
                    >
                      <TableCell className="text-xs font-mono">
                        {exc.id}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{loc?.name ?? "Unknown"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {point?.name ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {PARAMETER_LABELS[exc.parameter]}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-red-600">
                          {exc.value}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {exc.limit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[9px]",
                            exc.limitType === "action"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {exc.limitType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(exc.detectedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[9px]",
                            EXCURSION_STATUS_STYLES[exc.status]
                          )}
                        >
                          {exc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {exc.capaRef ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {exc.assignedTo}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {exc.status === "open" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() =>
                                  handleUpdateStatus(exc.id, "investigating")
                                }
                              >
                                Investigate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => setResolvingId(exc.id)}
                              >
                                Resolve
                              </Button>
                            </>
                          )}
                          {exc.status === "investigating" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              onClick={() => setResolvingId(exc.id)}
                            >
                              Resolve
                            </Button>
                          )}
                          {exc.status === "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              onClick={() =>
                                handleUpdateStatus(exc.id, "closed")
                              }
                            >
                              Close
                            </Button>
                          )}
                          {(exc.status === "resolved" ||
                            exc.status === "closed") &&
                            exc.investigationNotes && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] px-2"
                                title={exc.investigationNotes}
                                onClick={() => {}}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredExcursions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-xs text-muted-foreground py-8"
                    >
                      No excursions found for the selected filter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Trends Tab ────────────────────────────────────────────────────────────

function TrendsTab() {
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedPointId, setSelectedPointId] = useState("");
  const [period, setPeriod] = useState(30);

  const locations = useMemo(() => envMonitoringStore.getAllLocations(), []);
  const points = useMemo(
    () =>
      selectedLocationId
        ? envMonitoringStore.getPointsByLocation(selectedLocationId)
        : envMonitoringStore.getAllPoints(),
    [selectedLocationId]
  );

  // Auto-select first point
  useEffect(() => {
    if (points.length > 0 && !selectedPointId) {
      setSelectedPointId(points[0].id);
    }
  }, [points, selectedPointId]);

  // Get trends for selected point or all points in location
  const trends = useMemo(() => {
    if (selectedPointId) {
      const trend = envMonitoringStore.getTrend(selectedPointId, period);
      return trend ? [trend] : [];
    }
    if (selectedLocationId) {
      const locPoints = envMonitoringStore.getPointsByLocation(
        selectedLocationId
      );
      return locPoints
        .map((p) => envMonitoringStore.getTrend(p.id, period))
        .filter((t): t is TrendData => t != null && t.data.length > 0);
    }
    // Default: show all points with excursion readings
    const allPts = envMonitoringStore.getAllPoints();
    return allPts
      .map((p) => envMonitoringStore.getTrend(p.id, period))
      .filter((t): t is TrendData => t != null && t.data.length > 0)
      .slice(0, 6);
  }, [selectedLocationId, selectedPointId, period]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Location</label>
              <select
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setSelectedPointId("");
                }}
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Monitoring Point
              </label>
              <select
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
                value={selectedPointId}
                onChange={(e) => setSelectedPointId(e.target.value)}
              >
                <option value="">
                  {selectedLocationId
                    ? "All points in location"
                    : "Select a point..."}
                </option>
                {points.map((p) => {
                  const loc = locations.find((l) => l.id === p.locationId);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} - {PARAMETER_LABELS[p.parameter]}
                      {!selectedLocationId && loc
                        ? ` (${loc.name})`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Period</label>
              <div className="flex gap-1">
                {[7, 14, 30, 60, 90].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={period === d ? "default" : "outline"}
                    className="h-8 text-xs px-3"
                    onClick={() => setPeriod(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Charts */}
      {trends.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a location and monitoring point to view trend data.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trends.map((trend) => (
            <Card key={trend.pointId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>
                    {trend.pointName} &mdash;{" "}
                    {PARAMETER_LABELS[trend.parameter]}
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    {trend.unit}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {trend.locationName} &middot; {trend.data.length} readings
                  over {period} days
                </p>
              </CardHeader>
              <CardContent>
                <TrendChart trend={trend} height={220} />
                {/* Stats below chart */}
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="text-[10px] text-muted-foreground">Min</div>
                    <div className="text-xs font-medium">
                      {Math.min(...trend.data.map((d) => d.value)).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="text-[10px] text-muted-foreground">Max</div>
                    <div className="text-xs font-medium">
                      {Math.max(...trend.data.map((d) => d.value)).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="text-[10px] text-muted-foreground">Mean</div>
                    <div className="text-xs font-medium">
                      {(
                        trend.data.reduce((s, d) => s + d.value, 0) /
                        trend.data.length
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="text-[10px] text-muted-foreground">
                      Pass %
                    </div>
                    <div className="text-xs font-medium">
                      {(
                        (trend.data.filter((d) => d.result === "pass").length /
                          trend.data.length) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function EnvironmentalMonitoringPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [metrics, setMetrics] = useState<EMMetrics | null>(null);

  useEffect(() => {
    setMetrics(envMonitoringStore.getMetrics());
  }, [activeTab]);

  if (!metrics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading environmental monitoring data...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Environmental Monitoring"
        description="EU GMP Annex 1 compliant facility environmental monitoring and trend analysis"
        icon={<Thermometer className="w-5 h-5 text-primary" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Activity}
          title="Active Points"
          value={metrics.activePoints}
          subtitle={`${metrics.totalLocations} locations`}
          iconColor="text-blue-500"
        />
        <StatsCard
          icon={Clock}
          title="Readings Today"
          value={metrics.readingsToday}
          subtitle={`${metrics.readingsThisWeek} this week`}
          iconColor="text-indigo-500"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Alerts"
          value={metrics.alertsToday}
          subtitle={`${metrics.alertsThisWeek} this week`}
          iconColor="text-yellow-500"
        />
        <StatsCard
          icon={ShieldAlert}
          title="Open Excursions"
          value={metrics.excursionsOpen}
          subtitle={`${metrics.excursionsThisMonth} this month`}
          iconColor="text-red-500"
        />
        <StatsCard
          icon={CheckCircle}
          title="Compliance Rate"
          value={`${metrics.complianceRate}%`}
          subtitle="Overall pass rate"
          iconColor="text-green-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            count={
              tab.id === "excursions" ? metrics.excursionsOpen : undefined
            }
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardTab metrics={metrics} />}
      {activeTab === "readings" && <ReadingsTab />}
      {activeTab === "excursions" && <ExcursionsTab />}
      {activeTab === "trends" && <TrendsTab />}
    </div>
  );
}
