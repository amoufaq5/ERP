"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import ImpactAssessmentForm from "@/components/shared/impact-assessment-form";
import ChangeWorkflow from "@/components/shared/change-workflow";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  GitPullRequest,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Layers,
  Settings,
  Plus,
  Search,
  Eye,
} from "lucide-react";
import { useChangeControlStore } from "@/lib/quality/change-control-store";
import type {
  ChangeRequest,
  ChangeStatus,
  ChangeCategory,
  ChangeType,
  ChangePriority,
  ChangeControlMetrics,
  ImpactAssessment,
  Approval,
  RiskLevel,
} from "@/lib/quality/change-control-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_COLORS: Record<ChangeStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  "impact-assessment": "bg-purple-100 text-purple-800",
  review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  implementation: "bg-indigo-100 text-indigo-800",
  verification: "bg-cyan-100 text-cyan-800",
  closed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<ChangeStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  "impact-assessment": "Impact Assessment",
  review: "Review",
  approved: "Approved",
  implementation: "Implementation",
  verification: "Verification",
  closed: "Closed",
  rejected: "Rejected",
};

const CATEGORY_COLORS: Record<ChangeCategory, string> = {
  process: "bg-blue-100 text-blue-800",
  equipment: "bg-orange-100 text-orange-800",
  material: "bg-green-100 text-green-800",
  facility: "bg-purple-100 text-purple-800",
  document: "bg-gray-100 text-gray-800",
  system: "bg-indigo-100 text-indigo-800",
  supplier: "bg-yellow-100 text-yellow-800",
  packaging: "bg-pink-100 text-pink-800",
};

const TYPE_COLORS: Record<ChangeType, string> = {
  minor: "bg-green-100 text-green-800",
  major: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<ChangePriority, string> = {
  low: "text-gray-600",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600 font-bold",
};

const ALL_STATUSES: ChangeStatus[] = [
  "draft",
  "submitted",
  "impact-assessment",
  "review",
  "approved",
  "implementation",
  "verification",
  "closed",
  "rejected",
];
const ALL_CATEGORIES: ChangeCategory[] = [
  "process",
  "equipment",
  "material",
  "facility",
  "document",
  "system",
  "supplier",
  "packaging",
];
const ALL_TYPES: ChangeType[] = ["minor", "major", "critical"];
const ALL_PRIORITIES: ChangePriority[] = ["low", "medium", "high", "urgent"];

const AFFECTED_AREA_OPTIONS = [
  "Granulation Suite",
  "Tablet Coating",
  "Compression Room",
  "Packaging Line 1",
  "Packaging Line 2",
  "Packaging Line 3",
  "Aseptic Filling Suite",
  "SVP Filling",
  "QC Lab",
  "QC Micro Lab",
  "IPC Lab",
  "Stability Lab",
  "Warehouse",
  "Dispensing Room",
  "Water System",
  "HVAC System",
  "Autoclave Room",
];

const AFFECTED_PRODUCT_OPTIONS = [
  "Amoxicillin 500mg Tablets",
  "Metformin 500mg Tablets",
  "Metformin 850mg Tablets",
  "Metformin 1000mg Tablets",
  "Omeprazole 20mg Capsules",
  "Paracetamol 500mg Tablets",
  "Gentamicin 80mg/2ml Injection",
  "Ranitidine 50mg/2ml Injection",
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ChangeControlPage() {
  const { items, fetchAll, create, update, updateStatus } = useChangeControlStore();
  const changes = items as unknown as ChangeRequest[];
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New request form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ChangeCategory>("process");
  const [newType, setNewType] = useState<ChangeType>("minor");
  const [newPriority, setNewPriority] = useState<ChangePriority>("medium");
  const [newDescription, setNewDescription] = useState("");
  const [newJustification, setNewJustification] = useState("");
  const [newAffectedAreas, setNewAffectedAreas] = useState<string[]>([]);
  const [newAffectedProducts, setNewAffectedProducts] = useState<string[]>([]);
  const [newAffectedDocuments, setNewAffectedDocuments] = useState("");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Compute metrics from items
  const metrics = useMemo((): ChangeControlMetrics | null => {
    if (changes.length === 0) return null;
    const openStatuses: ChangeStatus[] = ["draft", "submitted", "impact-assessment", "review", "approved", "implementation", "verification"];
    const openChanges = changes.filter((c) => openStatuses.includes(c.status));
    const closedChanges = changes.filter((c) => c.status === "closed" && c.closedAt);
    const avgCycleDays = closedChanges.length > 0
      ? Math.round(closedChanges.reduce((sum, c) => sum + Math.round((new Date(c.closedAt!).getTime() - new Date(c.requestedAt).getTime()) / 86400000), 0) / closedChanges.length)
      : 0;
    const byCategory = ALL_CATEGORIES.map((cat) => ({ category: cat, count: changes.filter((c) => c.category === cat).length })).filter((i) => i.count > 0);
    return {
      total: changes.length, open: openChanges.length, avgCycleDays, onTimeClosurePct: closedChanges.length > 0 ? 100 : 0,
      byCategory, byType: ALL_TYPES.map((t) => ({ type: t, count: changes.filter((c) => c.type === t).length })),
    };
  }, [changes]);

  // Filtered changes
  const filtered = useMemo(() => {
    let result = changes;
    if (filterStatus !== "all")
      result = result.filter((c) => c.status === filterStatus);
    if (filterCategory !== "all")
      result = result.filter((c) => c.category === filterCategory);
    if (filterType !== "all")
      result = result.filter((c) => c.type === filterType);
    if (filterPriority !== "all")
      result = result.filter((c) => c.priority === filterPriority);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.requestedBy.toLowerCase().includes(q)
      );
    }
    return result;
  }, [changes, filterStatus, filterCategory, filterType, filterPriority, searchQuery]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleCreateDraft = async () => {
    if (!newTitle.trim()) return;
    await create({ number: `CC-${Date.now()}`, title: newTitle, description: newDescription, category: newCategory, type: newType, status: "draft", priority: newPriority, requestedBy: "Current User", requestedAt: new Date().toISOString(), department: "Production", affectedAreas: newAffectedAreas, affectedProducts: newAffectedProducts, affectedDocuments: newAffectedDocuments.split(",").map((s) => s.trim()).filter(Boolean), justification: newJustification, riskLevel: "low", approvals: [], implementationPlan: [] } as any);
    resetForm();
    setActiveTab("requests");
  };

  const handleSubmitNew = async () => {
    if (!newTitle.trim()) return;
    await create({ number: `CC-${Date.now()}`, title: newTitle, description: newDescription, category: newCategory, type: newType, status: "submitted", priority: newPriority, requestedBy: "Current User", requestedAt: new Date().toISOString(), department: "Production", affectedAreas: newAffectedAreas, affectedProducts: newAffectedProducts, affectedDocuments: newAffectedDocuments.split(",").map((s) => s.trim()).filter(Boolean), justification: newJustification, riskLevel: "low", approvals: [], implementationPlan: [] } as any);
    resetForm();
    setActiveTab("requests");
  };

  const resetForm = () => {
    setNewTitle("");
    setNewCategory("process");
    setNewType("minor");
    setNewPriority("medium");
    setNewDescription("");
    setNewJustification("");
    setNewAffectedAreas([]);
    setNewAffectedProducts([]);
    setNewAffectedDocuments("");
  };

  const handleSubmitForReview = async (id: string) => {
    const updated = await updateStatus(id, "submitted");
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleSaveAssessment = async (id: string, assessment: ImpactAssessment) => {
    const riskLevel: RiskLevel =
      assessment.qualityImpact === "high" || assessment.regulatoryImpact === "high" || assessment.safetyImpact === "high"
        ? "high"
        : assessment.qualityImpact === "medium" || assessment.regulatoryImpact === "medium" || assessment.safetyImpact === "medium"
        ? "medium"
        : "low";
    const updated = await update(id, { impactAssessment: assessment, riskLevel, status: "review" } as any);
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleApprove = async (id: string, role: string, name: string) => {
    const current = changes.find((i) => i.id === id);
    if (!current) return;
    const newApprovals = current.approvals.map((a: Approval) =>
      a.role === role && a.name === name ? { ...a, status: "approved" as const, date: new Date().toISOString() } : a
    );
    const allApproved = newApprovals.every((a: Approval) => a.status === "approved");
    const updated = await update(id, { approvals: newApprovals, ...(allApproved ? { status: "approved" } : {}) } as any);
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleRejectApproval = async (id: string, role: string, name: string) => {
    const current = changes.find((i) => i.id === id);
    if (!current) return;
    const newApprovals = current.approvals.map((a: Approval) =>
      a.role === role && a.name === name ? { ...a, status: "rejected" as const, date: new Date().toISOString(), comments: "Rejected during review" } : a
    );
    const updated = await update(id, { approvals: newApprovals } as any);
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleStartImplementation = async (id: string) => {
    const updated = await updateStatus(id, "implementation");
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleCompleteStep = async (id: string, stepId: string) => {
    const current = changes.find((i) => i.id === id);
    if (!current) return;
    const newPlan = current.implementationPlan.map((s) =>
      s.id === stepId ? { ...s, status: "completed" as const, completedAt: new Date().toISOString() } : s
    );
    const allComplete = newPlan.every((s) => s.status === "completed");
    const updated = await update(id, { implementationPlan: newPlan, ...(allComplete ? { status: "verification" } : {}) } as any);
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const handleCloseChange = async (id: string) => {
    const updated = await updateStatus(id, "closed");
    setSelectedChange(updated as unknown as ChangeRequest);
  };

  const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((a) => a !== item));
    } else {
      setter([...arr, item]);
    }
  };

  // ─── Analytics data ─────────────────────────────────────────────────────

  const overdueSteps = useMemo(() => {
    const now = new Date();
    const result: { changeNumber: string; changeTitle: string; step: string; assignedTo: string; dueDate: string }[] = [];
    changes.forEach((c) => {
      c.implementationPlan.forEach((s) => {
        if (s.status !== "completed" && new Date(s.dueDate) < now) {
          result.push({
            changeNumber: c.number,
            changeTitle: c.title,
            step: s.description,
            assignedTo: s.assignedTo,
            dueDate: s.dueDate,
          });
        }
      });
    });
    return result;
  }, [changes]);

  const areaFrequency = useMemo(() => {
    const map = new Map<string, number>();
    changes.forEach((c) => {
      c.affectedAreas.forEach((a) => map.set(a, (map.get(a) || 0) + 1));
    });
    return Array.from(map.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [changes]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Change Control"
        description="Manage and track changes to processes, equipment, and materials per GMP requirements"
        icon={<GitPullRequest className="h-6 w-6" />}
      />

      {/* Stats */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={Layers}
            title="Total Changes"
            value={metrics.total}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard
            icon={Clock}
            title="Open"
            value={metrics.open}
            iconColor="bg-amber-100 text-amber-600"
          />
          <StatsCard
            icon={Settings}
            title="Avg Cycle Time"
            value={`${metrics.avgCycleDays} days`}
            iconColor="bg-purple-100 text-purple-600"
          />
          <StatsCard
            icon={CheckCircle}
            title="On-Time Closure"
            value={`${metrics.onTimeClosurePct}%`}
            iconColor="bg-green-100 text-green-600"
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Change Requests</TabsTrigger>
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Change Requests Tab ─────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by CC#, title, or requestor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs mb-1 block">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px]">
                  <Label className="text-xs mb-1 block">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {ALL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs mb-1 block">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ALL_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs mb-1 block">Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {ALL_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">CC#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[80px]">Priority</TableHead>
                    <TableHead className="w-[140px]">Requested By</TableHead>
                    <TableHead className="w-[70px]">Age</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No change requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((change) => (
                      <TableRow
                        key={change.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedChange(change);
                          setDetailOpen(true);
                        }}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {change.number}
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[300px] truncate">
                          {change.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize text-xs", CATEGORY_COLORS[change.category])}
                          >
                            {change.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize text-xs", TYPE_COLORS[change.type])}
                          >
                            {change.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn("text-xs", STATUS_COLORS[change.status])}
                          >
                            {STATUS_LABELS[change.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs capitalize", PRIORITY_COLORS[change.priority])}>
                            {change.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {change.requestedBy}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {daysSince(change.requestedAt)}d
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChange(change);
                              setDetailOpen(true);
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

        {/* ─── New Request Tab ─────────────────────────────────────────────── */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                New Change Request
              </CardTitle>
              <CardDescription>
                Submit a new change request for review and approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Brief title describing the change"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newCategory}
                    onValueChange={(v) => setNewCategory(v as ChangeCategory)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newType}
                    onValueChange={(v) => setNewType(v as ChangeType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newPriority}
                    onValueChange={(v) => setNewPriority(v as ChangePriority)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed description of the proposed change..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Justification</Label>
                <Textarea
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  placeholder="Why is this change needed?"
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Affected Areas Multi-Select */}
              <div>
                <Label>Affected Areas</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AFFECTED_AREA_OPTIONS.map((area) => (
                    <Badge
                      key={area}
                      variant={newAffectedAreas.includes(area) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() =>
                        toggleArrayItem(newAffectedAreas, area, setNewAffectedAreas)
                      }
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Affected Products Multi-Select */}
              <div>
                <Label>Affected Products</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AFFECTED_PRODUCT_OPTIONS.map((prod) => (
                    <Badge
                      key={prod}
                      variant={newAffectedProducts.includes(prod) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() =>
                        toggleArrayItem(newAffectedProducts, prod, setNewAffectedProducts)
                      }
                    >
                      {prod}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Affected Documents */}
              <div>
                <Label>Affected Documents</Label>
                <Input
                  value={newAffectedDocuments}
                  onChange={(e) => setNewAffectedDocuments(e.target.value)}
                  placeholder="Comma-separated document IDs (e.g. SOP-PRD-042, BMR-AMX-500)"
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCreateDraft}>
                  Save as Draft
                </Button>
                <Button onClick={handleSubmitNew} disabled={!newTitle.trim()}>
                  <FileEdit className="mr-2 h-4 w-4" />
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Analytics Tab ───────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Changes by Category */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Changes by Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metrics?.byCategory.map((item) => (
                <Card
                  key={item.category}
                  className={cn("border-l-4", {
                    "border-l-blue-500": item.category === "process",
                    "border-l-orange-500": item.category === "equipment",
                    "border-l-green-500": item.category === "material",
                    "border-l-purple-500": item.category === "facility",
                    "border-l-gray-500": item.category === "document",
                    "border-l-indigo-500": item.category === "system",
                    "border-l-yellow-500": item.category === "supplier",
                    "border-l-pink-500": item.category === "packaging",
                  })}
                >
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.category}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Open vs Closed and By Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Open vs Closed</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Open</span>
                      <span className="font-bold text-amber-600">
                        {metrics.open}
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{
                          width: `${metrics.total > 0 ? (metrics.open / metrics.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Closed / Rejected</span>
                      <span className="font-bold text-green-600">
                        {metrics.total - metrics.open}
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${
                            metrics.total > 0
                              ? ((metrics.total - metrics.open) / metrics.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Cycle Time by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ALL_TYPES.map((t) => {
                    const typeChanges = changes.filter(
                      (c) => c.type === t && c.status === "closed" && c.closedAt
                    );
                    const avg =
                      typeChanges.length > 0
                        ? Math.round(
                            typeChanges.reduce(
                              (sum, c) =>
                                sum +
                                daysSince(c.requestedAt) -
                                daysSince(c.closedAt!),
                              0
                            ) / typeChanges.length
                          )
                        : 0;
                    return (
                      <div key={t} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("capitalize text-xs", TYPE_COLORS[t])}
                          >
                            {t}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({typeChanges.length} closed)
                          </span>
                        </div>
                        <span className="font-bold text-sm">
                          {avg > 0 ? `${avg} days` : "N/A"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Affected Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Affected Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {areaFrequency.map((item) => (
                  <div key={item.area} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{item.area}</span>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            areaFrequency.length > 0
                              ? (item.count / areaFrequency[0].count) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold w-6 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
                {areaFrequency.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Implementation Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Overdue Implementation Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overdue steps
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CC#</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueSteps.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">
                          {item.changeNumber}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">
                          {item.step}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.assignedTo}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Detail Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedChange && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">
                    {selectedChange.number}
                  </span>
                  <span>{selectedChange.title}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Workflow */}
                <ChangeWorkflow changeRequest={selectedChange} />

                <Separator />

                {/* Details */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    Change Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 capitalize", CATEGORY_COLORS[selectedChange.category])}
                      >
                        {selectedChange.category}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 capitalize", TYPE_COLORS[selectedChange.type])}
                      >
                        {selectedChange.type}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <p className={cn("text-sm font-medium capitalize mt-1", PRIORITY_COLORS[selectedChange.priority])}>
                        {selectedChange.priority}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Risk Level</Label>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 capitalize", {
                          "bg-green-100 text-green-800": selectedChange.riskLevel === "low",
                          "bg-yellow-100 text-yellow-800": selectedChange.riskLevel === "medium",
                          "bg-red-100 text-red-800": selectedChange.riskLevel === "high",
                        })}
                      >
                        {selectedChange.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedChange.description}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Justification</Label>
                      <p className="text-sm mt-1">{selectedChange.justification}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <p className="text-sm mt-1">{selectedChange.department}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Requested By</Label>
                      <p className="text-sm mt-1">
                        {selectedChange.requestedBy} on{" "}
                        {new Date(selectedChange.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {selectedChange.affectedAreas.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Affected Areas</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedChange.affectedAreas.map((a) => (
                          <Badge key={a} variant="outline" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedChange.affectedProducts.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Affected Products</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedChange.affectedProducts.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedChange.affectedDocuments.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Affected Documents</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedChange.affectedDocuments.map((d) => (
                          <Badge key={d} variant="outline" className="text-xs font-mono">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Impact Assessment */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Impact Assessment
                  </h4>
                  {selectedChange.status === "impact-assessment" ||
                  selectedChange.status === "submitted" ? (
                    <ImpactAssessmentForm
                      assessment={selectedChange.impactAssessment}
                      onSave={(assessment) =>
                        handleSaveAssessment(selectedChange.id, assessment)
                      }
                    />
                  ) : selectedChange.impactAssessment ? (
                    <ImpactAssessmentForm
                      assessment={selectedChange.impactAssessment}
                      onSave={() => {}}
                      readOnly
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Impact assessment not yet performed
                    </p>
                  )}
                </div>

                <Separator />

                {/* Approvals */}
                {selectedChange.approvals.length > 0 && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approvals
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Comments</TableHead>
                            {selectedChange.status === "review" && (
                              <TableHead>Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedChange.approvals.map((a, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm font-medium">
                                {a.role}
                              </TableCell>
                              <TableCell className="text-sm">{a.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn("capitalize text-xs", {
                                    "bg-yellow-100 text-yellow-800": a.status === "pending",
                                    "bg-green-100 text-green-800": a.status === "approved",
                                    "bg-red-100 text-red-800": a.status === "rejected",
                                    "bg-blue-100 text-blue-800": a.status === "deferred",
                                  })}
                                >
                                  {a.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {a.date
                                  ? new Date(a.date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate">
                                {a.comments || "-"}
                              </TableCell>
                              {selectedChange.status === "review" && (
                                <TableCell>
                                  {a.status === "pending" && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-green-600 hover:text-green-700"
                                        onClick={() =>
                                          handleApprove(
                                            selectedChange.id,
                                            a.role,
                                            a.name
                                          )
                                        }
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-red-600 hover:text-red-700"
                                        onClick={() =>
                                          handleRejectApproval(
                                            selectedChange.id,
                                            a.role,
                                            a.name
                                          )
                                        }
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Implementation Plan */}
                {selectedChange.implementationPlan.length > 0 && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Implementation Plan
                      </h4>
                      <div className="space-y-2">
                        {selectedChange.implementationPlan.map((step) => (
                          <div
                            key={step.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border",
                              step.status === "completed" && "bg-green-50 border-green-200",
                              step.status === "in-progress" && "bg-blue-50 border-blue-200",
                              step.status === "overdue" && "bg-red-50 border-red-200",
                              step.status === "pending" && "bg-gray-50 border-gray-200"
                            )}
                          >
                            <div className="mt-0.5">
                              {step.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : step.status === "in-progress" ? (
                                <Clock className="h-5 w-5 text-blue-600" />
                              ) : step.status === "overdue" ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                Step {step.step}: {step.description}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                <span>Assigned: {step.assignedTo}</span>
                                <span>
                                  Due: {new Date(step.dueDate).toLocaleDateString()}
                                </span>
                                {step.completedAt && (
                                  <span className="text-green-600">
                                    Completed:{" "}
                                    {new Date(step.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {step.evidence && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  Evidence: {step.evidence}
                                </p>
                              )}
                            </div>
                            {selectedChange.status === "implementation" &&
                              step.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0"
                                  onClick={() =>
                                    handleCompleteStep(selectedChange.id, step.id)
                                  }
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Complete
                                </Button>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Verification Results */}
                {selectedChange.verificationResults && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Verification Results
                      </h4>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg border">
                        {selectedChange.verificationResults}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-end">
                  {selectedChange.status === "draft" && (
                    <Button onClick={() => handleSubmitForReview(selectedChange.id)}>
                      <FileEdit className="mr-2 h-4 w-4" />
                      Submit for Review
                    </Button>
                  )}
                  {selectedChange.status === "submitted" && (
                    <Button
                      onClick={async () => {
                        const updated = await update(selectedChange.id, { status: "impact-assessment" } as any);
                        setSelectedChange(updated as unknown as ChangeRequest);
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Begin Impact Assessment
                    </Button>
                  )}
                  {selectedChange.status === "approved" && (
                    <Button
                      onClick={() => handleStartImplementation(selectedChange.id)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Start Implementation
                    </Button>
                  )}
                  {selectedChange.status === "verification" && (
                    <Button
                      onClick={() => handleCloseChange(selectedChange.id)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Close Change
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
