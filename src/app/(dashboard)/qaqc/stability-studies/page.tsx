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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StabilityChart from "@/components/shared/stability-chart";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  Activity,
  Clock,
  AlertTriangle,
  Package,
  CalendarDays,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowLeft,
  Filter,
  BarChart3,
  Thermometer,
  Droplets,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import type {
  StabilityStudy,
  StabilityStudyType,
  StabilityStatus,
  StabilityTimepoint,
  StabilityTest,
  StabilityCondition,
  StabilityTestParameter,
  StabilityMetrics,
  TimepointStatus,
  ShelfLifePrediction,
} from "@/lib/quality/stability-types";
import {
  ICH_CONDITIONS,
  TIMEPOINT_SCHEDULES,
  DEFAULT_TEST_PARAMETERS,
} from "@/lib/quality/stability-types";
import { StabilityStore, stabilityStore } from "@/lib/quality/stability-store";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STUDY_TYPE_LABELS: Record<StabilityStudyType, string> = {
  "long-term": "Long-term",
  accelerated: "Accelerated",
  intermediate: "Intermediate",
  "in-use": "In-use",
  photostability: "Photostability",
};

const STATUS_COLORS: Record<StabilityStatus, string> = {
  planned: "bg-blue-100 text-blue-800",
  ongoing: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

const TP_STATUS_COLORS: Record<TimepointStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  skipped: "bg-gray-100 text-gray-800",
};

function statusBadge(status: StabilityStatus) {
  return (
    <Badge className={cn("text-[10px] capitalize", STATUS_COLORS[status])}>
      {status}
    </Badge>
  );
}

function tpStatusBadge(status: TimepointStatus) {
  return (
    <Badge className={cn("text-[10px] capitalize", TP_STATUS_COLORS[status])}>
      {status === "in-progress" ? "In Progress" : status}
    </Badge>
  );
}

function trendIcon(trend: string) {
  if (trend === "increasing") return <TrendingUp className="h-3.5 w-3.5 text-amber-500" />;
  if (trend === "decreasing") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-green-500" />;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysFromNow(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Page Component ───────────────────────────────────────────────────────

export default function StabilityStudiesPage() {
  const [studies, setStudies] = useState<StabilityStudy[]>([]);
  const [metrics, setMetrics] = useState<StabilityMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("studies");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [selectedStudy, setSelectedStudy] = useState<StabilityStudy | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New study form state
  const [formProduct, setFormProduct] = useState("");
  const [formBatch, setFormBatch] = useState("");
  const [formBatchSize, setFormBatchSize] = useState("");
  const [formStudyType, setFormStudyType] = useState<StabilityStudyType>("long-term");
  const [formCondition, setFormCondition] = useState("");
  const [formDuration, setFormDuration] = useState("24");
  const [formPackaging, setFormPackaging] = useState("");
  const [formInitiatedBy, setFormInitiatedBy] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTestParams, setFormTestParams] = useState<StabilityTestParameter[]>([
    "assay",
    "dissolution",
    "moisture",
    "appearance",
  ]);

  // Timepoint recording state
  const [recordStudyId, setRecordStudyId] = useState<string>("");
  const [recordTpId, setRecordTpId] = useState<string>("");
  const [recordPerformedBy, setRecordPerformedBy] = useState("");
  const [recordResults, setRecordResults] = useState<
    Record<string, string>
  >({});
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────

  const refreshData = useCallback(() => {
    setStudies(stabilityStore.getAll());
    setMetrics(stabilityStore.getMetrics());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Derived data ──────────────────────────────────────────────────────

  const uniqueProducts = useMemo(
    () => stabilityStore.getUniqueProducts(),
    [studies]
  );

  const filteredStudies = useMemo(() => {
    let result = studies;
    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }
    if (filterType !== "all") {
      result = result.filter((s) => s.studyType === filterType);
    }
    if (filterProduct !== "all") {
      result = result.filter((s) => s.product === filterProduct);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.protocolNumber.toLowerCase().includes(term) ||
          s.product.toLowerCase().includes(term) ||
          s.batchNumber.toLowerCase().includes(term)
      );
    }
    return result;
  }, [studies, filterStatus, filterType, filterProduct, searchTerm]);

  const upcomingTimepoints = useMemo(
    () => stabilityStore.getUpcomingTimepoints(60),
    [studies]
  );

  const overdueTimepoints = useMemo(
    () => stabilityStore.getOverdueTimepoints(),
    [studies]
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleOpenStudy = useCallback((study: StabilityStudy) => {
    setSelectedStudy(study);
    setDialogOpen(true);
  }, []);

  const handleCreateStudy = useCallback(() => {
    if (!formProduct || !formBatch || !formCondition || !formInitiatedBy) return;

    const condition = ICH_CONDITIONS.find((c) => c.id === formCondition);
    if (!condition) return;

    const productCode =
      formProduct === "Amoxicillin 500mg"
        ? "AMX-500"
        : formProduct === "Omeprazole 20mg"
          ? "OMP-020"
          : formProduct === "Metformin 850mg"
            ? "MET-850"
            : formProduct === "Atorvastatin 10mg"
              ? "ATV-010"
              : formProduct === "Losartan 50mg"
                ? "LOS-050"
                : "PROD-001";

    stabilityStore.create({
      product: formProduct,
      productCode,
      batchNumber: formBatch,
      batchSize: formBatchSize || "100,000 units",
      studyType: formStudyType,
      condition,
      plannedDurationMonths: parseInt(formDuration, 10) || 24,
      testParameters: formTestParams,
      packagingType: formPackaging || "Standard packaging",
      initiatedBy: formInitiatedBy,
      notes: formNotes || undefined,
    });

    // Reset form
    setFormProduct("");
    setFormBatch("");
    setFormBatchSize("");
    setFormStudyType("long-term");
    setFormCondition("");
    setFormDuration("24");
    setFormPackaging("");
    setFormInitiatedBy("");
    setFormNotes("");
    setFormTestParams(["assay", "dissolution", "moisture", "appearance"]);
    setActiveTab("studies");
    refreshData();
  }, [
    formProduct,
    formBatch,
    formBatchSize,
    formStudyType,
    formCondition,
    formDuration,
    formPackaging,
    formInitiatedBy,
    formNotes,
    formTestParams,
    refreshData,
  ]);

  const handleToggleTestParam = useCallback(
    (param: StabilityTestParameter) => {
      setFormTestParams((prev) =>
        prev.includes(param)
          ? prev.filter((p) => p !== param)
          : [...prev, param]
      );
    },
    []
  );

  const handleOpenRecordDialog = useCallback(
    (studyId: string, tpId: string) => {
      setRecordStudyId(studyId);
      setRecordTpId(tpId);
      setRecordResults({});
      setRecordPerformedBy("");
      setRecordDialogOpen(true);
    },
    []
  );

  const handleRecordResults = useCallback(() => {
    if (!recordStudyId || !recordTpId || !recordPerformedBy) return;

    const results: { parameter: StabilityTestParameter; result: number }[] = [];
    for (const [param, value] of Object.entries(recordResults)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        results.push({ parameter: param as StabilityTestParameter, result: num });
      }
    }

    if (results.length === 0) return;

    stabilityStore.recordTimepointResults(
      recordStudyId,
      recordTpId,
      results,
      recordPerformedBy
    );

    setRecordDialogOpen(false);
    refreshData();
  }, [recordStudyId, recordTpId, recordPerformedBy, recordResults, refreshData]);

  // ── Auto-generate timepoint schedule display ─────────────────────────

  const autoSchedule = useMemo(() => {
    return TIMEPOINT_SCHEDULES[formStudyType] ?? [];
  }, [formStudyType]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Stability Studies"
        description="ICH Q1A/Q1E compliant stability study management and shelf-life prediction"
        icon={<FlaskConical className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={() => setActiveTab("new-study")}>
            <Plus className="h-4 w-4 mr-2" />
            New Study
          </Button>
        }
      />

      {/* ── Stats Cards ──────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={Activity}
            title="Active Studies"
            value={metrics.activeStudies}
            subtitle={`${metrics.totalStudies} total`}
            iconColor="bg-emerald-100 text-emerald-700"
          />
          <StatsCard
            icon={Clock}
            title="Upcoming Timepoints"
            value={metrics.upcomingTimepoints}
            subtitle="Within 30 days"
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Overdue Timepoints"
            value={metrics.overdueTimepoints}
            subtitle="Requires attention"
            iconColor="bg-red-100 text-red-700"
          />
          <StatsCard
            icon={Package}
            title="Products on Stability"
            value={metrics.productsOnStability}
            subtitle={`${metrics.completedStudies} completed`}
            iconColor="bg-purple-100 text-purple-700"
          />
          <StatsCard
            icon={CalendarDays}
            title="Avg Shelf Life"
            value={`${metrics.avgShelfLifeMonths}mo`}
            subtitle={`${metrics.complianceRate}% compliance`}
            iconColor="bg-amber-100 text-amber-700"
          />
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="studies">Studies</TabsTrigger>
          <TabsTrigger value="new-study">New Study</TabsTrigger>
          <TabsTrigger value="timepoints">Timepoints</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ━━━━━━━━━━━━━ TAB: Studies ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="studies">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stability Studies Register</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search protocol, product, batch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Study Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="long-term">Long-term</SelectItem>
                    <SelectItem value="accelerated">Accelerated</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="in-use">In-use</SelectItem>
                    <SelectItem value="photostability">Photostability</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {uniqueProducts.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Protocol #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shelf Life</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No studies found matching the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudies.map((study) => (
                        <TableRow
                          key={study.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleOpenStudy(study)}
                        >
                          <TableCell className="font-mono text-xs font-semibold">
                            {study.protocolNumber}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {study.product}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {study.batchNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {STUDY_TYPE_LABELS[study.studyType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {study.condition.label}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(study.startDate)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {study.plannedDurationMonths} months
                          </TableCell>
                          <TableCell>{statusBadge(study.status)}</TableCell>
                          <TableCell className="text-xs">
                            {study.shelfLifePrediction
                              ? `${study.shelfLifePrediction.estimatedShelfLifeMonths}mo`
                              : "--"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStudy(study);
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━━━━━━━━━ TAB: New Study ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="new-study">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Stability Study
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Selection */}
                <div className="space-y-2">
                  <Label htmlFor="form-product">Product *</Label>
                  <Select value={formProduct} onValueChange={setFormProduct}>
                    <SelectTrigger id="form-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amoxicillin 500mg">Amoxicillin 500mg</SelectItem>
                      <SelectItem value="Omeprazole 20mg">Omeprazole 20mg</SelectItem>
                      <SelectItem value="Metformin 850mg">Metformin 850mg</SelectItem>
                      <SelectItem value="Atorvastatin 10mg">Atorvastatin 10mg</SelectItem>
                      <SelectItem value="Losartan 50mg">Losartan 50mg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Number */}
                <div className="space-y-2">
                  <Label htmlFor="form-batch">Batch Number *</Label>
                  <Input
                    id="form-batch"
                    placeholder="e.g. AMX-2026-B001"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                  />
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <Label htmlFor="form-batch-size">Batch Size</Label>
                  <Input
                    id="form-batch-size"
                    placeholder="e.g. 500,000 tablets"
                    value={formBatchSize}
                    onChange={(e) => setFormBatchSize(e.target.value)}
                  />
                </div>

                {/* Study Type */}
                <div className="space-y-2">
                  <Label htmlFor="form-type">Study Type *</Label>
                  <Select
                    value={formStudyType}
                    onValueChange={(v) => setFormStudyType(v as StabilityStudyType)}
                  >
                    <SelectTrigger id="form-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long-term">Long-term</SelectItem>
                      <SelectItem value="accelerated">Accelerated</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="in-use">In-use</SelectItem>
                      <SelectItem value="photostability">Photostability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Storage Condition */}
                <div className="space-y-2">
                  <Label htmlFor="form-condition">Storage Condition *</Label>
                  <Select value={formCondition} onValueChange={setFormCondition}>
                    <SelectTrigger id="form-condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICH_CONDITIONS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} - {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Planned Duration */}
                <div className="space-y-2">
                  <Label htmlFor="form-duration">Planned Duration (months)</Label>
                  <Input
                    id="form-duration"
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    min={1}
                    max={60}
                  />
                </div>

                {/* Packaging Type */}
                <div className="space-y-2">
                  <Label htmlFor="form-packaging">Packaging Type</Label>
                  <Input
                    id="form-packaging"
                    placeholder="e.g. HDPE bottle with CRC"
                    value={formPackaging}
                    onChange={(e) => setFormPackaging(e.target.value)}
                  />
                </div>

                {/* Initiated By */}
                <div className="space-y-2">
                  <Label htmlFor="form-initiated-by">Initiated By *</Label>
                  <Input
                    id="form-initiated-by"
                    placeholder="e.g. Dr. Ahmed Hassan"
                    value={formInitiatedBy}
                    onChange={(e) => setFormInitiatedBy(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="form-notes">Notes</Label>
                  <Input
                    id="form-notes"
                    placeholder="Optional study notes..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Test Parameters Selection */}
              <div className="mt-6">
                <Label className="mb-3 block">Test Parameters</Label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "assay",
                      "dissolution",
                      "moisture",
                      "appearance",
                      "pH",
                      "microbial",
                      "impurities",
                      "hardness",
                      "disintegration",
                      "uniformity",
                    ] as StabilityTestParameter[]
                  ).map((param) => (
                    <Badge
                      key={param}
                      variant={formTestParams.includes(param) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer capitalize",
                        formTestParams.includes(param)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => handleToggleTestParam(param)}
                    >
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Auto-generated Schedule Preview */}
              <div className="mt-6">
                <Label className="mb-3 block">
                  Timepoint Schedule (auto-generated)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {autoSchedule.map((month) => (
                    <div
                      key={month}
                      className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs bg-muted/50"
                    >
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {month === 0 ? "Initial" : `${month}M`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setActiveTab("studies")}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateStudy}
                  disabled={
                    !formProduct || !formBatch || !formCondition || !formInitiatedBy
                  }
                >
                  Create Study
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━━━━━━━━━ TAB: Timepoints ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="timepoints">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Timepoints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Timepoints ({overdueTimepoints.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueTimepoints.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No overdue timepoints. All studies are on schedule.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueTimepoints.map((item, i) => (
                      <div
                        key={`overdue-${i}`}
                        className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50/50 p-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {item.study.protocolNumber} - {item.study.product}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Batch: {item.study.batchNumber} | {item.study.condition.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Timepoint: {item.timepoint.month === 0 ? "Initial" : `${item.timepoint.month}M`} |
                            Scheduled: {formatDate(item.timepoint.scheduledDate)}
                          </p>
                          <Badge className="bg-red-100 text-red-800 text-[10px]">
                            {item.daysOverdue} days overdue
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-100"
                          onClick={() =>
                            handleOpenRecordDialog(item.study.id, item.timepoint.id)
                          }
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Record
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Timepoints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  Upcoming Timepoints ({upcomingTimepoints.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTimepoints.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No upcoming timepoints within the next 60 days.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTimepoints.slice(0, 10).map((item, i) => (
                      <div
                        key={`upcoming-${i}`}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {item.study.protocolNumber} - {item.study.product}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Batch: {item.study.batchNumber} | {item.study.condition.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Timepoint: {item.timepoint.month === 0 ? "Initial" : `${item.timepoint.month}M`} |
                            Scheduled: {formatDate(item.timepoint.scheduledDate)}
                          </p>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                            {item.daysUntil === 0
                              ? "Due today"
                              : `${item.daysUntil} days away`}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleOpenRecordDialog(item.study.id, item.timepoint.id)
                          }
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Record
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full timepoint calendar view */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                All Study Timepoints Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Timepoint</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studies
                      .filter(
                        (s) => s.status === "ongoing" || s.status === "planned"
                      )
                      .flatMap((study) =>
                        study.timepoints
                          .filter(
                            (tp) =>
                              tp.status !== "completed" && tp.status !== "skipped"
                          )
                          .map((tp) => ({ study, tp }))
                      )
                      .sort((a, b) => {
                        const dateA = new Date(a.tp.scheduledDate).getTime();
                        const dateB = new Date(b.tp.scheduledDate).getTime();
                        return dateA - dateB;
                      })
                      .slice(0, 20)
                      .map((item, i) => (
                        <TableRow key={`cal-${i}`}>
                          <TableCell className="font-mono text-xs">
                            {item.study.protocolNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.study.product}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.study.condition.label}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.tp.month === 0 ? "Initial" : `${item.tp.month}M`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(item.tp.scheduledDate)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(item.tp.actualDate)}
                          </TableCell>
                          <TableCell>{tpStatusBadge(item.tp.status)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleOpenRecordDialog(
                                  item.study.id,
                                  item.tp.id
                                )
                              }
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━━━━━━━━━ TAB: Analytics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="analytics">
          <AnalyticsTab studies={studies} metrics={metrics} />
        </TabsContent>
      </Tabs>

      {/* ── Study Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedStudy && (
            <StudyDetailView
              study={selectedStudy}
              onRecordTimepoint={(tpId) => {
                handleOpenRecordDialog(selectedStudy.id, tpId);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Record Results Dialog ────────────────────────────────────── */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Timepoint Results</DialogTitle>
            <DialogDescription>
              Enter the test results for this stability timepoint.
            </DialogDescription>
          </DialogHeader>
          <RecordResultsForm
            studyId={recordStudyId}
            timepointId={recordTpId}
            performedBy={recordPerformedBy}
            results={recordResults}
            onPerformedByChange={setRecordPerformedBy}
            onResultChange={(param, value) =>
              setRecordResults((prev) => ({ ...prev, [param]: value }))
            }
            onSubmit={handleRecordResults}
            onCancel={() => setRecordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Study Detail View ────────────────────────────────────────────────────

function StudyDetailView({
  study,
  onRecordTimepoint,
}: {
  study: StabilityStudy;
  onRecordTimepoint: (tpId: string) => void;
}) {
  const [chartParam, setChartParam] = useState<string>("assay");

  // Available numeric test parameters for this study
  const numericParams = useMemo(() => {
    const params = new Set<string>();
    for (const tp of study.timepoints) {
      for (const test of tp.tests) {
        if (test.parameter !== "appearance" && test.parameter !== "microbial") {
          params.add(test.parameter);
        }
      }
    }
    return Array.from(params);
  }, [study]);

  // Get spec limits for selected parameter
  const specLimits = useMemo(() => {
    for (const tp of study.timepoints) {
      const test = tp.tests.find((t) => t.parameter === chartParam);
      if (test) {
        return { min: test.specificationMin, max: test.specificationMax };
      }
    }
    return { min: undefined, max: undefined };
  }, [study, chartParam]);

  // Get the parameter label
  const paramLabel = useMemo(() => {
    for (const tp of study.timepoints) {
      const test = tp.tests.find((t) => t.parameter === chartParam);
      if (test) return test.parameterLabel;
    }
    return chartParam;
  }, [study, chartParam]);

  // Get unit
  const paramUnit = useMemo(() => {
    for (const tp of study.timepoints) {
      const test = tp.tests.find((t) => t.parameter === chartParam);
      if (test) return test.unit;
    }
    return "";
  }, [study, chartParam]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          {study.protocolNumber} - {study.product}
        </DialogTitle>
        <DialogDescription>
          {STUDY_TYPE_LABELS[study.studyType]} stability study at{" "}
          {study.condition.label}
        </DialogDescription>
      </DialogHeader>

      {/* Protocol Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Batch Number
          </p>
          <p className="text-sm font-mono font-medium">{study.batchNumber}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Batch Size
          </p>
          <p className="text-sm">{study.batchSize}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Start Date
          </p>
          <p className="text-sm">{formatDate(study.startDate)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Status
          </p>
          {statusBadge(study.status)}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Condition
          </p>
          <p className="text-sm">
            {study.condition.label}
            {study.condition.lightExposure && (
              <span className="block text-[10px] text-muted-foreground">
                {study.condition.lightExposure}
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Duration
          </p>
          <p className="text-sm">{study.plannedDurationMonths} months</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Packaging
          </p>
          <p className="text-sm">{study.packagingType}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Initiated By
          </p>
          <p className="text-sm">{study.initiatedBy}</p>
        </div>
      </div>

      {/* Shelf Life Prediction */}
      {study.shelfLifePrediction && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1 mb-2">
            <CalendarDays className="h-4 w-4" />
            Shelf Life Prediction
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-blue-600 uppercase">
                Est. Shelf Life
              </p>
              <p className="text-lg font-bold text-blue-800">
                {study.shelfLifePrediction.estimatedShelfLifeMonths} months
              </p>
            </div>
            <div>
              <p className="text-[10px] text-blue-600 uppercase">Confidence</p>
              <p className="text-lg font-bold text-blue-800">
                {study.shelfLifePrediction.confidenceLevel}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-blue-600 uppercase">
                Degradation Rate
              </p>
              <p className="text-sm font-medium text-blue-800">
                {study.shelfLifePrediction.degradationRatePerMonth}%/month
              </p>
            </div>
            <div>
              <p className="text-[10px] text-blue-600 uppercase">Method</p>
              <p className="text-xs text-blue-700">
                {study.shelfLifePrediction.method}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timepoint Schedule */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Timepoint Schedule</h4>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Timepoint</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {study.timepoints.map((tp) => (
                <TableRow key={tp.id}>
                  <TableCell className="font-medium text-sm">
                    {tp.month === 0 ? "Initial" : `${tp.month}M`}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(tp.scheduledDate)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(tp.actualDate)}
                  </TableCell>
                  <TableCell>{tpStatusBadge(tp.status)}</TableCell>
                  <TableCell className="text-xs">
                    {tp.performedBy ?? "--"}
                  </TableCell>
                  <TableCell>
                    {tp.status !== "completed" && tp.status !== "skipped" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRecordTimepoint(tp.id)}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Test Results */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Test Results Summary</h4>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Specification</TableHead>
                {study.timepoints
                  .filter((tp) => tp.status === "completed")
                  .map((tp) => (
                    <TableHead key={tp.id} className="text-center text-xs">
                      {tp.month === 0 ? "Initial" : `${tp.month}M`}
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Get unique test parameters
                const paramSet = new Set<string>();
                study.timepoints.forEach((tp) =>
                  tp.tests.forEach((t) => paramSet.add(t.parameter))
                );
                return Array.from(paramSet).map((param) => {
                  const firstTest = study.timepoints
                    .flatMap((tp) => tp.tests)
                    .find((t) => t.parameter === param);
                  if (!firstTest) return null;

                  const specText =
                    firstTest.specificationText ??
                    [
                      firstTest.specificationMin != null
                        ? `>= ${firstTest.specificationMin}`
                        : "",
                      firstTest.specificationMax != null
                        ? `<= ${firstTest.specificationMax}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(", ");

                  return (
                    <TableRow key={param}>
                      <TableCell className="font-medium text-xs">
                        {firstTest.parameterLabel}
                        {firstTest.unit ? ` (${firstTest.unit})` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {specText || "--"}
                      </TableCell>
                      {study.timepoints
                        .filter((tp) => tp.status === "completed")
                        .map((tp) => {
                          const test = tp.tests.find(
                            (t) => t.parameter === param
                          );
                          if (!test) {
                            return (
                              <TableCell
                                key={`${tp.id}-${param}`}
                                className="text-center text-xs text-muted-foreground"
                              >
                                --
                              </TableCell>
                            );
                          }
                          if (test.resultText) {
                            return (
                              <TableCell
                                key={`${tp.id}-${param}`}
                                className="text-center text-xs"
                              >
                                {test.resultText}
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell
                              key={`${tp.id}-${param}`}
                              className={cn(
                                "text-center text-xs font-mono",
                                !test.passesSpec && "text-red-600 font-bold"
                              )}
                            >
                              <span className="flex items-center justify-center gap-1">
                                {test.result != null
                                  ? test.result.toFixed(2)
                                  : "--"}
                                {test.result != null && trendIcon(test.trend)}
                                {!test.passesSpec && (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                              </span>
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Trend Chart */}
      {numericParams.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-sm font-semibold">Trend Chart</h4>
            <Select value={chartParam} onValueChange={setChartParam}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericParams.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <StabilityChart
            timepoints={study.timepoints}
            parameter={chartParam}
            parameterLabel={paramLabel}
            unit={paramUnit}
            specMin={specLimits.min}
            specMax={specLimits.max}
            prediction={study.shelfLifePrediction}
            plannedMonths={study.plannedDurationMonths}
            height={280}
          />
        </div>
      )}
    </>
  );
}

// ─── Record Results Form ──────────────────────────────────────────────────

function RecordResultsForm({
  studyId,
  timepointId,
  performedBy,
  results,
  onPerformedByChange,
  onResultChange,
  onSubmit,
  onCancel,
}: {
  studyId: string;
  timepointId: string;
  performedBy: string;
  results: Record<string, string>;
  onPerformedByChange: (v: string) => void;
  onResultChange: (param: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const study = stabilityStore.getById(studyId);
  const timepoint = study?.timepoints.find((tp) => tp.id === timepointId);

  if (!study || !timepoint) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Study or timepoint not found.
      </div>
    );
  }

  const numericTests = timepoint.tests.filter(
    (t) => t.parameter !== "appearance"
  );

  return (
    <div className="space-y-4 mt-2">
      <div className="text-sm text-muted-foreground">
        <strong>{study.protocolNumber}</strong> - {study.product} |{" "}
        {timepoint.month === 0 ? "Initial" : `${timepoint.month}M`} timepoint
      </div>

      <div className="space-y-2">
        <Label>Performed By *</Label>
        <Input
          placeholder="Name of analyst"
          value={performedBy}
          onChange={(e) => onPerformedByChange(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label>Test Results</Label>
        {numericTests.map((test) => (
          <div
            key={test.id}
            className="flex items-center gap-3"
          >
            <Label className="min-w-[120px] text-xs">
              {test.parameterLabel}
              {test.unit ? ` (${test.unit})` : ""}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder={
                test.specificationMin != null && test.specificationMax != null
                  ? `${test.specificationMin} - ${test.specificationMax}`
                  : "Result"
              }
              value={results[test.parameter] ?? ""}
              onChange={(e) => onResultChange(test.parameter, e.target.value)}
              className="w-[140px]"
            />
            {test.specificationMin != null || test.specificationMax != null ? (
              <span className="text-[10px] text-muted-foreground">
                Spec:{" "}
                {[
                  test.specificationMin != null
                    ? `>= ${test.specificationMin}`
                    : "",
                  test.specificationMax != null
                    ? `<= ${test.specificationMax}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!performedBy}>
          Save Results
        </Button>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────

function AnalyticsTab({
  studies,
  metrics,
}: {
  studies: StabilityStudy[];
  metrics: StabilityMetrics | null;
}) {
  if (!metrics) return null;

  // ── Trend Comparison: Group studies by product that share the same batch ──
  const productGroups = useMemo(() => {
    const groups: Record<string, StabilityStudy[]> = {};
    for (const s of studies) {
      if (!groups[s.product]) groups[s.product] = [];
      groups[s.product].push(s);
    }
    return groups;
  }, [studies]);

  // ── Shelf Life by Product ──
  const shelfLifeByProduct = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const s of studies) {
      if (!s.shelfLifePrediction) continue;
      if (!map[s.product]) map[s.product] = [];
      map[s.product].push(s.shelfLifePrediction.estimatedShelfLifeMonths);
    }
    return Object.entries(map).map(([product, values]) => ({
      product,
      avgShelfLife: Math.round(
        values.reduce((sum, v) => sum + v, 0) / values.length
      ),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    }));
  }, [studies]);

  // ── Degradation Rate Analysis ──
  const degradationRates = useMemo(() => {
    return studies
      .filter((s) => s.shelfLifePrediction && s.shelfLifePrediction.degradationRatePerMonth !== 0)
      .map((s) => ({
        protocol: s.protocolNumber,
        product: s.product,
        condition: s.condition.label,
        type: STUDY_TYPE_LABELS[s.studyType],
        rate: s.shelfLifePrediction!.degradationRatePerMonth,
        r2: s.shelfLifePrediction!.r2,
        shelfLife: s.shelfLifePrediction!.estimatedShelfLifeMonths,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [studies]);

  // ── Study Compliance ──
  const complianceData = useMemo(() => {
    const data: {
      protocol: string;
      product: string;
      totalTPs: number;
      completedTPs: number;
      overdueTPs: number;
      rate: number;
    }[] = [];

    for (const s of studies) {
      if (s.status === "cancelled") continue;
      const total = s.timepoints.length;
      const completed = s.timepoints.filter(
        (tp) => tp.status === "completed"
      ).length;
      const overdue = s.timepoints.filter(
        (tp) => tp.status === "overdue"
      ).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      data.push({
        protocol: s.protocolNumber,
        product: s.product,
        totalTPs: total,
        completedTPs: completed,
        overdueTPs: overdue,
        rate,
      });
    }
    return data;
  }, [studies]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Study Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Studies by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.studiesByType).map(([type, count]) => {
              const total = metrics.totalStudies || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">
                      {STUDY_TYPE_LABELS[type as StabilityStudyType]}
                    </span>
                    <span className="font-medium">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Studies by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.studiesByStatus)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => {
                const total = metrics.totalStudies || 1;
                const pct = Math.round((count / total) * 100);
                const barColors: Record<string, string> = {
                  planned: "bg-blue-500",
                  ongoing: "bg-emerald-500",
                  completed: "bg-green-500",
                  cancelled: "bg-gray-400",
                  failed: "bg-red-500",
                };
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span className="font-medium">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          barColors[status] ?? "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Shelf Life by Product */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Shelf Life by Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shelfLifeByProduct.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No shelf life predictions available yet.
            </p>
          ) : (
            <div className="space-y-4">
              {shelfLifeByProduct.map((item) => (
                <div
                  key={item.product}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.product}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      Avg: {item.avgShelfLife} months
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Min: {item.min}mo</span>
                    <span>Max: {item.max}mo</span>
                    <span>{item.count} studies</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          (item.avgShelfLife / 60) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Study Compliance Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Study Compliance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceData.map((item) => (
                  <TableRow key={item.protocol}>
                    <TableCell className="font-mono text-xs">
                      {item.protocol}
                    </TableCell>
                    <TableCell className="text-xs">{item.product}</TableCell>
                    <TableCell className="text-center text-xs">
                      {item.totalTPs}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {item.completedTPs}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {item.overdueTPs > 0 ? (
                        <span className="text-red-600 font-medium">
                          {item.overdueTPs}
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "text-[10px]",
                          item.rate >= 80
                            ? "bg-green-100 text-green-800"
                            : item.rate >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        )}
                      >
                        {item.rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Degradation Rate Analysis */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Degradation Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {degradationRates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No degradation data available yet.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">
                      Degradation Rate (%/mo)
                    </TableHead>
                    <TableHead className="text-right">R-squared</TableHead>
                    <TableHead className="text-right">
                      Est. Shelf Life
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {degradationRates.map((item) => (
                    <TableRow key={item.protocol}>
                      <TableCell className="font-mono text-xs">
                        {item.protocol}
                      </TableCell>
                      <TableCell className="text-xs">{item.product}</TableCell>
                      <TableCell className="text-xs">{item.type}</TableCell>
                      <TableCell className="text-xs">
                        {item.condition}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs font-mono",
                          item.rate < -0.3
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.rate.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {item.r2.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {item.shelfLife} months
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condition Comparison Charts */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Trend Comparison Across Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(productGroups).map(([product, productStudies]) => {
              // Only show if multiple conditions exist for same product
              if (productStudies.length < 2) return null;

              const primaryStudy =
                productStudies.find((s) => s.studyType === "long-term") ??
                productStudies[0];
              const overlayStudies = productStudies.filter(
                (s) => s.id !== primaryStudy.id
              );

              // Find common assay parameter
              const hasAssay = primaryStudy.timepoints.some((tp) =>
                tp.tests.some((t) => t.parameter === "assay")
              );
              if (!hasAssay) return null;

              // Get spec limits from primary study
              const assayTest = primaryStudy.timepoints
                .flatMap((tp) => tp.tests)
                .find((t) => t.parameter === "assay");

              return (
                <div key={product}>
                  <h5 className="text-sm font-medium mb-2">
                    {product} - Assay Trend Comparison
                  </h5>
                  <StabilityChart
                    timepoints={primaryStudy.timepoints}
                    parameter="assay"
                    parameterLabel={`Assay - ${primaryStudy.condition.label}`}
                    unit="%"
                    specMin={assayTest?.specificationMin}
                    specMax={assayTest?.specificationMax}
                    prediction={primaryStudy.shelfLifePrediction}
                    plannedMonths={primaryStudy.plannedDurationMonths}
                    height={300}
                    overlays={overlayStudies.map((s, idx) => ({
                      label: `${STUDY_TYPE_LABELS[s.studyType]} (${s.condition.label})`,
                      color:
                        CONDITION_COLORS[(idx + 1) % CONDITION_COLORS.length],
                      timepoints: s.timepoints,
                    }))}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CONDITION_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
];
