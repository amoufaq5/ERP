"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wind,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Filter,
  Plus,
  Search,
  Settings,
  TrendingUp,
  BarChart3,
  Gauge,
  Thermometer,
  Droplets,
  Fan,
  ArrowUpDown,
  X,
  ChevronRight,
  FileText,
  Timer,
  CircleDot,
  PackageCheck,
  Shield,
  Bell,
  BellOff,
  Eye,
  RefreshCw,
  Layers,
  ArrowDown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import HVACFloorPlan from "@/components/shared/hvac-floor-plan";
import { cn } from "@/lib/utils";

import { hvacStore } from "@/lib/operations/hvac-store";
import type {
  HVACUnit,
  HVACUnitType,
  HVACParameterType,
  HVACReading,
  HVACQualification,
  QualificationType,
  QualificationStatus,
  FilterRecord,
  FilterType,
  FilterStatus,
  HVACAlarm,
  HVACMetrics,
  GradeClassification,
  ReadingResult,
} from "@/lib/operations/hvac-types";
import {
  HVAC_PARAMETER_LABELS,
  HVAC_PARAMETER_UNITS,
  GRADE_LABELS,
  UNIT_TYPE_LABELS,
} from "@/lib/operations/hvac-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resultBadge(result: ReadingResult) {
  switch (result) {
    case "pass":
      return <Badge variant="outline" className="border-green-400 text-green-700 dark:text-green-400 text-[10px]">Pass</Badge>;
    case "alert":
      return <Badge variant="outline" className="border-yellow-400 text-yellow-700 dark:text-yellow-400 text-[10px]">Alert</Badge>;
    case "action":
      return <Badge variant="outline" className="border-red-400 text-red-700 dark:text-red-400 text-[10px]">Action</Badge>;
    case "fail":
      return <Badge variant="outline" className="border-red-500 text-red-800 dark:text-red-300 text-[10px]">Fail</Badge>;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    operational: { cls: "border-green-400 text-green-700 dark:text-green-400", label: "Operational" },
    maintenance: { cls: "border-yellow-400 text-yellow-700 dark:text-yellow-400", label: "Maintenance" },
    alarm: { cls: "border-red-400 text-red-700 dark:text-red-400", label: "Alarm" },
    offline: { cls: "border-slate-400 text-slate-600 dark:text-slate-400", label: "Offline" },
    active: { cls: "border-green-400 text-green-700 dark:text-green-400", label: "Active" },
    "due-for-test": { cls: "border-yellow-400 text-yellow-700 dark:text-yellow-400", label: "Due for Test" },
    failed: { cls: "border-red-400 text-red-700 dark:text-red-400", label: "Failed" },
    replaced: { cls: "border-slate-400 text-slate-600 dark:text-slate-400", label: "Replaced" },
    scheduled: { cls: "border-blue-400 text-blue-700 dark:text-blue-400", label: "Scheduled" },
    planned: { cls: "border-blue-400 text-blue-700 dark:text-blue-400", label: "Planned" },
    "in-progress": { cls: "border-yellow-400 text-yellow-700 dark:text-yellow-400", label: "In Progress" },
    passed: { cls: "border-green-400 text-green-700 dark:text-green-400", label: "Passed" },
    "requalification-due": { cls: "border-orange-400 text-orange-700 dark:text-orange-400", label: "Requalification Due" },
  };
  const entry = map[status] ?? { cls: "border-slate-400 text-slate-600", label: status };
  return <Badge variant="outline" className={cn(entry.cls, "text-[10px]")}>{entry.label}</Badge>;
}

function gradeBadge(grade: GradeClassification) {
  const cls: Record<GradeClassification, string> = {
    A: "border-blue-400 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
    B: "border-indigo-400 text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30",
    C: "border-violet-400 text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30",
    D: "border-slate-400 text-slate-700 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/30",
  };
  return <Badge variant="outline" className={cn(cls[grade], "text-[10px] font-semibold")}>Grade {grade}</Badge>;
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function HVACPage() {
  // ── State ──
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [metrics, setMetrics] = useState<HVACMetrics | null>(null);
  const [units, setUnits] = useState<HVACUnit[]>([]);
  const [readings, setReadings] = useState<HVACReading[]>([]);
  const [alarms, setAlarms] = useState<HVACAlarm[]>([]);
  const [filters, setFilters] = useState<FilterRecord[]>([]);
  const [qualifications, setQualifications] = useState<HVACQualification[]>([]);

  // Filters & search state
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paramFilter, setParamFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [filterTypeFilter, setFilterTypeFilter] = useState<string>("all");
  const [filterStatusFilter, setFilterStatusFilter] = useState<string>("all");
  const [qualStatusFilter, setQualStatusFilter] = useState<string>("all");

  // Dialogs
  const [selectedUnit, setSelectedUnit] = useState<HVACUnit | null>(null);
  const [showUnitDetail, setShowUnitDetail] = useState(false);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [showFilterDetail, setShowFilterDetail] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterRecord | null>(null);
  const [showQualDetail, setShowQualDetail] = useState(false);
  const [selectedQual, setSelectedQual] = useState<HVACQualification | null>(null);

  // Reading form state
  const [readingUnitId, setReadingUnitId] = useState("");
  const [readingParameter, setReadingParameter] = useState<string>("");
  const [readingValue, setReadingValue] = useState("");
  const [readingOperator, setReadingOperator] = useState("");
  const [readingNotes, setReadingNotes] = useState("");

  // ── Load data ──
  const refreshData = useCallback(() => {
    setUnits(hvacStore.getAllUnits());
    setReadings(hvacStore.getAllReadings());
    setAlarms(hvacStore.getAllAlarms());
    setFilters(hvacStore.getAllFilters());
    setQualifications(hvacStore.getAllQualifications());
    setMetrics(hvacStore.getMetrics());
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, [refreshData]);

  // ── Derived data ──
  const latestReadingsByUnit = useMemo(() => {
    const map: Record<string, HVACReading[]> = {};
    for (const u of units) {
      map[u.id] = hvacStore.getLatestReadings(u.id);
    }
    return map;
  }, [units, readings]);

  const unitStatuses = useMemo(() => {
    const map: Record<string, "normal" | "alert" | "action"> = {};
    for (const u of units) {
      map[u.id] = hvacStore.getUnitStatus(u.id);
    }
    return map;
  }, [units, readings]);

  const activeAlarms = useMemo(() => alarms.filter((a) => !a.acknowledged), [alarms]);

  // ── Filtered readings for monitoring tab ──
  const filteredReadings = useMemo(() => {
    let result = [...readings];
    if (unitFilter !== "all") result = result.filter((r) => r.unitId === unitFilter);
    if (paramFilter !== "all") result = result.filter((r) => r.parameter === paramFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const unit = units.find((u) => u.id === r.unitId);
        return (
          unit?.name.toLowerCase().includes(term) ||
          r.operator.toLowerCase().includes(term) ||
          r.parameter.toLowerCase().includes(term)
        );
      });
    }
    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 200);
  }, [readings, unitFilter, paramFilter, searchTerm, units]);

  // ── Filtered filters ──
  const filteredFilters = useMemo(() => {
    let result = [...filters];
    if (filterTypeFilter !== "all") result = result.filter((f) => f.filterType === filterTypeFilter);
    if (filterStatusFilter !== "all") result = result.filter((f) => f.status === filterStatusFilter);
    if (unitFilter !== "all") result = result.filter((f) => f.unitId === unitFilter);
    return result;
  }, [filters, filterTypeFilter, filterStatusFilter, unitFilter]);

  // ── Filtered qualifications ──
  const filteredQualifications = useMemo(() => {
    let result = [...qualifications];
    if (qualStatusFilter !== "all") result = result.filter((q) => q.status === qualStatusFilter);
    if (unitFilter !== "all") result = result.filter((q) => q.unitId === unitFilter);
    return result;
  }, [qualifications, qualStatusFilter, unitFilter]);

  // ── Handlers ──
  const handleAcknowledgeAlarm = useCallback((alarmId: string) => {
    hvacStore.acknowledgeAlarm(alarmId, "Current User");
    refreshData();
  }, [refreshData]);

  const handleAddReading = useCallback(() => {
    if (!readingUnitId || !readingParameter || !readingValue) return;
    const unit = units.find((u) => u.id === readingUnitId);
    if (!unit) return;

    const value = parseFloat(readingValue);
    if (isNaN(value)) return;

    // Determine limits based on unit grade and parameter
    const param = readingParameter as HVACParameterType;
    const paramUnit = HVAC_PARAMETER_UNITS[param] ?? "";

    // Simple limit lookup - in production, use the full getHVACLimits function
    const existingReadings = readings.filter((r) => r.unitId === readingUnitId && r.parameter === param);
    const latestExisting = existingReadings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const alertLimit = latestExisting?.alertLimit ?? 0;
    const actionLimit = latestExisting?.actionLimit ?? 0;

    // Classify
    const lowerIsBad = ["differential-pressure", "air-changes-per-hour", "air-velocity", "filter-integrity"].includes(param);
    let result: ReadingResult = "pass";
    if (lowerIsBad) {
      if (value < actionLimit) result = "action";
      else if (value < alertLimit) result = "alert";
    } else {
      if (value >= actionLimit) result = "action";
      else if (value >= alertLimit) result = "alert";
    }

    hvacStore.addReading({
      unitId: readingUnitId,
      parameter: param,
      value,
      unit: paramUnit,
      alertLimit,
      actionLimit,
      result,
      timestamp: new Date().toISOString(),
      operator: readingOperator || "Current User",
      notes: readingNotes || undefined,
    });

    setShowReadingForm(false);
    setReadingUnitId("");
    setReadingParameter("");
    setReadingValue("");
    setReadingOperator("");
    setReadingNotes("");
    refreshData();
  }, [readingUnitId, readingParameter, readingValue, readingOperator, readingNotes, units, readings, refreshData]);

  const handleSelectFloorPlanUnit = useCallback((unit: HVACUnit) => {
    setSelectedUnit(unit);
    setShowUnitDetail(true);
  }, []);

  if (!mounted || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="HVAC Qualification & Monitoring"
        description="EU GMP Annex 1 compliant HVAC system monitoring, filter management, and qualification tracking"
        icon={<Wind className="h-6 w-6 text-sky-600" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowReadingForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Reading
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Fan}
          title="HVAC Units"
          value={metrics.totalUnits}
          subtitle={`${metrics.operationalUnits} operational`}
          iconColor="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Active Alarms"
          value={metrics.activeAlarms}
          subtitle={`${metrics.acknowledgedAlarms} acknowledged`}
          iconColor={metrics.activeAlarms > 0
            ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            : "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"}
        />
        <StatsCard
          icon={Filter}
          title="Filters Due"
          value={metrics.filtersDueCount}
          subtitle={`${metrics.filtersFailedCount} failed`}
          iconColor={metrics.filtersDueCount > 0
            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
            : "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"}
        />
        <StatsCard
          icon={ClipboardList}
          title="Qualification Due"
          value={metrics.qualificationsDue}
          subtitle="IQ/OQ/PQ protocols"
          iconColor={metrics.qualificationsDue > 0
            ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            : "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"}
        />
        <StatsCard
          icon={Shield}
          title="Compliance %"
          value={`${metrics.complianceRate}%`}
          subtitle="Pass rate (all readings)"
          iconColor={metrics.complianceRate >= 95
            ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
            : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="filters" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="qualification" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Qualification
          </TabsTrigger>
        </TabsList>

        {/* ━━━━━ DASHBOARD TAB ━━━━━ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Floor Plan */}
          <HVACFloorPlan
            units={units}
            latestReadings={latestReadingsByUnit}
            unitStatuses={unitStatuses}
            onSelectUnit={handleSelectFloorPlanUnit}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Alarms */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-red-500" />
                  Active Alarms
                  {activeAlarms.length > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{activeAlarms.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeAlarms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                    <p className="text-sm">No active alarms</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {activeAlarms.slice(0, 10).map((alarm) => {
                      const unit = units.find((u) => u.id === alarm.unitId);
                      return (
                        <div
                          key={alarm.id}
                          className={cn(
                            "flex items-start justify-between rounded-lg border p-3",
                            alarm.severity === "action" ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800" :
                            "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={cn("h-3.5 w-3.5",
                                alarm.severity === "action" ? "text-red-600" : "text-yellow-600"
                              )} />
                              <span className="text-xs font-semibold">{unit?.name ?? alarm.unitId}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {HVAC_PARAMETER_LABELS[alarm.parameter]}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Value: {alarm.value} (Limit: {alarm.limit}) &mdash; {formatDateTime(alarm.timestamp)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-7"
                            onClick={() => handleAcknowledgeAlarm(alarm.id)}
                          >
                            <BellOff className="h-3 w-3 mr-1" />
                            Ack
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unit Summary by Grade */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4" />
                  Units by Grade & Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Grade</TableHead>
                      <TableHead className="text-xs text-center">Units</TableHead>
                      <TableHead className="text-xs text-center">Normal</TableHead>
                      <TableHead className="text-xs text-center">Alert</TableHead>
                      <TableHead className="text-xs text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(["A", "B", "C", "D"] as GradeClassification[]).map((grade) => {
                      const gradeUnits = units.filter((u) => u.grade === grade);
                      const normal = gradeUnits.filter((u) => unitStatuses[u.id] === "normal").length;
                      const alert = gradeUnits.filter((u) => unitStatuses[u.id] === "alert").length;
                      const action = gradeUnits.filter((u) => unitStatuses[u.id] === "action").length;
                      return (
                        <TableRow key={grade}>
                          <TableCell>{gradeBadge(grade)}</TableCell>
                          <TableCell className="text-center text-xs font-medium">{gradeUnits.length}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("text-xs font-medium", normal > 0 ? "text-green-600" : "text-muted-foreground")}>{normal}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn("text-xs font-medium", alert > 0 ? "text-yellow-600" : "text-muted-foreground")}>{alert}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn("text-xs font-medium", action > 0 ? "text-red-600" : "text-muted-foreground")}>{action}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Unit Cards Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Fan className="h-4 w-4" />
                All HVAC Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {units.map((unit) => {
                  const status = unitStatuses[unit.id] ?? "normal";
                  const latest = latestReadingsByUnit[unit.id] ?? [];
                  const temp = latest.find((r) => r.parameter === "temperature");
                  const rh = latest.find((r) => r.parameter === "humidity");
                  const dp = latest.find((r) => r.parameter === "differential-pressure");

                  return (
                    <button
                      key={unit.id}
                      type="button"
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all hover:shadow-md cursor-pointer",
                        status === "action" && "border-red-300 dark:border-red-700",
                        status === "alert" && "border-yellow-300 dark:border-yellow-700",
                        status === "normal" && "border-border"
                      )}
                      onClick={() => { setSelectedUnit(unit); setShowUnitDetail(true); }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold">{unit.name}</span>
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          status === "normal" && "bg-green-500",
                          status === "alert" && "bg-yellow-500",
                          status === "action" && "bg-red-500"
                        )} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {gradeBadge(unit.grade)}
                        <Badge variant="outline" className="text-[10px]">
                          {UNIT_TYPE_LABELS[unit.type]}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{unit.areaServed}</p>
                      <div className="flex gap-3 text-[10px]">
                        {temp && (
                          <span className="flex items-center gap-0.5">
                            <Thermometer className="h-3 w-3 text-orange-500" />
                            {temp.value}°C
                          </span>
                        )}
                        {rh && (
                          <span className="flex items-center gap-0.5">
                            <Droplets className="h-3 w-3 text-blue-500" />
                            {rh.value}%
                          </span>
                        )}
                        {dp && (
                          <span className="flex items-center gap-0.5">
                            <Gauge className="h-3 w-3 text-purple-500" />
                            {dp.value}Pa
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━ MONITORING TAB ━━━━━ */}
        <TabsContent value="monitoring" className="space-y-4 mt-4">
          {/* Real-time display per unit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-green-500" />
                Real-Time Parameter Display
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.areaServed}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {unitFilter !== "all" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(latestReadingsByUnit[unitFilter] ?? []).map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-lg border p-3",
                        r.result === "action" && "border-red-300 bg-red-50 dark:bg-red-950/20",
                        r.result === "alert" && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20",
                        r.result === "pass" && "border-border"
                      )}
                    >
                      <div className="text-[10px] text-muted-foreground font-medium mb-1">
                        {HVAC_PARAMETER_LABELS[r.parameter]}
                      </div>
                      <div className="text-xl font-bold">
                        {r.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{r.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {resultBadge(r.result)}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(r.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Select a unit above to see real-time parameters.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reading history with filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Reading History
                </CardTitle>
                <Button size="sm" onClick={() => setShowReadingForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Reading
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search readings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="w-[200px] h-9 text-xs">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paramFilter} onValueChange={setParamFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Parameter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parameters</SelectItem>
                    {Object.entries(HVAC_PARAMETER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm || unitFilter !== "all" || paramFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setSearchTerm(""); setUnitFilter("all"); setParamFilter("all"); }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Table */}
              <div className="rounded-md border max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Timestamp</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Parameter</TableHead>
                      <TableHead className="text-xs text-right">Value</TableHead>
                      <TableHead className="text-xs text-center">Alert</TableHead>
                      <TableHead className="text-xs text-center">Action</TableHead>
                      <TableHead className="text-xs text-center">Result</TableHead>
                      <TableHead className="text-xs">Operator</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReadings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                          No readings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReadings.map((r) => {
                        const unit = units.find((u) => u.id === r.unitId);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-[11px]">{formatDateTime(r.timestamp)}</TableCell>
                            <TableCell className="text-[11px] font-medium">{unit?.name ?? r.unitId}</TableCell>
                            <TableCell className="text-[11px]">{HVAC_PARAMETER_LABELS[r.parameter]}</TableCell>
                            <TableCell className="text-[11px] text-right font-mono">
                              {r.value} <span className="text-muted-foreground">{r.unit}</span>
                            </TableCell>
                            <TableCell className="text-[11px] text-center text-muted-foreground">{r.alertLimit}</TableCell>
                            <TableCell className="text-[11px] text-center text-muted-foreground">{r.actionLimit}</TableCell>
                            <TableCell className="text-center">{resultBadge(r.result)}</TableCell>
                            <TableCell className="text-[11px]">{r.operator}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Showing {filteredReadings.length} of {readings.length} readings
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━ FILTERS TAB ━━━━━ */}
        <TabsContent value="filters" className="space-y-4 mt-4">
          {/* Filter summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Filters</p>
                  <p className="text-xl font-bold">{filters.filter((f) => f.status === "active").length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due for Test</p>
                  <p className="text-xl font-bold">{filters.filter((f) => f.status === "due-for-test").length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold">{filters.filter((f) => f.status === "failed").length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* HEPA Filter Registry */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  HEPA Filter Registry
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={filterTypeFilter} onValueChange={setFilterTypeFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Filter Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="HEPA">HEPA</SelectItem>
                    <SelectItem value="pre-filter">Pre-filter</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatusFilter} onValueChange={setFilterStatusFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="due-for-test">Due for Test</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="replaced">Replaced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Model</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Installed</TableHead>
                      <TableHead className="text-xs">Last Test</TableHead>
                      <TableHead className="text-xs">Test Result</TableHead>
                      <TableHead className="text-xs">Next Due</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                      <TableHead className="text-xs w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFilters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                          No filters found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFilters.map((f) => {
                        const unit = units.find((u) => u.id === f.unitId);
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="text-[11px] font-medium">{unit?.name ?? f.unitId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{f.filterType}</Badge>
                            </TableCell>
                            <TableCell className="text-[11px]">{f.filterModel}</TableCell>
                            <TableCell className="text-[11px] max-w-[200px] truncate">{f.location}</TableCell>
                            <TableCell className="text-[11px]">{formatDate(f.installationDate)}</TableCell>
                            <TableCell className="text-[11px]">{f.lastIntegrityTest ? formatDate(f.lastIntegrityTest) : "—"}</TableCell>
                            <TableCell className="text-[11px]">
                              {f.lastTestResult === "pass" ? (
                                <span className="text-green-600 font-medium">Pass</span>
                              ) : f.lastTestResult === "fail" ? (
                                <span className="text-red-600 font-medium">Fail</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-[11px]">{formatDate(f.nextTestDue)}</TableCell>
                            <TableCell className="text-center">{statusBadge(f.status)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setSelectedFilter(f); setShowFilterDetail(true); }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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

          {/* Integrity Test Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Integrity Test Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filters
                  .filter((f) => f.filterType === "HEPA")
                  .sort((a, b) => a.nextTestDue.localeCompare(b.nextTestDue))
                  .slice(0, 10)
                  .map((f) => {
                    const unit = units.find((u) => u.id === f.unitId);
                    const today = new Date().toISOString().slice(0, 10);
                    const isOverdue = f.nextTestDue <= today;
                    const isDueSoon = !isOverdue && f.nextTestDue <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3",
                          isOverdue && "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
                          isDueSoon && !isOverdue && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{unit?.name} — {f.location}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {f.filterModel} &mdash; {f.efficiency}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium">
                            {isOverdue ? (
                              <span className="text-red-600">Overdue</span>
                            ) : isDueSoon ? (
                              <span className="text-yellow-600">Due Soon</span>
                            ) : (
                              <span className="text-muted-foreground">{formatDate(f.nextTestDue)}</span>
                            )}
                          </div>
                          {f.lastIntegrityTest && (
                            <p className="text-[10px] text-muted-foreground">Last: {formatDate(f.lastIntegrityTest)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━ QUALIFICATION TAB ━━━━━ */}
        <TabsContent value="qualification" className="space-y-4 mt-4">
          {/* Qualification summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {(["planned", "in-progress", "passed", "requalification-due"] as QualificationStatus[]).map((qs) => {
              const count = qualifications.filter((q) => q.status === qs).length;
              const iconMap: Record<string, typeof Clock> = {
                planned: Calendar,
                "in-progress": Timer,
                passed: CheckCircle2,
                "requalification-due": AlertTriangle,
              };
              const colorMap: Record<string, string> = {
                planned: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                "in-progress": "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
                passed: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
                "requalification-due": "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
              };
              const Icon = iconMap[qs] ?? CircleDot;
              return (
                <Card key={qs} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorMap[qs])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground capitalize">{qs.replace("-", " ")}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Qualification table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  IQ/OQ/PQ Protocols
                </CardTitle>
                <Select value={qualStatusFilter} onValueChange={setQualStatusFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="requalification-due">Requalification Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Protocol #</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs text-center">Type</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                      <TableHead className="text-xs">Scheduled</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-xs">Completed</TableHead>
                      <TableHead className="text-xs">Tests</TableHead>
                      <TableHead className="text-xs w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQualifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                          No qualification records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQualifications.map((q) => {
                        const unit = units.find((u) => u.id === q.unitId);
                        const passedTests = q.testResults.filter((t) => t.status === "pass").length;
                        const totalTests = q.testResults.length;

                        return (
                          <TableRow key={q.id}>
                            <TableCell className="text-[11px] font-mono font-medium">{q.protocolNumber}</TableCell>
                            <TableCell className="text-[11px]">{unit?.name ?? q.unitId}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px] font-semibold">{q.type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{statusBadge(q.status)}</TableCell>
                            <TableCell className="text-[11px]">{formatDate(q.scheduledDate)}</TableCell>
                            <TableCell className="text-[11px]">{q.startedDate ? formatDate(q.startedDate) : "—"}</TableCell>
                            <TableCell className="text-[11px]">{q.completedDate ? formatDate(q.completedDate) : "—"}</TableCell>
                            <TableCell className="text-[11px]">
                              <span className={cn(
                                "font-medium",
                                passedTests === totalTests && totalTests > 0 ? "text-green-600" : "text-muted-foreground"
                              )}>
                                {passedTests}/{totalTests}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setSelectedQual(q); setShowQualDetail(true); }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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

          {/* Requalification Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Requalification Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {qualifications
                  .filter((q) => q.nextQualificationDue || q.status === "planned")
                  .sort((a, b) => {
                    const dateA = a.nextQualificationDue ?? a.scheduledDate;
                    const dateB = b.nextQualificationDue ?? b.scheduledDate;
                    return dateA.localeCompare(dateB);
                  })
                  .map((q) => {
                    const unit = units.find((u) => u.id === q.unitId);
                    const dueDate = q.nextQualificationDue ?? q.scheduledDate;
                    const today = new Date().toISOString().slice(0, 10);
                    const isOverdue = dueDate <= today && q.status !== "passed";
                    const isDueSoon = !isOverdue && dueDate <= new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3",
                          isOverdue && "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
                          isDueSoon && !isOverdue && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{unit?.name}</span>
                            <Badge variant="outline" className="text-[10px]">{q.type}</Badge>
                            {statusBadge(q.status)}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Protocol: {q.protocolNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium">
                            {isOverdue ? (
                              <span className="text-red-600">Overdue &mdash; {formatDate(dueDate)}</span>
                            ) : (
                              <span className={isDueSoon ? "text-yellow-600" : "text-muted-foreground"}>
                                {formatDate(dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ━━━━━ DIALOGS ━━━━━ */}

      {/* Unit Detail Dialog */}
      <Dialog open={showUnitDetail} onOpenChange={setShowUnitDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fan className="h-5 w-5" />
              {selectedUnit?.name} — Unit Details
            </DialogTitle>
            <DialogDescription>
              {selectedUnit?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedUnit && (
            <div className="space-y-4">
              {/* Unit Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="font-medium">{UNIT_TYPE_LABELS[selectedUnit.type]}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Grade</Label>
                  <div className="mt-0.5">{gradeBadge(selectedUnit.grade)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Area Served</Label>
                  <p className="font-medium">{selectedUnit.areaServed}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedUnit.building}, {selectedUnit.floor}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Installation Date</Label>
                  <p className="font-medium">{formatDate(selectedUnit.installationDate)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-0.5">{statusBadge(selectedUnit.status)}</div>
                </div>
              </div>

              {/* Design Parameters */}
              {selectedUnit.designParameters && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Design Parameters</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {selectedUnit.designParameters.supplyAirVolume != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Supply Air</span>
                        <p className="font-bold">{selectedUnit.designParameters.supplyAirVolume} m³/h</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.returnAirVolume != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Return Air</span>
                        <p className="font-bold">{selectedUnit.designParameters.returnAirVolume} m³/h</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.freshAirPercentage != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Fresh Air</span>
                        <p className="font-bold">{selectedUnit.designParameters.freshAirPercentage}%</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.coolingCapacity != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Cooling</span>
                        <p className="font-bold">{selectedUnit.designParameters.coolingCapacity} kW</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.heatingCapacity != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Heating</span>
                        <p className="font-bold">{selectedUnit.designParameters.heatingCapacity} kW</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.filterStages && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Filters</span>
                        <p className="font-bold">{selectedUnit.designParameters.filterStages}</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.motorPower != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Motor</span>
                        <p className="font-bold">{selectedUnit.designParameters.motorPower} kW</p>
                      </div>
                    )}
                    {selectedUnit.designParameters.airVelocity != null && (
                      <div className="rounded border p-2">
                        <span className="text-muted-foreground">Air Velocity</span>
                        <p className="font-bold">{selectedUnit.designParameters.airVelocity} m/s</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Latest Readings */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Latest Readings</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(latestReadingsByUnit[selectedUnit.id] ?? []).map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded border p-2",
                        r.result === "action" && "border-red-300 bg-red-50 dark:bg-red-950/20",
                        r.result === "alert" && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">{HVAC_PARAMETER_LABELS[r.parameter]}</span>
                      <p className="text-lg font-bold">
                        {r.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{r.unit}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {resultBadge(r.result)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reading History */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Recent History (Last 10)</h4>
                <div className="rounded-md border max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Time</TableHead>
                        <TableHead className="text-[10px]">Parameter</TableHead>
                        <TableHead className="text-[10px] text-right">Value</TableHead>
                        <TableHead className="text-[10px] text-center">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings
                        .filter((r) => r.unitId === selectedUnit.id)
                        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                        .slice(0, 10)
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-[10px]">{formatDateTime(r.timestamp)}</TableCell>
                            <TableCell className="text-[10px]">{HVAC_PARAMETER_LABELS[r.parameter]}</TableCell>
                            <TableCell className="text-[10px] text-right font-mono">{r.value} {r.unit}</TableCell>
                            <TableCell className="text-center">{resultBadge(r.result)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Reading Dialog */}
      <Dialog open={showReadingForm} onOpenChange={setShowReadingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add HVAC Reading
            </DialogTitle>
            <DialogDescription>
              Record a new monitoring reading for an HVAC unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">HVAC Unit</Label>
              <Select value={readingUnitId} onValueChange={setReadingUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — Grade {u.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Parameter</Label>
              <Select value={readingParameter} onValueChange={setReadingParameter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parameter..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HVAC_PARAMETER_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Value {readingParameter ? `(${HVAC_PARAMETER_UNITS[readingParameter as HVACParameterType] ?? ""})` : ""}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter value..."
                value={readingValue}
                onChange={(e) => setReadingValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Operator</Label>
              <Input
                placeholder="Operator name..."
                value={readingOperator}
                onChange={(e) => setReadingOperator(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={readingNotes}
                onChange={(e) => setReadingNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReadingForm(false)}>Cancel</Button>
            <Button
              onClick={handleAddReading}
              disabled={!readingUnitId || !readingParameter || !readingValue}
            >
              Save Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Detail Dialog */}
      <Dialog open={showFilterDetail} onOpenChange={setShowFilterDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Filter Details
            </DialogTitle>
          </DialogHeader>

          {selectedFilter && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <p className="font-medium">{units.find((u) => u.id === selectedFilter.unitId)?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedFilter.filterType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="font-medium">{selectedFilter.filterModel}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Efficiency</Label>
                  <p className="font-medium">{selectedFilter.efficiency ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedFilter.location}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Installation Date</Label>
                  <p className="font-medium">{formatDate(selectedFilter.installationDate)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-0.5">{statusBadge(selectedFilter.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Integrity Test</Label>
                  <p className="font-medium">{selectedFilter.lastIntegrityTest ? formatDate(selectedFilter.lastIntegrityTest) : "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Test Result</Label>
                  <p className={cn("font-medium",
                    selectedFilter.lastTestResult === "pass" ? "text-green-600" :
                    selectedFilter.lastTestResult === "fail" ? "text-red-600" : ""
                  )}>
                    {selectedFilter.lastTestResult ?? "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Next Test Due</Label>
                  <p className="font-medium">{formatDate(selectedFilter.nextTestDue)}</p>
                </div>
              </div>
              {selectedFilter.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-xs mt-1 p-2 rounded bg-muted">{selectedFilter.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Qualification Detail Dialog */}
      <Dialog open={showQualDetail} onOpenChange={setShowQualDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Qualification Protocol — {selectedQual?.protocolNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedQual?.type} qualification for {units.find((u) => u.id === selectedQual?.unitId)?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedQual && (
            <div className="space-y-4">
              {/* Protocol Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <div className="mt-0.5">
                    <Badge variant="outline" className="font-semibold">{selectedQual.type}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-0.5">{statusBadge(selectedQual.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Scheduled</Label>
                  <p className="font-medium">{formatDate(selectedQual.scheduledDate)}</p>
                </div>
                {selectedQual.startedDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Started</Label>
                    <p className="font-medium">{formatDate(selectedQual.startedDate)}</p>
                  </div>
                )}
                {selectedQual.completedDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Completed</Label>
                    <p className="font-medium">{formatDate(selectedQual.completedDate)}</p>
                  </div>
                )}
                {selectedQual.approvedBy && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Approved By</Label>
                    <p className="font-medium">{selectedQual.approvedBy}</p>
                  </div>
                )}
              </div>

              {/* Test Results */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Test Results</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Test</TableHead>
                        <TableHead className="text-[10px]">Criteria</TableHead>
                        <TableHead className="text-[10px]">Result</TableHead>
                        <TableHead className="text-[10px] text-center">Status</TableHead>
                        <TableHead className="text-[10px]">Tested By</TableHead>
                        <TableHead className="text-[10px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQual.testResults.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-[11px] font-medium">{t.testName}</TableCell>
                          <TableCell className="text-[10px] max-w-[150px] truncate">{t.acceptanceCriteria}</TableCell>
                          <TableCell className="text-[10px]">{t.actualResult}</TableCell>
                          <TableCell className="text-center">
                            {t.status === "pass" ? (
                              <Badge variant="outline" className="border-green-400 text-green-700 dark:text-green-400 text-[10px]">Pass</Badge>
                            ) : t.status === "fail" ? (
                              <Badge variant="outline" className="border-red-400 text-red-700 dark:text-red-400 text-[10px]">Fail</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px]">{t.testedBy ?? "—"}</TableCell>
                          <TableCell className="text-[10px]">{t.testedDate ? formatDate(t.testedDate) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Deviations & Conclusion */}
              {selectedQual.deviations && (
                <div>
                  <Label className="text-xs text-muted-foreground">Deviations</Label>
                  <p className="text-xs mt-1 p-2 rounded bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
                    {selectedQual.deviations}
                  </p>
                </div>
              )}
              {selectedQual.conclusion && (
                <div>
                  <Label className="text-xs text-muted-foreground">Conclusion</Label>
                  <p className="text-xs mt-1 p-2 rounded bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    {selectedQual.conclusion}
                  </p>
                </div>
              )}
              {selectedQual.nextQualificationDue && (
                <div>
                  <Label className="text-xs text-muted-foreground">Next Qualification Due</Label>
                  <p className="font-medium text-sm">{formatDate(selectedQual.nextQualificationDue)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
