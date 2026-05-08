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
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import SPCChartView from "@/components/shared/spc-chart-view";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Activity,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Plus,
  ArrowLeft,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Filter,
  Target,
} from "lucide-react";
import type {
  SPCChart,
  SPCChartType,
  SPCViolation,
  SPCMetrics,
  ViolationSeverity,
  ProcessCapability,
} from "@/lib/quality/spc-types";
import { DEFAULT_SPC_RULES } from "@/lib/quality/spc-types";
import { SPCStore, spcStore } from "@/lib/quality/spc-store";

// ─── Helpers ───────────────────────────────────────────────────────────────

const CHART_TYPE_LABELS: Record<SPCChartType, string> = {
  "x-bar": "X-bar",
  "r-chart": "R Chart",
  "p-chart": "P Chart",
  "c-chart": "C Chart",
  cusum: "CUSUM",
};

function severityBadge(severity: ViolationSeverity) {
  const colors: Record<ViolationSeverity, string> = {
    critical: "bg-red-100 text-red-800",
    major: "bg-orange-100 text-orange-800",
    minor: "bg-yellow-100 text-yellow-800",
  };
  return (
    <Badge className={cn("text-[10px] capitalize", colors[severity])}>
      {severity}
    </Badge>
  );
}

function cpkBadge(cpk: number | undefined) {
  if (cpk == null || cpk === 0) return <Badge variant="outline">N/A</Badge>;
  if (cpk >= 1.67)
    return (
      <Badge className="bg-green-100 text-green-800 text-[10px]">
        {cpk.toFixed(2)} - Excellent
      </Badge>
    );
  if (cpk >= 1.33)
    return (
      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
        {cpk.toFixed(2)} - Capable
      </Badge>
    );
  if (cpk >= 1.0)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
        {cpk.toFixed(2)} - Marginal
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 text-[10px]">
      {cpk.toFixed(2)} - Not Capable
    </Badge>
  );
}

function statusDot(inControl: boolean) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        inControl ? "bg-green-500" : "bg-red-500"
      )}
    />
  );
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function SPCChartsPage() {
  const [charts, setCharts] = useState<SPCChart[]>([]);
  const [metrics, setMetrics] = useState<SPCMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("charts");
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterProcess, setFilterProcess] = useState<string>("all");

  // ── New Chart Form State ────────────────────────────────────────────
  const [newChartName, setNewChartName] = useState("");
  const [newChartType, setNewChartType] = useState<SPCChartType>("x-bar");
  const [newProduct, setNewProduct] = useState("");
  const [newProcess, setNewProcess] = useState("");
  const [newParameter, setNewParameter] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newSubgroupSize, setNewSubgroupSize] = useState("5");
  const [newFrequency, setNewFrequency] = useState("");
  const [newUSL, setNewUSL] = useState("");
  const [newLSL, setNewLSL] = useState("");
  const [newTarget, setNewTarget] = useState("");

  // ── Load Data ──────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    setCharts(spcStore.getAll());
    setMetrics(spcStore.getMetrics());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived data ──────────────────────────────────────────────────
  const selectedChart = useMemo(
    () => (selectedChartId ? charts.find((c) => c.id === selectedChartId) : null),
    [selectedChartId, charts]
  );

  const products = useMemo(
    () => [...new Set(charts.map((c) => c.product))],
    [charts]
  );

  const processes = useMemo(
    () => [...new Set(charts.map((c) => c.process))],
    [charts]
  );

  const filteredCharts = useMemo(() => {
    return charts.filter((c) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !c.name.toLowerCase().includes(term) &&
          !c.product.toLowerCase().includes(term) &&
          !c.parameter.toLowerCase().includes(term)
        )
          return false;
      }
      if (filterProduct !== "all" && c.product !== filterProduct) return false;
      if (filterProcess !== "all" && c.process !== filterProcess) return false;
      return true;
    });
  }, [charts, searchTerm, filterProduct, filterProcess]);

  const allViolations = useMemo(
    () => charts.flatMap((c) => c.violations),
    [charts]
  );

  const filteredViolations = useMemo(() => {
    return allViolations.filter((v) => {
      if (filterSeverity !== "all" && v.severity !== filterSeverity) return false;
      if (filterProduct !== "all" && v.product !== filterProduct) return false;
      if (filterProcess !== "all" && v.process !== filterProcess) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !v.chartName.toLowerCase().includes(term) &&
          !v.product.toLowerCase().includes(term) &&
          !v.ruleName.toLowerCase().includes(term)
        )
          return false;
      }
      return true;
    });
  }, [allViolations, filterSeverity, filterProduct, filterProcess, searchTerm]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleCreateChart = useCallback(() => {
    if (!newChartName || !newProduct || !newProcess || !newParameter || !newUnit) return;

    const specLimits =
      newUSL && newLSL
        ? {
            USL: parseFloat(newUSL),
            LSL: parseFloat(newLSL),
            target: newTarget ? parseFloat(newTarget) : undefined,
          }
        : undefined;

    spcStore.create({
      name: newChartName,
      chartType: newChartType,
      product: newProduct,
      process: newProcess,
      parameter: newParameter,
      unit: newUnit,
      subgroupSize: parseInt(newSubgroupSize, 10) || 5,
      samplingFrequency: newFrequency || "Every batch",
      specLimits,
    });

    // Reset form
    setNewChartName("");
    setNewChartType("x-bar");
    setNewProduct("");
    setNewProcess("");
    setNewParameter("");
    setNewUnit("");
    setNewSubgroupSize("5");
    setNewFrequency("");
    setNewUSL("");
    setNewLSL("");
    setNewTarget("");

    loadData();
    setActiveTab("charts");
  }, [
    newChartName,
    newChartType,
    newProduct,
    newProcess,
    newParameter,
    newUnit,
    newSubgroupSize,
    newFrequency,
    newUSL,
    newLSL,
    newTarget,
    loadData,
  ]);

  const handleAcknowledge = useCallback(
    (chartId: string, violationId: string) => {
      spcStore.acknowledgeViolation(chartId, violationId, "QA Analyst");
      loadData();
    },
    [loadData]
  );

  // ─── Chart Detail View ─────────────────────────────────────────────

  if (selectedChart) {
    const oocPoints = selectedChart.dataPoints.filter((dp) => !dp.inControl);
    const cap = selectedChart.capability;
    const unacknowledgedCount = selectedChart.violations.filter(
      (v) => !v.acknowledged
    ).length;

    return (
      <div className="space-y-6 p-6">
        {/* Back button and header */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedChartId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Charts
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{selectedChart.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedChart.product} | {selectedChart.process} |{" "}
              {selectedChart.parameter} ({selectedChart.unit})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {CHART_TYPE_LABELS[selectedChart.chartType]}
            </Badge>
            {oocPoints.length > 0 ? (
              <Badge className="bg-red-100 text-red-800">
                <ShieldAlert className="h-3 w-3 mr-1" />
                {oocPoints.length} Out of Control
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">
                <ShieldCheck className="h-3 w-3 mr-1" />
                In Control
              </Badge>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            icon={BarChart3}
            title="Data Points"
            value={selectedChart.dataPoints.length}
            subtitle={`Subgroup size: ${selectedChart.subgroupSize}`}
          />
          <StatsCard
            icon={oocPoints.length > 0 ? ShieldAlert : ShieldCheck}
            title="OOC Points"
            value={oocPoints.length}
            iconColor={
              oocPoints.length > 0
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-600"
            }
            subtitle={
              selectedChart.dataPoints.length > 0
                ? `${((oocPoints.length / selectedChart.dataPoints.length) * 100).toFixed(1)}% of total`
                : undefined
            }
          />
          <StatsCard
            icon={AlertTriangle}
            title="Active Violations"
            value={unacknowledgedCount}
            iconColor="bg-amber-100 text-amber-600"
            subtitle={`${selectedChart.violations.length} total`}
          />
          <StatsCard
            icon={Target}
            title="Cpk"
            value={cap ? cap.Cpk.toFixed(3) : "N/A"}
            iconColor={
              cap && cap.Cpk >= 1.33
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            }
            subtitle={
              cap
                ? `Cp: ${cap.Cp.toFixed(3)}`
                : "No spec limits"
            }
          />
        </div>

        {/* Control Chart */}
        <SPCChartView
          dataPoints={selectedChart.dataPoints}
          controlLimits={selectedChart.controlLimits}
          title={`${CHART_TYPE_LABELS[selectedChart.chartType]} Control Chart`}
          unit={selectedChart.unit}
          height={360}
          showWarningLimits
        />

        {/* Control Limits & Capability side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Control Limits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Control Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UCL (3-sigma)</span>
                  <span className="font-mono font-medium text-red-600">
                    {selectedChart.controlLimits.UCL.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UWL (2-sigma)</span>
                  <span className="font-mono font-medium text-yellow-600">
                    {selectedChart.controlLimits.UWL.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+1 sigma</span>
                  <span className="font-mono">
                    {selectedChart.controlLimits.oneσUpper.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between border-y py-1">
                  <span className="text-muted-foreground font-medium">
                    CL (Center Line)
                  </span>
                  <span className="font-mono font-bold text-green-600">
                    {selectedChart.controlLimits.CL.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">-1 sigma</span>
                  <span className="font-mono">
                    {selectedChart.controlLimits.oneσLower.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LWL (2-sigma)</span>
                  <span className="font-mono font-medium text-yellow-600">
                    {selectedChart.controlLimits.LWL.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LCL (3-sigma)</span>
                  <span className="font-mono font-medium text-red-600">
                    {selectedChart.controlLimits.LCL.toFixed(4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Capability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Process Capability</CardTitle>
            </CardHeader>
            <CardContent>
              {cap ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cp</span>
                    <span className="font-mono font-medium">
                      {cap.Cp.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-medium">
                      Cpk
                    </span>
                    <span>{cpkBadge(cap.Cpk)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pp</span>
                    <span className="font-mono font-medium">
                      {cap.Pp.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Ppk</span>
                    <span className="font-mono font-medium">
                      {cap.Ppk.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mean</span>
                    <span className="font-mono">{cap.mean.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Std Dev</span>
                    <span className="font-mono">{cap.sigma.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PPM Total</span>
                    <span className="font-mono">
                      {cap.ppmTotal.toLocaleString()}
                    </span>
                  </div>
                  {selectedChart.specLimits && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">USL</span>
                        <span className="font-mono">
                          {selectedChart.specLimits.USL}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LSL</span>
                        <span className="font-mono">
                          {selectedChart.specLimits.LSL}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No specification limits defined. Add USL/LSL to calculate
                  process capability.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Data Points ({selectedChart.dataPoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">
                      Value ({selectedChart.unit})
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Violations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...selectedChart.dataPoints]
                    .reverse()
                    .slice(0, 50)
                    .map((dp) => (
                      <TableRow
                        key={dp.id}
                        className={cn(!dp.inControl && "bg-red-50/50")}
                      >
                        <TableCell className="font-mono text-xs">
                          {dp.sampleNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          {dp.timestamp}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {dp.value.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-center">
                          {statusDot(dp.inControl)}
                        </TableCell>
                        <TableCell>
                          {dp.violations.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {dp.violations.map((v) => {
                                const rule = DEFAULT_SPC_RULES.find(
                                  (r) => r.id === v
                                );
                                return (
                                  <Badge
                                    key={v}
                                    variant="outline"
                                    className="text-[9px] text-red-600 border-red-200"
                                  >
                                    {rule?.name ?? v}
                                  </Badge>
                                );
                              })}
                            </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Violations for this chart */}
        {selectedChart.violations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Violations ({selectedChart.violations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Sample #</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedChart.violations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs font-medium">
                          {v.ruleName}
                        </TableCell>
                        <TableCell>{severityBadge(v.severity)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {v.sampleNumbers.join(", ")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {v.value.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {v.detectedAt}
                        </TableCell>
                        <TableCell className="text-center">
                          {v.acknowledged ? (
                            <Badge className="bg-green-100 text-green-700 text-[9px]">
                              <CheckCircle className="h-3 w-3 mr-0.5" />
                              Ack
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 text-[9px]">
                              <XCircle className="h-3 w-3 mr-0.5" />
                              Open
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!v.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleAcknowledge(selectedChart.id, v.id)
                              }
                            >
                              Acknowledge
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Main Dashboard View ───────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="SPC Charts"
        description="Statistical Process Control - Monitor process stability and capability across manufacturing operations"
        icon={<LineChart className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={() => setActiveTab("new-chart")}>
            <Plus className="h-4 w-4 mr-1" />
            New Chart
          </Button>
        }
      />

      {/* Stats Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            icon={Activity}
            title="Active Charts"
            value={metrics.activeCharts}
            subtitle={`${metrics.totalCharts} total`}
          />
          <StatsCard
            icon={ShieldCheck}
            title="In Control"
            value={metrics.inControlCharts}
            iconColor="bg-green-100 text-green-600"
            subtitle={
              metrics.activeCharts > 0
                ? `${((metrics.inControlCharts / metrics.activeCharts) * 100).toFixed(0)}% of active`
                : undefined
            }
          />
          <StatsCard
            icon={ShieldAlert}
            title="Out of Control"
            value={metrics.outOfControlCharts}
            iconColor={
              metrics.outOfControlCharts > 0
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-600"
            }
            subtitle={`${metrics.unresolvedViolations} open violations`}
          />
          <StatsCard
            icon={TrendingUp}
            title="Avg Cpk"
            value={metrics.avgCpk > 0 ? metrics.avgCpk.toFixed(2) : "N/A"}
            iconColor={
              metrics.avgCpk >= 1.33
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            }
            subtitle={`${metrics.chartsAboveCpk133} charts >= 1.33`}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="new-chart">New Chart</TabsTrigger>
          <TabsTrigger value="violations">
            Violations
            {metrics && metrics.unresolvedViolations > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 h-5 min-w-[20px] text-[10px] px-1"
              >
                {metrics.unresolvedViolations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="capability">Capability</TabsTrigger>
        </TabsList>

        {/* ─── Charts Tab ─────────────────────────────────────────────── */}
        <TabsContent value="charts">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search charts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-[200px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Product" />
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
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chart Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCharts.map((chart) => {
              const ooc = chart.dataPoints.filter((dp) => !dp.inControl).length;
              const isOOC = ooc > 0;
              const unacked = chart.violations.filter(
                (v) => !v.acknowledged
              ).length;

              return (
                <Card
                  key={chart.id}
                  className={cn(
                    "cursor-pointer transition-shadow hover:shadow-md",
                    isOOC && "border-red-200"
                  )}
                  onClick={() => setSelectedChartId(chart.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">
                          {chart.name}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {chart.product}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[9px]">
                          {CHART_TYPE_LABELS[chart.chartType]}
                        </Badge>
                        {statusDot(!isOOC)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Mini chart preview */}
                    <div className="h-20 mb-3">
                      <MiniSparkline
                        dataPoints={chart.dataPoints}
                        controlLimits={chart.controlLimits}
                      />
                    </div>

                    {/* Info row */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {chart.dataPoints.length} pts
                        </span>
                        {isOOC ? (
                          <span className="text-red-600 font-medium">
                            {ooc} OOC
                          </span>
                        ) : (
                          <span className="text-green-600">In Control</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {cpkBadge(chart.capability?.Cpk)}
                        {unacked > 0 && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] h-4 px-1"
                          >
                            {unacked}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Parameter and process */}
                    <div className="mt-2 pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{chart.parameter}</span>
                      <span>{chart.process}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCharts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <LineChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No charts found matching your criteria.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── New Chart Tab ──────────────────────────────────────────── */}
        <TabsContent value="new-chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Create New SPC Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart-name">Chart Name *</Label>
                    <Input
                      id="chart-name"
                      placeholder="e.g., Tablet Weight - Product X"
                      value={newChartName}
                      onChange={(e) => setNewChartName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chart-type">Chart Type *</Label>
                    <Select
                      value={newChartType}
                      onValueChange={(v) => setNewChartType(v as SPCChartType)}
                    >
                      <SelectTrigger id="chart-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="x-bar">X-bar (Mean)</SelectItem>
                        <SelectItem value="r-chart">R Chart (Range)</SelectItem>
                        <SelectItem value="p-chart">
                          P Chart (Proportion)
                        </SelectItem>
                        <SelectItem value="c-chart">C Chart (Count)</SelectItem>
                        <SelectItem value="cusum">CUSUM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product">Product *</Label>
                    <Input
                      id="product"
                      placeholder="e.g., Amoxicillin 500mg Capsules"
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="process">Process *</Label>
                    <Input
                      id="process"
                      placeholder="e.g., Tablet Compression"
                      value={newProcess}
                      onChange={(e) => setNewProcess(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parameter">Parameter *</Label>
                    <Input
                      id="parameter"
                      placeholder="e.g., Tablet Weight"
                      value={newParameter}
                      onChange={(e) => setNewParameter(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <Input
                        id="unit"
                        placeholder="e.g., mg"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subgroup">Subgroup Size</Label>
                      <Input
                        id="subgroup"
                        type="number"
                        min="1"
                        value={newSubgroupSize}
                        onChange={(e) => setNewSubgroupSize(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Sampling Frequency</Label>
                    <Input
                      id="frequency"
                      placeholder="e.g., Every batch, Every 2 hours"
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right column - Specification Limits */}
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-4">
                    <h4 className="text-sm font-semibold">
                      Specification Limits (Optional)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Enter specification limits to calculate process capability
                      indices (Cp, Cpk).
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="usl">Upper Specification Limit (USL)</Label>
                      <Input
                        id="usl"
                        type="number"
                        step="any"
                        placeholder="e.g., 510"
                        value={newUSL}
                        onChange={(e) => setNewUSL(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lsl">Lower Specification Limit (LSL)</Label>
                      <Input
                        id="lsl"
                        type="number"
                        step="any"
                        placeholder="e.g., 490"
                        value={newLSL}
                        onChange={(e) => setNewLSL(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="target">Target Value</Label>
                      <Input
                        id="target"
                        type="number"
                        step="any"
                        placeholder="e.g., 500"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Western Electric Rules */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="text-sm font-semibold">
                      Western Electric Rules
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Default rules will be applied. You can customize after
                      creation.
                    </p>
                    <div className="space-y-1.5">
                      {DEFAULT_SPC_RULES.filter((r) => r.enabled).map(
                        (rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            {severityBadge(rule.severity)}
                            <span>{rule.description}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("charts")}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateChart}
                      disabled={
                        !newChartName ||
                        !newProduct ||
                        !newProcess ||
                        !newParameter ||
                        !newUnit
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Chart
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Violations Tab ─────────────────────────────────────────── */}
        <TabsContent value="violations">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search violations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Product" />
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

          {/* Violation summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">
                {filteredViolations.length}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Critical</div>
              <div className="text-xl font-bold text-red-600">
                {
                  filteredViolations.filter((v) => v.severity === "critical")
                    .length
                }
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Unacknowledged</div>
              <div className="text-xl font-bold text-amber-600">
                {filteredViolations.filter((v) => !v.acknowledged).length}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Acknowledged</div>
              <div className="text-xl font-bold text-green-600">
                {filteredViolations.filter((v) => v.acknowledged).length}
              </div>
            </Card>
          </div>

          {/* Violations table */}
          <Card>
            <CardContent className="pt-4">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chart</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Sample #</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No violations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredViolations
                        .sort((a, b) => {
                          // Unacknowledged first, then by severity, then by date
                          if (a.acknowledged !== b.acknowledged)
                            return a.acknowledged ? 1 : -1;
                          const sevOrder = { critical: 0, major: 1, minor: 2 };
                          if (sevOrder[a.severity] !== sevOrder[b.severity])
                            return sevOrder[a.severity] - sevOrder[b.severity];
                          return (
                            new Date(b.detectedAt).getTime() -
                            new Date(a.detectedAt).getTime()
                          );
                        })
                        .slice(0, 100)
                        .map((v) => (
                          <TableRow
                            key={v.id}
                            className={cn(
                              !v.acknowledged && "bg-amber-50/50"
                            )}
                          >
                            <TableCell
                              className="text-xs font-medium cursor-pointer hover:text-primary"
                              onClick={() => setSelectedChartId(v.chartId)}
                            >
                              {v.chartName}
                            </TableCell>
                            <TableCell className="text-xs">
                              {v.product}
                            </TableCell>
                            <TableCell className="text-xs">
                              {v.ruleName}
                            </TableCell>
                            <TableCell>
                              {severityBadge(v.severity)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {v.sampleNumbers.join(", ")}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {v.value.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {v.detectedAt}
                            </TableCell>
                            <TableCell className="text-center">
                              {v.acknowledged ? (
                                <Badge className="bg-green-100 text-green-700 text-[9px]">
                                  <CheckCircle className="h-3 w-3 mr-0.5" />
                                  Ack
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 text-[9px]">
                                  <XCircle className="h-3 w-3 mr-0.5" />
                                  Open
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setSelectedChartId(v.chartId)
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {!v.acknowledged && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      handleAcknowledge(v.chartId, v.id)
                                    }
                                  >
                                    Ack
                                  </Button>
                                )}
                              </div>
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

        {/* ─── Capability Tab ─────────────────────────────────────────── */}
        <TabsContent value="capability">
          {/* Capability summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">
                Charts with Cpk data
              </div>
              <div className="text-xl font-bold">
                {
                  charts.filter(
                    (c) => c.capability && c.capability.Cpk > 0
                  ).length
                }
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">
                Cpk &ge; 1.33 (Capable)
              </div>
              <div className="text-xl font-bold text-green-600">
                {metrics?.chartsAboveCpk133 ?? 0}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">
                Cpk &lt; 1.0 (Not Capable)
              </div>
              <div className="text-xl font-bold text-red-600">
                {metrics?.chartsBelowCpk1 ?? 0}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Avg Cpk</div>
              <div className="text-xl font-bold">
                {metrics && metrics.avgCpk > 0
                  ? metrics.avgCpk.toFixed(2)
                  : "N/A"}
              </div>
            </Card>
          </div>

          {/* Cpk comparison bar chart (CSS-based) */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Cpk Comparison Across Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts
                  .filter((c) => c.capability && c.capability.Cpk > 0)
                  .sort(
                    (a, b) =>
                      (b.capability?.Cpk ?? 0) - (a.capability?.Cpk ?? 0)
                  )
                  .map((chart) => {
                    const cpk = chart.capability?.Cpk ?? 0;
                    const maxCpk = 3;
                    const barWidth = Math.min((cpk / maxCpk) * 100, 100);
                    const barColor =
                      cpk >= 1.67
                        ? "bg-green-500"
                        : cpk >= 1.33
                        ? "bg-emerald-500"
                        : cpk >= 1.0
                        ? "bg-yellow-500"
                        : "bg-red-500";

                    return (
                      <div key={chart.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="font-medium truncate max-w-[300px] cursor-pointer hover:text-primary"
                            onClick={() => setSelectedChartId(chart.id)}
                          >
                            {chart.name}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {cpk.toFixed(3)}
                          </span>
                        </div>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          {/* 1.0 and 1.33 markers */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                            style={{
                              left: `${(1.0 / maxCpk) * 100}%`,
                            }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-px bg-green-400 z-10"
                            style={{
                              left: `${(1.33 / maxCpk) * 100}%`,
                            }}
                          />
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              barColor
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {charts.filter(
                  (c) => c.capability && c.capability.Cpk > 0
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No capability data available.
                  </p>
                )}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground border-t pt-2">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-red-400" />
                  Cpk = 1.0
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-green-400" />
                  Cpk = 1.33
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Capability summary table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Process Capability Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chart</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead className="text-right">USL</TableHead>
                    <TableHead className="text-right">LSL</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Std Dev</TableHead>
                    <TableHead className="text-right">Cp</TableHead>
                    <TableHead className="text-right">Cpk</TableHead>
                    <TableHead className="text-right">Pp</TableHead>
                    <TableHead className="text-right">Ppk</TableHead>
                    <TableHead className="text-right">PPM</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charts
                    .filter((c) => c.capability && c.specLimits)
                    .sort(
                      (a, b) =>
                        (a.capability?.Cpk ?? 0) - (b.capability?.Cpk ?? 0)
                    )
                    .map((chart) => {
                      const cap = chart.capability!;
                      const spec = chart.specLimits!;
                      return (
                        <TableRow
                          key={chart.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedChartId(chart.id)}
                        >
                          <TableCell className="text-xs font-medium">
                            {chart.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {chart.product}
                          </TableCell>
                          <TableCell className="text-xs">
                            {chart.parameter} ({chart.unit})
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {spec.USL}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {spec.LSL}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.mean.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.sigma.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.Cp.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            {cap.Cpk.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.Pp.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.Ppk.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {cap.ppmTotal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {cpkBadge(cap.Cpk)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {charts.filter((c) => c.capability && c.specLimits)
                    .length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No capability data available. Add specification limits
                        to your charts.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Mini Sparkline Component ────────────────────────────────────────────────

interface MiniSparklineProps {
  dataPoints: SPCChart["dataPoints"];
  controlLimits: SPCChart["controlLimits"];
}

function MiniSparkline({ dataPoints, controlLimits }: MiniSparklineProps) {
  if (dataPoints.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Insufficient data
      </div>
    );
  }

  const values = dataPoints.map((dp) => dp.value);
  const allY = [
    ...values,
    controlLimits.UCL,
    controlLimits.LCL,
    controlLimits.CL,
  ];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeY = maxY - minY || 1;

  const width = 300;
  const height = 80;
  const px = 4;
  const py = 4;
  const chartW = width - 2 * px;
  const chartH = height - 2 * py;

  const toX = (i: number) => px + (i / (dataPoints.length - 1)) * chartW;
  const toY = (v: number) => py + chartH - ((v - minY) / rangeY) * chartH;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
    .join(" ");

  const uclY = toY(controlLimits.UCL);
  const clY = toY(controlLimits.CL);
  const lclY = toY(controlLimits.LCL);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      {/* UCL */}
      <line
        x1={px}
        y1={uclY}
        x2={width - px}
        y2={uclY}
        stroke="#ef4444"
        strokeWidth={0.8}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      {/* CL */}
      <line
        x1={px}
        y1={clY}
        x2={width - px}
        y2={clY}
        stroke="#22c55e"
        strokeWidth={0.8}
        opacity={0.5}
      />
      {/* LCL */}
      <line
        x1={px}
        y1={lclY}
        x2={width - px}
        y2={lclY}
        stroke="#ef4444"
        strokeWidth={0.8}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      {/* Data line */}
      <path
        d={linePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* OOC points */}
      {dataPoints.map((dp, i) => {
        if (dp.inControl) return null;
        return (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(dp.value)}
            r={2.5}
            fill="#ef4444"
          />
        );
      })}
    </svg>
  );
}
