"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import StatsCard from "@/components/shared/stats-card";
import PageHeader from "@/components/shared/page-header";
import OOSWorkflowDiagram from "@/components/shared/oos-workflow-diagram";
import RootCauseTools from "@/components/shared/root-cause-tools";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  Target,
  Plus,
  Eye,
  ArrowRight,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import type {
  OOSInvestigation,
  OOSStatus,
  OOSPriority,
  OutOfSpecType,
  OOSMetrics,
  Phase1Investigation,
  HypothesisChecklistItem,
} from "@/lib/quality/oos-types";
import { OOSStore } from "@/lib/quality/oos-store";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OOSStatus, string> = {
  initiated: "Initiated",
  "phase1-lab": "Phase 1 - Lab",
  "phase1-review": "Phase 1 - Review",
  "phase2-production": "Phase 2 - Production",
  "phase2-review": "Phase 2 - Review",
  extended: "Extended",
  "closed-confirmed": "Closed (Confirmed)",
  "closed-invalidated": "Closed (Invalidated)",
};

const STATUS_COLORS: Record<OOSStatus, string> = {
  initiated: "bg-gray-100 text-gray-800",
  "phase1-lab": "bg-blue-100 text-blue-800",
  "phase1-review": "bg-indigo-100 text-indigo-800",
  "phase2-production": "bg-orange-100 text-orange-800",
  "phase2-review": "bg-amber-100 text-amber-800",
  extended: "bg-purple-100 text-purple-800",
  "closed-confirmed": "bg-red-100 text-red-800",
  "closed-invalidated": "bg-green-100 text-green-800",
};

const PRIORITY_COLORS: Record<OOSPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const CATEGORY_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-green-50 border-green-200 text-green-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-indigo-50 border-indigo-200 text-indigo-700",
  "bg-red-50 border-red-200 text-red-700",
  "bg-cyan-50 border-cyan-200 text-cyan-700",
];

function daysOpen(inv: OOSInvestigation): number {
  const end = inv.closedAt ? new Date(inv.closedAt) : new Date();
  return Math.max(0, Math.round((end.getTime() - new Date(inv.initiatedAt).getTime()) / 86400000));
}

function formatSpec(inv: OOSInvestigation): string {
  const { min, max, unit } = inv.specification;
  if (min === 0) return `NMT ${max}${unit}`;
  return `${min}-${max}${unit}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OOSInvestigationPage() {
  const [store, setStore] = useState<OOSStore | null>(null);
  const [investigations, setInvestigations] = useState<OOSInvestigation[]>([]);
  const [metrics, setMetrics] = useState<OOSMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("investigations");

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail dialog
  const [selectedInv, setSelectedInv] = useState<OOSInvestigation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // New investigation form
  const [newForm, setNewForm] = useState({
    batchNumber: "",
    productName: "",
    testName: "",
    specMin: "",
    specMax: "",
    specUnit: "%",
    actualResult: "",
    outOfSpecType: "OOS" as OutOfSpecType,
    priority: "high" as OOSPriority,
    notes: "",
  });

  // Initialize store
  useEffect(() => {
    const s = new OOSStore();
    setStore(s);
    setInvestigations(s.getAll());
    setMetrics(s.getMetrics());
  }, []);

  const refresh = useCallback(() => {
    if (!store) return;
    setInvestigations(store.getAll());
    setMetrics(store.getMetrics());
  }, [store]);

  // Filtered data
  const filteredInvestigations = useMemo(() => {
    return investigations.filter((inv) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterPriority !== "all" && inv.priority !== filterPriority) return false;
      if (filterProduct !== "all" && inv.productName !== filterProduct) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          inv.number.toLowerCase().includes(q) ||
          inv.batchNumber.toLowerCase().includes(q) ||
          inv.productName.toLowerCase().includes(q) ||
          inv.testName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [investigations, filterStatus, filterPriority, filterProduct, searchQuery]);

  const uniqueProducts = useMemo(
    () => [...new Set(investigations.map((inv) => inv.productName))].sort(),
    [investigations]
  );

  // ── Actions ────────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!store) return;
    if (!newForm.batchNumber || !newForm.productName || !newForm.testName || !newForm.actualResult) return;
    store.create({
      batchNumber: newForm.batchNumber,
      productName: newForm.productName,
      testName: newForm.testName,
      specification: {
        min: parseFloat(newForm.specMin) || 0,
        max: parseFloat(newForm.specMax) || 100,
        unit: newForm.specUnit,
      },
      actualResult: parseFloat(newForm.actualResult),
      outOfSpecType: newForm.outOfSpecType,
      status: "initiated",
      priority: newForm.priority,
      initiatedBy: "Current User",
    });
    setNewForm({
      batchNumber: "",
      productName: "",
      testName: "",
      specMin: "",
      specMax: "",
      specUnit: "%",
      actualResult: "",
      outOfSpecType: "OOS",
      priority: "high",
      notes: "",
    });
    refresh();
    setActiveTab("investigations");
  };

  const handleAdvancePhase = (inv: OOSInvestigation) => {
    if (!store) return;
    const statusFlow: Record<string, OOSStatus> = {
      initiated: "phase1-lab",
      "phase1-lab": "phase1-review",
      "phase1-review": "phase2-production",
      "phase2-production": "phase2-review",
    };
    const next = statusFlow[inv.status];
    if (!next) return;

    // If phase1 concludes lab error, go straight to closed
    if (inv.status === "phase1-review" && inv.phase1?.conclusion === "lab-error-confirmed") {
      store.closeInvestigation(
        inv.id,
        "OOS invalidated - lab error confirmed during Phase 1 investigation.",
      );
    } else {
      store.advancePhase(inv.id, next);
    }
    refresh();
    const updated = store.getById(inv.id);
    if (updated) setSelectedInv(updated);
  };

  const handleCloseConfirmed = (inv: OOSInvestigation) => {
    if (!store) return;
    store.closeInvestigation(
      inv.id,
      inv.phase2?.conclusion ?? "OOS confirmed after full investigation.",
      inv.rootCause ?? inv.phase2?.conclusion,
      inv.capaId
    );
    refresh();
    const updated = store.getById(inv.id);
    if (updated) setSelectedInv(updated);
  };

  const handleCloseInvalidated = (inv: OOSInvestigation) => {
    if (!store) return;
    store.closeInvestigation(
      inv.id,
      "OOS invalidated - lab error confirmed.",
    );
    refresh();
    const updated = store.getById(inv.id);
    if (updated) setSelectedInv(updated);
  };

  const handleSaveRootCauseTool = (invId: string, tool: string, data: string) => {
    if (!store) return;
    const inv = store.getById(invId);
    if (!inv) return;
    const phase2 = inv.phase2 ?? {
      productionReview: [],
      materialReview: [],
      equipmentReview: [],
      processReview: [],
      environmentalReview: [],
      rootCauseTools: [],
    };
    const existingIdx = phase2.rootCauseTools.findIndex((t) => t.tool === tool);
    if (existingIdx >= 0) {
      phase2.rootCauseTools[existingIdx] = { tool: tool as "fishbone" | "5why" | "fmea", data };
    } else {
      phase2.rootCauseTools.push({ tool: tool as "fishbone" | "5why" | "fmea", data });
    }
    store.update(invId, { phase2 });
    refresh();
    const updated = store.getById(invId);
    if (updated) setSelectedInv(updated);
  };

  const handleLinkCAPA = (inv: OOSInvestigation) => {
    if (!store) return;
    const capaId = `CAPA-2026-${String(Math.floor(Math.random() * 100) + 20).padStart(3, "0")}`;
    store.update(inv.id, { capaId });
    refresh();
    const updated = store.getById(inv.id);
    if (updated) setSelectedInv(updated);
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (!store || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading OOS Investigation data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="OOS Investigation"
        description="Out-of-Specification investigation workflow per FDA/ICH guidelines"
        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={FileText}
          title="Total Investigations"
          value={metrics.totalInvestigations}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Clock}
          title="Open Investigations"
          value={metrics.openCount}
          subtitle={`${metrics.closedCount} closed`}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={Target}
          title="Avg Closure Days"
          value={`${metrics.avgClosureDays}d`}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={GitBranch}
          title="CAPA Linked"
          value={`${metrics.capaLinkedPct}%`}
          subtitle={`Phase 1 only: ${metrics.phase1OnlyPct}%`}
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="new">New Investigation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── Investigations Tab ────────────────────────────────────────── */}
        <TabsContent value="investigations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search OOS#, batch, product, test..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-[160px]">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[130px]">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[200px]">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <Select value={filterProduct} onValueChange={setFilterProduct}>
                    <SelectTrigger>
                      <SelectValue />
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
              </div>
            </CardContent>
          </Card>

          {/* Investigations Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">OOS #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Spec vs Result</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Days Open</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvestigations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No investigations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvestigations.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedInv(inv);
                            setDetailOpen(true);
                          }}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {inv.number}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">
                            {inv.productName}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{inv.batchNumber}</TableCell>
                          <TableCell className="text-sm">{inv.testName}</TableCell>
                          <TableCell className="text-sm">
                            <span className="text-muted-foreground">{formatSpec(inv)}</span>
                            {" vs "}
                            <span className="font-semibold text-red-600">
                              {inv.actualResult}
                              {inv.specification.unit && inv.specification.unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", STATUS_COLORS[inv.status])}
                            >
                              {STATUS_LABELS[inv.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs capitalize", PRIORITY_COLORS[inv.priority])}
                            >
                              {inv.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{inv.assignedTo ?? "-"}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {daysOpen(inv)}d
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInv(inv);
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── New Investigation Tab ─────────────────────────────────────── */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New OOS Investigation</CardTitle>
              <CardDescription>
                Initiate a new Out-of-Specification investigation. Complete all required fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Batch Number *</Label>
                  <Input
                    value={newForm.batchNumber}
                    onChange={(e) => setNewForm((p) => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="BN-2026-XXXX"
                  />
                </div>
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    value={newForm.productName}
                    onChange={(e) => setNewForm((p) => ({ ...p, productName: e.target.value }))}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <Label>Test Name *</Label>
                  <Input
                    value={newForm.testName}
                    onChange={(e) => setNewForm((p) => ({ ...p, testName: e.target.value }))}
                    placeholder="e.g. Assay, Dissolution, pH"
                  />
                </div>
                <div>
                  <Label>Actual Result *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newForm.actualResult}
                    onChange={(e) => setNewForm((p) => ({ ...p, actualResult: e.target.value }))}
                    placeholder="Observed value"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold">Specification</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newForm.specMin}
                      onChange={(e) => setNewForm((p) => ({ ...p, specMin: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newForm.specMax}
                      onChange={(e) => setNewForm((p) => ({ ...p, specMax: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Input
                      value={newForm.specUnit}
                      onChange={(e) => setNewForm((p) => ({ ...p, specUnit: e.target.value }))}
                      placeholder="%"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>OOS Type</Label>
                  <Select
                    value={newForm.outOfSpecType}
                    onValueChange={(v) =>
                      setNewForm((p) => ({ ...p, outOfSpecType: v as OutOfSpecType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OOS">OOS - Out of Specification</SelectItem>
                      <SelectItem value="OOT">OOT - Out of Trend</SelectItem>
                      <SelectItem value="OOE">OOE - Out of Expectation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newForm.priority}
                    onValueChange={(v) =>
                      setNewForm((p) => ({ ...p, priority: v as OOSPriority }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newForm.notes}
                  onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes or context..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setNewForm({
                      batchNumber: "",
                      productName: "",
                      testName: "",
                      specMin: "",
                      specMax: "",
                      specUnit: "%",
                      actualResult: "",
                      outOfSpecType: "OOS",
                      priority: "high",
                      notes: "",
                    })
                  }
                >
                  Clear
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Investigation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analytics Tab ─────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Category Cards */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">OOS by Test Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.byCategory.map((cat, idx) => (
                <Card
                  key={cat.category}
                  className={cn("border", CATEGORY_COLORS[idx % CATEGORY_COLORS.length])}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{cat.count}</div>
                    <div className="text-xs font-medium mt-1">{cat.category}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Open vs Closed */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Open Investigations</div>
                <div className="text-3xl font-bold text-amber-600 mt-1">{metrics.openCount}</div>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{
                      width: `${metrics.totalInvestigations > 0 ? (metrics.openCount / metrics.totalInvestigations) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Closed Investigations</div>
                <div className="text-3xl font-bold text-green-600 mt-1">{metrics.closedCount}</div>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${metrics.totalInvestigations > 0 ? (metrics.closedCount / metrics.totalInvestigations) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Avg Closure Days</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">{metrics.avgClosureDays}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Target: &lt; 30 days
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Phase 1 vs Phase 2 Ratio</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">
                  {metrics.phase1OnlyPct}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  resolved in Phase 1 only
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Common Root Causes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common Root Causes</CardTitle>
              <CardDescription>From closed-confirmed investigations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {investigations
                  .filter((inv) => inv.status === "closed-confirmed" && inv.rootCause)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{inv.rootCause}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {inv.number} - {inv.productName} ({inv.testName})
                        </div>
                      </div>
                    </div>
                  ))}
                {investigations.filter(
                  (inv) => inv.status === "closed-confirmed" && inv.rootCause
                ).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No confirmed root causes yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Investigation Detail Dialog ──────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedInv && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-blue-500" />
                  {selectedInv.number} - {selectedInv.productName}
                </DialogTitle>
                <DialogDescription>
                  {selectedInv.testName} | Batch: {selectedInv.batchNumber} | Initiated:{" "}
                  {formatDate(selectedInv.initiatedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Workflow Diagram */}
                <OOSWorkflowDiagram
                  currentStatus={selectedInv.status}
                  investigation={selectedInv}
                />

                <Separator />

                {/* Investigation Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", STATUS_COLORS[selectedInv.status])}
                      >
                        {STATUS_LABELS[selectedInv.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <div>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs capitalize", PRIORITY_COLORS[selectedInv.priority])}
                      >
                        {selectedInv.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <div className="text-sm font-medium">{selectedInv.outOfSpecType}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Days Open</Label>
                    <div className="text-sm font-medium">{daysOpen(selectedInv)}d</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Specification</Label>
                    <div className="text-sm font-medium">{formatSpec(selectedInv)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Actual Result</Label>
                    <div className="text-sm font-bold text-red-600">
                      {selectedInv.actualResult}
                      {selectedInv.specification.unit}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Initiated By</Label>
                    <div className="text-sm">{selectedInv.initiatedBy}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <div className="text-sm">{selectedInv.assignedTo ?? "Unassigned"}</div>
                  </div>
                </div>

                {/* Phase 1 Section */}
                {selectedInv.phase1 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-500" />
                        Phase 1 - Laboratory Investigation
                      </h3>

                      {/* Lab Error Status */}
                      <div className="flex items-center gap-2 mb-3">
                        {selectedInv.phase1.labError ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Lab Error Identified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            No Lab Error Found
                          </Badge>
                        )}
                        {selectedInv.phase1.conclusion && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              selectedInv.phase1.conclusion === "lab-error-confirmed"
                                ? "bg-amber-100 text-amber-800"
                                : selectedInv.phase1.conclusion === "no-lab-error"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {selectedInv.phase1.conclusion === "lab-error-confirmed"
                              ? "Lab Error Confirmed"
                              : selectedInv.phase1.conclusion === "no-lab-error"
                              ? "No Lab Error"
                              : "Inconclusive"}
                          </Badge>
                        )}
                      </div>

                      {selectedInv.phase1.labErrorDetails && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3 text-sm">
                          <span className="font-semibold text-amber-800">Lab Error Details: </span>
                          {selectedInv.phase1.labErrorDetails}
                        </div>
                      )}

                      {/* Hypothesis Checklist */}
                      {selectedInv.phase1.hypothesisChecklist.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Hypothesis Checklist
                          </Label>
                          <div className="space-y-1">
                            {selectedInv.phase1.hypothesisChecklist.map(
                              (item: HypothesisChecklistItem, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 rounded border px-3 py-2 text-sm"
                                >
                                  <Checkbox checked={item.checked} disabled className="mt-0.5" />
                                  <div>
                                    <span
                                      className={cn(
                                        item.checked
                                          ? "text-green-700"
                                          : "text-red-600 font-medium"
                                      )}
                                    >
                                      {item.item}
                                    </span>
                                    {item.notes && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({item.notes})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Retest Results */}
                      {selectedInv.phase1.retestResults.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Retest Results
                          </Label>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Result</TableHead>
                                <TableHead className="text-xs">Analyst</TableHead>
                                <TableHead className="text-xs">Equipment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedInv.phase1.retestResults.map((r, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-sm">
                                    {formatDate(r.testDate)}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">
                                    {r.result}
                                    {selectedInv.specification.unit}
                                  </TableCell>
                                  <TableCell className="text-sm">{r.analyst}</TableCell>
                                  <TableCell className="text-sm font-mono">{r.equipment}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {selectedInv.phase1.notes && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                          <span className="font-semibold text-blue-800">Notes: </span>
                          {selectedInv.phase1.notes}
                        </div>
                      )}

                      {selectedInv.phase1.reviewedBy && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Reviewed by {selectedInv.phase1.reviewedBy}
                          {selectedInv.phase1.reviewedAt &&
                            ` on ${formatDate(selectedInv.phase1.reviewedAt)}`}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Phase 2 Section */}
                {selectedInv.phase2 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-500" />
                        Phase 2 - Production Investigation
                      </h3>

                      {/* Production Review */}
                      {selectedInv.phase2.productionReview.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Production Review
                          </Label>
                          {selectedInv.phase2.productionReview.map((r, idx) => (
                            <div key={idx} className="rounded border px-3 py-2 mb-1 text-sm">
                              <span className="font-medium">{r.area}:</span> {r.finding}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({r.investigator})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Material Review */}
                      {selectedInv.phase2.materialReview.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Material Review
                          </Label>
                          {selectedInv.phase2.materialReview.map((r, idx) => (
                            <div key={idx} className="rounded border px-3 py-2 mb-1 text-sm">
                              <span className="font-medium">{r.materialName}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                (Batch: {r.batchNumber})
                              </span>
                              : {r.finding}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Equipment Review */}
                      {selectedInv.phase2.equipmentReview.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Equipment Review
                          </Label>
                          {selectedInv.phase2.equipmentReview.map((r, idx) => (
                            <div key={idx} className="rounded border px-3 py-2 mb-1 text-sm">
                              <span className="font-medium">{r.equipmentName}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({r.equipmentId})
                              </span>
                              : {r.finding}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Process Review */}
                      {selectedInv.phase2.processReview.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Process Review
                          </Label>
                          {selectedInv.phase2.processReview.map((r, idx) => (
                            <div key={idx} className="rounded border px-3 py-2 mb-1 text-sm">
                              <span className="font-medium">
                                {r.step} - {r.parameter}:
                              </span>{" "}
                              {r.finding}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Environmental Review */}
                      {selectedInv.phase2.environmentalReview.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Environmental Review
                          </Label>
                          {selectedInv.phase2.environmentalReview.map((r, idx) => (
                            <div key={idx} className="rounded border px-3 py-2 mb-1 text-sm">
                              <span className="font-medium">{r.factor}:</span> {r.finding}
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedInv.phase2.conclusion && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm mt-2">
                          <span className="font-semibold text-orange-800">Conclusion: </span>
                          {selectedInv.phase2.conclusion}
                        </div>
                      )}

                      {selectedInv.phase2.reviewedBy && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Reviewed by {selectedInv.phase2.reviewedBy}
                          {selectedInv.phase2.reviewedAt &&
                            ` on ${formatDate(selectedInv.phase2.reviewedAt)}`}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Root Cause Tools (for phase2 investigations) */}
                {(selectedInv.status === "phase2-production" ||
                  selectedInv.status === "phase2-review" ||
                  selectedInv.status === "closed-confirmed") && (
                  <>
                    <Separator />
                    <RootCauseTools
                      onSave={(tool, data) => handleSaveRootCauseTool(selectedInv.id, tool, data)}
                      initialData={selectedInv.phase2?.rootCauseTools}
                    />
                  </>
                )}

                {/* CAPA Linkage */}
                {(selectedInv.capaId ||
                  selectedInv.status === "phase2-review" ||
                  selectedInv.status === "closed-confirmed") && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-purple-500" />
                        CAPA Linkage
                      </h3>
                      {selectedInv.capaId ? (
                        <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-sm">
                          Linked to{" "}
                          <span className="font-mono font-bold text-purple-700">
                            {selectedInv.capaId}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No CAPA linked yet.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Root Cause & Conclusion (closed) */}
                {selectedInv.rootCause && (
                  <>
                    <Separator />
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <Label className="text-xs font-bold text-red-700">Root Cause</Label>
                      <div className="text-sm mt-1">{selectedInv.rootCause}</div>
                    </div>
                  </>
                )}

                {selectedInv.conclusion && (
                  <div className="rounded-lg bg-gray-50 border p-3">
                    <Label className="text-xs font-bold text-gray-700">Conclusion</Label>
                    <div className="text-sm mt-1">{selectedInv.conclusion}</div>
                    {selectedInv.closedBy && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Closed by {selectedInv.closedBy}
                        {selectedInv.closedAt && ` on ${formatDate(selectedInv.closedAt)}`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex-wrap gap-2">
                {selectedInv.status !== "closed-confirmed" &&
                  selectedInv.status !== "closed-invalidated" && (
                    <>
                      {/* Advance phase */}
                      {selectedInv.status !== "phase2-review" && (
                        <Button onClick={() => handleAdvancePhase(selectedInv)} size="sm">
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {selectedInv.status === "initiated"
                            ? "Start Phase 1"
                            : selectedInv.status === "phase1-lab"
                            ? "Submit for Review"
                            : selectedInv.status === "phase1-review"
                            ? selectedInv.phase1?.conclusion === "lab-error-confirmed"
                              ? "Close as Invalidated"
                              : "Advance to Phase 2"
                            : selectedInv.status === "phase2-production"
                            ? "Submit for Review"
                            : "Advance"}
                        </Button>
                      )}

                      {/* Close as confirmed */}
                      {(selectedInv.status === "phase2-review" ||
                        selectedInv.status === "phase2-production") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCloseConfirmed(selectedInv)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Close as Confirmed
                        </Button>
                      )}

                      {/* Close as invalidated */}
                      {(selectedInv.status === "phase1-lab" ||
                        selectedInv.status === "phase1-review") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloseInvalidated(selectedInv)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Close as Invalidated
                        </Button>
                      )}

                      {/* Link CAPA */}
                      {!selectedInv.capaId &&
                        (selectedInv.status === "phase2-production" ||
                          selectedInv.status === "phase2-review") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLinkCAPA(selectedInv)}
                          >
                            <GitBranch className="mr-2 h-4 w-4" />
                            Link CAPA
                          </Button>
                        )}
                    </>
                  )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
