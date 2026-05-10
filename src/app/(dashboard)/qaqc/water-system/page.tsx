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
import WaterSystemDiagram from "@/components/shared/water-system-diagram";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  Droplet,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Plus,
  Search,
  Download,
  Filter,
  Eye,
  FileText,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  MapPin,
  Thermometer,
  FlaskConical,
  Gauge,
  TestTubes,
} from "lucide-react";
import type {
  WaterSystem,
  WaterSamplingPoint,
  WaterReading,
  WaterExcursionRecord,
  WaterTrend,
  WaterMetrics,
  WaterType,
  WaterTestParameterType,
  WaterReadingResult,
  WaterSystemStatus,
  WaterExcursionStatus,
} from "@/lib/quality/water-system-types";
import {
  WATER_PARAMETER_LABELS,
  WATER_TYPE_LABELS,
  SAMPLING_LOCATION_LABELS,
} from "@/lib/quality/water-system-types";
import { useWaterSystemStore, waterSystemStore } from "@/lib/quality/water-system-store";

// ─── API helpers ──────────────────────────────────────────────────────────

const API_BASE = "/api/v1/qaqc/water-system";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  const json = await res.json();
  return (json.data ?? json) as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

/** Shared hook: load systems + points from the API once. */
function useSystemsAndPoints() {
  const [systems, setSystems] = useState<WaterSystem[]>([]);
  const [points, setPoints] = useState<WaterSamplingPoint[]>([]);

  useEffect(() => {
    apiFetch<WaterSystem[]>("/systems").then(setSystems).catch(() => {});
    apiFetch<WaterSamplingPoint[]>("/points").then(setPoints).catch(() => {});
  }, []);

  return { systems, points };
}

// ─── Constants ─────────────────────────────────────────────────────────────

type TabId = "dashboard" | "readings" | "excursions" | "trends";

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: "dashboard", label: "Dashboard", icon: MapPin },
  { id: "readings", label: "Readings", icon: Activity },
  { id: "excursions", label: "Excursions", icon: ShieldAlert },
  { id: "trends", label: "Trends", icon: TrendingUp },
];

const RESULT_STYLES: Record<WaterReadingResult, string> = {
  pass: "bg-green-100 text-green-800",
  alert: "bg-yellow-100 text-yellow-800",
  action: "bg-red-100 text-red-800",
  fail: "bg-red-200 text-red-900",
};

const EXCURSION_STATUS_STYLES: Record<WaterExcursionStatus, string> = {
  open: "bg-red-100 text-red-800",
  investigating: "bg-orange-100 text-orange-800",
  resolved: "bg-blue-100 text-blue-800",
  closed: "bg-green-100 text-green-800",
};

const SYSTEM_STATUS_STYLES: Record<WaterSystemStatus, string> = {
  normal: "bg-green-100 text-green-800",
  alert: "bg-yellow-100 text-yellow-800",
  action: "bg-red-100 text-red-800",
  shutdown: "bg-red-200 text-red-900",
};

const PAGE_SIZE = 25;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatValue(value: number, unit: string): string {
  if (unit === "ppb" && value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value < 10 ? value.toFixed(3) : value.toFixed(value < 100 ? 1 : 0);
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

function WaterTrendChart({
  trend,
  height = 200,
}: {
  trend: WaterTrend;
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
      <div className="absolute left-0 top-4 bottom-8 w-14 flex flex-col justify-between text-[9px] text-muted-foreground">
        <span>{maxVal.toFixed(maxVal < 1 ? 3 : 0)}</span>
        <span>{((maxVal + minVal) / 2).toFixed(maxVal < 1 ? 3 : 0)}</span>
        <span>{minVal.toFixed(0)}</span>
      </div>

      {/* Chart area */}
      <div className="ml-16 mr-2 relative" style={{ height: height - 60 }}>
        {/* Alert limit line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-400 z-10"
          style={{ bottom: `${Math.min(100, alertY)}%` }}
        >
          <span className="absolute -top-3 right-0 text-[8px] text-yellow-600 bg-white px-1">
            Alert: {trend.alertLimit}
          </span>
        </div>

        {/* Action limit line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
          style={{ bottom: `${Math.min(100, actionY)}%` }}
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
      <div className="ml-16 mr-2 mt-1 flex justify-between text-[8px] text-muted-foreground">
        {trend.data.length > 0 && (
          <>
            <span>{formatDate(trend.data[0].date)}</span>
            {trend.data.length > 4 && (
              <span>
                {formatDate(
                  trend.data[Math.floor(trend.data.length / 2)].date
                )}
              </span>
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
  onSubmit: (reading: Omit<WaterReading, "id">) => void;
  onCancel: () => void;
}) {
  const [systemId, setSystemId] = useState("");
  const [pointId, setPointId] = useState("");
  const [parameter, setParameter] = useState<WaterTestParameterType | "">("");
  const [value, setValue] = useState("");
  const [operator, setOperator] = useState("");
  const [notes, setNotes] = useState("");

  const { systems, points: allPoints } = useSystemsAndPoints();
  const readings = useWaterSystemStore((s) => s.items) as WaterReading[];

  const points: WaterSamplingPoint[] = useMemo(
    () => (systemId ? allPoints.filter((p: WaterSamplingPoint) => p.systemId === systemId) : []),
    [allPoints, systemId]
  );
  const parameters: WaterTestParameterType[] = useMemo(
    () => {
      if (!systemId) return [];
      const params = new Set(
        readings
          .filter((r: WaterReading) => r.systemId === systemId)
          .map((r: WaterReading) => r.parameter)
      );
      return Array.from(params);
    },
    [readings, systemId]
  );

  const selectedSystem = useMemo(
    () => systems.find((s: WaterSystem) => s.id === systemId),
    [systems, systemId]
  );

  // Get limits for selected parameter
  const limits = useMemo(() => {
    if (!selectedSystem || !parameter) return null;
    const sampleReading = readings.find(
      (r: WaterReading) => r.systemId === selectedSystem.id && r.parameter === parameter
    );
    if (sampleReading) {
      return { alert: sampleReading.alertLimit, action: sampleReading.actionLimit, unit: sampleReading.unit };
    }
    return null;
  }, [readings, selectedSystem, parameter]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!systemId || !pointId || !parameter || !value || !operator || !limits) return;

      const numVal = parseFloat(value);
      let result: WaterReadingResult = "pass";
      if (parameter === "chlorine") {
        if (numVal < limits.action) result = "action";
        else if (numVal < limits.alert) result = "alert";
      } else if (parameter === "appearance") {
        result = numVal === 0 ? "pass" : "fail";
      } else {
        if (numVal >= limits.action) result = "action";
        else if (numVal >= limits.alert) result = "alert";
      }

      onSubmit({
        pointId,
        systemId,
        parameter,
        value: numVal,
        unit: limits.unit,
        alertLimit: limits.alert,
        actionLimit: limits.action,
        result,
        sampledBy: operator,
        sampledAt: new Date().toISOString(),
        notes: notes || undefined,
      });
    },
    [systemId, pointId, parameter, value, operator, notes, limits, onSubmit]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log New Water Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* System */}
            <div>
              <label className="block text-xs font-medium mb-1">Water System *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={systemId}
                onChange={(e) => {
                  setSystemId(e.target.value);
                  setPointId("");
                  setParameter("");
                }}
                required
              >
                <option value="">Select system...</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({WATER_TYPE_LABELS[s.type]})
                  </option>
                ))}
              </select>
            </div>

            {/* Point */}
            <div>
              <label className="block text-xs font-medium mb-1">Sampling Point *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                required
                disabled={!systemId}
              >
                <option value="">Select point...</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {SAMPLING_LOCATION_LABELS[p.location]}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameter */}
            <div>
              <label className="block text-xs font-medium mb-1">Parameter *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={parameter}
                onChange={(e) => setParameter(e.target.value as WaterTestParameterType)}
                required
                disabled={!systemId}
              >
                <option value="">Select parameter...</option>
                {parameters.map((p) => (
                  <option key={p} value={p}>
                    {WATER_PARAMETER_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Value * {limits ? `(${limits.unit})` : ""}
              </label>
              <input
                type="number"
                step="any"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  limits
                    ? `Alert: ${limits.alert} / Action: ${limits.action}`
                    : "Enter value"
                }
                required
              />
            </div>

            {/* Operator */}
            <div>
              <label className="block text-xs font-medium mb-1">Sampled By *</label>
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
            <div>
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
          {limits && parameter && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <span>
                <strong>Alert Limit:</strong> {limits.alert} {limits.unit}
              </span>
              <span>
                <strong>Action Limit:</strong> {limits.action} {limits.unit}
              </span>
              <span>
                <strong>Parameter:</strong> {WATER_PARAMETER_LABELS[parameter]}
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

// ─── Excursion Investigation Form ─────────────────────────────────────────

function ExcursionInvestigationForm({
  excursion,
  onResolve,
  onCancel,
}: {
  excursion: WaterExcursionRecord;
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

  const { systems, points } = useSystemsAndPoints();

  const system: WaterSystem | undefined = useMemo(
    () => systems.find((s: WaterSystem) => s.id === excursion.systemId),
    [systems, excursion.systemId]
  );

  const point: WaterSamplingPoint | undefined = useMemo(
    () => points.find((p: WaterSamplingPoint) => p.id === excursion.pointId),
    [points, excursion.pointId]
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
          <FileText className="w-4 h-4" /> Investigate Excursion: {excursion.id}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
          <div>
            <span className="text-muted-foreground">System:</span>
            <p className="font-medium">{system?.name ?? "Unknown"}</p>
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
              placeholder="Describe the investigation findings per SOP-WS-005..."
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
                placeholder="e.g. CAPA-2026-0001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Resolved By *</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Name or role"
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

// ─── Dashboard Tab ────────────────────────────────────────────────────────

function DashboardTab() {
  const { systems, points: allPoints } = useSystemsAndPoints();
  const readings = useWaterSystemStore((s) => s.items) as WaterReading[];

  // Fetch excursions from API
  const [allExcursions, setAllExcursions] = useState<WaterExcursionRecord[]>([]);
  useEffect(() => {
    apiFetch<WaterExcursionRecord[]>("/excursions").then(setAllExcursions).catch(() => {});
  }, []);

  // Get recent open excursions
  const recentExcursions: WaterExcursionRecord[] = useMemo(() => {
    return allExcursions
      .filter((e: WaterExcursionRecord) => e.status === "open" || e.status === "investigating")
      .sort((a: WaterExcursionRecord, b: WaterExcursionRecord) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 5);
  }, [allExcursions]);

  // Today's readings (filter from store items)
  const todayReadings: WaterReading[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return readings.filter((r: WaterReading) => r.sampledAt.slice(0, 10) === todayStr);
  }, [readings]);

  // Points that need sampling today
  const todaySchedule = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    return allPoints.filter((p: WaterSamplingPoint) => {
      if (p.samplingFrequency === "Daily") return true;
      if (p.samplingFrequency === "Weekly" && dayOfWeek === 1) return true; // Monday
      if (p.samplingFrequency === "Monthly" && today.getDate() === 1) return true;
      return false;
    });
  }, [allPoints]);

  // Points sampled today
  const sampledPointIds = useMemo(() => {
    return new Set(todayReadings.map((r) => r.pointId));
  }, [todayReadings]);

  return (
    <div className="space-y-6">
      {/* System Diagrams */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Droplet className="w-4 h-4 text-blue-500" />
          Water System Diagrams
        </h3>
        {systems.map((system: WaterSystem) => {
          const sysPoints = allPoints.filter((p: WaterSamplingPoint) => p.systemId === system.id);
          // Derive latest reading per point for this system
          const sysReadings = readings.filter((r: WaterReading) => r.systemId === system.id);
          const latestByPoint = new Map<string, WaterReading>();
          for (const r of sysReadings) {
            const prev = latestByPoint.get(r.pointId);
            if (!prev || r.sampledAt > prev.sampledAt) latestByPoint.set(r.pointId, r);
          }
          const latestReadings: WaterReading[] = Array.from(latestByPoint.values());
          // Derive system status from latest readings
          let status: WaterSystemStatus = "normal";
          for (const r of latestReadings) {
            if (r.result === "fail" || r.result === "action") { status = "action"; break; }
            if (r.result === "alert") status = "alert";
          }
          return (
            <WaterSystemDiagram
              key={system.id}
              system={system}
              points={sysPoints}
              latestReadings={latestReadings}
              systemStatus={status}
            />
          );
        })}
      </div>

      {/* Bottom row: Recent Excursions + Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Excursions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Recent Excursions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExcursions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No open excursions
              </p>
            ) : (
              <div className="space-y-2">
                {recentExcursions.map((exc: WaterExcursionRecord) => {
                  const system = systems.find((s: WaterSystem) => s.id === exc.systemId);
                  const point = allPoints.find((p: WaterSamplingPoint) => p.id === exc.pointId);
                  return (
                    <div
                      key={exc.id}
                      className="flex items-center justify-between p-2 rounded-md bg-red-50 border border-red-100"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {system?.name ?? "Unknown"} &mdash; {point?.name ?? "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {WATER_PARAMETER_LABELS[exc.parameter]}: {exc.value} (limit: {exc.limit}) &bull;{" "}
                          {formatDateTime(exc.detectedAt)}
                        </p>
                      </div>
                      <Badge
                        className={cn("text-[10px] shrink-0 ml-2", EXCURSION_STATUS_STYLES[exc.status])}
                        variant="outline"
                      >
                        {exc.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Sampling Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Today&apos;s Sampling Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No sampling scheduled for today
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {todaySchedule.map((point: WaterSamplingPoint) => {
                  const system = systems.find((s: WaterSystem) => s.id === point.systemId);
                  const isSampled = sampledPointIds.has(point.id);
                  return (
                    <div
                      key={point.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border text-xs",
                        isSampled
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {point.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {system?.name ?? ""} &bull; {SAMPLING_LOCATION_LABELS[point.location]}
                        </p>
                      </div>
                      {isSampled ? (
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 ml-2" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Sampled: {todaySchedule.filter((p: WaterSamplingPoint) => sampledPointIds.has(p.id)).length}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Pending: {todaySchedule.filter((p: WaterSamplingPoint) => !sampledPointIds.has(p.id)).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Readings Tab ──────────────────────────────────────────────────────────

function ReadingsTab() {
  const [showForm, setShowForm] = useState(false);
  const [filterSystem, setFilterSystem] = useState("");
  const [filterParameter, setFilterParameter] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "value" | "parameter">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const { systems, points: allPoints } = useSystemsAndPoints();
  const storeItems = useWaterSystemStore((s) => s.items) as WaterReading[];
  const storeCreate = useWaterSystemStore((s) => s.create);

  const uniqueParams: WaterTestParameterType[] = useMemo(() => {
    const params = new Set(storeItems.map((r: WaterReading) => r.parameter));
    return Array.from(params);
  }, [storeItems]);

  const readings: WaterReading[] = useMemo(() => {
    let result: WaterReading[] = [...storeItems];

    if (filterSystem) {
      result = result.filter((r: WaterReading) => r.systemId === filterSystem);
    }
    if (filterParameter) {
      result = result.filter((r: WaterReading) => r.parameter === filterParameter);
    }
    if (filterResult) {
      result = result.filter((r: WaterReading) => r.result === filterResult);
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter((r: WaterReading) => {
        const point = allPoints.find((p: WaterSamplingPoint) => p.id === r.pointId);
        return (
          point?.name.toLowerCase().includes(q) ||
          r.sampledBy.toLowerCase().includes(q) ||
          r.parameter.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result.sort((a: WaterReading, b: WaterReading) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.sampledAt.localeCompare(b.sampledAt);
          break;
        case "value":
          cmp = a.value - b.value;
          break;
        case "parameter":
          cmp = a.parameter.localeCompare(b.parameter);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeItems, allPoints, filterSystem, filterParameter, filterResult, filterSearch, sortField, sortDir, refreshKey]);

  const totalPages = Math.ceil(readings.length / PAGE_SIZE);
  const pageReadings = readings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleAddReading = useCallback(
    async (data: Omit<WaterReading, "id">) => {
      await storeCreate(data as any);
      // Auto-create excursion for action-level
      if (data.result === "action" || data.result === "fail") {
        await apiPost<WaterExcursionRecord>("/excursions", {
          readingId: "pending",
          pointId: data.pointId,
          systemId: data.systemId,
          status: "open",
          detectedAt: data.sampledAt,
          value: data.value,
          limit: data.actionLimit,
          limitType: "action",
          parameter: data.parameter,
          investigationNotes: "",
          assignedTo: data.sampledBy,
        });
      }
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    },
    [storeCreate]
  );

  const handleExport = useCallback(() => {
    const headers = [
      "ID",
      "System",
      "Point",
      "Parameter",
      "Value",
      "Unit",
      "Alert Limit",
      "Action Limit",
      "Result",
      "Sampled By",
      "Date",
      "Notes",
    ];
    const rows = readings.map((r: WaterReading) => {
      const system = systems.find((s: WaterSystem) => s.id === r.systemId);
      const point = allPoints.find((p: WaterSamplingPoint) => p.id === r.pointId);
      return [
        r.id,
        system?.name ?? "",
        point?.name ?? "",
        r.parameter,
        r.value.toString(),
        r.unit,
        r.alertLimit.toString(),
        r.actionLimit.toString(),
        r.result,
        r.sampledBy,
        r.sampledAt,
        r.notes ?? "",
      ];
    });
    const csv = [headers, ...rows].map((r: string[]) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `water-readings-${isoDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [readings, systems, allPoints]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Hide Form" : "Log Reading"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Reading Form */}
      {showForm && (
        <ReadingForm
          onSubmit={handleAddReading}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="pl-8 pr-3 py-1.5 text-sm border rounded-md w-48 bg-background"
                placeholder="Search points..."
                value={filterSearch}
                onChange={(e) => {
                  setFilterSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={filterSystem}
              onChange={(e) => {
                setFilterSystem(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Systems</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={filterParameter}
              onChange={(e) => {
                setFilterParameter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Parameters</option>
              {uniqueParams.map((p) => (
                <option key={p} value={p}>
                  {WATER_PARAMETER_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
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
              <option value="fail">Fail</option>
            </select>
            {(filterSystem || filterParameter || filterResult || filterSearch) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setFilterSystem("");
                  setFilterParameter("");
                  setFilterResult("");
                  setFilterSearch("");
                  setPage(0);
                }}
              >
                <XCircle className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readings table */}
      <Card>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Point</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("parameter")}
                  >
                    <span className="flex items-center gap-1">
                      Parameter
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => handleSort("value")}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Value
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Limits (Alert/Action)</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Sampled By</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("date")}
                  >
                    <span className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No readings found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageReadings.map((r) => {
                    const system = systems.find((s) => s.id === r.systemId);
                    const point = allPoints.find((p) => p.id === r.pointId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.id.slice(-8)}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">
                          {system?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{point?.name ?? "Unknown"}</TableCell>
                        <TableCell className="text-xs">{WATER_PARAMETER_LABELS[r.parameter]}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatValue(r.value, r.unit)}{" "}
                          <span className="text-muted-foreground">{r.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {r.alertLimit} / {r.actionLimit}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn("text-[10px]", RESULT_STYLES[r.result])}
                            variant="outline"
                          >
                            {r.result.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.sampledBy}</TableCell>
                        <TableCell className="text-xs">{formatDateTime(r.sampledAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, readings.length)} of{" "}
                {readings.length} readings
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const idx = start + i;
                  if (idx >= totalPages) return null;
                  return (
                    <Button
                      key={idx}
                      size="sm"
                      variant={idx === page ? "default" : "outline"}
                      onClick={() => setPage(idx)}
                      className="w-8"
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
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
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSystem, setFilterSystem] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { systems, points: allPoints } = useSystemsAndPoints();

  // Fetch all excursions from API
  const [allExcursions, setAllExcursions] = useState<WaterExcursionRecord[]>([]);
  useEffect(() => {
    apiFetch<WaterExcursionRecord[]>("/excursions").then(setAllExcursions).catch(() => {});
  }, [refreshKey]);

  const excursions: WaterExcursionRecord[] = useMemo(() => {
    let result: WaterExcursionRecord[] = [...allExcursions];
    if (filterStatus) {
      result = result.filter((e: WaterExcursionRecord) => e.status === filterStatus);
    }
    if (filterSystem) {
      result = result.filter((e: WaterExcursionRecord) => e.systemId === filterSystem);
    }
    return result.sort((a: WaterExcursionRecord, b: WaterExcursionRecord) => b.detectedAt.localeCompare(a.detectedAt));
  }, [allExcursions, filterStatus, filterSystem]);

  const openCount = useMemo(
    () => excursions.filter((e: WaterExcursionRecord) => e.status === "open" || e.status === "investigating").length,
    [excursions]
  );

  const resolvingExcursion = useMemo(
    () => (resolvingId ? excursions.find((e: WaterExcursionRecord) => e.id === resolvingId) : null),
    [resolvingId, excursions]
  );

  const handleResolve = useCallback(
    async (data: {
      investigationNotes: string;
      rootCause: string;
      capaRef?: string;
      resolvedBy: string;
    }) => {
      if (resolvingId) {
        await apiPatch<WaterExcursionRecord>(`/excursions/${resolvingId}`, {
          ...data,
          status: "resolved",
          resolvedAt: new Date().toISOString(),
        });
        setResolvingId(null);
        setRefreshKey((k) => k + 1);
      }
    },
    [resolvingId]
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Open</div>
          <div className="text-xl font-bold text-red-600">
            {excursions.filter((e: WaterExcursionRecord) => e.status === "open").length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Investigating</div>
          <div className="text-xl font-bold text-orange-600">
            {excursions.filter((e: WaterExcursionRecord) => e.status === "investigating").length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Resolved</div>
          <div className="text-xl font-bold text-blue-600">
            {excursions.filter((e: WaterExcursionRecord) => e.status === "resolved").length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Closed</div>
          <div className="text-xl font-bold text-green-600">
            {excursions.filter((e: WaterExcursionRecord) => e.status === "closed").length}
          </div>
        </Card>
      </div>

      {/* Investigation Form */}
      {resolvingExcursion && (
        <ExcursionInvestigationForm
          excursion={resolvingExcursion}
          onResolve={handleResolve}
          onCancel={() => setResolvingId(null)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
        >
          <option value="">All Systems</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {openCount} active excursion{openCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Excursions list */}
      <Card>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Point</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead className="text-right">Value / Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excursions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No excursions found
                    </TableCell>
                  </TableRow>
                ) : (
                  excursions.slice(0, 50).map((exc) => {
                    const system = systems.find((s) => s.id === exc.systemId);
                    const point = allPoints.find((p) => p.id === exc.pointId);
                    const isExpanded = expandedId === exc.id;
                    return (
                      <TableRow key={exc.id} className="group">
                        <TableCell className="font-mono text-xs">{exc.id.slice(-7)}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">
                          {system?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{point?.name ?? "Unknown"}</TableCell>
                        <TableCell className="text-xs">{WATER_PARAMETER_LABELS[exc.parameter]}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          <span className="text-red-600">{exc.value}</span>
                          <span className="text-muted-foreground"> / {exc.limit}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn("text-[10px]", EXCURSION_STATUS_STYLES[exc.status])}
                            variant="outline"
                          >
                            {exc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDateTime(exc.detectedAt)}</TableCell>
                        <TableCell className="text-xs">{exc.assignedTo}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(exc.status === "open" || exc.status === "investigating") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-6 px-2"
                                onClick={() => setResolvingId(exc.id)}
                              >
                                Investigate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setExpandedId(isExpanded ? null : exc.id)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expanded excursion details */}
      {expandedId && (() => {
        const exc = excursions.find((e) => e.id === expandedId);
        if (!exc) return null;
        const system = systems.find((s) => s.id === exc.systemId);
        const point = allPoints.find((p) => p.id === exc.pointId);
        return (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Excursion Details: {exc.id}</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">System:</span>
                  <p className="font-medium">{system?.name ?? "Unknown"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Point:</span>
                  <p className="font-medium">{point?.name ?? "Unknown"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Parameter:</span>
                  <p className="font-medium">{WATER_PARAMETER_LABELS[exc.parameter]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Limit Type:</span>
                  <p className="font-medium">{exc.limitType.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Detected At:</span>
                  <p className="font-medium">{formatDateTime(exc.detectedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned To:</span>
                  <p className="font-medium">{exc.assignedTo}</p>
                </div>
                {exc.rootCause && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Root Cause:</span>
                    <p className="font-medium">{exc.rootCause}</p>
                  </div>
                )}
                {exc.investigationNotes && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-muted-foreground">Investigation Notes:</span>
                    <p className="font-medium">{exc.investigationNotes}</p>
                  </div>
                )}
                {exc.capaRef && (
                  <div>
                    <span className="text-muted-foreground">CAPA Reference:</span>
                    <p className="font-medium text-blue-600">{exc.capaRef}</p>
                  </div>
                )}
                {exc.resolvedAt && (
                  <div>
                    <span className="text-muted-foreground">Resolved:</span>
                    <p className="font-medium">
                      {formatDate(exc.resolvedAt)} by {exc.resolvedBy}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

// ─── Trends Tab ────────────────────────────────────────────────────────────

function TrendsTab() {
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedPoint, setSelectedPoint] = useState("");
  const [selectedParameter, setSelectedParameter] = useState<WaterTestParameterType | "">("");
  const [trendDays, setTrendDays] = useState(30);

  const systems: WaterSystem[] = useMemo(() => waterSystemStore.getAllSystems(), []);
  const points: WaterSamplingPoint[] = useMemo(
    () => (selectedSystem ? waterSystemStore.getPointsBySystem(selectedSystem) : []),
    [selectedSystem]
  );
  const parameters: WaterTestParameterType[] = useMemo(
    () => (selectedSystem ? waterSystemStore.getParametersForSystem(selectedSystem) : []),
    [selectedSystem]
  );

  // Auto-select first system
  useEffect(() => {
    if (!selectedSystem && systems.length > 0) {
      setSelectedSystem(systems[0].id);
    }
  }, [systems, selectedSystem]);

  // Auto-select first point when system changes
  useEffect(() => {
    if (points.length > 0 && !points.find((p: WaterSamplingPoint) => p.id === selectedPoint)) {
      setSelectedPoint(points[0].id);
    }
  }, [points, selectedPoint]);

  // Auto-select first parameter
  useEffect(() => {
    if (parameters.length > 0 && !parameters.includes(selectedParameter as WaterTestParameterType)) {
      setSelectedParameter(parameters[0]);
    }
  }, [parameters, selectedParameter]);

  // Get trend data
  const trend: WaterTrend | null = useMemo(() => {
    if (!selectedPoint || !selectedParameter) return null;
    return waterSystemStore.getTrend(selectedPoint, selectedParameter as WaterTestParameterType, trendDays);
  }, [selectedPoint, selectedParameter, trendDays]);

  // Get all trends for multi-chart view
  const allPointTrends: WaterTrend[] = useMemo(() => {
    if (!selectedSystem || !selectedParameter) return [];
    const sysPoints: WaterSamplingPoint[] = waterSystemStore.getPointsBySystem(selectedSystem);
    return sysPoints
      .map((p: WaterSamplingPoint) =>
        waterSystemStore.getTrend(p.id, selectedParameter as WaterTestParameterType, trendDays)
      )
      .filter((t: any): t is WaterTrend => t != null && t.data.length >= 2);
  }, [selectedSystem, selectedParameter, trendDays]);

  // Statistics
  const stats = useMemo(() => {
    if (!trend || trend.data.length === 0) return null;
    const values = trend.data.map((d: { value: number }) => d.value);
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: mean,
      stdDev: stdDev,
      passRate: (trend.data.filter((d: { result: string }) => d.result === "pass").length / trend.data.length * 100),
    };
  }, [trend]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={selectedSystem}
              onChange={(e) => {
                setSelectedSystem(e.target.value);
                setSelectedPoint("");
                setSelectedParameter("");
              }}
            >
              <option value="">Select System...</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={selectedPoint}
              onChange={(e) => setSelectedPoint(e.target.value)}
              disabled={points.length === 0}
            >
              <option value="">Select Point...</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({SAMPLING_LOCATION_LABELS[p.location]})
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value as WaterTestParameterType)}
              disabled={parameters.length === 0}
            >
              <option value="">Select Parameter...</option>
              {parameters.map((p) => (
                <option key={p} value={p}>
                  {WATER_PARAMETER_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value))}
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Single Point Trend */}
      {trend && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              {trend.pointName} &mdash; {WATER_PARAMETER_LABELS[trend.parameter]}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {trend.systemName} &bull; {trend.data.length} readings over {trendDays} days &bull;
              Limits: Alert {trend.alertLimit} / Action {trend.actionLimit} {trend.unit}
            </p>
          </CardHeader>
          <CardContent>
            <WaterTrendChart trend={trend} height={240} />
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && trend && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Readings</div>
            <div className="text-lg font-bold">{stats.count}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mean</div>
            <div className="text-lg font-bold">{stats.mean.toFixed(stats.mean < 1 ? 3 : 1)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Std Dev</div>
            <div className="text-lg font-bold">{stats.stdDev.toFixed(stats.stdDev < 1 ? 3 : 2)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min</div>
            <div className="text-lg font-bold">{stats.min.toFixed(stats.min < 1 ? 3 : 1)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Max</div>
            <div className="text-lg font-bold">{stats.max.toFixed(stats.max < 1 ? 3 : 1)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pass Rate</div>
            <div className={cn(
              "text-lg font-bold",
              stats.passRate >= 95 ? "text-green-600" : stats.passRate >= 90 ? "text-yellow-600" : "text-red-600"
            )}>
              {stats.passRate.toFixed(1)}%
            </div>
          </Card>
        </div>
      )}

      {/* Multi-point comparison */}
      {allPointTrends.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-500" />
              All Points &mdash; {selectedParameter ? WATER_PARAMETER_LABELS[selectedParameter as WaterTestParameterType] : ""}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Comparing {allPointTrends.length} sampling points over {trendDays} days
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {allPointTrends.map((t) => (
                <div key={t.pointId}>
                  <p className="text-xs font-medium mb-1">
                    {t.pointName}{" "}
                    <span className="text-muted-foreground">({t.data.length} readings)</span>
                  </p>
                  <WaterTrendChart trend={t} height={160} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data message */}
      {!trend && selectedSystem && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a sampling point and parameter to view trend data
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function WaterSystemPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [metrics, setMetrics] = useState<WaterMetrics | null>(null);

  useEffect(() => {
    setMetrics(waterSystemStore.getMetrics());
  }, [activeTab]);

  const openExcursions = useMemo(
    () => (metrics?.excursionsOpen ?? 0),
    [metrics]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Water System Monitoring"
        description="USP/EP compliant pharmaceutical water quality monitoring -- Purified Water, WFI, Potable & Process Water systems"
        icon={<Droplet className="w-6 h-6 text-blue-500" />}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMetrics(waterSystemStore.getMetrics());
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        }
      />

      {/* Stats Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            icon={Droplet}
            title="Systems Monitored"
            value={metrics.systemsMonitored}
            subtitle="Active water systems"
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard
            icon={MapPin}
            title="Sampling Points"
            value={metrics.activeSamplingPoints}
            subtitle="Active monitoring points"
            iconColor="bg-cyan-100 text-cyan-600"
          />
          <StatsCard
            icon={Activity}
            title="Readings Today"
            value={metrics.readingsToday}
            subtitle={`${metrics.readingsThisWeek} this week`}
            iconColor="bg-emerald-100 text-emerald-600"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Excursions"
            value={metrics.excursionsOpen}
            subtitle={`${metrics.excursionsThisMonth} this month`}
            iconColor={
              metrics.excursionsOpen > 0
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-600"
            }
          />
          <StatsCard
            icon={CheckCircle}
            title="Compliance Rate"
            value={`${metrics.complianceRate}%`}
            subtitle="All readings"
            iconColor={
              metrics.complianceRate >= 95
                ? "bg-green-100 text-green-600"
                : metrics.complianceRate >= 90
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-red-100 text-red-600"
            }
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            count={tab.id === "excursions" ? openExcursions : undefined}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "readings" && <ReadingsTab />}
      {activeTab === "excursions" && <ExcursionsTab />}
      {activeTab === "trends" && <TrendsTab />}
    </div>
  );
}
