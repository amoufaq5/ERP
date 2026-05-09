"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatsCard from "@/components/shared/stats-card";
import PageHeader from "@/components/shared/page-header";
import AuditFindingsChart from "@/components/shared/audit-findings-chart";
import { cn, formatDate } from "@/lib/utils";
import {
  ClipboardCheck,
  Search,
  Plus,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Shield,
  Users,
  Target,
  BarChart3,
  TrendingUp,
  Filter,
  Link2,
} from "lucide-react";
import { auditStore } from "@/lib/quality/audit-store";
import type {
  Audit,
  AuditStatus,
  AuditType,
  AuditFinding,
  AuditChecklist,
  Auditor,
  AuditReport,
  AuditMetrics,
  FindingCategory,
  FindingStatus,
  GMPArea,
  ChecklistItem,
} from "@/lib/quality/audit-types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function daysUntil(dateStr: string): number {
  return Math.round(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// ─── Color Maps ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AuditStatus, string> = {
  planned: "bg-blue-100 text-blue-800",
  "in-progress": "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<AuditStatus, string> = {
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_COLORS: Record<AuditType, string> = {
  internal: "bg-indigo-100 text-indigo-800",
  external: "bg-purple-100 text-purple-800",
  supplier: "bg-cyan-100 text-cyan-800",
  regulatory: "bg-red-100 text-red-800",
  "self-inspection": "bg-teal-100 text-teal-800",
};

const TYPE_LABELS: Record<AuditType, string> = {
  internal: "Internal",
  external: "External",
  supplier: "Supplier",
  regulatory: "Regulatory",
  "self-inspection": "Self-Inspection",
};

const FINDING_CATEGORY_COLORS: Record<FindingCategory, string> = {
  critical: "bg-red-100 text-red-800",
  major: "bg-orange-100 text-orange-800",
  minor: "bg-yellow-100 text-yellow-800",
  observation: "bg-blue-100 text-blue-800",
  opportunity: "bg-emerald-100 text-emerald-800",
};

const FINDING_STATUS_COLORS: Record<FindingStatus, string> = {
  open: "bg-red-100 text-red-800",
  responded: "bg-amber-100 text-amber-800",
  "capa-linked": "bg-purple-100 text-purple-800",
  closed: "bg-emerald-100 text-emerald-800",
  overdue: "bg-rose-100 text-rose-800",
};

const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  responded: "Responded",
  "capa-linked": "CAPA Linked",
  closed: "Closed",
  overdue: "Overdue",
};

const GMP_AREA_LABELS: Record<GMPArea, string> = {
  documentation: "Documentation",
  facilities: "Facilities",
  equipment: "Equipment",
  personnel: "Personnel",
  production: "Production",
  "quality-control": "Quality Control",
  warehousing: "Warehousing",
  complaints: "Complaints",
};

const RATING_COLORS: Record<string, string> = {
  satisfactory: "bg-emerald-100 text-emerald-800",
  "needs-improvement": "bg-amber-100 text-amber-800",
  unsatisfactory: "bg-red-100 text-red-800",
  critical: "bg-rose-200 text-rose-900",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AuditManagementPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [activeTab, setActiveTab] = useState("audits");

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Finding filters
  const [findingCategoryFilter, setFindingCategoryFilter] = useState("all");
  const [findingStatusFilter, setFindingStatusFilter] = useState("all");
  const [findingAreaFilter, setFindingAreaFilter] = useState("all");

  // Dialogs
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newAuditOpen, setNewAuditOpen] = useState(false);
  const [addFindingOpen, setAddFindingOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("info");

  // New audit form
  const [newAuditForm, setNewAuditForm] = useState({
    title: "",
    type: "internal" as AuditType,
    scope: "",
    department: "",
    scheduledDate: "",
    leadAuditor: "",
    objectives: "",
  });

  // New finding form
  const [newFindingForm, setNewFindingForm] = useState({
    category: "minor" as FindingCategory,
    gmpArea: "documentation" as GMPArea,
    description: "",
    area: "",
    evidence: "",
    requirement: "",
    assignedTo: "",
    responseDueDate: "",
  });

  // ── Data Loading ────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    setAudits(auditStore.getAll());
    setMetrics(auditStore.getMetrics());
    setAuditors(auditStore.getAuditors());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Derived Data ────────────────────────────────────────────────────

  const departments = useMemo(
    () => [...new Set(audits.map((a) => a.department))].sort(),
    [audits]
  );

  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (deptFilter !== "all" && a.department !== deptFilter) return false;
      if (
        searchQuery &&
        !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !a.number.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [audits, typeFilter, statusFilter, deptFilter, searchQuery]);

  const allFindings = useMemo(
    () => audits.flatMap((a) => a.findings),
    [audits]
  );

  const filteredFindings = useMemo(() => {
    return allFindings.filter((f) => {
      if (findingCategoryFilter !== "all" && f.category !== findingCategoryFilter)
        return false;
      if (findingStatusFilter !== "all" && f.status !== findingStatusFilter)
        return false;
      if (findingAreaFilter !== "all" && f.gmpArea !== findingAreaFilter)
        return false;
      return true;
    });
  }, [allFindings, findingCategoryFilter, findingStatusFilter, findingAreaFilter]);

  const auditorMap = useMemo(() => {
    const map = new Map<string, Auditor>();
    auditors.forEach((a) => map.set(a.id, a));
    return map;
  }, [auditors]);

  // Aggregated scores for analytics
  const avgScoresByArea = useMemo(() => {
    const completedWithReports = audits.filter(
      (a) => a.status === "completed" && a.report
    );
    if (completedWithReports.length === 0) return [];
    const areaMap = new Map<GMPArea, number[]>();
    completedWithReports.forEach((a) => {
      a.report!.scoreByArea.forEach((s) => {
        if (!areaMap.has(s.area)) areaMap.set(s.area, []);
        areaMap.get(s.area)!.push(s.score);
      });
    });
    return Array.from(areaMap.entries()).map(([area, scores]) => ({
      area,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  }, [audits]);

  // Top recurring findings
  const recurringFindings = useMemo(() => {
    const map = new Map<string, { area: GMPArea; count: number }>();
    allFindings.forEach((f) => {
      const key = f.gmpArea;
      if (!map.has(key)) map.set(key, { area: f.gmpArea, count: 0 });
      map.get(key)!.count++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allFindings]);

  // ── Handlers ────────────────────────────────────────────────────────

  function openAuditDetail(audit: Audit) {
    setSelectedAudit(audit);
    setDetailTab("info");
    setDetailOpen(true);
  }

  function handleCreateAudit() {
    if (!newAuditForm.title || !newAuditForm.scheduledDate) return;
    const objectives = newAuditForm.objectives
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    auditStore.create({
      title: newAuditForm.title,
      type: newAuditForm.type,
      status: "planned",
      scope: newAuditForm.scope,
      department: newAuditForm.department,
      scheduledDate: new Date(newAuditForm.scheduledDate).toISOString(),
      leadAuditor: newAuditForm.leadAuditor,
      auditors: newAuditForm.leadAuditor
        ? [newAuditForm.leadAuditor]
        : [],
      objectives,
      findings: [],
      createdAt: new Date().toISOString(),
    });
    setNewAuditForm({
      title: "",
      type: "internal",
      scope: "",
      department: "",
      scheduledDate: "",
      leadAuditor: "",
      objectives: "",
    });
    setNewAuditOpen(false);
    refresh();
  }

  function handleAddFinding() {
    if (!selectedAudit || !newFindingForm.description) return;
    auditStore.addFinding(selectedAudit.id, {
      category: newFindingForm.category,
      gmpArea: newFindingForm.gmpArea,
      description: newFindingForm.description,
      area: newFindingForm.area,
      evidence: newFindingForm.evidence,
      requirement: newFindingForm.requirement,
      status: "open",
      assignedTo: newFindingForm.assignedTo || undefined,
      responseDueDate: newFindingForm.responseDueDate
        ? new Date(newFindingForm.responseDueDate).toISOString()
        : undefined,
      detectedAt: new Date().toISOString(),
    });
    setNewFindingForm({
      category: "minor",
      gmpArea: "documentation",
      description: "",
      area: "",
      evidence: "",
      requirement: "",
      assignedTo: "",
      responseDueDate: "",
    });
    setAddFindingOpen(false);
    refresh();
    // Re-select audit with updated data
    const updated = auditStore.getById(selectedAudit.id);
    if (updated) setSelectedAudit(updated);
  }

  function handleGenerateReport() {
    if (!selectedAudit) return;
    const findings = selectedAudit.findings;
    const count = {
      critical: findings.filter((f) => f.category === "critical").length,
      major: findings.filter((f) => f.category === "major").length,
      minor: findings.filter((f) => f.category === "minor").length,
      observation: findings.filter((f) => f.category === "observation").length,
      opportunity: findings.filter((f) => f.category === "opportunity").length,
    };
    let rating: AuditReport["overallRating"] = "satisfactory";
    if (count.critical > 0) rating = "critical";
    else if (count.major >= 3) rating = "unsatisfactory";
    else if (count.major > 0) rating = "needs-improvement";

    const report: AuditReport = {
      id: `rpt-${Date.now()}`,
      auditId: selectedAudit.id,
      summary: `Audit ${selectedAudit.number} completed with ${findings.length} findings identified. ${count.critical} critical, ${count.major} major, ${count.minor} minor findings.`,
      findingsCount: count,
      overallRating: rating,
      recommendations: [
        "Address all critical and major findings within specified timelines",
        "Implement preventive actions to avoid recurrence",
      ],
      scoreByArea: (
        [
          "documentation",
          "facilities",
          "equipment",
          "personnel",
          "production",
          "quality-control",
          "warehousing",
          "complaints",
        ] as GMPArea[]
      ).map((area) => ({
        area,
        score: Math.round(
          85 -
            findings.filter((f) => f.gmpArea === area).length * 5 +
            Math.random() * 10
        ),
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: "Current User",
    };

    const updated = auditStore.update(selectedAudit.id, {
      report,
      status: "completed",
      endDate: new Date().toISOString(),
    });
    if (updated) setSelectedAudit(updated);
    refresh();
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Audit Management"
        description="Plan, execute, and track GMP audits, inspections, findings, and corrective actions"
        icon={<ClipboardCheck className="h-6 w-6 text-primary" />}
      />

      {/* ── Stats Cards ───────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={ClipboardCheck}
            title="Total Audits"
            value={metrics.totalAudits}
            subtitle={`${metrics.completed} completed`}
          />
          <StatsCard
            icon={Calendar}
            title="Planned"
            value={metrics.planned}
            subtitle={`${metrics.inProgress} in progress`}
            iconColor="text-blue-500"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Open Findings"
            value={metrics.openFindings}
            subtitle={`of ${metrics.totalFindings} total`}
            iconColor="text-amber-500"
          />
          <StatsCard
            icon={Shield}
            title="Critical Findings"
            value={metrics.criticalFindings}
            subtitle="Requiring immediate action"
            iconColor="text-red-500"
          />
          <StatsCard
            icon={Target}
            title="Closure Rate"
            value={`${metrics.findingClosureRate}%`}
            subtitle="Finding closure rate"
            iconColor="text-emerald-500"
          />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 1: AUDITS                                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="audits" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs mb-1">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search audits..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-40">
                  <Label className="text-xs mb-1">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="regulatory">Regulatory</SelectItem>
                      <SelectItem value="self-inspection">Self-Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Label className="text-xs mb-1">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-44">
                  <Label className="text-xs mb-1">Department</Label>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Audits ({filteredAudits.length})
                </CardTitle>
                <Button size="sm" onClick={() => setNewAuditOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New Audit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8"
                      >
                        No audits found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudits.map((audit) => (
                      <TableRow
                        key={audit.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openAuditDetail(audit)}
                      >
                        <TableCell className="font-mono text-sm">
                          {audit.number}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate font-medium">
                          {audit.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              TYPE_COLORS[audit.type]
                            )}
                          >
                            {TYPE_LABELS[audit.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {audit.department}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(audit.scheduledDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[audit.status]
                            )}
                          >
                            {STATUS_LABELS[audit.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {audit.findings.length > 0 ? (
                            <span className="text-sm font-medium">
                              {audit.findings.length}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAuditDetail(audit);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SCHEDULE                                            */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar / Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Annual Audit Calendar
                  </CardTitle>
                  <CardDescription>
                    Audit schedule overview with status tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {audits
                      .sort(
                        (a, b) =>
                          new Date(a.scheduledDate).getTime() -
                          new Date(b.scheduledDate).getTime()
                      )
                      .map((audit) => {
                        const isPast =
                          new Date(audit.scheduledDate) < new Date();
                        const days = isPast
                          ? daysSince(audit.scheduledDate)
                          : daysUntil(audit.scheduledDate);
                        return (
                          <div
                            key={audit.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                              audit.status === "cancelled" && "opacity-50"
                            )}
                            onClick={() => openAuditDetail(audit)}
                          >
                            {/* Date badge */}
                            <div className="flex-shrink-0 w-16 text-center">
                              <div className="text-xs text-muted-foreground">
                                {new Date(audit.scheduledDate).toLocaleDateString(
                                  "en-GB",
                                  { month: "short" }
                                )}
                              </div>
                              <div className="text-lg font-bold">
                                {new Date(audit.scheduledDate).getDate()}
                              </div>
                            </div>
                            <Separator orientation="vertical" className="h-10" />
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {audit.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    TYPE_COLORS[audit.type]
                                  )}
                                >
                                  {TYPE_LABELS[audit.type]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {audit.department}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Lead:{" "}
                                  {auditorMap.get(audit.leadAuditor)?.name ??
                                    audit.leadAuditor}
                                </span>
                              </div>
                            </div>
                            {/* Status & Timeline */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  STATUS_COLORS[audit.status]
                                )}
                              >
                                {STATUS_LABELS[audit.status]}
                              </Badge>
                              {audit.status === "planned" && !isPast && (
                                <span className="text-xs text-muted-foreground">
                                  in {days}d
                                </span>
                              )}
                              {audit.status === "planned" && isPast && (
                                <span className="text-xs text-red-600 font-medium">
                                  {days}d overdue
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plan New Audit */}
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plan New Audit</CardTitle>
                  <CardDescription>
                    Schedule a new audit or inspection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={newAuditForm.title}
                      onChange={(e) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Audit title"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Audit Type</Label>
                    <Select
                      value={newAuditForm.type}
                      onValueChange={(v) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          type: v as AuditType,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="regulatory">Regulatory</SelectItem>
                        <SelectItem value="self-inspection">
                          Self-Inspection
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Scope</Label>
                    <Textarea
                      value={newAuditForm.scope}
                      onChange={(e) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          scope: e.target.value,
                        }))
                      }
                      placeholder="Audit scope description..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Input
                      value={newAuditForm.department}
                      onChange={(e) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          department: e.target.value,
                        }))
                      }
                      placeholder="Target department"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Scheduled Date</Label>
                    <Input
                      type="date"
                      value={newAuditForm.scheduledDate}
                      onChange={(e) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          scheduledDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lead Auditor</Label>
                    <Select
                      value={newAuditForm.leadAuditor}
                      onValueChange={(v) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          leadAuditor: v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select auditor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {auditors.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Objectives (one per line)
                    </Label>
                    <Textarea
                      value={newAuditForm.objectives}
                      onChange={(e) =>
                        setNewAuditForm((f) => ({
                          ...f,
                          objectives: e.target.value,
                        }))
                      }
                      placeholder="Enter audit objectives..."
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateAudit}
                    disabled={
                      !newAuditForm.title || !newAuditForm.scheduledDate
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Schedule Audit
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 3: FINDINGS                                            */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="findings" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Label className="text-xs mb-1">Severity</Label>
                  <Select
                    value={findingCategoryFilter}
                    onValueChange={setFindingCategoryFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                      <SelectItem value="opportunity">Opportunity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Label className="text-xs mb-1">Status</Label>
                  <Select
                    value={findingStatusFilter}
                    onValueChange={setFindingStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="capa-linked">CAPA Linked</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-44">
                  <Label className="text-xs mb-1">GMP Area</Label>
                  <Select
                    value={findingAreaFilter}
                    onValueChange={setFindingAreaFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {(Object.keys(GMP_AREA_LABELS) as GMPArea[]).map(
                        (area) => (
                          <SelectItem key={area} value={area}>
                            {GMP_AREA_LABELS[area]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Findings Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                All Findings ({filteredFindings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finding #</TableHead>
                    <TableHead>Audit</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>GMP Area</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CAPA</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFindings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8"
                      >
                        No findings match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFindings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">
                          {f.findingNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.auditNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              FINDING_CATEGORY_COLORS[f.category]
                            )}
                          >
                            {f.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {GMP_AREA_LABELS[f.gmpArea]}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm">
                          {f.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              FINDING_STATUS_COLORS[f.status]
                            )}
                          >
                            {FINDING_STATUS_LABELS[f.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {f.capaNumber ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-purple-700"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              {f.capaNumber}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {f.responseDueDate ? (
                            <span
                              className={cn(
                                new Date(f.responseDueDate) < new Date() &&
                                  f.status !== "closed" &&
                                  f.status !== "capa-linked"
                                  ? "text-red-600 font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatDate(f.responseDueDate)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 4: ANALYTICS                                           */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Findings by Category & Closure Rate */}
              <AuditFindingsChart
                findingsByCategory={metrics.findingsByCategory}
                closureRate={metrics.findingClosureRate}
                scoresByArea={avgScoresByArea}
                quarterlyTrend={metrics.quarterlyTrend}
              />

              {/* Right column analytics */}
              <div className="space-y-4">
                {/* Finding Distribution by GMP Area */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Findings by GMP Area
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.findingsByGMPArea
                        .sort((a, b) => b.count - a.count)
                        .map((item) => {
                          const maxCount = Math.max(
                            ...metrics.findingsByGMPArea.map((i) => i.count),
                            1
                          );
                          return (
                            <div
                              key={item.area}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm w-28">
                                {GMP_AREA_LABELS[item.area]}
                              </span>
                              <div className="flex items-center gap-2 flex-1 ml-2">
                                <div className="h-2.5 bg-muted rounded-full flex-1 overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{
                                      width: `${(item.count / maxCount) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-6 text-right">
                                  {item.count}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Score Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Audit Score Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {audits
                        .filter((a) => a.report)
                        .map((audit) => (
                          <div key={audit.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium truncate max-w-[200px]">
                                {audit.number}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  RATING_COLORS[
                                    audit.report!.overallRating
                                  ] ?? ""
                                )}
                              >
                                {audit.report!.overallRating.replace("-", " ")}
                              </Badge>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              {(() => {
                                const avgScore =
                                  audit.report!.scoreByArea.reduce(
                                    (s, a) => s + a.score,
                                    0
                                  ) / audit.report!.scoreByArea.length;
                                return (
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      avgScore >= 85
                                        ? "bg-emerald-500"
                                        : avgScore >= 70
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    )}
                                    style={{
                                      width: `${avgScore}%`,
                                    }}
                                  />
                                );
                              })()}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {audit.title}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Closure Time Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Closure Time Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const closedFindings = allFindings.filter(
                        (f) => f.status === "closed" && f.closedAt
                      );
                      if (closedFindings.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No closed findings to analyze
                          </p>
                        );
                      }
                      const closureDays = closedFindings.map((f) =>
                        Math.round(
                          (new Date(f.closedAt!).getTime() -
                            new Date(f.detectedAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      );
                      const avg = Math.round(
                        closureDays.reduce((a, b) => a + b, 0) /
                          closureDays.length
                      );
                      const min = Math.min(...closureDays);
                      const max = Math.max(...closureDays);
                      return (
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-emerald-600">
                              {min}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min (days)
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-amber-600">
                              {avg}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Avg (days)
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-600">
                              {max}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Max (days)
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Top Recurring Findings */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Top Recurring Finding Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recurringFindings.map((item, i) => (
                        <div
                          key={item.area}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">
                              #{i + 1}
                            </span>
                            <span className="text-sm">
                              {GMP_AREA_LABELS[item.area]}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {item.count} findings
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* AUDIT DETAIL DIALOG                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  {selectedAudit.number} - {selectedAudit.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", TYPE_COLORS[selectedAudit.type])}
                >
                  {TYPE_LABELS[selectedAudit.type]}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    STATUS_COLORS[selectedAudit.status]
                  )}
                >
                  {STATUS_LABELS[selectedAudit.status]}
                </Badge>
                {selectedAudit.report && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      RATING_COLORS[selectedAudit.report.overallRating] ?? ""
                    )}
                  >
                    {selectedAudit.report.overallRating.replace("-", " ")}
                  </Badge>
                )}
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="checklist">Checklist</TabsTrigger>
                  <TabsTrigger value="findings">
                    Findings ({selectedAudit.findings.length})
                  </TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>

                {/* ── Info Tab ──────────────────────────────────────── */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Department
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedAudit.department}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Scheduled Date
                      </Label>
                      <p className="text-sm font-medium">
                        {formatDate(selectedAudit.scheduledDate)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Start Date
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedAudit.startDate
                          ? formatDate(selectedAudit.startDate)
                          : "--"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        End Date
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedAudit.endDate
                          ? formatDate(selectedAudit.endDate)
                          : "--"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Lead Auditor
                      </Label>
                      <p className="text-sm font-medium">
                        {auditorMap.get(selectedAudit.leadAuditor)?.name ??
                          selectedAudit.leadAuditor}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Audit Team
                      </Label>
                      <p className="text-sm">
                        {selectedAudit.auditors
                          .map(
                            (id) =>
                              auditorMap.get(id)?.name ?? id
                          )
                          .join(", ")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Scope
                    </Label>
                    <p className="text-sm mt-1">{selectedAudit.scope}</p>
                  </div>

                  {selectedAudit.objectives.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Objectives
                      </Label>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {selectedAudit.objectives.map((obj, i) => (
                          <li key={i} className="text-sm">
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                {/* ── Checklist Tab ─────────────────────────────────── */}
                <TabsContent value="checklist" className="mt-4">
                  {selectedAudit.checklist ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {selectedAudit.checklist.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {selectedAudit.checklist.items.length} items
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>GMP Area</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Requirement</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedAudit.checklist.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs">
                                {GMP_AREA_LABELS[item.gmpArea]}
                              </TableCell>
                              <TableCell className="text-sm max-w-[250px]">
                                {item.question}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                                {item.requirement}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    item.status === "conforming"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item.status === "non-conforming"
                                      ? "bg-red-100 text-red-800"
                                      : item.status === "not-applicable"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-slate-100 text-slate-800"
                                  )}
                                >
                                  {item.status.replace("-", " ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        No checklist assigned to this audit
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Findings Tab ──────────────────────────────────── */}
                <TabsContent value="findings" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedAudit.findings.length} findings
                    </p>
                    {(selectedAudit.status === "in-progress" ||
                      selectedAudit.status === "completed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddFindingOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Finding
                      </Button>
                    )}
                  </div>

                  {selectedAudit.findings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Finding #</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>CAPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAudit.findings.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">
                              {f.findingNumber}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  FINDING_CATEGORY_COLORS[f.category]
                                )}
                              >
                                {f.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {GMP_AREA_LABELS[f.gmpArea]}
                            </TableCell>
                            <TableCell className="text-sm max-w-[250px]">
                              <div className="truncate">{f.description}</div>
                              {f.response && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  Response: {f.response}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  FINDING_STATUS_COLORS[f.status]
                                )}
                              >
                                {FINDING_STATUS_LABELS[f.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {f.capaNumber ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-purple-700"
                                >
                                  <Link2 className="h-3 w-3 mr-1" />
                                  {f.capaNumber}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  --
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No findings recorded yet</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Report Tab ────────────────────────────────────── */}
                <TabsContent value="report" className="mt-4 space-y-4">
                  {selectedAudit.report ? (
                    <>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Summary
                              </Label>
                              <p className="text-sm mt-1">
                                {selectedAudit.report.summary}
                              </p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-5 gap-4 text-center">
                              {(
                                [
                                  "critical",
                                  "major",
                                  "minor",
                                  "observation",
                                  "opportunity",
                                ] as const
                              ).map((cat) => (
                                <div key={cat}>
                                  <div
                                    className={cn(
                                      "text-xl font-bold",
                                      cat === "critical"
                                        ? "text-red-600"
                                        : cat === "major"
                                        ? "text-orange-600"
                                        : cat === "minor"
                                        ? "text-yellow-600"
                                        : cat === "observation"
                                        ? "text-blue-600"
                                        : "text-emerald-600"
                                    )}
                                  >
                                    {selectedAudit.report!.findingsCount[cat]}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground capitalize">
                                    {cat}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Separator />
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Recommendations
                              </Label>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {selectedAudit.report.recommendations.map(
                                  (r, i) => (
                                    <li key={i} className="text-sm">
                                      {r}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Generated:{" "}
                                {formatDate(selectedAudit.report.generatedAt)}
                              </span>
                              <span>
                                By: {selectedAudit.report.generatedBy}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Score by area in report */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Score by GMP Area
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedAudit.report.scoreByArea.map((s) => (
                              <div
                                key={s.area}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm w-28">
                                  {GMP_AREA_LABELS[s.area]}
                                </span>
                                <div className="flex items-center gap-2 flex-1 ml-2">
                                  <div className="h-2 bg-muted rounded-full flex-1 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        s.score >= 85
                                          ? "bg-emerald-500"
                                          : s.score >= 70
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                      )}
                                      style={{ width: `${s.score}%` }}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      "text-sm font-medium w-10 text-right",
                                      s.score >= 85
                                        ? "text-emerald-600"
                                        : s.score >= 70
                                        ? "text-amber-600"
                                        : "text-red-600"
                                    )}
                                  >
                                    {s.score}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground mb-3">
                        No report generated yet
                      </p>
                      {(selectedAudit.status === "in-progress" ||
                        selectedAudit.status === "completed") &&
                        selectedAudit.findings.length > 0 && (
                          <Button size="sm" onClick={handleGenerateReport}>
                            <FileText className="h-4 w-4 mr-1" /> Generate
                            Report
                          </Button>
                        )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* NEW AUDIT DIALOG                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={newAuditOpen} onOpenChange={setNewAuditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule New Audit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={newAuditForm.title}
                onChange={(e) =>
                  setNewAuditForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Audit title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={newAuditForm.type}
                  onValueChange={(v) =>
                    setNewAuditForm((f) => ({
                      ...f,
                      type: v as AuditType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="self-inspection">
                      Self-Inspection
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Scheduled Date *</Label>
                <Input
                  type="date"
                  value={newAuditForm.scheduledDate}
                  onChange={(e) =>
                    setNewAuditForm((f) => ({
                      ...f,
                      scheduledDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input
                value={newAuditForm.department}
                onChange={(e) =>
                  setNewAuditForm((f) => ({
                    ...f,
                    department: e.target.value,
                  }))
                }
                placeholder="Target department"
              />
            </div>
            <div>
              <Label className="text-xs">Scope</Label>
              <Textarea
                value={newAuditForm.scope}
                onChange={(e) =>
                  setNewAuditForm((f) => ({ ...f, scope: e.target.value }))
                }
                placeholder="Describe audit scope..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Lead Auditor</Label>
              <Select
                value={newAuditForm.leadAuditor}
                onValueChange={(v) =>
                  setNewAuditForm((f) => ({ ...f, leadAuditor: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead auditor..." />
                </SelectTrigger>
                <SelectContent>
                  {auditors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} - {a.qualification}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Objectives (one per line)</Label>
              <Textarea
                value={newAuditForm.objectives}
                onChange={(e) =>
                  setNewAuditForm((f) => ({
                    ...f,
                    objectives: e.target.value,
                  }))
                }
                placeholder="Enter audit objectives..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setNewAuditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAudit}
                disabled={
                  !newAuditForm.title || !newAuditForm.scheduledDate
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Create Audit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ADD FINDING DIALOG                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addFindingOpen} onOpenChange={setAddFindingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Finding</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category *</Label>
                <Select
                  value={newFindingForm.category}
                  onValueChange={(v) =>
                    setNewFindingForm((f) => ({
                      ...f,
                      category: v as FindingCategory,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GMP Area *</Label>
                <Select
                  value={newFindingForm.gmpArea}
                  onValueChange={(v) =>
                    setNewFindingForm((f) => ({
                      ...f,
                      gmpArea: v as GMPArea,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GMP_AREA_LABELS) as GMPArea[]).map(
                      (area) => (
                        <SelectItem key={area} value={area}>
                          {GMP_AREA_LABELS[area]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={newFindingForm.description}
                onChange={(e) =>
                  setNewFindingForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the finding..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Area / Location</Label>
              <Input
                value={newFindingForm.area}
                onChange={(e) =>
                  setNewFindingForm((f) => ({
                    ...f,
                    area: e.target.value,
                  }))
                }
                placeholder="Where was this finding observed?"
              />
            </div>
            <div>
              <Label className="text-xs">Evidence</Label>
              <Textarea
                value={newFindingForm.evidence}
                onChange={(e) =>
                  setNewFindingForm((f) => ({
                    ...f,
                    evidence: e.target.value,
                  }))
                }
                placeholder="What evidence supports this finding?"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Requirement Reference</Label>
              <Input
                value={newFindingForm.requirement}
                onChange={(e) =>
                  setNewFindingForm((f) => ({
                    ...f,
                    requirement: e.target.value,
                  }))
                }
                placeholder="e.g. WHO TRS 986 Section 15.25"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Input
                  value={newFindingForm.assignedTo}
                  onChange={(e) =>
                    setNewFindingForm((f) => ({
                      ...f,
                      assignedTo: e.target.value,
                    }))
                  }
                  placeholder="Responsible person"
                />
              </div>
              <div>
                <Label className="text-xs">Response Due Date</Label>
                <Input
                  type="date"
                  value={newFindingForm.responseDueDate}
                  onChange={(e) =>
                    setNewFindingForm((f) => ({
                      ...f,
                      responseDueDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setAddFindingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFinding}
                disabled={!newFindingForm.description}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Finding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
