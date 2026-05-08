"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatsCard from "@/components/shared/stats-card";
import PageHeader from "@/components/shared/page-header";
import CAPAWorkflow from "@/components/shared/capa-workflow";
import { PieChartWidget, BarChartWidget } from "@/components/shared/charts";
import { cn } from "@/lib/utils";
import { capaStore } from "@/lib/quality/capa-store";
import type {
  CAPARecord,
  CAPAStatus,
  CAPASource,
  CAPAType,
  CAPAPriority,
  CAPAAction,
  CAPAMetrics,
  ActionStatus,
  RootCauseMethod,
  EffectivenessCheck,
} from "@/lib/quality/capa-types";
import {
  Shield,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  X,
  Eye,
  ArrowRight,
  Target,
  ClipboardCheck,
  FileWarning,
  Activity,
  Calendar,
  User,
  ChevronRight,
  ListChecks,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CAPAStatus, string> = {
  initiated: "Initiated",
  investigation: "Investigation",
  "action-plan": "Action Plan",
  implementation: "Implementation",
  verification: "Verification",
  "effectiveness-check": "Effectiveness Check",
  closed: "Closed",
};

const STATUS_COLORS: Record<CAPAStatus, string> = {
  initiated: "bg-gray-100 text-gray-800",
  investigation: "bg-blue-100 text-blue-800",
  "action-plan": "bg-purple-100 text-purple-800",
  implementation: "bg-orange-100 text-orange-800",
  verification: "bg-cyan-100 text-cyan-800",
  "effectiveness-check": "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-800",
};

const PRIORITY_LABELS: Record<CAPAPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const PRIORITY_COLORS: Record<CAPAPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const SOURCE_LABELS: Record<CAPASource, string> = {
  deviation: "Deviation",
  OOS: "OOS",
  audit: "Audit",
  complaint: "Complaint",
  recall: "Recall",
  "self-inspection": "Self-Inspection",
};

const SOURCE_COLORS: Record<CAPASource, string> = {
  deviation: "bg-red-100 text-red-800",
  OOS: "bg-purple-100 text-purple-800",
  audit: "bg-blue-100 text-blue-800",
  complaint: "bg-amber-100 text-amber-800",
  recall: "bg-rose-100 text-rose-800",
  "self-inspection": "bg-teal-100 text-teal-800",
};

const TYPE_LABELS: Record<CAPAType, string> = {
  corrective: "Corrective",
  preventive: "Preventive",
  both: "Both",
};

const TYPE_COLORS: Record<CAPAType, string> = {
  corrective: "bg-red-50 text-red-700",
  preventive: "bg-green-50 text-green-700",
  both: "bg-violet-50 text-violet-700",
};

const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

const ROOT_CAUSE_LABELS: Record<RootCauseMethod, string> = {
  "5-why": "5-Why Analysis",
  fishbone: "Fishbone (Ishikawa)",
  "fault-tree": "Fault Tree Analysis",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function getEffectiveActionStatus(action: CAPAAction): ActionStatus {
  if (action.status === "completed") return "completed";
  if (isOverdue(action.dueDate)) return "overdue";
  return action.status;
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function CAPAPage() {
  const [capas, setCAPAs] = useState<CAPARecord[]>([]);
  const [metrics, setMetrics] = useState<CAPAMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("capas");
  const [selectedCapa, setSelectedCapa] = useState<CAPARecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters for CAPAs tab
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Action Tracker filters
  const [actionAssigneeFilter, setActionAssigneeFilter] = useState<string>("all");
  const [actionStatusFilter, setActionStatusFilter] = useState<string>("all");
  const [actionDueFilter, setActionDueFilter] = useState<string>("all");

  // New CAPA form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSource, setNewSource] = useState<CAPASource>("deviation");
  const [newSourceRecordId, setNewSourceRecordId] = useState("");
  const [newType, setNewType] = useState<CAPAType>("corrective");
  const [newPriority, setNewPriority] = useState<CAPAPriority>("medium");
  const [newDepartment, setNewDepartment] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newActions, setNewActions] = useState<
    { description: string; assignee: string; dueDate: string }[]
  >([{ description: "", assignee: "", dueDate: "" }]);

  // Effectiveness check form
  const [ecCriteria, setEcCriteria] = useState("");
  const [ecResult, setEcResult] = useState<"effective" | "partially-effective" | "not-effective">("effective");
  const [ecCheckedBy, setEcCheckedBy] = useState("");
  const [ecNotes, setEcNotes] = useState("");

  const reload = useCallback(() => {
    setCAPAs(capaStore.getAll());
    setMetrics(capaStore.getMetrics());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ─── Filtered CAPAs ─────────────────────────────────────────────────────

  const filteredCAPAs = useMemo(() => {
    return capas.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.initiatedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [capas, statusFilter, priorityFilter, sourceFilter, typeFilter, searchQuery]);

  // ─── All Actions Across CAPAs ────────────────────────────────────────────

  const allActions = useMemo(() => {
    const actions: {
      action: CAPAAction;
      capaId: string;
      capaNumber: string;
      capaTitle: string;
      effectiveStatus: ActionStatus;
    }[] = [];
    capas.forEach((c) => {
      c.actions.forEach((a) => {
        actions.push({
          action: a,
          capaId: c.id,
          capaNumber: c.number,
          capaTitle: c.title,
          effectiveStatus: getEffectiveActionStatus(a),
        });
      });
    });
    return actions;
  }, [capas]);

  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    allActions.forEach((a) => set.add(a.action.assignee));
    return Array.from(set).sort();
  }, [allActions]);

  const filteredActions = useMemo(() => {
    return allActions.filter((a) => {
      if (actionAssigneeFilter !== "all" && a.action.assignee !== actionAssigneeFilter)
        return false;
      if (actionStatusFilter !== "all" && a.effectiveStatus !== actionStatusFilter)
        return false;
      if (actionDueFilter === "overdue" && !isOverdue(a.action.dueDate)) return false;
      if (actionDueFilter === "due-this-week") {
        const now = new Date();
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() + 7);
        const due = new Date(a.action.dueDate);
        if (due < now || due > weekEnd) return false;
      }
      if (actionDueFilter === "due-this-month") {
        const now = new Date();
        const monthEnd = new Date();
        monthEnd.setDate(now.getDate() + 30);
        const due = new Date(a.action.dueDate);
        if (due < now || due > monthEnd) return false;
      }
      return true;
    });
  }, [allActions, actionAssigneeFilter, actionStatusFilter, actionDueFilter]);

  // ─── Analytics Data ──────────────────────────────────────────────────────

  const analyticsBySource = useMemo(() => {
    const map = new Map<string, number>();
    capas.forEach((c) => {
      const label = SOURCE_LABELS[c.source];
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [capas]);

  const openClosedData = useMemo(() => {
    const open = capas.filter((c) => c.status !== "closed").length;
    const closed = capas.filter((c) => c.status === "closed").length;
    return [
      { name: "Open", value: open },
      { name: "Closed", value: closed },
    ];
  }, [capas]);

  const avgClosureByPriority = useMemo(() => {
    const priorities: CAPAPriority[] = ["low", "medium", "high", "critical"];
    return priorities.map((p) => {
      const closed = capas.filter(
        (c) => c.priority === p && c.status === "closed" && c.closedAt
      );
      const avg =
        closed.length > 0
          ? Math.round(
              closed.reduce(
                (sum, c) =>
                  sum +
                  Math.round(
                    (new Date(c.closedAt!).getTime() -
                      new Date(c.initiatedAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ),
                0
              ) / closed.length
            )
          : 0;
      return { priority: PRIORITY_LABELS[p], avgDays: avg } as Record<string, unknown>;
    });
  }, [capas]);

  const effectivenessBySource = useMemo(() => {
    const sources: CAPASource[] = [
      "deviation",
      "OOS",
      "audit",
      "complaint",
      "self-inspection",
    ];
    return sources.map((s) => {
      const sourceCAPAs = capas.filter((c) => c.source === s);
      const allChecks = sourceCAPAs.flatMap((c) => c.effectivenessChecks);
      const effectiveCount = allChecks.filter(
        (ec) => ec.result === "effective"
      ).length;
      const rate =
        allChecks.length > 0
          ? Math.round((effectiveCount / allChecks.length) * 100)
          : 0;
      return { source: SOURCE_LABELS[s], rate } as Record<string, unknown>;
    });
  }, [capas]);

  const overdueAging = useMemo(() => {
    const now = new Date();
    const buckets = [
      { name: "1-7 days", min: 1, max: 7, count: 0 },
      { name: "8-14 days", min: 8, max: 14, count: 0 },
      { name: "15-30 days", min: 15, max: 30, count: 0 },
      { name: "31+ days", min: 31, max: 9999, count: 0 },
    ];
    capas
      .filter((c) => c.status !== "closed" && new Date(c.dueDate) < now)
      .forEach((c) => {
        const days = Math.round(
          (now.getTime() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const bucket = buckets.find((b) => days >= b.min && days <= b.max);
        if (bucket) bucket.count++;
      });
    return buckets.map((b) => ({ name: b.name, count: b.count }));
  }, [capas]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openDetail = useCallback(
    (capa: CAPARecord) => {
      setSelectedCapa(capa);
      setDetailOpen(true);
      setEcCriteria("");
      setEcResult("effective");
      setEcCheckedBy("");
      setEcNotes("");
    },
    []
  );

  const handleAdvanceStatus = useCallback(
    (id: string) => {
      capaStore.advanceStatus(id);
      reload();
      const updated = capaStore.getById(id);
      if (updated) setSelectedCapa(updated);
    },
    [reload]
  );

  const handleCompleteAction = useCallback(
    (capaId: string, actionId: string) => {
      capaStore.completeAction(capaId, actionId);
      reload();
      const updated = capaStore.getById(capaId);
      if (updated) setSelectedCapa(updated);
    },
    [reload]
  );

  const handleRecordEffectivenessCheck = useCallback(
    (capaId: string) => {
      if (!ecCriteria || !ecCheckedBy) return;
      capaStore.recordEffectivenessCheck(capaId, {
        criteria: ecCriteria,
        result: ecResult,
        checkedBy: ecCheckedBy,
        date: new Date().toISOString(),
        notes: ecNotes || undefined,
      });
      reload();
      const updated = capaStore.getById(capaId);
      if (updated) setSelectedCapa(updated);
      setEcCriteria("");
      setEcResult("effective");
      setEcCheckedBy("");
      setEcNotes("");
    },
    [reload, ecCriteria, ecResult, ecCheckedBy, ecNotes]
  );

  const handleCreateCapa = useCallback(() => {
    if (!newTitle || !newDescription || !newDepartment || !newDueDate) return;
    const validActions = newActions.filter(
      (a) => a.description && a.assignee && a.dueDate
    );
    capaStore.create({
      title: newTitle,
      description: newDescription,
      source: newSource,
      sourceRecordId: newSourceRecordId || undefined,
      sourceRecordNumber: newSourceRecordId || undefined,
      type: newType,
      priority: newPriority,
      status: "initiated",
      initiatedBy: "Current User",
      initiatedAt: new Date().toISOString(),
      department: newDepartment,
      actions: validActions.map((a, i) => ({
        id: `new-a-${Date.now()}-${i}`,
        description: a.description,
        assignee: a.assignee,
        dueDate: new Date(a.dueDate).toISOString(),
        status: "pending" as const,
      })),
      effectivenessChecks: [],
      dueDate: new Date(newDueDate).toISOString(),
    });
    // Reset form
    setNewTitle("");
    setNewDescription("");
    setNewSource("deviation");
    setNewSourceRecordId("");
    setNewType("corrective");
    setNewPriority("medium");
    setNewDepartment("");
    setNewDueDate("");
    setNewActions([{ description: "", assignee: "", dueDate: "" }]);
    reload();
    setActiveTab("capas");
  }, [
    newTitle,
    newDescription,
    newSource,
    newSourceRecordId,
    newType,
    newPriority,
    newDepartment,
    newDueDate,
    newActions,
    reload,
  ]);

  const handleBulkCompleteActions = useCallback(
    (items: { capaId: string; actionId: string }[]) => {
      items.forEach(({ capaId, actionId }) => {
        capaStore.completeAction(capaId, actionId);
      });
      reload();
    },
    [reload]
  );

  // ─── Bulk selection for action tracker ───────────────────────────────────

  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());

  const toggleActionSelection = useCallback((actionId: string) => {
    setSelectedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }, []);

  const handleBulkComplete = useCallback(() => {
    const items = filteredActions
      .filter((a) => selectedActionIds.has(a.action.id) && a.effectiveStatus !== "completed")
      .map((a) => ({ capaId: a.capaId, actionId: a.action.id }));
    handleBulkCompleteActions(items);
    setSelectedActionIds(new Set());
  }, [filteredActions, selectedActionIds, handleBulkCompleteActions]);

  if (!metrics) return null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="CAPA Management"
        description="Corrective and Preventive Action tracking for GMP compliance. Manage root cause investigations, action plans, and effectiveness verification."
        icon={<Shield className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={() => setActiveTab("new-capa")}>
            <Plus className="h-4 w-4 mr-2" />
            New CAPA
          </Button>
        }
      />

      {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Shield}
          title="Total CAPAs"
          value={metrics.total}
          subtitle="All records"
          iconColor="bg-primary/10 text-primary"
        />
        <StatsCard
          icon={Clock}
          title="Open"
          value={metrics.open}
          subtitle="Requiring action"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Overdue"
          value={metrics.overdue}
          subtitle="Past due date"
          iconColor="bg-red-100 text-red-600"
        />
        <StatsCard
          icon={Calendar}
          title="Avg Closure Days"
          value={metrics.avgClosureDays}
          subtitle="Closed CAPAs"
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={Target}
          title="Effectiveness Rate"
          value={`${metrics.effectivenessRate}%`}
          subtitle="Checks passed"
          iconColor="bg-green-100 text-green-600"
        />
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="capas">CAPAs</TabsTrigger>
          <TabsTrigger value="new-capa">New CAPA</TabsTrigger>
          <TabsTrigger value="action-tracker">Action Tracker</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: CAPAs
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="capas" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search CAPAs..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {(Object.keys(STATUS_LABELS) as CAPAStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {(Object.keys(PRIORITY_LABELS) as CAPAPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {(Object.keys(SOURCE_LABELS) as CAPASource[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {(Object.keys(TYPE_LABELS) as CAPAType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* CAPAs Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[90px]">Type</TableHead>
                    <TableHead className="w-[90px]">Priority</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[100px]">Due Date</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCAPAs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No CAPAs match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCAPAs.map((capa) => (
                      <TableRow
                        key={capa.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(capa)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {capa.number}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium text-sm truncate">
                              {capa.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {capa.initiatedBy} | {capa.department}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", SOURCE_COLORS[capa.source])}
                          >
                            {SOURCE_LABELS[capa.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", TYPE_COLORS[capa.type])}
                          >
                            {TYPE_LABELS[capa.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", PRIORITY_COLORS[capa.priority])}
                          >
                            {PRIORITY_LABELS[capa.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", STATUS_COLORS[capa.status])}
                          >
                            {STATUS_LABELS[capa.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs",
                              capa.status !== "closed" && isOverdue(capa.dueDate)
                                ? "text-red-600 font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDate(capa.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(capa);
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

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: New CAPA
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="new-capa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Initiate New CAPA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Source selection and linked record */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Source *</Label>
                  <Select
                    value={newSource}
                    onValueChange={(v) => setNewSource(v as CAPASource)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SOURCE_LABELS) as CAPASource[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked Source Record ID</Label>
                  <Input
                    placeholder="e.g. DEV-2026-003, OOS-2026-005"
                    value={newSourceRecordId}
                    onChange={(e) => setNewSourceRecordId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={newType}
                    onValueChange={(v) => setNewType(v as CAPAType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as CAPAType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title and description */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Brief title describing the CAPA"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Detailed description of the issue and why CAPA is needed..."
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              {/* Priority, department, due date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={newPriority}
                    onValueChange={(v) => setNewPriority(v as CAPAPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as CAPAPriority[]).map(
                        (p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Input
                    placeholder="e.g. Production, QC, Engineering"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Completion Date *</Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Initial actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Initial Action Items
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewActions([
                        ...newActions,
                        { description: "", assignee: "", dueDate: "" },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Action
                  </Button>
                </div>
                {newActions.map((action, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Action description"
                        value={action.description}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setNewActions(updated);
                        }}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Assignee</Label>
                      <Input
                        placeholder="Assignee name"
                        value={action.assignee}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[idx] = { ...updated[idx], assignee: e.target.value };
                          setNewActions(updated);
                        }}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Due Date</Label>
                      <Input
                        type="date"
                        value={action.dueDate}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[idx] = { ...updated[idx], dueDate: e.target.value };
                          setNewActions(updated);
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      {newActions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setNewActions(newActions.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setActiveTab("capas")}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCapa}
                  disabled={!newTitle || !newDescription || !newDepartment || !newDueDate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Initiate CAPA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Action Tracker
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="action-tracker" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  value={actionAssigneeFilter}
                  onValueChange={setActionAssigneeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {uniqueAssignees.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={actionStatusFilter}
                  onValueChange={setActionStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {ACTION_STATUS_LABELS[s]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={actionDueFilter}
                  onValueChange={setActionDueFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Due Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Due Dates</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due-this-week">Due This Week</SelectItem>
                    <SelectItem value="due-this-month">Due This Month</SelectItem>
                  </SelectContent>
                </Select>
                {selectedActionIds.size > 0 && (
                  <Button onClick={handleBulkComplete} variant="default">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Selected ({selectedActionIds.size})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead className="w-[130px]">CAPA</TableHead>
                    <TableHead>Action Description</TableHead>
                    <TableHead className="w-[150px]">Assignee</TableHead>
                    <TableHead className="w-[100px]">Due Date</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No actions match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActions.map((item) => (
                      <TableRow key={`${item.capaId}-${item.action.id}`}>
                        <TableCell>
                          {item.effectiveStatus !== "completed" && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedActionIds.has(item.action.id)}
                              onChange={() => toggleActionSelection(item.action.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            className="font-mono text-sm text-blue-600 hover:underline"
                            onClick={() => {
                              const capa = capaStore.getById(item.capaId);
                              if (capa) openDetail(capa);
                            }}
                          >
                            {item.capaNumber}
                          </button>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{item.action.description}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {item.capaTitle}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{item.action.assignee}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs",
                              item.effectiveStatus === "overdue"
                                ? "text-red-600 font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDate(item.action.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              ACTION_STATUS_COLORS[item.effectiveStatus]
                            )}
                          >
                            {ACTION_STATUS_LABELS[item.effectiveStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.effectiveStatus !== "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCompleteAction(item.capaId, item.action.id)
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
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

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Analytics
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CAPAs by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">CAPAs by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartWidget
                  data={analyticsBySource}
                  height={280}
                  donut
                  showLabels
                  showLegend
                />
              </CardContent>
            </Card>

            {/* Open vs Closed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Open vs Closed CAPAs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartWidget
                  data={openClosedData}
                  height={280}
                  showLabels
                  showLegend
                />
              </CardContent>
            </Card>

            {/* Average Closure by Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Avg Closure Days by Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={avgClosureByPriority}
                  bars={[{ dataKey: "avgDays", name: "Avg Days", color: "#f59e0b" }]}
                  xAxisKey="priority"
                  height={280}
                />
              </CardContent>
            </Card>

            {/* Effectiveness Rate by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Effectiveness Rate by Source (%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={effectivenessBySource}
                  bars={[{ dataKey: "rate", name: "Effectiveness %", color: "#10b981" }]}
                  xAxisKey="source"
                  height={280}
                />
              </CardContent>
            </Card>

            {/* Overdue Aging */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Overdue CAPA Aging Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={overdueAging}
                  bars={[{ dataKey: "count", name: "CAPAs", color: "#ef4444" }]}
                  xAxisKey="name"
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          DETAIL DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCapa && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selectedCapa.number}</span>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", STATUS_COLORS[selectedCapa.status])}
                  >
                    {STATUS_LABELS[selectedCapa.status]}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", PRIORITY_COLORS[selectedCapa.priority])}
                  >
                    {PRIORITY_LABELS[selectedCapa.priority]}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-left">
                  {selectedCapa.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Workflow */}
                <Card>
                  <CardContent className="pt-6">
                    <CAPAWorkflow capa={selectedCapa} />
                  </CardContent>
                </Card>

                {/* General Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">General Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Source</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "mt-1 text-[10px]",
                            SOURCE_COLORS[selectedCapa.source]
                          )}
                        >
                          {SOURCE_LABELS[selectedCapa.source]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Type</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "mt-1 text-[10px]",
                            TYPE_COLORS[selectedCapa.type]
                          )}
                        >
                          {TYPE_LABELS[selectedCapa.type]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Initiated By</p>
                        <p className="font-medium mt-1">{selectedCapa.initiatedBy}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Department</p>
                        <p className="font-medium mt-1">{selectedCapa.department}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Initiated</p>
                        <p className="font-medium mt-1">
                          {formatDate(selectedCapa.initiatedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Due Date</p>
                        <p
                          className={cn(
                            "font-medium mt-1",
                            selectedCapa.status !== "closed" &&
                              isOverdue(selectedCapa.dueDate) &&
                              "text-red-600"
                          )}
                        >
                          {formatDate(selectedCapa.dueDate)}
                        </p>
                      </div>
                      {selectedCapa.sourceRecordNumber && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">
                            Linked Source Record
                          </p>
                          <p className="font-mono font-medium mt-1 text-blue-600">
                            {selectedCapa.sourceRecordNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">
                        Description
                      </p>
                      <p className="text-sm">{selectedCapa.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Root Cause Analysis */}
                {selectedCapa.rootCauseAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Root Cause Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">
                              Method:
                            </span>{" "}
                            <Badge variant="outline" className="text-xs">
                              {ROOT_CAUSE_LABELS[selectedCapa.rootCauseAnalysis.method]}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">
                              Investigator:
                            </span>{" "}
                            <span className="font-medium">
                              {selectedCapa.rootCauseAnalysis.investigator}
                            </span>
                          </div>
                          {selectedCapa.rootCauseAnalysis.completedAt && (
                            <div>
                              <span className="text-muted-foreground text-xs">
                                Completed:
                              </span>{" "}
                              <span className="font-medium">
                                {formatDate(
                                  selectedCapa.rootCauseAnalysis.completedAt
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedCapa.rootCauseAnalysis.findings}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Action Items ({selectedCapa.actions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCapa.actions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No action items defined yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCapa.actions.map((action) => {
                          const effectiveStatus = getEffectiveActionStatus(action);
                          return (
                            <div
                              key={action.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border",
                                effectiveStatus === "completed" && "bg-green-50/50",
                                effectiveStatus === "overdue" && "bg-red-50/50 border-red-200"
                              )}
                            >
                              <div className="pt-0.5">
                                {effectiveStatus === "completed" ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : effectiveStatus === "overdue" ? (
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                ) : effectiveStatus === "in-progress" ? (
                                  <Clock className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    effectiveStatus === "completed" &&
                                      "line-through text-muted-foreground"
                                  )}
                                >
                                  {action.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {action.assignee}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due: {formatDate(action.dueDate)}
                                  </span>
                                  {action.completionDate && (
                                    <span className="flex items-center gap-1 text-green-600">
                                      <CheckCircle className="h-3 w-3" />
                                      Completed: {formatDate(action.completionDate)}
                                    </span>
                                  )}
                                </div>
                                {action.evidence && (
                                  <p className="mt-1 text-xs text-muted-foreground italic">
                                    Evidence: {action.evidence}
                                  </p>
                                )}
                              </div>
                              {effectiveStatus !== "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCompleteAction(selectedCapa.id, action.id)
                                  }
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Effectiveness Checks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Effectiveness Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing checks */}
                    {selectedCapa.effectivenessChecks.length > 0 && (
                      <div className="space-y-3">
                        {selectedCapa.effectivenessChecks.map((ec) => (
                          <div
                            key={ec.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              ec.result === "effective" && "bg-green-50/50 border-green-200",
                              ec.result === "partially-effective" &&
                                "bg-amber-50/50 border-amber-200",
                              ec.result === "not-effective" && "bg-red-50/50 border-red-200"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{ec.criteria}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  ec.result === "effective" &&
                                    "bg-green-100 text-green-800",
                                  ec.result === "partially-effective" &&
                                    "bg-amber-100 text-amber-800",
                                  ec.result === "not-effective" &&
                                    "bg-red-100 text-red-800"
                                )}
                              >
                                {ec.result === "effective"
                                  ? "Effective"
                                  : ec.result === "partially-effective"
                                  ? "Partially Effective"
                                  : "Not Effective"}
                              </Badge>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Checked by: {ec.checkedBy}</span>
                              <span>Date: {formatDate(ec.date)}</span>
                            </div>
                            {ec.notes && (
                              <p className="mt-1 text-xs text-muted-foreground italic">
                                {ec.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new effectiveness check form */}
                    {selectedCapa.status !== "closed" && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Record New Effectiveness Check
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Criteria *</Label>
                              <Input
                                placeholder="Effectiveness criteria..."
                                value={ecCriteria}
                                onChange={(e) => setEcCriteria(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Checked By *</Label>
                              <Input
                                placeholder="Name"
                                value={ecCheckedBy}
                                onChange={(e) => setEcCheckedBy(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Result *</Label>
                              <Select
                                value={ecResult}
                                onValueChange={(v) =>
                                  setEcResult(
                                    v as
                                      | "effective"
                                      | "partially-effective"
                                      | "not-effective"
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="effective">
                                    Effective
                                  </SelectItem>
                                  <SelectItem value="partially-effective">
                                    Partially Effective
                                  </SelectItem>
                                  <SelectItem value="not-effective">
                                    Not Effective
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Notes</Label>
                              <Input
                                placeholder="Optional notes..."
                                value={ecNotes}
                                onChange={(e) => setEcNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={!ecCriteria || !ecCheckedBy}
                            onClick={() =>
                              handleRecordEffectivenessCheck(selectedCapa.id)
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Record Check
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Status and closure info */}
                {selectedCapa.status === "closed" && selectedCapa.closedAt && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-700">
                            CAPA Closed
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Closed by {selectedCapa.closedBy} on{" "}
                            {formatDate(selectedCapa.closedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Advance Status Button */}
                {selectedCapa.status !== "closed" && (
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => handleAdvanceStatus(selectedCapa.id)}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Advance to Next Stage
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
