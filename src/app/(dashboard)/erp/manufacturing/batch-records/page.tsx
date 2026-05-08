"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/page-header";
import MBRBPRComparison from "@/components/shared/mbr-bpr-comparison";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Factory,
  FileText,
  PlayCircle,
  GitCompare,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Eye,
  Plus,
  ChevronRight,
  Beaker,
  FlaskConical,
  Scale,
  Activity,
  Target,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { manufacturingStore } from "@/lib/manufacturing/mbr-store";
import type {
  MasterBatchRecord,
  BatchProductionRecord,
  VarianceRecord,
  BPRStatus,
  MBRStatus,
  MBRMetrics,
  YieldReconciliation,
} from "@/lib/manufacturing/mbr-types";

// ── Status helpers ────────────────────────────────────────────────
const BPR_STATUS_CONFIG: Record<
  BPRStatus,
  { label: string; color: string; bgColor: string }
> = {
  planned: { label: "Planned", color: "text-slate-700", bgColor: "bg-slate-100 border-slate-300" },
  "in-progress": { label: "In Progress", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  weighing: { label: "Weighing", color: "text-indigo-700", bgColor: "bg-indigo-50 border-indigo-200" },
  processing: { label: "Processing", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  "ipc-hold": { label: "IPC Hold", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  packaging: { label: "Packaging", color: "text-cyan-700", bgColor: "bg-cyan-50 border-cyan-200" },
  review: { label: "Review", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" },
  "qa-release": { label: "QA Release", color: "text-teal-700", bgColor: "bg-teal-50 border-teal-200" },
  released: { label: "Released", color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
};

const MBR_STATUS_CONFIG: Record<
  MBRStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: "Draft", color: "text-slate-700", bgColor: "bg-slate-100 border-slate-300" },
  approved: { label: "Approved", color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  superseded: { label: "Superseded", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
};

function BPRStatusBadge({ status }: { status: BPRStatus }) {
  const cfg = BPR_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.color, cfg.bgColor)}>
      {cfg.label}
    </Badge>
  );
}

function MBRStatusBadge({ status }: { status: MBRStatus }) {
  const cfg = MBR_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.color, cfg.bgColor)}>
      {cfg.label}
    </Badge>
  );
}

// ── Stats Card ────────────────────────────────────────────────────
function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            {trend && (
              <>
                {trendUp ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={trendUp ? "text-green-600" : "text-red-600"}>
                  {trend}
                </span>
              </>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Main Page Component
// ══════════════════════════════════════════════════════════════════

export default function BatchRecordsPage() {
  const [activeTab, setActiveTab] = useState("master");
  const [mbrs, setMBRs] = useState<MasterBatchRecord[]>([]);
  const [bprs, setBPRs] = useState<BatchProductionRecord[]>([]);
  const [metrics, setMetrics] = useState<MBRMetrics | null>(null);
  const [selectedMBR, setSelectedMBR] = useState<MasterBatchRecord | null>(null);
  const [selectedBPR, setSelectedBPR] = useState<BatchProductionRecord | null>(null);
  const [comparisonBPRId, setComparisonBPRId] = useState<string>("");
  const [showMBRDetail, setShowMBRDetail] = useState(false);
  const [showBPRExecution, setShowBPRExecution] = useState(false);
  const [showNewMBR, setShowNewMBR] = useState(false);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterBPRStatus, setFilterBPRStatus] = useState<string>("all");

  // ── Data loading ──
  const reload = useCallback(() => {
    setMBRs(manufacturingStore.getAllMBRs());
    setBPRs(manufacturingStore.getAllBPRs());
    setMetrics(manufacturingStore.getMetrics());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Derived data ──
  const products = useMemo(
    () => Array.from(new Set(mbrs.map((m) => m.product))),
    [mbrs]
  );

  const filteredMBRs = useMemo(
    () =>
      filterProduct === "all"
        ? mbrs
        : mbrs.filter((m) => m.product === filterProduct),
    [mbrs, filterProduct]
  );

  const filteredBPRs = useMemo(() => {
    let list = bprs;
    if (filterProduct !== "all") {
      list = list.filter((b) => b.product === filterProduct);
    }
    if (filterBPRStatus !== "all") {
      list = list.filter((b) => b.status === filterBPRStatus);
    }
    return list;
  }, [bprs, filterProduct, filterBPRStatus]);

  const comparisonBPR = useMemo(
    () => bprs.find((b) => b.id === comparisonBPRId),
    [bprs, comparisonBPRId]
  );

  const comparisonMBR = useMemo(
    () => (comparisonBPR ? mbrs.find((m) => m.id === comparisonBPR.mbrId) : undefined),
    [mbrs, comparisonBPR]
  );

  const comparisonVariances = useMemo(
    () => (comparisonBPRId ? manufacturingStore.getVariancesForBPR(comparisonBPRId) : []),
    [comparisonBPRId]
  );

  const allVariances = useMemo(
    () => manufacturingStore.getAllVariances(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bprs]
  );

  // ── New MBR form state ──
  const [newMBRProduct, setNewMBRProduct] = useState("");
  const [newMBRDosageForm, setNewMBRDosageForm] = useState("");
  const [newMBRStrength, setNewMBRStrength] = useState("");
  const [newMBRBatchSize, setNewMBRBatchSize] = useState("");
  const [newMBRBatchSizeUnit, setNewMBRBatchSizeUnit] = useState("tablets");

  const handleCreateMBR = () => {
    if (!newMBRProduct || !newMBRDosageForm || !newMBRStrength || !newMBRBatchSize) return;
    manufacturingStore.createMBR({
      product: newMBRProduct,
      dosageForm: newMBRDosageForm,
      strength: newMBRStrength,
      approvedBatchSize: parseInt(newMBRBatchSize, 10),
      batchSizeUnit: newMBRBatchSizeUnit,
      version: 1,
      edaApprovalDate: "",
      status: "draft",
      createdBy: "Current User",
      steps: [],
      formulation: {
        id: `form-new-${Date.now()}`,
        mbrId: "",
        ingredients: [],
        totalBatchWeight: 0,
        unit: "g",
      },
      shelfLife: "",
      storageConditions: "",
    });
    setShowNewMBR(false);
    setNewMBRProduct("");
    setNewMBRDosageForm("");
    setNewMBRStrength("");
    setNewMBRBatchSize("");
    reload();
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Batch Manufacturing Records"
        description="Master Batch Records (MBR) and Batch Production Records (BPR) with variance tracking and yield reconciliation"
        icon={<Factory className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Dialog open={showNewMBR} onOpenChange={setShowNewMBR}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New MBR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Master Batch Record</DialogTitle>
                  <DialogDescription>
                    Define a new Master Batch Record for EDA approval workflow.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="mbr-product">Product Name</Label>
                    <Input
                      id="mbr-product"
                      value={newMBRProduct}
                      onChange={(e) => setNewMBRProduct(e.target.value)}
                      placeholder="e.g. Atorvastatin 10mg Tablets"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mbr-dosage">Dosage Form</Label>
                      <Input
                        id="mbr-dosage"
                        value={newMBRDosageForm}
                        onChange={(e) => setNewMBRDosageForm(e.target.value)}
                        placeholder="e.g. Film-Coated Tablet"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mbr-strength">Strength</Label>
                      <Input
                        id="mbr-strength"
                        value={newMBRStrength}
                        onChange={(e) => setNewMBRStrength(e.target.value)}
                        placeholder="e.g. 10mg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mbr-batch-size">Approved Batch Size</Label>
                      <Input
                        id="mbr-batch-size"
                        type="number"
                        value={newMBRBatchSize}
                        onChange={(e) => setNewMBRBatchSize(e.target.value)}
                        placeholder="e.g. 200000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mbr-unit">Unit</Label>
                      <Select value={newMBRBatchSizeUnit} onValueChange={setNewMBRBatchSizeUnit}>
                        <SelectTrigger id="mbr-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tablets">Tablets</SelectItem>
                          <SelectItem value="capsules">Capsules</SelectItem>
                          <SelectItem value="vials">Vials</SelectItem>
                          <SelectItem value="ampoules">Ampoules</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewMBR(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMBR}>Create Draft MBR</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Active MBRs"
          value={metrics.activeMBRs}
          icon={FileText}
          description="Approved records"
        />
        <StatsCard
          title="Active BPRs"
          value={metrics.activeBPRs}
          icon={Beaker}
          description="In production pipeline"
        />
        <StatsCard
          title="In Progress"
          value={metrics.inProgressBPRs}
          icon={PlayCircle}
          description="Currently on floor"
        />
        <StatsCard
          title="Avg Yield %"
          value={`${metrics.averageYieldPercent}%`}
          icon={Target}
          trend={metrics.averageYieldPercent >= 95 ? "On target" : "Below target"}
          trendUp={metrics.averageYieldPercent >= 95}
        />
        <StatsCard
          title="Deviations"
          value={metrics.deviationsThisMonth}
          icon={AlertTriangle}
          description="This month"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="master" className="gap-1">
            <FileText className="h-4 w-4 hidden sm:block" />
            Master Records
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-1">
            <PlayCircle className="h-4 w-4 hidden sm:block" />
            Production
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1">
            <GitCompare className="h-4 w-4 hidden sm:block" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="yield" className="gap-1">
            <Scale className="h-4 w-4 hidden sm:block" />
            Yield
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-4 w-4 hidden sm:block" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: MASTER RECORDS
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="master" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Master Batch Records</CardTitle>
              <CardDescription>
                EDA-approved formulations and process definitions. Each MBR is
                immutable once approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MBR Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Dosage Form</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>EDA Approval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMBRs.map((mbr) => (
                    <TableRow key={mbr.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium text-sm">
                        {mbr.number}
                      </TableCell>
                      <TableCell className="font-medium">{mbr.product}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mbr.dosageForm}
                      </TableCell>
                      <TableCell className="text-sm">
                        {mbr.approvedBatchSize.toLocaleString()} {mbr.batchSizeUnit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          v{mbr.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {mbr.edaApprovalDate
                          ? new Date(mbr.edaApprovalDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <MBRStatusBadge status={mbr.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMBR(mbr);
                            setShowMBRDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMBRs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No Master Batch Records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* MBR Detail Dialog */}
          <Dialog open={showMBRDetail} onOpenChange={setShowMBRDetail}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedMBR && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5" />
                      {selectedMBR.number} - {selectedMBR.product}
                    </DialogTitle>
                    <DialogDescription>
                      Version {selectedMBR.version} | {selectedMBR.dosageForm} |{" "}
                      {selectedMBR.strength}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-2">
                    {/* General Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Batch Size</span>
                        <span className="font-medium">
                          {selectedMBR.approvedBatchSize.toLocaleString()}{" "}
                          {selectedMBR.batchSizeUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Shelf Life</span>
                        <span className="font-medium">{selectedMBR.shelfLife}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Storage</span>
                        <span className="font-medium">{selectedMBR.storageConditions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Status</span>
                        <MBRStatusBadge status={selectedMBR.status} />
                      </div>
                    </div>

                    <Separator />

                    {/* Formulation */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Formulation</h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead>Material</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>% of Batch</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedMBR.formulation.ingredients.map((ing) => (
                            <TableRow key={ing.id} className="text-sm">
                              <TableCell className="font-medium">{ing.materialName}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {ing.materialCode}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize",
                                    ing.role === "API"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : ing.role === "coating"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : ing.role === "packaging"
                                      ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                      : ""
                                  )}
                                >
                                  {ing.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono">
                                {ing.theoreticalQuantity.toLocaleString()} {ing.unit}
                              </TableCell>
                              <TableCell className="font-mono">
                                {ing.percentageOfBatch > 0 ? `${ing.percentageOfBatch}%` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        Total Batch Weight:{" "}
                        {selectedMBR.formulation.totalBatchWeight.toLocaleString()}{" "}
                        {selectedMBR.formulation.unit}
                      </div>
                    </div>

                    <Separator />

                    {/* Process Steps */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Process Steps</h4>
                      <div className="space-y-3">
                        {selectedMBR.steps.map((s) => (
                          <Card key={s.id} className={cn(s.criticalStep && "border-red-200")}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    Step {s.stepNumber}
                                  </Badge>
                                  <span className="font-medium text-sm capitalize">
                                    {s.operation}
                                  </span>
                                  {s.criticalStep && (
                                    <Badge variant="destructive" className="text-xs">
                                      Critical
                                    </Badge>
                                  )}
                                </div>
                                {s.estimatedDuration && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {s.estimatedDuration}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {s.description}
                              </p>
                              <div className="text-xs text-muted-foreground mb-2">
                                Equipment: {s.equipment}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {s.parameters.map((p) => (
                                  <Badge
                                    key={p.name}
                                    variant="secondary"
                                    className="text-xs font-mono"
                                  >
                                    {p.name}: {p.targetValue} {p.unit} (±{p.tolerancePercent}%)
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 2: PRODUCTION
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="production" className="space-y-4 mt-4">
          {/* BPR Status Filter */}
          <div className="flex gap-3">
            <div className="w-48">
              <Select value={filterBPRStatus} onValueChange={setFilterBPRStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(BPR_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch Production Records</CardTitle>
              <CardDescription>
                Active and historical production batches with real-time tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BPR Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>MBR</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBPRs.map((bpr) => (
                    <TableRow
                      key={bpr.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        bpr.status === "rejected" && "bg-red-50/30"
                      )}
                    >
                      <TableCell className="font-mono font-medium text-sm">
                        {bpr.number}
                      </TableCell>
                      <TableCell className="font-medium">{bpr.product}</TableCell>
                      <TableCell className="font-mono text-sm">{bpr.batchNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {bpr.mbrNumber}
                      </TableCell>
                      <TableCell className="text-sm">{bpr.productionLine}</TableCell>
                      <TableCell className="text-sm">
                        {bpr.startDate
                          ? new Date(bpr.startDate).toLocaleDateString()
                          : "Not started"}
                      </TableCell>
                      <TableCell>
                        <BPRStatusBadge status={bpr.status} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {bpr.yieldReconciliation
                          ? `${bpr.yieldReconciliation.yieldPercent}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBPR(bpr);
                            setShowBPRExecution(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBPRs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No Batch Production Records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* BPR Execution Detail Dialog */}
          <Dialog open={showBPRExecution} onOpenChange={setShowBPRExecution}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              {selectedBPR && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Beaker className="h-5 w-5" />
                      {selectedBPR.number} - {selectedBPR.product}
                    </DialogTitle>
                    <DialogDescription>
                      Batch: {selectedBPR.batchNumber} | Line:{" "}
                      {selectedBPR.productionLine} | MBR: {selectedBPR.mbrNumber}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-2">
                    {/* Status + Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Status</span>
                        <BPRStatusBadge status={selectedBPR.status} />
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Batch Size</span>
                        <span className="font-medium">
                          {selectedBPR.batchSize.toLocaleString()} {selectedBPR.batchSizeUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Start</span>
                        <span className="font-medium">
                          {selectedBPR.startDate
                            ? new Date(selectedBPR.startDate).toLocaleDateString()
                            : "Not started"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">End</span>
                        <span className="font-medium">
                          {selectedBPR.endDate
                            ? new Date(selectedBPR.endDate).toLocaleDateString()
                            : "In progress"}
                        </span>
                      </div>
                    </div>

                    {selectedBPR.status === "rejected" && selectedBPR.rejectionReason && (
                      <Card className="border-red-200 bg-red-50/50">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-red-800 text-sm block">
                                Rejection Reason
                              </span>
                              <span className="text-sm text-red-700">
                                {selectedBPR.rejectionReason}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Separator />

                    {/* Step Executions */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">
                        Step Executions ({selectedBPR.stepExecutions.length} completed)
                      </h4>
                      {selectedBPR.stepExecutions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No steps executed yet. Production has not started.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedBPR.stepExecutions.map((exec) => (
                            <Card
                              key={exec.id}
                              className={cn(
                                exec.deviationFlag && "border-red-200 bg-red-50/30"
                              )}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      Step {exec.stepNumber}
                                    </Badge>
                                    <span className="font-medium text-sm capitalize">
                                      {exec.operation}
                                    </span>
                                    {exec.deviationFlag && (
                                      <Badge variant="destructive" className="text-xs gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Deviation {exec.deviationId}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {exec.operator} |{" "}
                                    {new Date(exec.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  Equipment: {exec.equipmentName} ({exec.equipmentId})
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="text-xs">
                                      <TableHead>Parameter</TableHead>
                                      <TableHead>Target</TableHead>
                                      <TableHead>Actual</TableHead>
                                      <TableHead>Tolerance</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {exec.actualValues.map((av) => {
                                      const variance =
                                        av.targetValue !== 0
                                          ? ((av.actualValue - av.targetValue) /
                                              av.targetValue) *
                                            100
                                          : 0;
                                      return (
                                        <TableRow
                                          key={av.parameterName}
                                          className={cn(
                                            "text-sm",
                                            !av.withinTolerance && "bg-red-50"
                                          )}
                                        >
                                          <TableCell className="font-medium">
                                            {av.parameterName}
                                          </TableCell>
                                          <TableCell className="font-mono text-blue-700">
                                            {av.targetValue} {av.unit}
                                          </TableCell>
                                          <TableCell
                                            className={cn(
                                              "font-mono",
                                              av.withinTolerance
                                                ? "text-green-700"
                                                : "text-red-700 font-bold"
                                            )}
                                          >
                                            {av.actualValue} {av.unit}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground">
                                            ±{av.tolerancePercent}%
                                          </TableCell>
                                          <TableCell>
                                            {av.withinTolerance ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : (
                                              <div className="flex items-center gap-1">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                                <span className="text-xs text-red-600 font-medium">
                                                  {variance >= 0 ? "+" : ""}
                                                  {variance.toFixed(1)}%
                                                </span>
                                              </div>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Material Usage */}
                    {selectedBPR.materialUsage.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Material Dispensing</h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead>Material</TableHead>
                              <TableHead>Batch/Lot</TableHead>
                              <TableHead>Theoretical</TableHead>
                              <TableHead>Actual</TableHead>
                              <TableHead>Variance</TableHead>
                              <TableHead>Dispensed By</TableHead>
                              <TableHead>Verified By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedBPR.materialUsage.map((mu) => (
                              <TableRow
                                key={mu.id}
                                className={cn(
                                  "text-sm",
                                  !mu.withinTolerance && "bg-red-50/50"
                                )}
                              >
                                <TableCell className="font-medium">{mu.materialName}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {mu.batchNumber} / {mu.lotNumber}
                                </TableCell>
                                <TableCell className="font-mono text-blue-700">
                                  {mu.theoreticalQuantity.toLocaleString()} {mu.unit}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "font-mono",
                                    mu.withinTolerance ? "text-green-700" : "text-red-700"
                                  )}
                                >
                                  {mu.actualQuantity.toLocaleString()} {mu.unit}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      mu.withinTolerance
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                    )}
                                  >
                                    {mu.variancePercent >= 0 ? "+" : ""}
                                    {mu.variancePercent.toFixed(2)}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{mu.dispensedBy}</TableCell>
                                <TableCell className="text-xs">{mu.verifiedBy}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Yield */}
                    {selectedBPR.yieldReconciliation && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Yield Reconciliation</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground block">Theoretical</span>
                              <span className="font-semibold">
                                {selectedBPR.yieldReconciliation.theoreticalYield.toLocaleString()}{" "}
                                {selectedBPR.yieldReconciliation.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Actual</span>
                              <span className="font-semibold">
                                {selectedBPR.yieldReconciliation.actualYield.toLocaleString()}{" "}
                                {selectedBPR.yieldReconciliation.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Yield %</span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  selectedBPR.yieldReconciliation.reconciliationStatus === "pass"
                                    ? "text-green-700"
                                    : selectedBPR.yieldReconciliation.reconciliationStatus ===
                                      "investigation"
                                    ? "text-yellow-700"
                                    : "text-red-700"
                                )}
                              >
                                {selectedBPR.yieldReconciliation.yieldPercent}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Status</span>
                              <Badge
                                variant={
                                  selectedBPR.yieldReconciliation.reconciliationStatus === "pass"
                                    ? "outline"
                                    : "destructive"
                                }
                                className={cn(
                                  selectedBPR.yieldReconciliation.reconciliationStatus ===
                                    "pass" && "bg-green-50 text-green-700 border-green-200"
                                )}
                              >
                                {selectedBPR.yieldReconciliation.reconciliationStatus === "pass"
                                  ? "Pass"
                                  : selectedBPR.yieldReconciliation.reconciliationStatus ===
                                    "investigation"
                                  ? "Investigation"
                                  : "Fail"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 3: COMPARISON
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MBR vs BPR Comparison</CardTitle>
              <CardDescription>
                Select a batch to view side-by-side comparison of theoretical vs
                actual values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-md">
                <Label htmlFor="comparison-bpr" className="mb-2 block">
                  Select Batch Production Record
                </Label>
                <Select value={comparisonBPRId} onValueChange={setComparisonBPRId}>
                  <SelectTrigger id="comparison-bpr">
                    <SelectValue placeholder="Choose a BPR to compare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bprs
                      .filter((b) => b.stepExecutions.length > 0)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.number} - {b.product} ({b.batchNumber})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {comparisonMBR && comparisonBPR && (
            <MBRBPRComparison
              mbr={comparisonMBR}
              bpr={comparisonBPR}
              variances={comparisonVariances}
            />
          )}

          {comparisonBPRId && !comparisonBPR && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                BPR not found. Please select another batch.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 4: YIELD
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="yield" className="space-y-4 mt-4">
          {/* Yield Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Gauge className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-3xl font-bold text-green-700">
                  {metrics.averageYieldPercent}%
                </div>
                <div className="text-sm text-muted-foreground">Average Yield</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-3xl font-bold">{metrics.totalBPRsCompleted}</div>
                <div className="text-sm text-muted-foreground">Batches Released</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <div className="text-3xl font-bold text-red-700">
                  {metrics.totalBPRsRejected}
                </div>
                <div className="text-sm text-muted-foreground">Batches Rejected</div>
              </CardContent>
            </Card>
          </div>

          {/* Yield by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yield by Product</CardTitle>
              <CardDescription>
                Average yield percentage across all completed batches per product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.yieldByProduct.map((yp) => (
                  <div key={yp.product} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{yp.product}</span>
                      <span className="text-muted-foreground">
                        {yp.avgYield}% ({yp.batchCount} batches)
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={Math.min(yp.avgYield, 100)}
                        className={cn(
                          "h-4",
                          yp.avgYield >= 95
                            ? "[&>div]:bg-green-500"
                            : yp.avgYield >= 90
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-red-500"
                        )}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                        {yp.avgYield}%
                      </div>
                    </div>
                  </div>
                ))}
                {metrics.yieldByProduct.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No yield data available yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batch-by-Batch Yield Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch-by-Batch Yield Tracking</CardTitle>
              <CardDescription>
                Material balance and yield reconciliation for each completed batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BPR</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Theoretical</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead>Material Balance</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bprs
                    .filter((b) => b.yieldReconciliation)
                    .map((b) => {
                      const yr = b.yieldReconciliation!;
                      return (
                        <TableRow
                          key={b.id}
                          className={cn(
                            yr.reconciliationStatus === "fail" && "bg-red-50/50"
                          )}
                        >
                          <TableCell className="font-mono text-sm">{b.number}</TableCell>
                          <TableCell className="font-medium">{b.product}</TableCell>
                          <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                          <TableCell className="font-mono">
                            {yr.theoreticalYield.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono">
                            {yr.actualYield.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-xs",
                                yr.yieldPercent >= 95
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : yr.yieldPercent >= 90
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              {yr.yieldPercent}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {yr.materialBalance}%
                          </TableCell>
                          <TableCell className="font-mono text-sm text-red-600">
                            {yr.rejectedQuantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={yr.reconciliationStatus === "pass" ? "outline" : "destructive"}
                              className={cn(
                                "text-xs",
                                yr.reconciliationStatus === "pass" &&
                                  "bg-green-50 text-green-700 border-green-200"
                              )}
                            >
                              {yr.reconciliationStatus === "pass"
                                ? "Pass"
                                : yr.reconciliationStatus === "investigation"
                                ? "Investigation"
                                : "Fail"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 5: ANALYTICS
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {/* Yield Trends by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Yield Trends by Product
              </CardTitle>
              <CardDescription>
                Average yield performance across products with batch count context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.yieldByProduct.map((yp) => (
                  <div key={yp.product}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{yp.product}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {yp.batchCount} batches
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            yp.avgYield >= 95
                              ? "text-green-700"
                              : yp.avgYield >= 90
                              ? "text-yellow-700"
                              : "text-red-700"
                          )}
                        >
                          {yp.avgYield}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-8 items-end">
                      {/* Simple bar representation */}
                      <div
                        className={cn(
                          "rounded-t w-full transition-all",
                          yp.avgYield >= 95
                            ? "bg-green-500"
                            : yp.avgYield >= 90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                        style={{ height: `${(yp.avgYield / 100) * 32}px` }}
                      />
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Common Variance Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Common Variance Parameters
              </CardTitle>
              <CardDescription>
                Most frequently out-of-tolerance parameters across all batches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.commonVarianceParameters.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>OOT Count</TableHead>
                      <TableHead>Avg Variance</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.commonVarianceParameters.map((cp, idx) => (
                      <TableRow key={cp.parameter}>
                        <TableCell className="font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{cp.parameter}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {cp.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cp.avgVariance}%
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              cp.avgVariance > 15
                                ? "bg-red-50 text-red-700 border-red-200"
                                : cp.avgVariance > 8
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            )}
                          >
                            {cp.avgVariance > 15
                              ? "High"
                              : cp.avgVariance > 8
                              ? "Medium"
                              : "Low"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No out-of-tolerance variances recorded.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Deviation Correlation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Deviation Correlation
              </CardTitle>
              <CardDescription>
                Batches with deviations and their impact on yield.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Deviations</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Correlation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bprs
                    .filter((b) => b.stepExecutions.length > 0)
                    .map((b) => {
                      const deviationCount = b.stepExecutions.filter(
                        (e) => e.deviationFlag
                      ).length;
                      const yp = b.yieldReconciliation?.yieldPercent;
                      return (
                        <TableRow
                          key={b.id}
                          className={cn(deviationCount > 0 && "bg-amber-50/30")}
                        >
                          <TableCell className="font-mono text-sm">
                            {b.number}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {b.product}
                          </TableCell>
                          <TableCell>
                            {deviationCount > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                {deviationCount} deviation{deviationCount > 1 ? "s" : ""}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                              >
                                None
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono">
                            {yp ? `${yp}%` : "N/A"}
                          </TableCell>
                          <TableCell>
                            <BPRStatusBadge status={b.status} />
                          </TableCell>
                          <TableCell>
                            {deviationCount > 0 && yp && yp < 95 ? (
                              <Badge
                                variant="outline"
                                className="text-xs bg-red-50 text-red-700 border-red-200"
                              >
                                Yield Impact
                              </Badge>
                            ) : deviationCount > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                Monitor
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Process Capability Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Process Capability Summary
              </CardTitle>
              <CardDescription>
                Overall manufacturing performance indicators across all product
                lines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-700">
                    {metrics.totalBPRsCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Batches Released
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-red-700">
                    {metrics.totalBPRsRejected}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Batches Rejected
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">
                    {metrics.totalBPRsCompleted + metrics.totalBPRsRejected > 0
                      ? (
                          (metrics.totalBPRsCompleted /
                            (metrics.totalBPRsCompleted + metrics.totalBPRsRejected)) *
                          100
                        ).toFixed(1)
                      : "0"}
                    %
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Right First Time
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">
                    {metrics.deviationsThisMonth}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Deviations (Month)
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Status Distribution */}
              <h4 className="font-semibold text-sm mb-3">BPR Status Distribution</h4>
              <div className="space-y-2">
                {metrics.statusDistribution.map((sd) => {
                  const cfg = BPR_STATUS_CONFIG[sd.status];
                  const pct =
                    bprs.length > 0
                      ? Math.round((sd.count / bprs.length) * 100)
                      : 0;
                  return (
                    <div key={sd.status} className="flex items-center gap-3">
                      <div className="w-24 text-sm">
                        <Badge variant="outline" className={cn("text-xs", cfg.color, cfg.bgColor)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="h-5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              sd.status === "released"
                                ? "bg-green-500"
                                : sd.status === "rejected"
                                ? "bg-red-500"
                                : sd.status === "planned"
                                ? "bg-slate-400"
                                : "bg-blue-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-mono w-16 text-right">
                        {sd.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* Monthly Batches */}
              <h4 className="font-semibold text-sm mb-3">Monthly Batch Output</h4>
              <div className="grid grid-cols-6 gap-2">
                {metrics.monthlyBatches.map((mb) => (
                  <div key={mb.month} className="text-center">
                    <div className="flex flex-col items-center gap-1 h-20 justify-end">
                      {mb.completed > 0 && (
                        <div
                          className="w-8 bg-green-500 rounded-t"
                          style={{
                            height: `${Math.max(mb.completed * 16, 8)}px`,
                          }}
                        />
                      )}
                      {mb.rejected > 0 && (
                        <div
                          className="w-8 bg-red-500 rounded-t"
                          style={{
                            height: `${Math.max(mb.rejected * 16, 8)}px`,
                          }}
                        />
                      )}
                      {mb.completed === 0 && mb.rejected === 0 && (
                        <div className="w-8 h-1 bg-muted rounded" />
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {mb.month}
                    </div>
                    <div className="text-xs font-mono">
                      {mb.completed + mb.rejected}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  Released
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  Rejected
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
