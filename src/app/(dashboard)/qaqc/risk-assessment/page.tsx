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
import RiskMatrix from "@/components/shared/risk-matrix";
import type { RiskDot } from "@/components/shared/risk-matrix";
import { cn, formatDate } from "@/lib/utils";
import {
  TriangleAlert,
  Shield,
  BarChart3,
  Plus,
  Search,
  Eye,
  ClipboardList,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Target,
  FileText,
  Trash2,
} from "lucide-react";
import { useRiskStore, calculateRPN, classifyRiskLevel } from "@/lib/quality/risk-store";
import type {
  RiskAssessment,
  RiskStatus,
  RiskCategory,
  RiskMethod,
  RiskLevel,
  FMEAEntry,
  MitigationAction,
  RiskMetrics,
} from "@/lib/quality/risk-types";

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_CONFIG: Record<RiskStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  review: { label: "Review", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  closed: { label: "Closed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  quality: "Quality",
  safety: "Safety",
  regulatory: "Regulatory",
  operational: "Operational",
  "supply-chain": "Supply Chain",
};

const METHOD_LABELS: Record<RiskMethod, string> = {
  FMEA: "FMEA",
  HACCP: "HACCP",
  FTA: "Fault Tree Analysis",
  PHA: "Preliminary Hazard Analysis",
};

function rpnColor(rpn: number): string {
  if (rpn >= 200) return "text-red-600 font-bold";
  if (rpn >= 100) return "text-orange-600 font-semibold";
  if (rpn >= 40) return "text-yellow-600 font-medium";
  return "text-green-600";
}

/* ───────────────────────── page ───────────────────────── */

export default function RiskAssessmentPage() {
  const { items: riskItems, fetchAll, create: createAssessment } = useRiskStore();
  const assessments = riskItems as unknown as RiskAssessment[];
  const [activeTab, setActiveTab] = useState("assessments");

  /* filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  /* detail dialog */
  const [detailRA, setDetailRA] = useState<RiskAssessment | null>(null);

  /* new assessment form */
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState("");
  const [newMethod, setNewMethod] = useState<RiskMethod>("FMEA");
  const [newProduct, setNewProduct] = useState("");
  const [newProcess, setNewProcess] = useState("");
  const [newCategory, setNewCategory] = useState<RiskCategory>("quality");

  /* new FMEA entry (within new assessment form) */
  const [newEntries, setNewEntries] = useState<Omit<FMEAEntry, "id" | "rpn" | "riskLevel">[]>([]);
  const [entryFM, setEntryFM] = useState("");
  const [entryEffect, setEntryEffect] = useState("");
  const [entryCause, setEntryCause] = useState("");
  const [entryControls, setEntryControls] = useState("");
  const [entrySev, setEntrySev] = useState(5);
  const [entryOcc, setEntryOcc] = useState(5);
  const [entryDet, setEntryDet] = useState(5);
  const [entryCategory, setEntryCategory] = useState<RiskCategory>("quality");
  const [entryAction, setEntryAction] = useState("");

  /* risk register filters */
  const [regSearch, setRegSearch] = useState("");
  const [regLevelFilter, setRegLevelFilter] = useState<string>("all");
  const [regCategoryFilter, setRegCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ───── compute metrics from items ───── */
  const metrics: RiskMetrics | null = useMemo(() => {
    if (assessments.length === 0) return null;
    const allEntries = assessments.flatMap((a) => a.entries);
    const highRiskItems = allEntries.filter(
      (e) => e.riskLevel === "high" || e.riskLevel === "critical"
    ).length;
    const avgRPN =
      allEntries.length > 0
        ? Math.round(allEntries.reduce((s, e) => s + e.rpn, 0) / allEntries.length)
        : 0;
    const mitigationsPending = allEntries.reduce(
      (count, e) =>
        count +
        e.mitigationActions.filter(
          (m: MitigationAction) => m.status !== "completed" && m.status !== "verified"
        ).length,
      0
    );
    const mitigated = allEntries.filter((e) => e.residualRPN != null);
    const riskReductionPct =
      mitigated.length > 0
        ? Math.round(
            mitigated.reduce(
              (s, e) => s + ((e.rpn - (e.residualRPN ?? e.rpn)) / e.rpn) * 100,
              0
            ) / mitigated.length
          )
        : 0;
    const byStatus = (Object.keys(STATUS_CONFIG) as RiskStatus[]).map((status) => ({
      status,
      count: assessments.filter((a) => a.status === status).length,
    }));
    const byCategory = (Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((category) => ({
      category,
      count: allEntries.filter((e) => e.category === category).length,
    }));
    const byMethod = (Object.keys(METHOD_LABELS) as RiskMethod[]).map((method) => ({
      method,
      count: assessments.filter((a) => a.method === method).length,
    }));
    const rpnDistribution = [
      { range: "Low (1-39)", count: allEntries.filter((e) => e.rpn < 40).length },
      { range: "Medium (40-99)", count: allEntries.filter((e) => e.rpn >= 40 && e.rpn < 100).length },
      { range: "High (100-199)", count: allEntries.filter((e) => e.rpn >= 100 && e.rpn < 200).length },
      { range: "Critical (200+)", count: allEntries.filter((e) => e.rpn >= 200).length },
    ];
    return {
      totalAssessments: assessments.length,
      highRiskItems,
      avgRPN,
      mitigationsPending,
      riskReductionPct,
      byStatus,
      byCategory,
      byMethod,
      rpnDistribution,
    };
  }, [assessments]);

  /* ───── filtered assessments ───── */
  const filteredAssessments = useMemo(() => {
    let list = assessments;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.process.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assessments, statusFilter, categoryFilter, search]);

  /* ───── risk register items ───── */
  const registerItems = useMemo(() => {
    const allItems = assessments.flatMap((assessment) =>
      assessment.entries.map((entry: FMEAEntry) => ({ assessment, entry }))
    );
    let filtered = allItems.filter(
      ({ entry }: { entry: FMEAEntry }) => entry.riskLevel === "high" || entry.riskLevel === "critical"
    );
    if (regLevelFilter !== "all") {
      filtered = filtered.filter(({ entry }: { entry: FMEAEntry }) => entry.riskLevel === regLevelFilter);
    }
    if (regCategoryFilter !== "all") {
      filtered = filtered.filter(({ entry }: { entry: FMEAEntry }) => entry.category === regCategoryFilter);
    }
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase();
      filtered = filtered.filter(
        ({ entry, assessment }: { entry: FMEAEntry; assessment: RiskAssessment }) =>
          entry.failureMode.toLowerCase().includes(q) ||
          entry.effect.toLowerCase().includes(q) ||
          assessment.title.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [assessments, regLevelFilter, regCategoryFilter, regSearch]);

  /* ───── matrix dots for analytics ───── */
  const allDots: RiskDot[] = useMemo(() => {
    return assessments.flatMap((ra) =>
      ra.entries.map((e) => ({
        id: e.id,
        label: e.failureMode,
        severity: e.severity,
        occurrence: e.occurrence,
        rpn: e.rpn,
        riskLevel: e.riskLevel,
        failureMode: e.failureMode,
        effect: e.effect,
        cause: e.cause,
        currentControls: e.currentControls,
        residualSeverity: e.residualSeverity,
        residualOccurrence: e.residualOccurrence,
        residualRPN: e.residualRPN,
        residualRiskLevel: e.residualRiskLevel,
      }))
    );
  }, [assessments]);

  /* ───── detail dialog dots ───── */
  const detailDots: RiskDot[] = useMemo(() => {
    if (!detailRA) return [];
    return detailRA.entries.map((e) => ({
      id: e.id,
      label: e.failureMode,
      severity: e.severity,
      occurrence: e.occurrence,
      rpn: e.rpn,
      riskLevel: e.riskLevel,
      failureMode: e.failureMode,
      effect: e.effect,
      cause: e.cause,
      currentControls: e.currentControls,
      residualSeverity: e.residualSeverity,
      residualOccurrence: e.residualOccurrence,
      residualRPN: e.residualRPN,
      residualRiskLevel: e.residualRiskLevel,
    }));
  }, [detailRA]);

  /* ───── handlers ───── */
  function handleAddEntry() {
    if (!entryFM.trim()) return;
    const entry: Omit<FMEAEntry, "id" | "rpn" | "riskLevel"> = {
      failureMode: entryFM,
      effect: entryEffect,
      cause: entryCause,
      currentControls: entryControls,
      severity: entrySev,
      occurrence: entryOcc,
      detection: entryDet,
      category: entryCategory,
      recommendedAction: entryAction,
      mitigationActions: [],
    };
    setNewEntries((prev) => [...prev, entry]);
    setEntryFM("");
    setEntryEffect("");
    setEntryCause("");
    setEntryControls("");
    setEntrySev(5);
    setEntryOcc(5);
    setEntryDet(5);
    setEntryCategory("quality");
    setEntryAction("");
  }

  function handleRemoveEntry(index: number) {
    setNewEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCreateAssessment() {
    if (!newTitle.trim() || !newScope.trim()) return;
    const entries: FMEAEntry[] = newEntries.map((e, i) => {
      const rpn = calculateRPN(e.severity, e.occurrence, e.detection);
      return {
        ...e,
        id: `fmea-new-${Date.now()}-${i}`,
        rpn,
        riskLevel: classifyRiskLevel(rpn),
      };
    });
    createAssessment({
      title: newTitle,
      scope: newScope,
      method: newMethod,
      product: newProduct,
      process: newProcess,
      status: "draft",
      category: newCategory,
      createdBy: "Current User",
      entries,
    } as any);
    // reset form
    setNewTitle("");
    setNewScope("");
    setNewMethod("FMEA");
    setNewProduct("");
    setNewProcess("");
    setNewCategory("quality");
    setNewEntries([]);
    fetchAll();
    setActiveTab("assessments");
  }

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Risk Assessment (FMEA)"
        description="ICH Q9-based risk management for pharmaceutical manufacturing processes"
        icon={<TriangleAlert className="h-5 w-5 text-orange-500" />}
        actions={
          <Button onClick={() => setActiveTab("new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Assessment
          </Button>
        }
      />

      {/* ─── Stats Cards ─── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={ClipboardList}
            title="Total Assessments"
            value={metrics.totalAssessments}
            subtitle={`${metrics.byStatus.find((s) => s.status === "in-progress")?.count ?? 0} in progress`}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
          />
          <StatsCard
            icon={AlertCircle}
            title="High Risk Items"
            value={metrics.highRiskItems}
            subtitle="Across all assessments"
            iconColor="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
          />
          <StatsCard
            icon={Target}
            title="Avg RPN"
            value={metrics.avgRPN}
            subtitle={metrics.avgRPN >= 100 ? "Above threshold" : "Within acceptable range"}
            iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400"
          />
          <StatsCard
            icon={Clock}
            title="Mitigations Pending"
            value={metrics.mitigationsPending}
            subtitle="Actions to complete"
            iconColor="bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
          />
          <StatsCard
            icon={TrendingDown}
            title="Risk Reduction"
            value={`${metrics.riskReductionPct}%`}
            subtitle="Avg RPN decrease after mitigation"
            iconColor="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
          />
        </div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assessments" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Assessment
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Risk Register
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ TAB: Assessments ═══════════════ */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          {/* filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as RiskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Method</TableHead>
                    <TableHead className="w-[110px]">Category</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[70px] text-center">Entries</TableHead>
                    <TableHead className="w-[80px] text-center">Max RPN</TableHead>
                    <TableHead className="w-[100px]">Created</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No risk assessments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssessments.map((ra) => {
                      const maxRPN = ra.entries.length > 0
                        ? Math.max(...ra.entries.map((e) => e.rpn))
                        : 0;
                      return (
                        <TableRow
                          key={ra.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setDetailRA(ra)}
                        >
                          <TableCell className="font-mono text-xs">
                            {ra.number}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{ra.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {ra.product}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ra.method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {CATEGORY_LABELS[ra.category]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", STATUS_CONFIG[ra.status].color)}>
                              {STATUS_CONFIG[ra.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {ra.entries.length}
                          </TableCell>
                          <TableCell className={cn("text-center text-sm", rpnColor(maxRPN))}>
                            {maxRPN}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(ra.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailRA(ra);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ TAB: New Assessment ═══════════════ */}
        <TabsContent value="new" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Risk Assessment</CardTitle>
              <CardDescription>
                Define the scope, method, and FMEA entries for a new risk assessment following ICH Q9 guidelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ra-title">Title</Label>
                  <Input
                    id="ra-title"
                    placeholder="e.g. Manufacturing Process FMEA — Product Name"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ra-scope">Scope</Label>
                  <Textarea
                    id="ra-scope"
                    placeholder="Describe the scope and boundaries of this risk assessment..."
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={newMethod} onValueChange={(v) => setNewMethod(v as RiskMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHOD_LABELS) as RiskMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as RiskCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ra-product">Product</Label>
                  <Input
                    id="ra-product"
                    placeholder="e.g. Amoxicillin 500mg Tablets"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ra-process">Process</Label>
                  <Input
                    id="ra-process"
                    placeholder="e.g. Tablet Compression"
                    value={newProcess}
                    onChange={(e) => setNewProcess(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* FMEA entries */}
              <div>
                <h3 className="text-sm font-semibold mb-3">FMEA Entries</h3>

                {newEntries.length > 0 && (
                  <div className="mb-4 rounded-lg border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Failure Mode</TableHead>
                          <TableHead className="w-[50px] text-center">S</TableHead>
                          <TableHead className="w-[50px] text-center">O</TableHead>
                          <TableHead className="w-[50px] text-center">D</TableHead>
                          <TableHead className="w-[70px] text-center">RPN</TableHead>
                          <TableHead className="w-[80px] text-center">Level</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newEntries.map((entry, idx) => {
                          const rpn = calculateRPN(entry.severity, entry.occurrence, entry.detection);
                          const level = classifyRiskLevel(rpn);
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="text-sm font-medium">{entry.failureMode}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{entry.effect}</div>
                              </TableCell>
                              <TableCell className="text-center text-sm">{entry.severity}</TableCell>
                              <TableCell className="text-center text-sm">{entry.occurrence}</TableCell>
                              <TableCell className="text-center text-sm">{entry.detection}</TableCell>
                              <TableCell className={cn("text-center text-sm", rpnColor(rpn))}>{rpn}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn("text-xs", RISK_LEVEL_CONFIG[level].color)}>
                                  {RISK_LEVEL_CONFIG[level].label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveEntry(idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* add entry form */}
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add FMEA Entry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Failure Mode</Label>
                        <Input
                          placeholder="What can go wrong?"
                          value={entryFM}
                          onChange={(e) => setEntryFM(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Effect</Label>
                        <Input
                          placeholder="What is the impact?"
                          value={entryEffect}
                          onChange={(e) => setEntryEffect(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cause</Label>
                        <Input
                          placeholder="Root cause"
                          value={entryCause}
                          onChange={(e) => setEntryCause(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Controls</Label>
                        <Input
                          placeholder="Existing controls in place"
                          value={entryControls}
                          onChange={(e) => setEntryControls(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Severity (1-10)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={entrySev}
                          onChange={(e) => setEntrySev(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Occurrence (1-10)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={entryOcc}
                          onChange={(e) => setEntryOcc(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Detection (1-10)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={entryDet}
                          onChange={(e) => setEntryDet(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RPN (auto)</Label>
                        <div className={cn("h-9 flex items-center px-3 rounded-md border text-sm font-semibold", rpnColor(entrySev * entryOcc * entryDet))}>
                          {entrySev * entryOcc * entryDet}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={entryCategory} onValueChange={(v) => setEntryCategory(v as RiskCategory)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((c) => (
                              <SelectItem key={c} value={c}>
                                {CATEGORY_LABELS[c]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Recommended Action</Label>
                        <Input
                          placeholder="Proposed mitigation"
                          value={entryAction}
                          onChange={(e) => setEntryAction(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddEntry} variant="outline" className="gap-2" disabled={!entryFM.trim()}>
                      <Plus className="h-4 w-4" />
                      Add Entry
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewTitle("");
                    setNewScope("");
                    setNewEntries([]);
                    setActiveTab("assessments");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssessment}
                  disabled={!newTitle.trim() || !newScope.trim()}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Create Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ TAB: Risk Register ═══════════════ */}
        <TabsContent value="register" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Register — High &amp; Critical Items</CardTitle>
              <CardDescription>
                Consolidated view of all high and critical risk items across assessments with mitigation tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search risk items..."
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={regLevelFilter} onValueChange={setRegLevelFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={regCategoryFilter} onValueChange={setRegCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* register table */}
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Failure Mode</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead className="w-[90px]">Category</TableHead>
                      <TableHead className="w-[50px] text-center">S</TableHead>
                      <TableHead className="w-[50px] text-center">O</TableHead>
                      <TableHead className="w-[50px] text-center">D</TableHead>
                      <TableHead className="w-[70px] text-center">RPN</TableHead>
                      <TableHead className="w-[80px] text-center">Level</TableHead>
                      <TableHead className="w-[100px]">Mitigation</TableHead>
                      <TableHead className="w-[80px] text-center">Residual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registerItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No high/critical risk items found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      registerItems.map(({ assessment, entry }) => {
                        const mitigationCount = entry.mitigationActions.length;
                        const completedCount = entry.mitigationActions.filter(
                          (m) => m.status === "completed" || m.status === "verified"
                        ).length;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="text-sm font-medium">{entry.failureMode}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {entry.effect}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-mono">{assessment.number}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                                {assessment.title}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {CATEGORY_LABELS[entry.category]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{entry.severity}</TableCell>
                            <TableCell className="text-center text-sm">{entry.occurrence}</TableCell>
                            <TableCell className="text-center text-sm">{entry.detection}</TableCell>
                            <TableCell className={cn("text-center text-sm", rpnColor(entry.rpn))}>
                              {entry.rpn}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn("text-xs", RISK_LEVEL_CONFIG[entry.riskLevel].color)}>
                                {RISK_LEVEL_CONFIG[entry.riskLevel].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {mitigationCount > 0 ? (
                                <div className="text-xs">
                                  <span className="font-medium">{completedCount}/{mitigationCount}</span>
                                  <span className="text-muted-foreground ml-1">done</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.residualRPN != null ? (
                                <span className={cn("text-sm", rpnColor(entry.residualRPN))}>
                                  {entry.residualRPN}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
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

        {/* ═══════════════ TAB: Analytics ═══════════════ */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {metrics && (
            <>
              {/* Row 1: RPN Distribution + Risk Matrix Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RPN Distribution Histogram */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">RPN Distribution</CardTitle>
                    <CardDescription>Distribution of Risk Priority Numbers across all FMEA entries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.rpnDistribution.map((bucket) => {
                        const maxCount = Math.max(...metrics.rpnDistribution.map((b) => b.count), 1);
                        const pct = Math.round((bucket.count / maxCount) * 100);
                        const isLow = bucket.range.includes("Low");
                        const isMedium = bucket.range.includes("Medium");
                        const isHigh = bucket.range.includes("High") && !bucket.range.includes("Critical");
                        const barColor = isLow
                          ? "bg-green-500"
                          : isMedium
                          ? "bg-yellow-500"
                          : isHigh
                          ? "bg-orange-500"
                          : "bg-red-500";
                        return (
                          <div key={bucket.range} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{bucket.range}</span>
                              <span className="font-semibold">{bucket.count}</span>
                            </div>
                            <div className="h-6 w-full rounded bg-muted overflow-hidden">
                              <div
                                className={cn("h-full rounded transition-all", barColor)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Matrix Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Matrix — All Items</CardTitle>
                    <CardDescription>5x5 severity vs occurrence matrix with before/after mitigation overlay</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RiskMatrix items={allDots} showResidual />
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Risk by Category + Mitigation Effectiveness */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Items by Category</CardTitle>
                    <CardDescription>Breakdown of FMEA entries by risk category across all assessments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const catCounts = new Map<RiskCategory, { total: number; high: number }>();
                        for (const ra of assessments) {
                          for (const e of ra.entries) {
                            const prev = catCounts.get(e.category) || { total: 0, high: 0 };
                            prev.total++;
                            if (e.riskLevel === "high" || e.riskLevel === "critical") prev.high++;
                            catCounts.set(e.category, prev);
                          }
                        }
                        const maxTotal = Math.max(...Array.from(catCounts.values()).map((v) => v.total), 1);
                        return (Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((cat) => {
                          const data = catCounts.get(cat) || { total: 0, high: 0 };
                          const pct = Math.round((data.total / maxTotal) * 100);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                                <span className="text-muted-foreground">
                                  {data.total} total / <span className="text-red-500 font-medium">{data.high} high</span>
                                </span>
                              </div>
                              <div className="h-5 w-full rounded bg-muted overflow-hidden flex">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Mitigation Effectiveness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mitigation Effectiveness</CardTitle>
                    <CardDescription>Before vs after RPN comparison for mitigated risk items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const mitigated = assessments
                          .flatMap((ra) => ra.entries)
                          .filter((e) => e.residualRPN != null)
                          .sort((a, b) => b.rpn - a.rpn)
                          .slice(0, 10);

                        if (mitigated.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No mitigated items to display.
                            </div>
                          );
                        }

                        const maxRPN = Math.max(...mitigated.map((e) => e.rpn), 1);

                        return mitigated.map((entry) => {
                          const origPct = Math.round((entry.rpn / maxRPN) * 100);
                          const resPct = Math.round(((entry.residualRPN ?? 0) / maxRPN) * 100);
                          const reductionPct = Math.round(
                            ((entry.rpn - (entry.residualRPN ?? entry.rpn)) / entry.rpn) * 100
                          );
                          return (
                            <div key={entry.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate max-w-[250px] font-medium">{entry.failureMode}</span>
                                <span className="text-green-600 font-medium shrink-0 ml-2">
                                  -{reductionPct}%
                                </span>
                              </div>
                              <div className="flex gap-1 items-center">
                                <div className="flex-1 h-4 rounded bg-muted overflow-hidden relative">
                                  <div
                                    className="h-full bg-red-400/60 rounded absolute top-0 left-0"
                                    style={{ width: `${origPct}%` }}
                                  />
                                  <div
                                    className="h-full bg-green-500 rounded relative z-10"
                                    style={{ width: `${resPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                                  {entry.rpn} → {entry.residualRPN}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-6 rounded bg-red-400/60 inline-block" />
                        Original RPN
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-6 rounded bg-green-500 inline-block" />
                        Residual RPN
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Assessment Status + Method breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assessments by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.byStatus.map(({ status, count }) => (
                        <div key={status} className="flex items-center justify-between">
                          <Badge className={cn("text-xs", STATUS_CONFIG[status].color)}>
                            {STATUS_CONFIG[status].label}
                          </Badge>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assessments by Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.byMethod.map(({ method, count }) => (
                        <div key={method} className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {METHOD_LABELS[method]}
                          </Badge>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════ DETAIL DIALOG ═══════════════ */}
      <Dialog open={!!detailRA} onOpenChange={() => setDetailRA(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {detailRA && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">{detailRA.number}</span>
                  <span>{detailRA.title}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* meta info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge className={cn("text-xs", STATUS_CONFIG[detailRA.status].color)}>
                        {STATUS_CONFIG[detailRA.status].label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Method</span>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">{detailRA.method}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Category</span>
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[detailRA.category]}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Created</span>
                    <div className="mt-1 text-sm">{formatDate(detailRA.createdAt)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Product</span>
                    <div className="mt-1 font-medium">{detailRA.product}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Process</span>
                    <div className="mt-1 font-medium">{detailRA.process}</div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Scope</span>
                  <p className="mt-1 text-sm">{detailRA.scope}</p>
                </div>

                {detailRA.approvedBy && (
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Approved By</span>
                      <div className="mt-1">{detailRA.approvedBy}</div>
                    </div>
                    {detailRA.approvedAt && (
                      <div>
                        <span className="text-xs text-muted-foreground">Approved At</span>
                        <div className="mt-1">{formatDate(detailRA.approvedAt)}</div>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Risk Matrix visualization */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Risk Matrix</h3>
                  <RiskMatrix items={detailDots} showResidual className="max-w-lg" />
                </div>

                <Separator />

                {/* FMEA Worksheet */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    FMEA Worksheet ({detailRA.entries.length} entries)
                  </h3>
                  <div className="rounded-lg border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Failure Mode</TableHead>
                          <TableHead className="min-w-[150px]">Effect</TableHead>
                          <TableHead className="min-w-[150px]">Cause</TableHead>
                          <TableHead className="min-w-[150px]">Current Controls</TableHead>
                          <TableHead className="w-[40px] text-center">S</TableHead>
                          <TableHead className="w-[40px] text-center">O</TableHead>
                          <TableHead className="w-[40px] text-center">D</TableHead>
                          <TableHead className="w-[60px] text-center">RPN</TableHead>
                          <TableHead className="w-[80px] text-center">Level</TableHead>
                          <TableHead className="min-w-[150px]">Recommended Action</TableHead>
                          <TableHead className="w-[70px] text-center">Residual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRA.entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm font-medium">{entry.failureMode}</TableCell>
                            <TableCell className="text-xs">{entry.effect}</TableCell>
                            <TableCell className="text-xs">{entry.cause}</TableCell>
                            <TableCell className="text-xs">{entry.currentControls}</TableCell>
                            <TableCell className="text-center text-sm">{entry.severity}</TableCell>
                            <TableCell className="text-center text-sm">{entry.occurrence}</TableCell>
                            <TableCell className="text-center text-sm">{entry.detection}</TableCell>
                            <TableCell className={cn("text-center text-sm", rpnColor(entry.rpn))}>
                              {entry.rpn}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn("text-[10px]", RISK_LEVEL_CONFIG[entry.riskLevel].color)}>
                                {RISK_LEVEL_CONFIG[entry.riskLevel].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{entry.recommendedAction}</TableCell>
                            <TableCell className="text-center">
                              {entry.residualRPN != null ? (
                                <span className={cn("text-sm", rpnColor(entry.residualRPN))}>
                                  {entry.residualRPN}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Mitigation Actions */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Mitigation Actions</h3>
                  {(() => {
                    const allMitigations = detailRA.entries.flatMap((e) =>
                      e.mitigationActions.map((m) => ({ ...m, failureMode: e.failureMode }))
                    );
                    if (allMitigations.length === 0) {
                      return (
                        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                          No mitigation actions defined for this assessment.
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-lg border overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Action</TableHead>
                              <TableHead className="min-w-[140px]">Related Failure Mode</TableHead>
                              <TableHead className="w-[130px]">Owner</TableHead>
                              <TableHead className="w-[100px]">Due Date</TableHead>
                              <TableHead className="w-[100px] text-center">Status</TableHead>
                              <TableHead className="w-[120px] text-center">Effectiveness</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allMitigations.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell className="text-sm">{m.description}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{m.failureMode}</TableCell>
                                <TableCell className="text-sm">{m.owner}</TableCell>
                                <TableCell className="text-xs">{formatDate(m.dueDate)}</TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-xs",
                                      m.status === "completed" || m.status === "verified"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                        : m.status === "in-progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    )}
                                  >
                                    {m.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {m.effectiveness ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        m.effectiveness === "effective"
                                          ? "border-green-500 text-green-700"
                                          : m.effectiveness === "partially-effective"
                                          ? "border-yellow-500 text-yellow-700"
                                          : "border-red-500 text-red-700"
                                      )}
                                    >
                                      {m.effectiveness}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">--</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>

                {detailRA.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Notes</h3>
                      <p className="text-sm text-muted-foreground">{detailRA.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
