"use client";

import { useState, useEffect, useMemo } from "react";
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
import ReleaseChecklistComponent from "@/components/shared/release-checklist";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  ShieldCheck,
  Search,
  Eye,
  Play,
  Send,
  Ban,
  RotateCcw,
  Package,
  FileText,
  Calendar,
  User,
  TrendingUp,
  BarChart3,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { batchReleaseStore } from "@/lib/quality/batch-release-store";
import type {
  BatchRelease,
  ReleaseStatus,
  ReleaseMetrics,
  QPDecision,
  QPDecisionType,
  RegulatoryHold,
  ChecklistCategory,
} from "@/lib/quality/batch-release-types";
import { useCrossModuleActions } from "@/lib/cross-module-actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReleaseStatus, string> = {
  "pending-review": "bg-gray-100 text-gray-800",
  "under-review": "bg-blue-100 text-blue-800",
  "checklist-complete": "bg-cyan-100 text-cyan-800",
  "qp-review": "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  "on-hold": "bg-orange-100 text-orange-800",
  "released-to-market": "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  "pending-review": "Pending Review",
  "under-review": "Under Review",
  "checklist-complete": "Checklist Complete",
  "qp-review": "QP Review",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  "released-to-market": "Released to Market",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "text-gray-600",
  high: "text-orange-600 font-medium",
  urgent: "text-red-600 font-bold",
};

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  manufacturing: "Manufacturing",
  qc: "Quality Control",
  regulatory: "Regulatory",
  documentation: "Documentation",
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function BatchReleasePage() {
  const crossModule = useCrossModuleActions();
  const [releases, setReleases] = useState<BatchRelease[]>([]);
  const [metrics, setMetrics] = useState<ReleaseMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedRelease, setSelectedRelease] = useState<BatchRelease | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // QP Decision form state
  const [qpName, setQpName] = useState("");
  const [qpDecision, setQpDecision] = useState<QPDecisionType>("release");
  const [qpJustification, setQpJustification] = useState("");
  const [qpConditions, setQpConditions] = useState("");
  const [qpSignature, setQpSignature] = useState("");

  // Hold form state
  const [holdReason, setHoldReason] = useState("");
  const [holdExpectedResolution, setHoldExpectedResolution] = useState("");

  // Start review form
  const [startReviewQP, setStartReviewQP] = useState("");

  // Load data
  function reload() {
    setReleases(batchReleaseStore.getAll());
    setMetrics(batchReleaseStore.getMetrics());
  }

  useEffect(() => {
    reload();
  }, []);

  // Derived data
  const products = useMemo(
    () => [...new Set(releases.map((r) => r.product))].sort(),
    [releases]
  );

  const queueReleases = useMemo(() => {
    const queue = releases.filter((r) =>
      [
        "pending-review",
        "under-review",
        "checklist-complete",
        "qp-review",
      ].includes(r.status)
    );
    // Sort by priority then by creation date
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
    };
    return queue.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [releases]);

  const releasedReleases = useMemo(
    () =>
      releases
        .filter((r) => r.status === "released-to-market")
        .sort(
          (a, b) =>
            new Date(b.releasedToMarketAt || b.updatedAt).getTime() -
            new Date(a.releasedToMarketAt || a.updatedAt).getTime()
        ),
    [releases]
  );

  const onHoldReleases = useMemo(
    () => releases.filter((r) => r.status === "on-hold"),
    [releases]
  );

  const rejectedReleases = useMemo(
    () => releases.filter((r) => r.status === "rejected"),
    [releases]
  );

  // Filtered queue
  const filteredQueue = useMemo(() => {
    let list = queueReleases;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.batchNumber.toLowerCase().includes(q)
      );
    }
    if (filterProduct !== "all") {
      list = list.filter((r) => r.product === filterProduct);
    }
    if (filterPriority !== "all") {
      list = list.filter((r) => r.priority === filterPriority);
    }
    return list;
  }, [queueReleases, searchQuery, filterProduct, filterPriority]);

  // ── Actions ─────────────────────────────────────────────────────────────

  function openDetail(release: BatchRelease) {
    setSelectedRelease(release);
    setDetailOpen(true);
    resetForms();
  }

  function resetForms() {
    setQpName("");
    setQpDecision("release");
    setQpJustification("");
    setQpConditions("");
    setQpSignature("");
    setHoldReason("");
    setHoldExpectedResolution("");
    setStartReviewQP("");
  }

  function handleStartReview(id: string) {
    if (!startReviewQP.trim()) return;
    batchReleaseStore.startReview(id, startReviewQP.trim());
    reload();
    const updated = batchReleaseStore.getById(id);
    if (updated) setSelectedRelease(updated);
  }

  function handleChecklistUpdate(
    itemId: string,
    status: "passed" | "failed" | "na",
    reviewer: string,
    comments?: string
  ) {
    if (!selectedRelease) return;
    batchReleaseStore.completeChecklistItem(
      selectedRelease.id,
      itemId,
      status,
      reviewer,
      comments
    );
    reload();
    const updated = batchReleaseStore.getById(selectedRelease.id);
    if (updated) setSelectedRelease(updated);
  }

  function handleSubmitForQP(id: string) {
    batchReleaseStore.submitForQP(id);
    reload();
    const updated = batchReleaseStore.getById(id);
    if (updated) setSelectedRelease(updated);
  }

  function handleRecordQPDecision(id: string) {
    if (!qpName.trim() || !qpJustification.trim() || !qpSignature.trim()) return;
    const decision: QPDecision = {
      qpName: qpName.trim(),
      decision: qpDecision,
      justification: qpJustification.trim(),
      conditions: qpConditions.trim()
        ? qpConditions
            .trim()
            .split("\n")
            .filter((c) => c.trim())
        : undefined,
      date: new Date().toISOString(),
      signature: qpSignature.trim(),
    };
    batchReleaseStore.recordQPDecision(id, decision);
    reload();
    const updated = batchReleaseStore.getById(id);
    if (updated) setSelectedRelease(updated);
  }

  function handleReleaseToMarket(id: string) {
    batchReleaseStore.releaseToMarket(id);
    const release = batchReleaseStore.getById(id);
    if (release) crossModule.onBatchReleasedToMarket(release);
    reload();
    setDetailOpen(false);
  }

  function handlePlaceOnHold(id: string) {
    if (!holdReason.trim()) return;
    const hold: RegulatoryHold = {
      reason: holdReason.trim(),
      placedBy: "Current User",
      date: new Date().toISOString(),
      expectedResolution: holdExpectedResolution.trim() || undefined,
    };
    batchReleaseStore.placeOnHold(id, hold);
    reload();
    const updated = batchReleaseStore.getById(id);
    if (updated) setSelectedRelease(updated);
  }

  function handleRemoveHold(id: string) {
    batchReleaseStore.removeHold(id);
    reload();
    const updated = batchReleaseStore.getById(id);
    if (updated) setSelectedRelease(updated);
  }

  // ── Checklist helpers ───────────────────────────────────────────────────

  function getChecklistProgress(release: BatchRelease) {
    const total = release.checklist.items.length;
    const done = release.checklist.items.filter(
      (i) => i.status === "passed" || i.status === "na"
    ).length;
    const failed = release.checklist.items.filter(
      (i) => i.status === "failed"
    ).length;
    return { total, done, failed, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // ── Analytics helpers ───────────────────────────────────────────────────

  const analyticsData = useMemo(() => {
    const all = releases;

    // Release cycle time by product
    const released = all.filter(
      (r) => r.status === "released-to-market" && r.reviewStartedAt && r.releasedToMarketAt
    );
    const cycleByProduct = new Map<string, number[]>();
    released.forEach((r) => {
      const days = daysSince(r.reviewStartedAt!) - daysSince(r.releasedToMarketAt!);
      const arr = cycleByProduct.get(r.product) || [];
      arr.push(Math.abs(days));
      cycleByProduct.set(r.product, arr);
    });
    const avgCycleByProduct = Array.from(cycleByProduct.entries()).map(
      ([product, days]) => ({
        product,
        avgDays: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
        count: days.length,
      })
    );

    // Rejection reasons
    const rejected = all.filter((r) => r.status === "rejected" && r.qpDecision);
    const rejectionReasons = rejected.map((r) => ({
      batch: r.batchNumber,
      product: r.product,
      reason: r.qpDecision!.justification,
      date: r.qpDecision!.date,
    }));

    // Monthly release volume (simulate last 6 months)
    const monthlyVolume: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = released.filter((r) => {
        const relDate = new Date(r.releasedToMarketAt!);
        return relDate >= startOfMonth && relDate <= endOfMonth;
      }).length;
      monthlyVolume.push({ month: monthLabel, count });
    }

    // QP workload
    const qpWorkload = new Map<string, { active: number; completed: number }>();
    all.forEach((r) => {
      if (!r.assignedQP) return;
      const entry = qpWorkload.get(r.assignedQP) || {
        active: 0,
        completed: 0,
      };
      if (
        ["under-review", "checklist-complete", "qp-review"].includes(r.status)
      ) {
        entry.active++;
      }
      if (r.status === "released-to-market" || r.status === "rejected") {
        entry.completed++;
      }
      qpWorkload.set(r.assignedQP, entry);
    });
    const qpWorkloadArr = Array.from(qpWorkload.entries()).map(
      ([name, data]) => ({ name, ...data })
    );

    // Checklist bottleneck analysis
    const failedCounts = new Map<string, number>();
    const pendingCounts = new Map<string, number>();
    all.forEach((r) => {
      r.checklist.items.forEach((item) => {
        if (item.status === "failed") {
          failedCounts.set(
            item.description,
            (failedCounts.get(item.description) || 0) + 1
          );
        }
        if (
          item.status === "pending" &&
          ["under-review", "checklist-complete", "qp-review"].includes(r.status)
        ) {
          pendingCounts.set(
            item.description,
            (pendingCounts.get(item.description) || 0) + 1
          );
        }
      });
    });
    const bottlenecks = Array.from(failedCounts.entries())
      .map(([description, failCount]) => ({
        description,
        failCount,
        pendingCount: pendingCounts.get(description) || 0,
      }))
      .sort((a, b) => b.failCount - a.failCount);

    return {
      avgCycleByProduct,
      rejectionReasons,
      monthlyVolume,
      qpWorkloadArr,
      bottlenecks,
    };
  }, [releases]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <PageHeader
        title="Batch Release / QP Certification"
        description="Manage batch release workflow, QP review and certification, and market release authorization per Egyptian GMP requirements."
        icon={<CheckSquare className="h-6 w-6 text-primary" />}
      />

      {/* Stats Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={Clock}
            title="Pending Review"
            value={metrics.pending}
            subtitle="Awaiting reviewer assignment"
            iconColor="bg-gray-100 text-gray-700"
          />
          <StatsCard
            icon={Search}
            title="Under Review"
            value={metrics.underReview}
            subtitle="Active review in progress"
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={CheckCircle2}
            title="Released This Month"
            value={metrics.releasedThisMonth}
            subtitle={`${metrics.totalReleased} total released`}
            iconColor="bg-emerald-100 text-emerald-700"
          />
          <StatsCard
            icon={Timer}
            title="Avg Review Days"
            value={metrics.avgReviewDays}
            subtitle="From review start to release"
            iconColor="bg-amber-100 text-amber-700"
          />
          <StatsCard
            icon={XCircle}
            title="Rejection Rate"
            value={`${metrics.rejectionRate}%`}
            subtitle={`${metrics.onHold} batch(es) on hold`}
            iconColor="bg-red-100 text-red-700"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Release Queue
            {queueReleases.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {queueReleases.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="released" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Released
          </TabsTrigger>
          <TabsTrigger value="onhold" className="flex items-center gap-1.5">
            <PauseCircle className="h-4 w-4" />
            On Hold
            {onHoldReleases.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-xs px-1.5 bg-orange-100 text-orange-700"
              >
                {onHoldReleases.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Release Queue
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by release #, product, or batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue placeholder="All Products" />
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
                <Select
                  value={filterPriority}
                  onValueChange={setFilterPriority}
                >
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Queue Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Release Queue ({filteredQueue.length})
              </CardTitle>
              <CardDescription>
                Batches awaiting review, checklist completion, or QP
                certification
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Release #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Assigned QP</TableHead>
                    <TableHead className="w-[80px]">Age</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-10"
                      >
                        No batches in the release queue
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueue.map((rel) => {
                      const prog = getChecklistProgress(rel);
                      return (
                        <TableRow
                          key={rel.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(rel)}
                        >
                          <TableCell className="font-mono text-xs font-medium">
                            {rel.number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {rel.product}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {rel.batchNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                STATUS_COLORS[rel.status]
                              )}
                            >
                              {STATUS_LABELS[rel.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-xs capitalize",
                                PRIORITY_COLORS[rel.priority]
                              )}
                            >
                              {rel.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    prog.failed > 0
                                      ? "bg-red-500"
                                      : prog.pct === 100
                                        ? "bg-green-500"
                                        : "bg-blue-500"
                                  )}
                                  style={{ width: `${prog.pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {prog.pct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {rel.assignedQP || (
                              <span className="text-muted-foreground italic text-xs">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {daysSince(rel.createdAt)}d
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
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

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Released
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="released" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Released Batches ({releasedReleases.length})
              </CardTitle>
              <CardDescription>
                Batches certified by QP and released for market distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Release #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>QP</TableHead>
                    <TableHead>QP Decision Date</TableHead>
                    <TableHead>Released to Market</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releasedReleases.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-10"
                      >
                        No released batches yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    releasedReleases.map((rel) => (
                      <TableRow
                        key={rel.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(rel)}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {rel.number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rel.product}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rel.batchNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rel.qpDecision?.qpName || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {rel.qpDecision?.date
                            ? formatDate(rel.qpDecision.date)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {rel.releasedToMarketAt
                            ? formatDate(rel.releasedToMarketAt)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(rel.expiryDate)}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
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

          {/* Rejected list below */}
          {rejectedReleases.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Rejected Batches ({rejectedReleases.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Release #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>QP</TableHead>
                      <TableHead>Rejection Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedReleases.map((rel) => (
                      <TableRow
                        key={rel.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(rel)}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {rel.number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rel.product}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rel.batchNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rel.qpDecision?.qpName || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {rel.qpDecision?.date
                            ? formatDate(rel.qpDecision.date)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-red-700 max-w-[300px] truncate">
                          {rel.qpDecision?.justification || "-"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: On Hold
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="onhold" className="space-y-4 mt-4">
          {onHoldReleases.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <PauseCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium">No batches currently on hold</p>
                <p className="text-sm mt-1">
                  Batches placed on regulatory or quality hold will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            onHoldReleases.map((rel) => (
              <Card key={rel.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <PauseCircle className="h-4 w-4 text-orange-500" />
                        {rel.number} — {rel.product}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Batch: {rel.batchNumber} | Size: {rel.batchSize}
                      </CardDescription>
                    </div>
                    <Badge className={cn("text-xs", STATUS_COLORS["on-hold"])}>
                      On Hold
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rel.regulatoryHold && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-orange-800">
                        Hold Reason
                      </h4>
                      <p className="text-sm text-orange-900">
                        {rel.regulatoryHold.reason}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-orange-700">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Placed by: {rel.regulatoryHold.placedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Date: {formatDate(rel.regulatoryHold.date)}
                        </span>
                        {rel.regulatoryHold.expectedResolution && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Expected resolution:{" "}
                            {formatDate(rel.regulatoryHold.expectedResolution)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linked Records */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Linked Records</h4>
                    <div className="flex flex-wrap gap-2">
                      {rel.linkedRecords.bprNumber && (
                        <Badge variant="outline" className="text-xs">
                          BPR: {rel.linkedRecords.bprNumber}
                        </Badge>
                      )}
                      {rel.linkedRecords.coaNumber && (
                        <Badge variant="outline" className="text-xs">
                          CoA: {rel.linkedRecords.coaNumber}
                        </Badge>
                      )}
                      {rel.linkedRecords.oosInvestigations?.map((oos) => (
                        <Badge
                          key={oos}
                          variant="outline"
                          className="text-xs border-red-300 text-red-700"
                        >
                          OOS: {oos}
                        </Badge>
                      ))}
                      {rel.linkedRecords.deviations?.map((dev) => (
                        <Badge
                          key={dev}
                          variant="outline"
                          className="text-xs border-amber-300 text-amber-700"
                        >
                          DEV: {dev}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetail(rel)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleRemoveHold(rel.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Remove Hold
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Analytics
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {/* Release Cycle Time by Product */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Release Cycle Time by Product
              </CardTitle>
              <CardDescription>
                Average days from review start to market release
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.avgCycleByProduct.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No released batches to analyze
                </p>
              ) : (
                <div className="space-y-3">
                  {analyticsData.avgCycleByProduct.map((item) => (
                    <div key={item.product} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate mr-4">
                          {item.product}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {item.avgDays} days avg ({item.count} batches)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.avgDays <= 5
                              ? "bg-green-500"
                              : item.avgDays <= 10
                                ? "bg-amber-500"
                                : "bg-red-500"
                          )}
                          style={{
                            width: `${Math.min((item.avgDays / 20) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Release Volume */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Monthly Release Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.monthlyVolume.map((item) => {
                    const maxCount = Math.max(
                      ...analyticsData.monthlyVolume.map((m) => m.count),
                      1
                    );
                    return (
                      <div
                        key={item.month}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs text-muted-foreground w-20 shrink-0">
                          {item.month}
                        </span>
                        <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full rounded bg-emerald-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 15 : 0)}%`,
                            }}
                          >
                            {item.count > 0 && (
                              <span className="text-[10px] font-bold text-white">
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.count === 0 && (
                          <span className="text-xs text-muted-foreground">
                            0
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* QP Workload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  QP Workload Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.qpWorkloadArr.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No QP data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analyticsData.qpWorkloadArr.map((qp) => (
                      <div key={qp.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {qp.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-blue-600">
                              {qp.active} active
                            </span>
                            <span className="text-green-600">
                              {qp.completed} completed
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(qp.active / (qp.active + qp.completed || 1)) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(qp.completed / (qp.active + qp.completed || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rejection Reasons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Rejection History
              </CardTitle>
              <CardDescription>
                Batches rejected by QP with reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.rejectionReasons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No rejections recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {analyticsData.rejectionReasons.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-100 bg-red-50/50 p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-medium">
                          {item.batch}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span>{item.product}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-xs text-red-800">{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist Bottleneck Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Checklist Bottleneck Analysis
              </CardTitle>
              <CardDescription>
                Checklist items with the most failures or pending reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.bottlenecks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No bottlenecks detected
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Checklist Item</TableHead>
                      <TableHead className="w-[100px] text-center">
                        Failures
                      </TableHead>
                      <TableHead className="w-[100px] text-center">
                        Still Pending
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.bottlenecks.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs border-red-300 text-red-700"
                          >
                            {item.failCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700"
                          >
                            {item.pendingCount}
                          </Badge>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          Detail Dialog
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRelease && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selectedRelease.number}</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      STATUS_COLORS[selectedRelease.status]
                    )}
                  >
                    {STATUS_LABELS[selectedRelease.status]}
                  </Badge>
                  <span
                    className={cn(
                      "text-sm capitalize",
                      PRIORITY_COLORS[selectedRelease.priority]
                    )}
                  >
                    {selectedRelease.priority} priority
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Batch Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Product
                    </Label>
                    <p className="text-sm font-medium">
                      {selectedRelease.product}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Batch Number
                    </Label>
                    <p className="text-sm font-mono">
                      {selectedRelease.batchNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Batch Size
                    </Label>
                    <p className="text-sm">{selectedRelease.batchSize}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Mfg Date
                    </Label>
                    <p className="text-sm">
                      {formatDate(selectedRelease.manufacturingDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Expiry Date
                    </Label>
                    <p className="text-sm">
                      {formatDate(selectedRelease.expiryDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Assigned QP
                    </Label>
                    <p className="text-sm">
                      {selectedRelease.assignedQP || "Unassigned"}
                    </p>
                  </div>
                  {selectedRelease.reviewStartedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Review Started
                      </Label>
                      <p className="text-sm">
                        {formatDate(selectedRelease.reviewStartedAt)}
                      </p>
                    </div>
                  )}
                  {selectedRelease.releasedToMarketAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Released to Market
                      </Label>
                      <p className="text-sm text-green-700 font-medium">
                        {formatDate(selectedRelease.releasedToMarketAt)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Linked Records */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Linked Records
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRelease.linkedRecords.bprNumber && (
                      <Badge variant="outline" className="text-xs">
                        BPR: {selectedRelease.linkedRecords.bprNumber}
                      </Badge>
                    )}
                    {selectedRelease.linkedRecords.coaNumber && (
                      <Badge variant="outline" className="text-xs">
                        CoA: {selectedRelease.linkedRecords.coaNumber}
                      </Badge>
                    )}
                    {selectedRelease.linkedRecords.stabilityStudy && (
                      <Badge variant="outline" className="text-xs">
                        Stability: {selectedRelease.linkedRecords.stabilityStudy}
                      </Badge>
                    )}
                    {selectedRelease.linkedRecords.deviations?.map((dev) => (
                      <Badge
                        key={dev}
                        variant="outline"
                        className="text-xs border-amber-300 text-amber-700"
                      >
                        Deviation: {dev}
                      </Badge>
                    ))}
                    {selectedRelease.linkedRecords.oosInvestigations?.map(
                      (oos) => (
                        <Badge
                          key={oos}
                          variant="outline"
                          className="text-xs border-red-300 text-red-700"
                        >
                          OOS: {oos}
                        </Badge>
                      )
                    )}
                    {selectedRelease.linkedRecords.changeControls?.map((cc) => (
                      <Badge
                        key={cc}
                        variant="outline"
                        className="text-xs border-purple-300 text-purple-700"
                      >
                        CC: {cc}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Start Review (for pending-review) */}
                {selectedRelease.status === "pending-review" && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start Review
                    </h3>
                    <p className="text-xs text-blue-700">
                      Assign a Qualified Person to begin the batch release
                      review process.
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">
                          Assign QP
                        </Label>
                        <Input
                          placeholder="QP name (e.g. Dr. Laila Farouk)"
                          value={startReviewQP}
                          onChange={(e) => setStartReviewQP(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={!startReviewQP.trim()}
                        onClick={() =>
                          handleStartReview(selectedRelease.id)
                        }
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start Review
                      </Button>
                    </div>
                  </div>
                )}

                {/* Release Checklist */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Release Checklist
                  </h3>
                  <ReleaseChecklistComponent
                    items={selectedRelease.checklist.items}
                    readOnly={
                      selectedRelease.status === "pending-review" ||
                      selectedRelease.status === "released-to-market" ||
                      selectedRelease.status === "rejected"
                    }
                    onItemUpdate={handleChecklistUpdate}
                  />
                </div>

                {/* Submit for QP Review (when checklist is complete or under-review with all done) */}
                {(selectedRelease.status === "under-review" ||
                  selectedRelease.status === "checklist-complete") && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleSubmitForQP(selectedRelease.id)
                        }
                        disabled={
                          selectedRelease.checklist.items.some(
                            (i) => i.required && i.status === "pending"
                          ) ||
                          selectedRelease.checklist.items.some(
                            (i) => i.required && i.status === "failed"
                          )
                        }
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Submit for QP Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-300"
                        onClick={() => {
                          if (holdReason.trim()) {
                            handlePlaceOnHold(selectedRelease.id);
                          }
                        }}
                      >
                        <PauseCircle className="h-4 w-4 mr-1" />
                        Place On Hold
                      </Button>
                    </div>
                    {/* Hold form inline */}
                    <div className="rounded-lg border p-3 space-y-2">
                      <Label className="text-xs font-medium">
                        Hold Reason (required to place on hold)
                      </Label>
                      <Textarea
                        placeholder="Reason for placing batch on hold..."
                        value={holdReason}
                        onChange={(e) => setHoldReason(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Expected Resolution Date (optional)
                        </Label>
                        <Input
                          type="date"
                          value={holdExpectedResolution}
                          onChange={(e) =>
                            setHoldExpectedResolution(e.target.value)
                          }
                          className="h-8 text-sm w-48"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* QP Decision Form (when in qp-review) */}
                {selectedRelease.status === "qp-review" && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        QP Decision
                      </h3>
                      <p className="text-xs text-indigo-700">
                        As the Qualified Person, review all batch documentation
                        and record your release decision.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">QP Name</Label>
                          <Input
                            placeholder="Qualified Person full name"
                            value={qpName}
                            onChange={(e) => setQpName(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Decision</Label>
                          <Select
                            value={qpDecision}
                            onValueChange={(v) =>
                              setQpDecision(v as QPDecisionType)
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="release">
                                Release for Distribution
                              </SelectItem>
                              <SelectItem value="reject">
                                Reject Batch
                              </SelectItem>
                              <SelectItem value="hold">
                                Place on Hold
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Justification</Label>
                        <Textarea
                          placeholder="Provide detailed justification for your decision..."
                          value={qpJustification}
                          onChange={(e) =>
                            setQpJustification(e.target.value)
                          }
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Conditions (optional, one per line)
                        </Label>
                        <Textarea
                          placeholder="Any conditions for release..."
                          value={qpConditions}
                          onChange={(e) => setQpConditions(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Digital Signature</Label>
                        <Input
                          placeholder="Type digital signature (e.g. QP-LF-2026)"
                          value={qpSignature}
                          onChange={(e) => setQpSignature(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={
                          !qpName.trim() ||
                          !qpJustification.trim() ||
                          !qpSignature.trim()
                        }
                        onClick={() =>
                          handleRecordQPDecision(selectedRelease.id)
                        }
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Record QP Decision
                      </Button>
                    </div>
                  </>
                )}

                {/* Release to Market (when approved) */}
                {selectedRelease.status === "approved" && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Release to Market
                      </h3>
                      <p className="text-xs text-green-700">
                        QP has approved this batch. Confirm release to market
                        distribution.
                      </p>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleReleaseToMarket(selectedRelease.id)
                        }
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Confirm Release to Market
                      </Button>
                    </div>
                  </>
                )}

                {/* QP Decision Display (when decision exists) */}
                {selectedRelease.qpDecision && (
                  <>
                    <Separator />
                    <div
                      className={cn(
                        "rounded-lg border p-4 space-y-3",
                        selectedRelease.qpDecision.decision === "release"
                          ? "border-green-200 bg-green-50"
                          : selectedRelease.qpDecision.decision === "reject"
                            ? "border-red-200 bg-red-50"
                            : "border-orange-200 bg-orange-50"
                      )}
                    >
                      <h3
                        className={cn(
                          "text-sm font-semibold flex items-center gap-2",
                          selectedRelease.qpDecision.decision === "release"
                            ? "text-green-800"
                            : selectedRelease.qpDecision.decision === "reject"
                              ? "text-red-800"
                              : "text-orange-800"
                        )}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        QP Decision:{" "}
                        {selectedRelease.qpDecision.decision === "release"
                          ? "Approved for Release"
                          : selectedRelease.qpDecision.decision === "reject"
                            ? "Rejected"
                            : "Placed on Hold"}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Qualified Person
                          </Label>
                          <p>{selectedRelease.qpDecision.qpName}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Decision Date
                          </Label>
                          <p>
                            {formatDateTime(selectedRelease.qpDecision.date)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Signature
                          </Label>
                          <p className="font-mono text-xs">
                            {selectedRelease.qpDecision.signature}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Justification
                        </Label>
                        <p className="text-sm mt-1">
                          {selectedRelease.qpDecision.justification}
                        </p>
                      </div>
                      {selectedRelease.qpDecision.conditions &&
                        selectedRelease.qpDecision.conditions.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Conditions
                            </Label>
                            <ul className="list-disc ml-4 mt-1 text-sm space-y-1">
                              {selectedRelease.qpDecision.conditions.map(
                                (c, i) => (
                                  <li key={i}>{c}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* Regulatory Hold Display */}
                {selectedRelease.regulatoryHold &&
                  selectedRelease.status === "on-hold" && (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                          <PauseCircle className="h-4 w-4" />
                          Regulatory Hold
                        </h3>
                        <p className="text-sm text-orange-900">
                          {selectedRelease.regulatoryHold.reason}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-orange-700">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {selectedRelease.regulatoryHold.placedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(selectedRelease.regulatoryHold.date)}
                          </span>
                          {selectedRelease.regulatoryHold
                            .expectedResolution && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Expected:{" "}
                              {formatDate(
                                selectedRelease.regulatoryHold
                                  .expectedResolution
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleRemoveHold(selectedRelease.id)
                            }
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Remove Hold &amp; Resume Review
                          </Button>
                        </div>
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
