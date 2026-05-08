"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import TrainingMatrixGrid from "@/components/shared/training-matrix-grid";
import { cn } from "@/lib/utils";
import { trainingStore } from "@/lib/quality/training-store";
import type {
  TrainingRecord,
  TrainingSession,
  TrainingMatrixCell,
  TrainingMetrics,
  TrainingStatus,
  TrainingType,
  CompetencyLevel,
} from "@/lib/quality/training-types";
import {
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  CalendarDays,
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  BookOpen,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  FileText,
  MapPin,
  User,
  Calendar,
} from "lucide-react";

/* ─── helpers ─── */

function formatDate(iso?: string): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(
  status: TrainingStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "overdue":
    case "expired":
      return "destructive";
    case "in-progress":
    case "scheduled":
      return "secondary";
    default:
      return "outline";
  }
}

function statusLabel(status: TrainingStatus): string {
  const map: Record<TrainingStatus, string> = {
    scheduled: "Scheduled",
    "in-progress": "In Progress",
    completed: "Completed",
    overdue: "Overdue",
    expired: "Expired",
  };
  return map[status] || status;
}

function typeLabel(t: TrainingType): string {
  const map: Record<TrainingType, string> = {
    initial: "Initial",
    refresher: "Refresher",
    retraining: "Retraining",
    "on-the-job": "On-the-Job",
  };
  return map[t] || t;
}

function competencyLabel(level: CompetencyLevel): string {
  const map: Record<CompetencyLevel, string> = {
    "not-trained": "Not Trained",
    "in-training": "In Training",
    competent: "Competent",
    expert: "Expert",
  };
  return map[level] || level;
}

function sessionStatusVariant(
  s: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    case "in-progress":
      return "secondary";
    default:
      return "outline";
  }
}

/* ─── page component ─── */

export default function TrainingMatrixPage() {
  /* ─── state ─── */
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [matrixCells, setMatrixCells] = useState<TrainingMatrixCell[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("matrix");

  // Filters
  const [recordSearch, setRecordSearch] = useState("");
  const [recordStatusFilter, setRecordStatusFilter] = useState<string>("all");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [recordDeptFilter, setRecordDeptFilter] = useState<string>("all");
  const [matrixRoleFilter, setMatrixRoleFilter] = useState<string>("all");
  const [matrixDeptFilter, setMatrixDeptFilter] = useState<string>("all");
  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");

  // Record detail
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [completeScore, setCompleteScore] = useState<string>("");

  // New session form
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    documentId: "",
    trainer: "",
    scheduledDate: "",
    startTime: "09:00",
    endTime: "12:00",
    location: "",
    maxAttendees: 20,
    attendeeIds: [] as string[],
  });

  // Sort
  const [sortField, setSortField] = useState<string>("employeeName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /* ─── data loading ─── */
  const reload = useCallback(() => {
    setRecords(trainingStore.getAllRecords());
    setSessions(trainingStore.getAllSessions());
    setMatrixCells(trainingStore.getMatrixData());
    setMetrics(trainingStore.getMetrics());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const employees = useMemo(() => trainingStore.getEmployees(), []);
  const sops = useMemo(() => trainingStore.getSOPs(), []);
  const roles = useMemo(() => trainingStore.getRoles(), []);
  const departments = useMemo(() => trainingStore.getDepartments(), []);

  /* ─── filtered records ─── */
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (recordSearch) {
      const q = recordSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.documentTitle.toLowerCase().includes(q) ||
          r.documentId.toLowerCase().includes(q) ||
          r.trainer.toLowerCase().includes(q)
      );
    }
    if (recordStatusFilter !== "all") {
      result = result.filter((r) => r.status === recordStatusFilter);
    }
    if (recordTypeFilter !== "all") {
      result = result.filter((r) => r.trainingType === recordTypeFilter);
    }
    if (recordDeptFilter !== "all") {
      result = result.filter((r) => r.department === recordDeptFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aRec = a as unknown as Record<string, unknown>;
      const bRec = b as unknown as Record<string, unknown>;
      const aStr = String(aRec[sortField] ?? "");
      const bStr = String(bRec[sortField] ?? "");
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [records, recordSearch, recordStatusFilter, recordTypeFilter, recordDeptFilter, sortField, sortDir]);

  /* ─── filtered matrix cells ─── */
  const filteredMatrixCells = useMemo(() => {
    let result = matrixCells;
    if (matrixRoleFilter !== "all") {
      result = result.filter((c) => c.employeeRole === matrixRoleFilter);
    }
    if (matrixDeptFilter !== "all") {
      result = result.filter((c) => c.department === matrixDeptFilter);
    }
    return result;
  }, [matrixCells, matrixRoleFilter, matrixDeptFilter]);

  /* ─── session lists ─── */
  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "planned" || s.status === "in-progress")
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [sessions]
  );
  const pastSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed" || s.status === "cancelled")
        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()),
    [sessions]
  );

  /* ─── handlers ─── */
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="inline h-3 w-3 ml-0.5" />
    ) : (
      <ChevronDown className="inline h-3 w-3 ml-0.5" />
    );
  };

  const handleCompleteTraining = () => {
    if (!selectedRecord || !completeScore) return;
    const score = parseInt(completeScore, 10);
    if (isNaN(score) || score < 0 || score > 100) return;
    trainingStore.completeTraining(selectedRecord.id, score);
    setSelectedRecord(null);
    setCompleteScore("");
    reload();
  };

  const handleMatrixCellClick = (cell: TrainingMatrixCell) => {
    if (cell.recordId) {
      const rec = trainingStore.getRecordById(cell.recordId);
      if (rec) setSelectedRecord(rec);
    }
  };

  const handleCreateSession = () => {
    if (!newSession.title || !newSession.documentId || !newSession.scheduledDate) return;
    const sop = sops.find((s) => s.id === newSession.documentId);
    const selectedEmps = employees.filter((e) =>
      newSession.attendeeIds.includes(e.id)
    );
    trainingStore.createSession({
      title: newSession.title,
      documentId: newSession.documentId,
      documentTitle: sop?.title || newSession.documentId,
      trainingType: "refresher",
      trainer: newSession.trainer,
      scheduledDate: newSession.scheduledDate,
      startTime: newSession.startTime,
      endTime: newSession.endTime,
      location: newSession.location,
      maxAttendees: newSession.maxAttendees,
      attendeeIds: newSession.attendeeIds,
      attendeeNames: selectedEmps.map((e) => e.name),
      status: "planned",
    });
    setShowNewSession(false);
    setNewSession({
      title: "",
      documentId: "",
      trainer: "",
      scheduledDate: "",
      startTime: "09:00",
      endTime: "12:00",
      location: "",
      maxAttendees: 20,
      attendeeIds: [],
    });
    reload();
  };

  const handleExportMatrix = () => {
    const header = ["Employee", "Role", "Department", ...sops.map((s) => s.title)];
    const csvRows = [header.join(",")];
    for (const emp of employees) {
      const row = [emp.name, emp.role, emp.department];
      for (const sop of sops) {
        const cell = matrixCells.find(
          (c) => c.employeeId === emp.id && c.documentId === sop.id
        );
        row.push(cell ? statusLabel(cell.status as TrainingStatus) : "N/A");
      }
      csvRows.push(row.map((v) => `"${v}"`).join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-matrix-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleAttendee = (empId: string) => {
    setNewSession((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(empId)
        ? prev.attendeeIds.filter((id) => id !== empId)
        : [...prev.attendeeIds, empId],
    }));
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading training data...</div>
      </div>
    );
  }

  /* ─── render ─── */
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <PageHeader
        title="Training Matrix"
        description="Manage employee training records, track competencies, and ensure GMP compliance across all departments."
        icon={<GraduationCap className="h-6 w-6 text-primary" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={ClipboardCheck}
          title="Total Requirements"
          value={metrics.totalRequirements}
          subtitle={`${metrics.totalRecords} training records`}
        />
        <StatsCard
          icon={Target}
          title="Compliance Rate"
          value={`${metrics.complianceRate}%`}
          subtitle={`${metrics.completedCount} of ${metrics.totalRecords} completed`}
          iconColor={
            metrics.complianceRate >= 80
              ? "bg-green-100 text-green-700"
              : metrics.complianceRate >= 60
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }
        />
        <StatsCard
          icon={AlertTriangle}
          title="Overdue"
          value={metrics.overdueCount}
          subtitle="Require immediate action"
          iconColor="bg-red-100 text-red-700"
        />
        <StatsCard
          icon={Clock}
          title="Expiring < 30d"
          value={metrics.expiringIn30Days}
          subtitle="Schedule refresher training"
          iconColor="bg-amber-100 text-amber-700"
        />
        <StatsCard
          icon={CalendarDays}
          title="Sessions Scheduled"
          value={metrics.scheduledSessions}
          subtitle={`${metrics.trainingHoursThisMonth}h this month`}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="matrix" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Matrix
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ MATRIX TAB ═══════════════════ */}
        <TabsContent value="matrix" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={matrixRoleFilter}
                onChange={(e) => setMatrixRoleFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={matrixDeptFilter}
                onChange={(e) => setMatrixDeptFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportMatrix} className="gap-1.5">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <TrainingMatrixGrid
            cells={filteredMatrixCells}
            onCellClick={handleMatrixCellClick}
          />
        </TabsContent>

        {/* ═══════════════════ RECORDS TAB ═══════════════════ */}
        <TabsContent value="records" className="space-y-4">
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, SOP, trainer..."
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm"
              />
            </div>
            <select
              value={recordStatusFilter}
              onChange={(e) => setRecordStatusFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="overdue">Overdue</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="initial">Initial</option>
              <option value="refresher">Refresher</option>
              <option value="retraining">Retraining</option>
              <option value="on-the-job">On-the-Job</option>
            </select>
            <select
              value={recordDeptFilter}
              onChange={(e) => setRecordDeptFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Badge variant="outline" className="ml-auto">
              {filteredRecords.length} records
            </Badge>
          </div>

          {/* Records table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("employeeName")}
                      >
                        Employee <SortIcon field="employeeName" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("documentTitle")}
                      >
                        Document/SOP <SortIcon field="documentTitle" />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("status")}
                      >
                        Status <SortIcon field="status" />
                      </TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("scheduledDate")}
                      >
                        Scheduled <SortIcon field="scheduledDate" />
                      </TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((rec) => (
                      <TableRow
                        key={rec.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          selectedRecord?.id === rec.id && "bg-muted"
                        )}
                        onClick={() => setSelectedRecord(rec)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{rec.employeeName}</div>
                            <div className="text-xs text-muted-foreground">
                              {rec.employeeRole}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{rec.documentTitle}</div>
                            <div className="text-xs text-muted-foreground">{rec.documentId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {typeLabel(rec.trainingType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(rec.status)} className="text-xs">
                            {statusLabel(rec.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{rec.trainer}</TableCell>
                        <TableCell className="text-sm">{formatDate(rec.scheduledDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(rec.completionDate)}</TableCell>
                        <TableCell className="text-sm">
                          {rec.expiryDate ? (
                            <span
                              className={cn(
                                rec.status === "expired" && "text-red-600 font-medium",
                                rec.expiryDate &&
                                  new Date(rec.expiryDate) > new Date() &&
                                  new Date(rec.expiryDate).getTime() - Date.now() <
                                    30 * 24 * 60 * 60 * 1000 &&
                                  "text-amber-600 font-medium"
                              )}
                            >
                              {formatDate(rec.expiryDate)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {rec.assessmentScore != null ? (
                            <span
                              className={cn(
                                "font-semibold text-sm",
                                rec.assessmentScore >= rec.assessmentPassMark
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {rec.assessmentScore}%
                            </span>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(rec.status === "scheduled" ||
                            rec.status === "in-progress" ||
                            rec.status === "overdue") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecord(rec);
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No training records match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Selected record detail / Complete action */}
          {selectedRecord && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Training Record Detail</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRecord(null);
                      setCompleteScore("");
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedRecord.employeeName}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {selectedRecord.employeeRole} &middot; {selectedRecord.department}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedRecord.documentTitle}</span>
                    </div>
                    <div className="text-muted-foreground">{selectedRecord.documentId}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={statusVariant(selectedRecord.status)}>
                        {statusLabel(selectedRecord.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Competency:</span>
                      <span className="font-medium">
                        {competencyLabel(selectedRecord.competencyLevel)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Training Type</div>
                    <div className="font-medium">{typeLabel(selectedRecord.trainingType)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Trainer</div>
                    <div className="font-medium">{selectedRecord.trainer}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Scheduled</div>
                    <div className="font-medium">{formatDate(selectedRecord.scheduledDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Assessment Score</div>
                    <div className="font-medium">
                      {selectedRecord.assessmentScore != null
                        ? `${selectedRecord.assessmentScore}% (pass: ${selectedRecord.assessmentPassMark}%)`
                        : "Not assessed"}
                    </div>
                  </div>
                </div>

                {/* Complete training form */}
                {(selectedRecord.status === "scheduled" ||
                  selectedRecord.status === "in-progress" ||
                  selectedRecord.status === "overdue") && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-end gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Assessment Score (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={completeScore}
                          onChange={(e) => setCompleteScore(e.target.value)}
                          placeholder="e.g. 85"
                          className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleCompleteTraining}
                        disabled={!completeScore}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as Completed
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════ SESSIONS TAB ═══════════════════ */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={sessionTab === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionTab("upcoming")}
              >
                Upcoming ({upcomingSessions.length})
              </Button>
              <Button
                variant={sessionTab === "past" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionTab("past")}
              >
                Past ({pastSessions.length})
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewSession(!showNewSession)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Schedule Session
            </Button>
          </div>

          {/* New session form */}
          {showNewSession && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Schedule New Training Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Session Title *</label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="e.g. Annual GMP Refresher"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">SOP/Document *</label>
                    <select
                      value={newSession.documentId}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, documentId: e.target.value }))
                      }
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Select document...</option>
                      {sops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} - {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Trainer</label>
                    <input
                      type="text"
                      value={newSession.trainer}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, trainer: e.target.value }))
                      }
                      placeholder="Trainer name"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date *</label>
                    <input
                      type="date"
                      value={newSession.scheduledDate}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, scheduledDate: e.target.value }))
                      }
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={newSession.startTime}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, startTime: e.target.value }))
                      }
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">End Time</label>
                    <input
                      type="time"
                      value={newSession.endTime}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, endTime: e.target.value }))
                      }
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location</label>
                    <input
                      type="text"
                      value={newSession.location}
                      onChange={(e) =>
                        setNewSession((p) => ({ ...p, location: e.target.value }))
                      }
                      placeholder="e.g. Training Room A"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Attendees</label>
                    <input
                      type="number"
                      min={1}
                      value={newSession.maxAttendees}
                      onChange={(e) =>
                        setNewSession((p) => ({
                          ...p,
                          maxAttendees: parseInt(e.target.value, 10) || 20,
                        }))
                      }
                      className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                {/* Attendee selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Attendees ({newSession.attendeeIds.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleAttendee(emp.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors",
                          newSession.attendeeIds.includes(emp.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center",
                            newSession.attendeeIds.includes(emp.id)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {newSession.attendeeIds.includes(emp.id) && (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium leading-tight">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewSession(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateSession}
                    disabled={
                      !newSession.title || !newSession.documentId || !newSession.scheduledDate
                    }
                  >
                    Create Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions list */}
          <div className="grid gap-4">
            {(sessionTab === "upcoming" ? upcomingSessions : pastSessions).map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{session.title}</h3>
                        <Badge variant={sessionStatusVariant(session.status)} className="text-xs">
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabel(session.trainingType)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {session.documentId} - {session.documentTitle}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {session.trainer}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(session.scheduledDate)} {session.startTime}-{session.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {session.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {session.attendeeNames.length}/{session.maxAttendees} attendees
                        </span>
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground italic">{session.notes}</p>
                      )}
                      {/* Attendee list */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {session.attendeeNames.map((name) => (
                          <Badge key={name} variant="secondary" className="text-[10px]">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(sessionTab === "upcoming" ? upcomingSessions : pastSessions).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {sessionTab === "upcoming"
                    ? "No upcoming training sessions scheduled."
                    : "No past training sessions found."}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════ ANALYTICS TAB ═══════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{metrics.avgAssessmentScore}%</div>
                <div className="text-sm text-muted-foreground mt-1">Avg. Assessment Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{metrics.trainingHoursThisYear}h</div>
                <div className="text-sm text-muted-foreground mt-1">Training Hours (YTD)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{metrics.completedCount}</div>
                <div className="text-sm text-muted-foreground mt-1">Trainings Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{metrics.overdueCount}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Overdue</div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance by Department */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Compliance by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.byDepartment.map((dept) => (
                  <div key={dept.department}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{dept.department}</span>
                      <span className="text-sm">
                        <span
                          className={cn(
                            "font-semibold",
                            dept.compliance >= 80
                              ? "text-green-600"
                              : dept.compliance >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {dept.compliance}%
                        </span>
                        <span className="text-muted-foreground ml-1">
                          ({dept.completed}/{dept.total})
                        </span>
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          dept.compliance >= 80
                            ? "bg-green-500"
                            : dept.compliance >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${dept.compliance}%` }}
                      />
                    </div>
                  </div>
                ))}
                {metrics.byDepartment.length === 0 && (
                  <p className="text-sm text-muted-foreground">No department data available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compliance by Role */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Compliance by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.byRole.map((r) => (
                    <div key={r.role}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{r.role}</span>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            r.compliance >= 80
                              ? "text-green-600"
                              : r.compliance >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {r.compliance}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            r.compliance >= 80
                              ? "bg-green-500"
                              : r.compliance >= 60
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${r.compliance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competency Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Competency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.competencyDistribution.map((cd) => {
                    const total = metrics.totalRecords || 1;
                    const pct = Math.round((cd.count / total) * 100);
                    const colorMap: Record<CompetencyLevel, string> = {
                      expert: "bg-emerald-500",
                      competent: "bg-green-500",
                      "in-training": "bg-blue-500",
                      "not-trained": "bg-gray-400",
                    };
                    return (
                      <div key={cd.level}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize">
                            {competencyLabel(cd.level)}
                          </span>
                          <span className="text-sm font-medium">
                            {cd.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", colorMap[cd.level])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overdue by Department */}
          {metrics.overdueByDepartment.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue Training by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.overdueByDepartment.map((d) => (
                    <div
                      key={d.department}
                      className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-center"
                    >
                      <div className="text-2xl font-bold text-red-600">{d.count}</div>
                      <div className="text-xs text-muted-foreground mt-1">{d.department}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Training Gap Analysis: SOP-level compliance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gap Analysis by SOP/Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SOP/Document</TableHead>
                      <TableHead className="text-center">Total Required</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Compliance</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.byDocument
                      .sort((a, b) => a.compliance - b.compliance)
                      .map((doc) => (
                        <TableRow key={doc.documentId}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{doc.documentTitle}</div>
                              <div className="text-xs text-muted-foreground">{doc.documentId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{doc.total}</TableCell>
                          <TableCell className="text-center">{doc.completed}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "font-semibold",
                                doc.compliance >= 80
                                  ? "text-green-600"
                                  : doc.compliance >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                              )}
                            >
                              {doc.compliance}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  doc.compliance >= 80
                                    ? "bg-green-500"
                                    : doc.compliance >= 60
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${doc.compliance}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Training Hours Trend (CSS bar chart) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Training Hours (Estimate)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {Array.from({ length: 6 }).map((_, i) => {
                  const monthDate = new Date();
                  monthDate.setMonth(monthDate.getMonth() - (5 - i));
                  const month = monthDate.toLocaleDateString("en-GB", { month: "short" });
                  // Simulated data based on index
                  const hours = [18, 24, 15, 30, 21, metrics.trainingHoursThisMonth || 12][i];
                  const maxH = 36;
                  const pct = (hours / maxH) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {hours}h
                      </span>
                      <div
                        className="w-full bg-primary/80 rounded-t-sm"
                        style={{ height: `${pct}%`, minHeight: 4 }}
                        title={`${month}: ${hours} hours`}
                      />
                      <span className="text-[10px] text-muted-foreground">{month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
