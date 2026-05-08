"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import DeviationTrendChart from "@/components/shared/deviation-trend-chart";
import DeviationInvestigationForm from "@/components/shared/deviation-investigation-form";
import { cn } from "@/lib/utils";
import { deviationStore } from "@/lib/quality/deviation-store";
import type {
  Deviation,
  DeviationCategory,
  DeviationClassification,
  DeviationInvestigation,
  DeviationMetrics,
  DeviationStatus,
  DeviationTrend,
  DispositionDecision,
  RootCauseCategory,
} from "@/lib/quality/deviation-types";
import {
  AlertTriangle,
  FileWarning,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Shield,
  Target,
  Plus,
  X,
  ArrowRight,
  Eye,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DeviationStatus, string> = {
  open: "Open",
  investigation: "Investigation",
  "root-cause": "Root Cause",
  "capa-required": "CAPA Required",
  "capa-implementation": "CAPA Implementation",
  "effectiveness-check": "Effectiveness Check",
  closed: "Closed",
};

const STATUS_COLORS: Record<DeviationStatus, string> = {
  open: "bg-red-100 text-red-800",
  investigation: "bg-blue-100 text-blue-800",
  "root-cause": "bg-purple-100 text-purple-800",
  "capa-required": "bg-amber-100 text-amber-800",
  "capa-implementation": "bg-orange-100 text-orange-800",
  "effectiveness-check": "bg-cyan-100 text-cyan-800",
  closed: "bg-green-100 text-green-800",
};

const CLASSIFICATION_COLORS: Record<DeviationClassification, string> = {
  critical: "bg-red-100 text-red-800",
  major: "bg-amber-100 text-amber-800",
  minor: "bg-blue-100 text-blue-800",
};

const CATEGORY_LABELS: Record<DeviationCategory, string> = {
  process: "Process",
  equipment: "Equipment",
  material: "Material",
  facility: "Facility",
  documentation: "Documentation",
  environmental: "Environmental",
  personnel: "Personnel",
  utilities: "Utilities",
};

const STATUS_WORKFLOW: DeviationStatus[] = [
  "open",
  "investigation",
  "root-cause",
  "capa-required",
  "capa-implementation",
  "effectiveness-check",
  "closed",
];

const DEPARTMENTS = [
  "Production",
  "Quality Control",
  "Quality Assurance",
  "Warehouse",
  "Engineering",
  "Packaging",
];

const ROOT_CAUSE_CATEGORY_LABELS: Record<RootCauseCategory, string> = {
  "human-error": "Human Error",
  "equipment-failure": "Equipment Failure",
  "material-defect": "Material Defect",
  "process-gap": "Process Gap",
  environmental: "Environmental",
  "design-flaw": "Design Flaw",
  "training-gap": "Training Gap",
  "documentation-gap": "Documentation Gap",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function ageDays(dateStr: string): number {
  return Math.max(
    0,
    Math.round(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function DeviationsPage() {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [metrics, setMetrics] = useState<DeviationMetrics | null>(null);
  const [trends, setTrends] = useState<DeviationTrend[]>([]);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClassification, setFilterClassification] =
    useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");

  // New Deviation form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DeviationCategory>("process");
  const [newClassification, setNewClassification] =
    useState<DeviationClassification>("minor");
  const [newDescription, setNewDescription] = useState("");
  const [newDepartment, setNewDepartment] = useState("Production");
  const [newArea, setNewArea] = useState("");
  const [newBatches, setNewBatches] = useState<string[]>([]);
  const [newBatchInput, setNewBatchInput] = useState("");
  const [newProducts, setNewProducts] = useState<string[]>([]);
  const [newProductInput, setNewProductInput] = useState("");
  const [newImmediateAction, setNewImmediateAction] = useState("");
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );

  // Investigation dialog state
  const [investigatorName, setInvestigatorName] = useState("");
  const [rootCauseText, setRootCauseText] = useState("");
  const [rootCauseCat, setRootCauseCat] =
    useState<RootCauseCategory>("process-gap");
  const [capaIdInput, setCapaIdInput] = useState("");
  const [dispositionInput, setDispositionInput] =
    useState<DispositionDecision>("release");

  const refresh = useCallback(() => {
    setDeviations(deviationStore.getAll());
    setMetrics(deviationStore.getMetrics());
    setTrends(deviationStore.getTrends(6));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filtered deviations
  const filteredDeviations = useMemo(() => {
    return deviations.filter((d) => {
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (
        filterClassification !== "all" &&
        d.classification !== filterClassification
      )
        return false;
      if (filterCategory !== "all" && d.category !== filterCategory)
        return false;
      if (filterDepartment !== "all" && d.department !== filterDepartment)
        return false;
      return true;
    });
  }, [deviations, filterStatus, filterClassification, filterCategory, filterDepartment]);

  // Repeat deviations
  const repeatDeviations = useMemo(
    () => deviationStore.getRepeatDeviations(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deviations]
  );

  // ── Actions ───────────────────────────────────────────────────────────

  function handleCreateDeviation() {
    if (!newTitle.trim() || !newDescription.trim()) return;
    deviationStore.create({
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      classification: newClassification,
      detectedAt: new Date().toISOString().slice(0, 10),
      detectedBy: "Current User",
      department: newDepartment,
      area: newArea.trim(),
      batchesAffected: newBatches,
      productsAffected: newProducts,
      immediateAction: newImmediateAction.trim() || undefined,
      dueDate: newDueDate,
    });
    // Reset form
    setNewTitle("");
    setNewCategory("process");
    setNewClassification("minor");
    setNewDescription("");
    setNewDepartment("Production");
    setNewArea("");
    setNewBatches([]);
    setNewProducts([]);
    setNewImmediateAction("");
    setNewDueDate(
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    );
    refresh();
  }

  function handleStartInvestigation() {
    if (!selectedDeviation || !investigatorName.trim()) return;
    const updated = deviationStore.startInvestigation(
      selectedDeviation.id,
      investigatorName.trim()
    );
    if (updated) {
      setSelectedDeviation(updated);
      setInvestigatorName("");
      refresh();
    }
  }

  function handleSetRootCause() {
    if (!selectedDeviation || !rootCauseText.trim()) return;
    const updated = deviationStore.setRootCause(
      selectedDeviation.id,
      rootCauseText.trim(),
      rootCauseCat
    );
    if (updated) {
      setSelectedDeviation(updated);
      setRootCauseText("");
      refresh();
    }
  }

  function handleLinkCAPA() {
    if (!selectedDeviation || !capaIdInput.trim()) return;
    const updated = deviationStore.linkCAPA(
      selectedDeviation.id,
      capaIdInput.trim()
    );
    if (updated) {
      setSelectedDeviation(updated);
      setCapaIdInput("");
      refresh();
    }
  }

  function handleCloseDeviation() {
    if (!selectedDeviation) return;
    const updated = deviationStore.closeDeviation(
      selectedDeviation.id,
      dispositionInput
    );
    if (updated) {
      setSelectedDeviation(updated);
      refresh();
    }
  }

  function handleSaveInvestigation(investigation: DeviationInvestigation) {
    if (!selectedDeviation) return;
    const updated = deviationStore.update(selectedDeviation.id, {
      investigation,
      impactOnProduct: selectedDeviation.impactOnProduct,
    });
    if (updated) {
      setSelectedDeviation(updated);
      refresh();
    }
  }

  function openDetail(dev: Deviation) {
    setSelectedDeviation(dev);
    setDetailOpen(true);
  }

  // Batch/product input handlers
  function addBatch() {
    if (!newBatchInput.trim()) return;
    setNewBatches((prev) => [...prev, newBatchInput.trim()]);
    setNewBatchInput("");
  }

  function addProduct() {
    if (!newProductInput.trim()) return;
    setNewProducts((prev) => [...prev, newProductInput.trim()]);
    setNewProductInput("");
  }

  // ── Analytics computations ────────────────────────────────────────────

  const analyticsByClassification = useMemo(() => {
    const map = new Map<DeviationClassification, number>();
    for (const d of deviations) {
      map.set(d.classification, (map.get(d.classification) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deviations]);

  const analyticsByCategory = useMemo(() => {
    const map = new Map<DeviationCategory, number>();
    for (const d of deviations) {
      map.set(d.category, (map.get(d.category) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deviations]);

  const analyticsByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deviations) {
      map.set(d.department, (map.get(d.department) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deviations]);

  const topRootCauses = useMemo(() => {
    const map = new Map<RootCauseCategory, number>();
    for (const d of deviations) {
      if (d.investigation?.rootCauseCategory) {
        map.set(
          d.investigation.rootCauseCategory,
          (map.get(d.investigation.rootCauseCategory) || 0) + 1
        );
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deviations]);

  const mttrByClassification = useMemo(() => {
    const result: { classification: DeviationClassification; mttr: number }[] =
      [];
    for (const cls of ["critical", "major", "minor"] as DeviationClassification[]) {
      const closed = deviations.filter(
        (d) => d.classification === cls && d.status === "closed" && d.closedAt
      );
      if (closed.length > 0) {
        const totalDays = closed.reduce(
          (sum, d) =>
            sum +
            Math.round(
              (new Date(d.closedAt!).getTime() -
                new Date(d.detectedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          0
        );
        result.push({
          classification: cls,
          mttr: Math.round(totalDays / closed.length),
        });
      } else {
        result.push({ classification: cls, mttr: 0 });
      }
    }
    return result;
  }, [deviations]);

  const overdueDeviations = useMemo(
    () => deviations.filter((d) => d.isOverdue && d.status !== "closed"),
    [deviations]
  );

  // Areas for heatmap
  const areaHeatmap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deviations) {
      if (d.area) {
        map.set(d.area, (map.get(d.area) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deviations]);

  const maxAreaCount = useMemo(
    () => Math.max(...areaHeatmap.map(([, c]) => c), 1),
    [areaHeatmap]
  );

  if (!metrics) return null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="GMP Deviation Management"
        description="Track and investigate deviations from approved manufacturing processes"
        icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          icon={FileWarning}
          title="Open Deviations"
          value={metrics.totalOpen}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Critical Open"
          value={metrics.criticalOpen}
          iconColor="bg-red-100 text-red-600"
        />
        <StatsCard
          icon={Clock}
          title="Overdue"
          value={metrics.overdueCount}
          iconColor="bg-orange-100 text-orange-600"
        />
        <StatsCard
          icon={Target}
          title="Avg Closure Days"
          value={metrics.avgClosureDays}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={Shield}
          title="CAPA Linked %"
          value={`${metrics.capaLinkedPct}%`}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Repeat Rate %"
          value={`${metrics.repeatRate}%`}
          iconColor="bg-cyan-100 text-cyan-600"
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="deviations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deviations">Deviations</TabsTrigger>
          <TabsTrigger value="new">New Deviation</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ═══ DEVIATIONS TAB ═══ */}
        <TabsContent value="deviations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_WORKFLOW.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Classification</Label>
                  <Select
                    value={filterClassification}
                    onValueChange={setFilterClassification}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classifications</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(
                        Object.keys(CATEGORY_LABELS) as DeviationCategory[]
                      ).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select
                    value={filterDepartment}
                    onValueChange={setFilterDepartment}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
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
                    <TableHead className="w-[120px]">DEV #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Classification</TableHead>
                    <TableHead className="w-[110px]">Category</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[120px]">Department</TableHead>
                    <TableHead className="w-[70px]">Age</TableHead>
                    <TableHead className="w-[80px]">Overdue</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeviations.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-8"
                      >
                        No deviations match the current filters
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredDeviations.map((dev) => (
                    <TableRow
                      key={dev.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(dev)}
                    >
                      <TableCell className="font-mono text-sm">
                        {dev.number}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {dev.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs capitalize",
                            CLASSIFICATION_COLORS[dev.classification]
                          )}
                        >
                          {dev.classification}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {CATEGORY_LABELS[dev.category]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            STATUS_COLORS[dev.status]
                          )}
                        >
                          {STATUS_LABELS[dev.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dev.department}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ageDays(dev.detectedAt)}d
                      </TableCell>
                      <TableCell>
                        {dev.isOverdue && dev.status !== "closed" ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px]"
                          >
                            Overdue
                          </Badge>
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
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(dev);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ NEW DEVIATION TAB ═══ */}
        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report New Deviation</CardTitle>
              <CardDescription>
                Document a deviation from approved manufacturing processes, SOPs,
                or specifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="new-title">Title</Label>
                  <Input
                    id="new-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Brief title describing the deviation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newCategory}
                    onValueChange={(v) =>
                      setNewCategory(v as DeviationCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(CATEGORY_LABELS) as DeviationCategory[]
                      ).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Classification</Label>
                  <Select
                    value={newClassification}
                    onValueChange={(v) =>
                      setNewClassification(v as DeviationClassification)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="new-desc">Description</Label>
                  <Textarea
                    id="new-desc"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Detailed description of the deviation..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={newDepartment}
                    onValueChange={setNewDepartment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-area">Area</Label>
                  <Input
                    id="new-area"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="e.g., Granulation Suite A"
                  />
                </div>
              </div>

              <Separator />

              {/* Batches */}
              <div className="space-y-2">
                <Label>Affected Batches</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newBatches.map((b, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {b}
                      <button
                        onClick={() =>
                          setNewBatches((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newBatchInput}
                    onChange={(e) => setNewBatchInput(e.target.value)}
                    placeholder="e.g., BN-2026-0450"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBatch();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addBatch}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Products */}
              <div className="space-y-2">
                <Label>Affected Products</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newProducts.map((p, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {p}
                      <button
                        onClick={() =>
                          setNewProducts((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newProductInput}
                    onChange={(e) => setNewProductInput(e.target.value)}
                    placeholder="e.g., Amoxicillin 500mg Capsules"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addProduct();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addProduct}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="new-immediate">Immediate Action Taken</Label>
                <Textarea
                  id="new-immediate"
                  value={newImmediateAction}
                  onChange={(e) => setNewImmediateAction(e.target.value)}
                  placeholder="Describe any immediate containment actions taken..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-due">Due Date</Label>
                <Input
                  id="new-due"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleCreateDeviation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Deviation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TRENDS TAB ═══ */}
        <TabsContent value="trends" className="space-y-6">
          <DeviationTrendChart trends={trends} />

          {/* Repeat Deviations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repeat Deviations</CardTitle>
              <CardDescription>
                Deviations sharing the same root cause category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repeatDeviations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repeat deviation patterns detected
                </p>
              ) : (
                <div className="space-y-4">
                  {repeatDeviations.map((group) => (
                    <div
                      key={group.rootCauseCategory}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          Repeat Pattern
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {ROOT_CAUSE_CATEGORY_LABELS[group.rootCauseCategory]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({group.deviations.length} deviations)
                        </span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {group.deviations.map((dev) => (
                          <div
                            key={dev.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {dev.number}
                            </span>
                            <span>{dev.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Area Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deviations by Area
              </CardTitle>
              <CardDescription>
                Heatmap of deviation frequency across facility areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {areaHeatmap.map(([area, count]) => {
                  const intensity = count / maxAreaCount;
                  return (
                    <div
                      key={area}
                      className={cn(
                        "rounded-md p-3 text-sm border",
                        intensity >= 0.75
                          ? "bg-red-100 border-red-200 text-red-900"
                          : intensity >= 0.5
                          ? "bg-amber-100 border-amber-200 text-amber-900"
                          : intensity >= 0.25
                          ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                          : "bg-green-50 border-green-200 text-green-900"
                      )}
                    >
                      <div className="font-medium truncate">{area}</div>
                      <div className="text-xs mt-1">
                        {count} deviation{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
                {areaHeatmap.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    No area data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ ANALYTICS TAB ═══ */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* By Classification */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsByClassification.map(([cls, count]) => (
                    <div key={cls} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{cls}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            cls === "critical"
                              ? "bg-red-500"
                              : cls === "major"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          )}
                          style={{
                            width: `${
                              deviations.length > 0
                                ? (count / deviations.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsByCategory.map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Department */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsByDepartment.map(([dept, count]) => (
                    <div
                      key={dept}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{dept}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Root Causes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Top Root Cause Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topRootCauses.map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">
                        {ROOT_CAUSE_CATEGORY_LABELS[cat]}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                  {topRootCauses.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No root cause data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* MTTR by Classification */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Mean Time to Resolve (days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mttrByClassification.map(({ classification, mttr }) => (
                    <div key={classification} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{classification}</span>
                        <span className="font-medium">
                          {mttr > 0 ? `${mttr} days` : "N/A"}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            classification === "critical"
                              ? "bg-red-500"
                              : classification === "major"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          )}
                          style={{
                            width: `${Math.min(
                              (mttr / Math.max(...mttrByClassification.map((m) => m.mttr), 1)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Overdue List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Overdue Deviations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueDeviations.map((dev) => (
                    <div
                      key={dev.id}
                      className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1"
                      onClick={() => openDetail(dev)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {dev.number}
                        </span>
                        <span className="truncate">{dev.title}</span>
                      </div>
                      <Badge
                        variant="destructive"
                        className="text-[10px] shrink-0 ml-2"
                      >
                        {ageDays(dev.dueDate)}d late
                      </Badge>
                    </div>
                  ))}
                  {overdueDeviations.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No overdue deviations
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ DETAIL DIALOG ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDeviation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-base">
                    {selectedDeviation.number}
                  </span>
                  <span>{selectedDeviation.title}</span>
                </DialogTitle>
                <DialogDescription>
                  Detected on{" "}
                  {new Date(selectedDeviation.detectedAt).toLocaleDateString()} by{" "}
                  {selectedDeviation.detectedBy}
                </DialogDescription>
              </DialogHeader>

              {/* Status Workflow */}
              <div className="flex items-center gap-1 overflow-x-auto py-2">
                {STATUS_WORKFLOW.map((step, idx) => {
                  const currentIdx = STATUS_WORKFLOW.indexOf(
                    selectedDeviation.status
                  );
                  const isActive = step === selectedDeviation.status;
                  const isPast = idx < currentIdx;
                  return (
                    <div key={step} className="flex items-center">
                      {idx > 0 && (
                        <ArrowRight
                          className={cn(
                            "h-3 w-3 mx-0.5 shrink-0",
                            isPast
                              ? "text-green-500"
                              : "text-muted-foreground/30"
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap",
                          isActive
                            ? STATUS_COLORS[step]
                            : isPast
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {STATUS_LABELS[step]}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Classification
                    </span>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize",
                          CLASSIFICATION_COLORS[
                            selectedDeviation.classification
                          ]
                        )}
                      >
                        {selectedDeviation.classification}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="mt-1 font-medium capitalize">
                      {CATEGORY_LABELS[selectedDeviation.category]}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department</span>
                    <p className="mt-1 font-medium">
                      {selectedDeviation.department}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Area</span>
                    <p className="mt-1 font-medium">
                      {selectedDeviation.area}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">
                    Description
                  </span>
                  <p className="mt-1 text-sm">{selectedDeviation.description}</p>
                </div>

                {selectedDeviation.immediateAction && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Immediate Action Taken
                    </span>
                    <p className="mt-1 text-sm">
                      {selectedDeviation.immediateAction}
                    </p>
                  </div>
                )}

                {/* Affected batches/products */}
                {selectedDeviation.batchesAffected.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Affected Batches
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedDeviation.batchesAffected.map((b) => (
                        <Badge key={b} variant="outline" className="text-xs">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDeviation.productsAffected.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Affected Products
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedDeviation.productsAffected.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* CAPA Linkage */}
                {selectedDeviation.capaId && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Linked CAPA
                    </span>
                    <p className="mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {selectedDeviation.capaId}
                      </Badge>
                    </p>
                  </div>
                )}

                <Separator />

                {/* Investigation Section */}
                {selectedDeviation.investigation ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Investigation</h3>
                    <DeviationInvestigationForm
                      deviation={selectedDeviation}
                      onSave={handleSaveInvestigation}
                      readOnly={selectedDeviation.status === "closed"}
                    />
                  </div>
                ) : (
                  selectedDeviation.status === "open" && (
                    <div className="text-sm text-muted-foreground">
                      Investigation has not been started yet. Use the action
                      below to begin.
                    </div>
                  )
                )}

                <Separator />

                {/* Action Buttons based on status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Actions</h3>

                  {selectedDeviation.status === "open" && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Investigator Name</Label>
                        <Input
                          value={investigatorName}
                          onChange={(e) => setInvestigatorName(e.target.value)}
                          placeholder="Enter investigator name"
                          className="h-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleStartInvestigation}
                        disabled={!investigatorName.trim()}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Start Investigation
                      </Button>
                    </div>
                  )}

                  {selectedDeviation.status === "investigation" && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Root Cause</Label>
                        <Input
                          value={rootCauseText}
                          onChange={(e) => setRootCauseText(e.target.value)}
                          placeholder="Describe root cause"
                          className="h-9"
                        />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={rootCauseCat}
                          onValueChange={(v) =>
                            setRootCauseCat(v as RootCauseCategory)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROOT_CAUSE_CATEGORY_LABELS).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSetRootCause}
                        disabled={!rootCauseText.trim()}
                      >
                        Record Root Cause
                      </Button>
                    </div>
                  )}

                  {(selectedDeviation.status === "root-cause" ||
                    selectedDeviation.status === "capa-required") && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">CAPA ID</Label>
                        <Input
                          value={capaIdInput}
                          onChange={(e) => setCapaIdInput(e.target.value)}
                          placeholder="e.g., CAPA-2026-020"
                          className="h-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleLinkCAPA}
                        disabled={!capaIdInput.trim()}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Link CAPA
                      </Button>
                    </div>
                  )}

                  {(selectedDeviation.status === "capa-implementation" ||
                    selectedDeviation.status === "effectiveness-check") && (
                    <div className="flex items-end gap-2">
                      <div className="w-48 space-y-1">
                        <Label className="text-xs">Disposition Decision</Label>
                        <Select
                          value={dispositionInput}
                          onValueChange={(v) =>
                            setDispositionInput(v as DispositionDecision)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="release">Release</SelectItem>
                            <SelectItem value="reject">Reject</SelectItem>
                            <SelectItem value="rework">Rework</SelectItem>
                            <SelectItem value="return-to-supplier">
                              Return to Supplier
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" onClick={handleCloseDeviation}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Close Deviation
                      </Button>
                    </div>
                  )}

                  {selectedDeviation.status === "closed" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Closed on{" "}
                        {selectedDeviation.closedAt
                          ? new Date(
                              selectedDeviation.closedAt
                            ).toLocaleDateString()
                          : "N/A"}{" "}
                        by {selectedDeviation.closedBy ?? "N/A"}
                      </span>
                      {selectedDeviation.dispositionDecision && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {selectedDeviation.dispositionDecision.replace(
                            /-/g,
                            " "
                          )}
                        </Badge>
                      )}
                    </div>
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
