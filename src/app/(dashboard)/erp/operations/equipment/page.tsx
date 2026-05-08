"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wrench,
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
  ThermometerSun,
  ArrowUpDown,
  X,
  ChevronRight,
  FileText,
  Timer,
  CircleDot,
  PackageCheck,
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
import EquipmentCalendar from "@/components/shared/equipment-calendar";
import { cn } from "@/lib/utils";

import { equipmentStore } from "@/lib/operations/equipment-store";
import type {
  Equipment,
  EquipmentType,
  EquipmentStatus,
  EquipmentCriticality,
  CalibrationRecord,
  CalibrationResult,
  MaintenanceOrder,
  MaintenanceType,
  MaintenancePriority,
  MaintenanceOrderStatus,
  MaintenanceSchedule,
  EquipmentMetrics,
  CalendarEvent,
  PartUsed,
} from "@/lib/operations/equipment-types";

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<EquipmentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  operational:       { label: "Operational",       variant: "default" },
  "under-maintenance": { label: "Under Maintenance", variant: "secondary" },
  "calibration-due": { label: "Calibration Due",   variant: "outline" },
  "out-of-service":  { label: "Out of Service",    variant: "destructive" },
  retired:           { label: "Retired",            variant: "secondary" },
};

const CRITICALITY_COLORS: Record<EquipmentCriticality, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  major:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  minor:    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const TYPE_LABELS: Record<EquipmentType, string> = {
  production:     "Production",
  lab:            "Laboratory",
  utility:        "Utility",
  HVAC:           "HVAC",
  "water-system": "Water System",
};

const MO_STATUS_BADGE: Record<MaintenanceOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned:       { label: "Planned",     variant: "outline" },
  "in-progress": { label: "In Progress", variant: "default" },
  completed:     { label: "Completed",   variant: "secondary" },
  cancelled:     { label: "Cancelled",   variant: "secondary" },
  "on-hold":     { label: "On Hold",     variant: "destructive" },
};

const MO_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
  breakdown:  "Breakdown",
};

const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  low:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  high:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const CAL_RESULT_BADGE: Record<CalibrationResult, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pass:     { label: "Pass",     variant: "default" },
  fail:     { label: "Fail",     variant: "destructive" },
  adjusted: { label: "Adjusted", variant: "outline" },
};

function formatDate(d: string | undefined): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(d: string | undefined): number {
  if (!d) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function futureDaysISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ────────────────────────────────────────────────────────────
   Simple bar chart (pure CSS)
   ──────────────────────────────────────────────────────────── */

function SimpleBar({
  label,
  value,
  max,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate mr-2">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────────────────────── */

export default function EquipmentPage() {
  /* ── state ──────────────────────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("equipment");
  const [searchQuery, setSearchQuery] = useState("");

  // Equipment filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCriticality, setFilterCriticality] = useState<string>("all");

  // Detail dialog
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [detailTab, setDetailTab] = useState("info");

  // Calibration form
  const [showCalForm, setShowCalForm] = useState(false);
  const [calFormEquipmentId, setCalFormEquipmentId] = useState("");
  const [calFormDate, setCalFormDate] = useState(todayISO());
  const [calFormNextDue, setCalFormNextDue] = useState(futureDaysISO(90));
  const [calFormStandard, setCalFormStandard] = useState("");
  const [calFormStdCert, setCalFormStdCert] = useState("");
  const [calFormResult, setCalFormResult] = useState<CalibrationResult>("pass");
  const [calFormPerformedBy, setCalFormPerformedBy] = useState("");
  const [calFormAsFound, setCalFormAsFound] = useState("");
  const [calFormAsLeft, setCalFormAsLeft] = useState("");
  const [calFormNotes, setCalFormNotes] = useState("");

  // Maintenance form
  const [showMOForm, setShowMOForm] = useState(false);
  const [moFormEquipmentId, setMoFormEquipmentId] = useState("");
  const [moFormType, setMoFormType] = useState<MaintenanceType>("preventive");
  const [moFormPriority, setMoFormPriority] = useState<MaintenancePriority>("medium");
  const [moFormDescription, setMoFormDescription] = useState("");
  const [moFormAssignedTo, setMoFormAssignedTo] = useState("");
  const [moFormScheduledDate, setMoFormScheduledDate] = useState(todayISO());

  // Completion form
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeOrderId, setCompleteOrderId] = useState("");
  const [completeDate, setCompleteDate] = useState(todayISO());
  const [completeDowntime, setCompleteDowntime] = useState("0");
  const [completeRootCause, setCompleteRootCause] = useState("");
  const [completeAction, setCompleteAction] = useState("");

  // Equipment form
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [eqFormName, setEqFormName] = useState("");
  const [eqFormAssetTag, setEqFormAssetTag] = useState("");
  const [eqFormSerial, setEqFormSerial] = useState("");
  const [eqFormModel, setEqFormModel] = useState("");
  const [eqFormManufacturer, setEqFormManufacturer] = useState("");
  const [eqFormType, setEqFormType] = useState<EquipmentType>("manufacturing");
  const [eqFormDept, setEqFormDept] = useState("");
  const [eqFormCriticality, setEqFormCriticality] = useState<EquipmentCriticality>("minor");
  const [eqFormLocation, setEqFormLocation] = useState("");
  const [deleteEquipId, setDeleteEquipId] = useState<string | null>(null);

  // Force refresh
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── load data ──────────────────────────────────────────── */
  const allEquipment = useMemo(() => (mounted ? equipmentStore.getAllEquipment() : []), [mounted, tick]);
  const allCalibrations = useMemo(() => (mounted ? equipmentStore.getAllCalibrations() : []), [mounted, tick]);
  const allOrders = useMemo(() => (mounted ? equipmentStore.getAllMaintenanceOrders() : []), [mounted, tick]);
  const allSchedules = useMemo(() => (mounted ? equipmentStore.getAllSchedules() : []), [mounted, tick]);
  const metrics = useMemo(() => (mounted ? equipmentStore.getMetrics() : null), [mounted, tick]);
  const departments = useMemo(() => (mounted ? equipmentStore.getDepartments() : []), [mounted, tick]);

  const calendarEvents = useMemo(() => {
    if (!mounted) return [];
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return equipmentStore.getCalendarEvents(
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    );
  }, [mounted, tick]);

  /* ── filtered equipment ─────────────────────────────────── */
  const filteredEquipment = useMemo(() => {
    let list = allEquipment;
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (filterDept !== "all") list = list.filter((e) => e.department === filterDept);
    if (filterStatus !== "all") list = list.filter((e) => e.status === filterStatus);
    if (filterCriticality !== "all") list = list.filter((e) => e.criticality === filterCriticality);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.assetTag.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q) ||
          e.model.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allEquipment, filterType, filterDept, filterStatus, filterCriticality, searchQuery]);

  /* ── calibration lists ──────────────────────────────────── */
  const overdueCalibrations = useMemo(() => (mounted ? equipmentStore.getOverdueCalibrations() : []), [mounted, tick]);
  const upcomingCalibrations = useMemo(() => (mounted ? equipmentStore.getUpcomingCalibrations(60) : []), [mounted, tick]);

  /* ── maintenance lists ──────────────────────────────────── */
  const openOrders = useMemo(() => (mounted ? equipmentStore.getOpenMaintenanceOrders() : []), [mounted, tick]);
  const upcomingMaintenance = useMemo(() => (mounted ? equipmentStore.getUpcomingMaintenance(60) : []), [mounted, tick]);

  /* ── detail data ────────────────────────────────────────── */
  const selectedCalibrations = useMemo(
    () => (selectedEquipment ? equipmentStore.getCalibrationsByEquipment(selectedEquipment.id) : []),
    [selectedEquipment, tick]
  );
  const selectedMaintenance = useMemo(
    () => (selectedEquipment ? equipmentStore.getMaintenanceByEquipment(selectedEquipment.id) : []),
    [selectedEquipment, tick]
  );
  const selectedSchedules = useMemo(
    () => (selectedEquipment ? equipmentStore.getSchedulesByEquipment(selectedEquipment.id) : []),
    [selectedEquipment, tick]
  );

  /* ── handlers ───────────────────────────────────────────── */

  function handleSubmitCalibration() {
    if (!calFormEquipmentId || !calFormPerformedBy || !calFormStandard) return;
    equipmentStore.createCalibration({
      equipmentId: calFormEquipmentId,
      calibrationDate: calFormDate,
      nextDueDate: calFormNextDue,
      standardUsed: calFormStandard,
      standardCertificate: calFormStdCert,
      result: calFormResult,
      performedBy: calFormPerformedBy,
      asFoundReadings: calFormAsFound,
      asLeftReadings: calFormAsLeft,
      notes: calFormNotes || undefined,
    });
    setShowCalForm(false);
    resetCalForm();
    refresh();
  }

  function resetCalForm() {
    setCalFormEquipmentId("");
    setCalFormDate(todayISO());
    setCalFormNextDue(futureDaysISO(90));
    setCalFormStandard("");
    setCalFormStdCert("");
    setCalFormResult("pass");
    setCalFormPerformedBy("");
    setCalFormAsFound("");
    setCalFormAsLeft("");
    setCalFormNotes("");
  }

  function handleSubmitMO() {
    if (!moFormEquipmentId || !moFormDescription || !moFormAssignedTo) return;
    equipmentStore.createMaintenanceOrder({
      equipmentId: moFormEquipmentId,
      type: moFormType,
      priority: moFormPriority,
      description: moFormDescription,
      assignedTo: moFormAssignedTo,
      scheduledDate: moFormScheduledDate,
      partsUsed: [],
      downtimeHours: 0,
      status: "planned",
    });
    setShowMOForm(false);
    resetMOForm();
    refresh();
  }

  function resetMOForm() {
    setMoFormEquipmentId("");
    setMoFormType("preventive");
    setMoFormPriority("medium");
    setMoFormDescription("");
    setMoFormAssignedTo("");
    setMoFormScheduledDate(todayISO());
  }

  function handleCompleteMO() {
    if (!completeOrderId) return;
    equipmentStore.completeMaintenanceOrder(
      completeOrderId,
      completeDate,
      parseFloat(completeDowntime) || 0,
      [],
      completeRootCause || undefined,
      completeAction || undefined
    );
    setShowCompleteForm(false);
    setCompleteOrderId("");
    setCompleteDate(todayISO());
    setCompleteDowntime("0");
    setCompleteRootCause("");
    setCompleteAction("");
    refresh();
  }

  function handleCreateEquipment() {
    if (!eqFormName) return;
    equipmentStore.createEquipment({
      name: eqFormName,
      serialNumber: eqFormSerial || `SN-${Date.now()}`,
      model: eqFormModel || "N/A",
      manufacturer: eqFormManufacturer || "N/A",
      type: eqFormType,
      department: eqFormDept || "General",
      location: eqFormLocation || "Main Facility",
      criticality: eqFormCriticality,
      status: "operational",
      installDate: todayISO(),
      nextCalibrationDue: futureDaysISO(90),
      nextMaintenanceDue: futureDaysISO(30),
      calibrationInterval: 90,
      maintenanceInterval: 30,
    });
    setShowEquipForm(false);
    resetEquipForm();
    refresh();
  }

  function resetEquipForm() {
    setEqFormName("");
    setEqFormAssetTag("");
    setEqFormSerial("");
    setEqFormModel("");
    setEqFormManufacturer("");
    setEqFormType("manufacturing");
    setEqFormDept("");
    setEqFormCriticality("minor");
    setEqFormLocation("");
  }

  function handleDeleteEquipment() {
    if (!deleteEquipId) return;
    equipmentStore.deleteEquipment(deleteEquipId);
    setDeleteEquipId(null);
    if (selectedEquipment?.id === deleteEquipId) setSelectedEquipment(null);
    refresh();
  }

  function openCompleteForm(orderId: string) {
    setCompleteOrderId(orderId);
    setCompleteDate(todayISO());
    setCompleteDowntime("0");
    setCompleteRootCause("");
    setCompleteAction("");
    setShowCompleteForm(true);
  }

  /* ── guard for SSR ──────────────────────────────────────── */
  if (!mounted || !metrics) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Equipment Calibration & Maintenance"
          description="Manage equipment lifecycle, calibration schedules, and preventive maintenance programs"
          icon={<Wrench className="h-6 w-6 text-primary" />}
        />
        <div className="text-muted-foreground text-sm">Loading equipment data...</div>
      </div>
    );
  }

  /* ── PM Due count ───────────────────────────────────────── */
  const pmDueCount = openOrders.filter((o) => o.type === "preventive").length;
  const calDueCount = overdueCalibrations.length + upcomingCalibrations.filter((c) => daysUntil(c.nextDueDate) <= 7).length;

  /* ────────────────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Equipment Calibration & Maintenance"
        description="Manage equipment lifecycle, calibration schedules, and preventive maintenance programs"
        icon={<Wrench className="h-6 w-6 text-primary" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Settings}
          title="Total Equipment"
          value={metrics.totalEquipment}
          subtitle={`${metrics.operational} operational`}
        />
        <StatsCard
          icon={Gauge}
          title="Calibration Due"
          value={calDueCount}
          subtitle={`${overdueCalibrations.length} overdue`}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <StatsCard
          icon={ClipboardList}
          title="PM Due"
          value={pmDueCount}
          subtitle={`${openOrders.length} total open WOs`}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatsCard
          icon={Timer}
          title="MTBF"
          value={`${metrics.mtbfDays}d`}
          subtitle={`MTTR: ${metrics.mttrHours}h`}
          iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
        />
        <StatsCard
          icon={CheckCircle2}
          title="PM Compliance"
          value={`${metrics.pmCompliancePct}%`}
          subtitle={`Cal: ${metrics.calibrationCompliancePct}%`}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════
            TAB 1: EQUIPMENT
           ════════════════════════════════════════════════════ */}
        <TabsContent value="equipment" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, asset tag, serial..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="min-w-[140px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {(Object.keys(TYPE_LABELS) as EquipmentType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[180px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
                  <Select value={filterDept} onValueChange={setFilterDept}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {(Object.keys(STATUS_BADGE) as EquipmentStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_BADGE[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[130px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Criticality</Label>
                  <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Equipment List ({filteredEquipment.length})
              </CardTitle>
              <Button size="sm" onClick={() => setShowEquipForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Equipment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Cal.</TableHead>
                      <TableHead>Next PM</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No equipment matches the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipment.map((eq) => {
                        const calDays = daysUntil(eq.nextCalibrationDue);
                        const pmDays = daysUntil(eq.nextMaintenanceDue);
                        return (
                          <TableRow
                            key={eq.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => { setSelectedEquipment(eq); setDetailTab("info"); }}
                          >
                            <TableCell className="font-mono text-xs">{eq.assetTag}</TableCell>
                            <TableCell className="font-medium max-w-[250px] truncate">{eq.name}</TableCell>
                            <TableCell>
                              <span className="text-xs">{TYPE_LABELS[eq.type]}</span>
                            </TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{eq.department}</TableCell>
                            <TableCell>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CRITICALITY_COLORS[eq.criticality])}>
                                {eq.criticality}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGE[eq.status].variant}>
                                {STATUS_BADGE[eq.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={cn("text-xs", calDays < 0 ? "text-red-600 font-semibold" : calDays <= 7 ? "text-orange-600" : "text-muted-foreground")}>
                                {eq.nextCalibrationDue ? formatDate(eq.nextCalibrationDue) : "--"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={cn("text-xs", pmDays < 0 ? "text-red-600 font-semibold" : pmDays <= 7 ? "text-orange-600" : "text-muted-foreground")}>
                                {eq.nextMaintenanceDue ? formatDate(eq.nextMaintenanceDue) : "--"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedEquipment(eq); setDetailTab("info"); }}><ChevronRight className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteEquipId(eq.id); }}><X className="h-3.5 w-3.5" /></Button>
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
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            TAB 2: CALIBRATION
           ════════════════════════════════════════════════════ */}
        <TabsContent value="calibration" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Calibration Management</h3>
            <Button onClick={() => setShowCalForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Record Calibration
            </Button>
          </div>

          {/* Overdue Calibrations */}
          {overdueCalibrations.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Calibrations ({overdueCalibrations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Last Calibrated</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Last Result</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueCalibrations.map((cal) => {
                      const eq = allEquipment.find((e) => e.id === cal.equipmentId);
                      const overdueDays = Math.abs(daysUntil(cal.nextDueDate));
                      return (
                        <TableRow key={cal.id}>
                          <TableCell className="font-medium">{eq?.name ?? cal.equipmentId}</TableCell>
                          <TableCell>{formatDate(cal.calibrationDate)}</TableCell>
                          <TableCell className="text-red-600 font-medium">{formatDate(cal.nextDueDate)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{overdueDays} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={CAL_RESULT_BADGE[cal.result].variant}>
                              {CAL_RESULT_BADGE[cal.result].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{cal.certificateNumber}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Calibrations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Calibrations (next 60 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingCalibrations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No calibrations due in the next 60 days.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Last Calibrated</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Until Due</TableHead>
                      <TableHead>Last Result</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingCalibrations.map((cal) => {
                      const eq = allEquipment.find((e) => e.id === cal.equipmentId);
                      const d = daysUntil(cal.nextDueDate);
                      return (
                        <TableRow key={cal.id}>
                          <TableCell className="font-medium">{eq?.name ?? cal.equipmentId}</TableCell>
                          <TableCell>{formatDate(cal.calibrationDate)}</TableCell>
                          <TableCell>{formatDate(cal.nextDueDate)}</TableCell>
                          <TableCell>
                            <span className={cn("text-sm font-medium", d <= 7 ? "text-orange-600" : "text-muted-foreground")}>
                              {d} days
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={CAL_RESULT_BADGE[cal.result].variant}>
                              {CAL_RESULT_BADGE[cal.result].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{cal.performedBy}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Calibration History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Calibration Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Standard</TableHead>
                      <TableHead>As Found</TableHead>
                      <TableHead>As Left</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCalibrations
                      .sort((a, b) => b.calibrationDate.localeCompare(a.calibrationDate))
                      .slice(0, 15)
                      .map((cal) => {
                        const eq = allEquipment.find((e) => e.id === cal.equipmentId);
                        return (
                          <TableRow key={cal.id}>
                            <TableCell className="font-mono text-xs">{cal.certificateNumber}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[180px] truncate">{eq?.name ?? "--"}</TableCell>
                            <TableCell className="text-xs">{formatDate(cal.calibrationDate)}</TableCell>
                            <TableCell>
                              <Badge variant={CAL_RESULT_BADGE[cal.result].variant}>
                                {CAL_RESULT_BADGE[cal.result].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{cal.standardUsed}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{cal.asFoundReadings}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{cal.asLeftReadings}</TableCell>
                            <TableCell className="text-xs">{cal.performedBy}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Calendar View */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calibration & Maintenance Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentCalendar events={calendarEvents} months={3} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            TAB 3: MAINTENANCE
           ════════════════════════════════════════════════════ */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Maintenance Management</h3>
            <Button onClick={() => setShowMOForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Work Order
            </Button>
          </div>

          {/* PM Schedule Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                PM Schedules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Performed</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Checklist Items</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSchedules.map((sch) => {
                    const eq = allEquipment.find((e) => e.id === sch.equipmentId);
                    const d = daysUntil(sch.nextDue);
                    return (
                      <TableRow key={sch.id}>
                        <TableCell className="font-medium text-sm">{eq?.name ?? "--"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{sch.frequency}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(sch.lastPerformed)}</TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-medium", d < 0 ? "text-red-600" : d <= 7 ? "text-orange-600" : "")}>
                            {formatDate(sch.nextDue)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{sch.assignedTo}</TableCell>
                        <TableCell className="text-xs">{sch.checklistItems.length} items</TableCell>
                        <TableCell>
                          {d < 0 ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : d <= 7 ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">Due Soon</Badge>
                          ) : (
                            <Badge variant="secondary">On Track</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Open Work Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Open Work Orders ({openOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No open work orders.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WO #</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openOrders.map((mo) => {
                      const eq = allEquipment.find((e) => e.id === mo.equipmentId);
                      return (
                        <TableRow key={mo.id}>
                          <TableCell className="font-mono text-xs">{mo.orderNumber}</TableCell>
                          <TableCell className="font-medium text-xs max-w-[150px] truncate">{eq?.name ?? "--"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{MO_TYPE_LABELS[mo.type]}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[mo.priority])}>
                              {mo.priority}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{mo.description}</TableCell>
                          <TableCell className="text-xs">{mo.assignedTo}</TableCell>
                          <TableCell className="text-xs">{formatDate(mo.scheduledDate)}</TableCell>
                          <TableCell>
                            <Badge variant={MO_STATUS_BADGE[mo.status].variant}>
                              {MO_STATUS_BADGE[mo.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(mo.status === "planned" || mo.status === "in-progress") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => openCompleteForm(mo.id)}
                              >
                                Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Completed Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                Recently Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WO #</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Downtime</TableHead>
                      <TableHead>Parts Cost</TableHead>
                      <TableHead>Root Cause</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrders
                      .filter((m) => m.status === "completed")
                      .sort((a, b) => (b.completionDate ?? "").localeCompare(a.completionDate ?? ""))
                      .slice(0, 10)
                      .map((mo) => {
                        const eq = allEquipment.find((e) => e.id === mo.equipmentId);
                        const partsCost = mo.partsUsed.reduce((s, p) => s + p.quantity * p.unitCost, 0);
                        return (
                          <TableRow key={mo.id}>
                            <TableCell className="font-mono text-xs">{mo.orderNumber}</TableCell>
                            <TableCell className="text-xs font-medium max-w-[150px] truncate">{eq?.name ?? "--"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{MO_TYPE_LABELS[mo.type]}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(mo.completionDate)}</TableCell>
                            <TableCell className="text-xs">{mo.downtimeHours}h</TableCell>
                            <TableCell className="text-xs font-medium">
                              {partsCost > 0 ? `EGP ${partsCost.toLocaleString()}` : "--"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {mo.rootCause ?? "--"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            TAB 4: ANALYTICS
           ════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Equipment Analytics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Calibration Compliance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Calibration Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative h-32 w-32">
                    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className={metrics.calibrationCompliancePct >= 90 ? "text-green-500" : metrics.calibrationCompliancePct >= 70 ? "text-yellow-500" : "text-red-500"}
                        strokeWidth="3"
                        strokeDasharray={`${metrics.calibrationCompliancePct}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{metrics.calibrationCompliancePct}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compliant Equipment</span>
                    <span className="font-medium">
                      {Math.round((metrics.calibrationCompliancePct / 100) * metrics.totalEquipment)} / {metrics.totalEquipment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue</span>
                    <span className="font-medium text-red-600">{overdueCalibrations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due in 30 days</span>
                    <span className="font-medium text-orange-600">
                      {upcomingCalibrations.filter((c) => daysUntil(c.nextDueDate) <= 30).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PM Compliance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  PM Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative h-32 w-32">
                    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className={metrics.pmCompliancePct >= 90 ? "text-green-500" : metrics.pmCompliancePct >= 70 ? "text-yellow-500" : "text-red-500"}
                        strokeWidth="3"
                        strokeDasharray={`${metrics.pmCompliancePct}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{metrics.pmCompliancePct}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed PMs</span>
                    <span className="font-medium">
                      {allOrders.filter((o) => o.type === "preventive" && o.status === "completed").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open PM Work Orders</span>
                    <span className="font-medium">{pmDueCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Schedules</span>
                    <span className="font-medium">{allSchedules.filter((s) => s.active).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MTBF by Equipment Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  MTBF by Equipment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.byType.map(({ type, count }) => {
                    const breakdowns = allOrders.filter(
                      (m) => m.type === "breakdown" && m.status === "completed" &&
                        allEquipment.find((e) => e.id === m.equipmentId)?.type === type
                    ).length;
                    const typeMtbf = breakdowns > 0 ? Math.round((count * 365) / breakdowns) : 365;
                    return (
                      <SimpleBar
                        key={type}
                        label={TYPE_LABELS[type]}
                        value={typeMtbf}
                        max={400}
                        color={typeMtbf > 300 ? "bg-green-500" : typeMtbf > 150 ? "bg-yellow-500" : "bg-red-500"}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Mean Time Between Failures (days) - higher is better
                </p>
              </CardContent>
            </Card>

            {/* Downtime Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Monthly Downtime (hours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.monthlyDowntime.map(({ month, hours }) => (
                    <SimpleBar
                      key={month}
                      label={month}
                      value={hours}
                      max={Math.max(...metrics.monthlyDowntime.map((m) => m.hours), 1)}
                      color={hours > 100 ? "bg-red-500" : hours > 50 ? "bg-orange-500" : "bg-blue-500"}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Equipment by Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Equipment by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.byType.map(({ type, count }) => (
                    <SimpleBar
                      key={type}
                      label={TYPE_LABELS[type]}
                      value={count}
                      max={Math.max(...metrics.byType.map((t) => t.count))}
                      color="bg-primary"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Failure Modes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Top Failure Modes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.topFailureModes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No failure data recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.topFailureModes.map(({ mode, count }) => (
                      <SimpleBar
                        key={mode}
                        label={mode}
                        value={count}
                        max={Math.max(...metrics.topFailureModes.map((f) => f.count))}
                        color="bg-red-500"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment by Department */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleDot className="h-4 w-4" />
                  Equipment by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {metrics.byDepartment.map(({ department, count }) => (
                    <SimpleBar
                      key={department}
                      label={department}
                      value={count}
                      max={Math.max(...metrics.byDepartment.map((d) => d.count))}
                      color="bg-indigo-500"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════
          EQUIPMENT DETAIL DIALOG
         ════════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedEquipment}
        onOpenChange={(open) => { if (!open) setSelectedEquipment(null); }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedEquipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {selectedEquipment.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedEquipment.assetTag} | {selectedEquipment.serialNumber} | {selectedEquipment.manufacturer}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="mb-3">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="cal-history">Calibration</TabsTrigger>
                  <TabsTrigger value="maint-history">Maintenance</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Type</p>
                      <p className="font-medium">{TYPE_LABELS[selectedEquipment.type]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Model</p>
                      <p className="font-medium">{selectedEquipment.model}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="font-medium">{selectedEquipment.location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Department</p>
                      <p className="font-medium">{selectedEquipment.department}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Criticality</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CRITICALITY_COLORS[selectedEquipment.criticality])}>
                        {selectedEquipment.criticality}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant={STATUS_BADGE[selectedEquipment.status].variant}>
                        {STATUS_BADGE[selectedEquipment.status].label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Installation Date</p>
                      <p className="font-medium">{formatDate(selectedEquipment.installationDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Serial Number</p>
                      <p className="font-mono font-medium">{selectedEquipment.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last Calibration</p>
                      <p className="font-medium">{formatDate(selectedEquipment.lastCalibrationDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Next Calibration Due</p>
                      <p className={cn("font-medium", daysUntil(selectedEquipment.nextCalibrationDue) < 0 ? "text-red-600" : "")}>
                        {formatDate(selectedEquipment.nextCalibrationDue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last Maintenance</p>
                      <p className="font-medium">{formatDate(selectedEquipment.lastMaintenanceDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Next Maintenance Due</p>
                      <p className={cn("font-medium", daysUntil(selectedEquipment.nextMaintenanceDue) < 0 ? "text-red-600" : "")}>
                        {formatDate(selectedEquipment.nextMaintenanceDue)}
                      </p>
                    </div>
                    {selectedEquipment.notes && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Notes</p>
                        <p className="font-medium text-sm">{selectedEquipment.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCalFormEquipmentId(selectedEquipment.id);
                        setShowCalForm(true);
                      }}
                    >
                      <Gauge className="h-3.5 w-3.5 mr-1" /> Record Calibration
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMoFormEquipmentId(selectedEquipment.id);
                        setShowMOForm(true);
                      }}
                    >
                      <Wrench className="h-3.5 w-3.5 mr-1" /> Create Work Order
                    </Button>
                  </div>
                </TabsContent>

                {/* Calibration History Tab */}
                <TabsContent value="cal-history">
                  {selectedCalibrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No calibration records for this equipment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedCalibrations.map((cal) => (
                        <div key={cal.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{cal.certificateNumber}</span>
                              <Badge variant={CAL_RESULT_BADGE[cal.result].variant}>
                                {CAL_RESULT_BADGE[cal.result].label}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(cal.calibrationDate)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Standard Used</p>
                              <p>{cal.standardUsed}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Performed By</p>
                              <p>{cal.performedBy}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">As Found</p>
                              <p>{cal.asFoundReadings}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">As Left</p>
                              <p>{cal.asLeftReadings}</p>
                            </div>
                          </div>
                          {cal.notes && (
                            <p className="text-xs text-muted-foreground border-t pt-1">{cal.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Maintenance History Tab */}
                <TabsContent value="maint-history">
                  {selectedMaintenance.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No maintenance records for this equipment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedMaintenance.map((mo) => (
                        <div key={mo.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{mo.orderNumber}</span>
                              <Badge variant="outline" className="text-xs">{MO_TYPE_LABELS[mo.type]}</Badge>
                              <Badge variant={MO_STATUS_BADGE[mo.status].variant}>
                                {MO_STATUS_BADGE[mo.status].label}
                              </Badge>
                            </div>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[mo.priority])}>
                              {mo.priority}
                            </span>
                          </div>
                          <p className="text-sm">{mo.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Scheduled</p>
                              <p>{formatDate(mo.scheduledDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p>{mo.completionDate ? formatDate(mo.completionDate) : "--"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Downtime</p>
                              <p>{mo.downtimeHours}h</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned To</p>
                              <p>{mo.assignedTo}</p>
                            </div>
                          </div>
                          {mo.partsUsed.length > 0 && (
                            <div className="text-xs">
                              <p className="text-muted-foreground mb-1">Parts Used:</p>
                              <ul className="list-disc pl-4">
                                {mo.partsUsed.map((p, i) => (
                                  <li key={i}>
                                    {p.partName} ({p.partNumber}) x{p.quantity} - EGP {(p.quantity * p.unitCost).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {mo.rootCause && (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Root Cause:</p>
                              <p>{mo.rootCause}</p>
                            </div>
                          )}
                          {mo.correctiveAction && (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Corrective Action:</p>
                              <p>{mo.correctiveAction}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule">
                  {selectedSchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No PM schedule configured for this equipment.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedSchedules.map((sch) => (
                        <div key={sch.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="capitalize">{sch.frequency} PM</Badge>
                            <span className={cn(
                              "text-xs font-medium",
                              daysUntil(sch.nextDue) < 0 ? "text-red-600" : daysUntil(sch.nextDue) <= 7 ? "text-orange-600" : "text-muted-foreground"
                            )}>
                              Next: {formatDate(sch.nextDue)}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <p><span className="text-muted-foreground">Assigned To:</span> {sch.assignedTo}</p>
                            <p><span className="text-muted-foreground">Last Performed:</span> {formatDate(sch.lastPerformed)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-2">Checklist ({sch.checklistItems.length} items):</p>
                            <ul className="space-y-1">
                              {sch.checklistItems.map((item) => (
                                <li key={item.id} className="flex items-center gap-2 text-xs">
                                  <div className={cn(
                                    "h-3 w-3 rounded border flex items-center justify-center shrink-0",
                                    item.required ? "border-primary" : "border-muted-foreground"
                                  )}>
                                    {item.required && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
                                  </div>
                                  <span className={item.required ? "" : "text-muted-foreground"}>
                                    {item.description}
                                    {item.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          RECORD CALIBRATION DIALOG
         ════════════════════════════════════════════════════ */}
      <Dialog open={showCalForm} onOpenChange={(open) => { if (!open) { setShowCalForm(false); resetCalForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Calibration</DialogTitle>
            <DialogDescription>Enter calibration results for selected equipment.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Equipment</Label>
              <Select value={calFormEquipmentId} onValueChange={setCalFormEquipmentId}>
                <SelectTrigger><SelectValue placeholder="Select equipment..." /></SelectTrigger>
                <SelectContent>
                  {allEquipment.filter((e) => e.status !== "retired").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Calibration Date</Label>
                <Input type="date" value={calFormDate} onChange={(e) => setCalFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Next Due Date</Label>
                <Input type="date" value={calFormNextDue} onChange={(e) => setCalFormNextDue(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Standard Used</Label>
              <Input value={calFormStandard} onChange={(e) => setCalFormStandard(e.target.value)} placeholder="e.g., NIST Traceable Force Gauge" />
            </div>

            <div>
              <Label>Standard Certificate</Label>
              <Input value={calFormStdCert} onChange={(e) => setCalFormStdCert(e.target.value)} placeholder="e.g., NIST-FG-2026-0001" />
            </div>

            <div>
              <Label>Result</Label>
              <Select value={calFormResult} onValueChange={(v) => setCalFormResult(v as CalibrationResult)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="adjusted">Adjusted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Performed By</Label>
              <Input value={calFormPerformedBy} onChange={(e) => setCalFormPerformedBy(e.target.value)} placeholder="Engineer name" />
            </div>

            <div>
              <Label>As-Found Readings</Label>
              <Textarea value={calFormAsFound} onChange={(e) => setCalFormAsFound(e.target.value)} placeholder="Record the as-found condition readings..." rows={2} />
            </div>

            <div>
              <Label>As-Left Readings</Label>
              <Textarea value={calFormAsLeft} onChange={(e) => setCalFormAsLeft(e.target.value)} placeholder="Record the as-left condition readings..." rows={2} />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={calFormNotes} onChange={(e) => setCalFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCalForm(false); resetCalForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitCalibration} disabled={!calFormEquipmentId || !calFormPerformedBy || !calFormStandard}>
              Save Calibration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          NEW WORK ORDER DIALOG
         ════════════════════════════════════════════════════ */}
      <Dialog open={showMOForm} onOpenChange={(open) => { if (!open) { setShowMOForm(false); resetMOForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>Schedule a new maintenance work order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Equipment</Label>
              <Select value={moFormEquipmentId} onValueChange={setMoFormEquipmentId}>
                <SelectTrigger><SelectValue placeholder="Select equipment..." /></SelectTrigger>
                <SelectContent>
                  {allEquipment.filter((e) => e.status !== "retired").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={moFormType} onValueChange={(v) => setMoFormType(v as MaintenanceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={moFormPriority} onValueChange={(v) => setMoFormPriority(v as MaintenancePriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={moFormDescription} onChange={(e) => setMoFormDescription(e.target.value)} placeholder="Describe the maintenance task..." rows={3} />
            </div>

            <div>
              <Label>Assigned To</Label>
              <Input value={moFormAssignedTo} onChange={(e) => setMoFormAssignedTo(e.target.value)} placeholder="Engineer or service provider" />
            </div>

            <div>
              <Label>Scheduled Date</Label>
              <Input type="date" value={moFormScheduledDate} onChange={(e) => setMoFormScheduledDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowMOForm(false); resetMOForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitMO} disabled={!moFormEquipmentId || !moFormDescription || !moFormAssignedTo}>
              Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          COMPLETE WORK ORDER DIALOG
         ════════════════════════════════════════════════════ */}
      <Dialog open={showCompleteForm} onOpenChange={(open) => { if (!open) setShowCompleteForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
            <DialogDescription>Record completion details for this work order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Completion Date</Label>
              <Input type="date" value={completeDate} onChange={(e) => setCompleteDate(e.target.value)} />
            </div>

            <div>
              <Label>Downtime (hours)</Label>
              <Input type="number" value={completeDowntime} onChange={(e) => setCompleteDowntime(e.target.value)} min="0" step="0.5" />
            </div>

            <div>
              <Label>Root Cause (optional)</Label>
              <Textarea value={completeRootCause} onChange={(e) => setCompleteRootCause(e.target.value)} placeholder="Describe root cause if applicable..." rows={2} />
            </div>

            <div>
              <Label>Corrective Action (optional)</Label>
              <Textarea value={completeAction} onChange={(e) => setCompleteAction(e.target.value)} placeholder="Describe action taken..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteForm(false)}>Cancel</Button>
            <Button onClick={handleCompleteMO}>
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
