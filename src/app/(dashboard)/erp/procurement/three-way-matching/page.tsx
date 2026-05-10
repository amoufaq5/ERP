"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  GitCompare,
  Search,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BarChart3,
  FileCheck,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ChevronUp,
  TrendingUp,
  Package,
  FileText,
  Receipt,
  Percent,
  CalendarDays,
  Users,
  Info,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import MatchComparison from "@/components/shared/match-comparison";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { matchingStore } from "@/lib/operations/matching-store";
import type {
  MatchRecord,
  MatchStatus,
  MatchException,
  MatchingMetrics,
  ExceptionType,
  ExceptionSeverity,
  ResolutionAction,
} from "@/lib/operations/matching-types";

/* ────────────────────────────────────────────────────────────
   3-Way Matching Page
   PO / GRN / Invoice reconciliation for pharma procurement
   ──────────────────────────────────────────────────────────── */

// ── Helpers ─────────────────────────────────────────────────

function statusBadge(status: MatchStatus) {
  const map: Record<MatchStatus, { label: string; variant: string; icon: typeof CheckCircle2 }> = {
    pending: { label: "Pending", variant: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Clock },
    matched: { label: "Matched", variant: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
    "partial-match": { label: "Partial", variant: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", icon: AlertTriangle },
    mismatch: { label: "Mismatch", variant: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: XCircle },
    exception: { label: "Exception", variant: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: ShieldAlert },
    resolved: { label: "Resolved", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: FileCheck },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.variant)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function severityBadge(severity: ExceptionSeverity) {
  const map: Record<ExceptionSeverity, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", map[severity])}>
      {severity}
    </span>
  );
}

function exceptionTypeBadge(type: ExceptionType) {
  const labels: Record<ExceptionType, string> = {
    "qty-variance": "Qty Variance",
    "price-variance": "Price Variance",
    "missing-grn": "Missing GRN",
    "missing-invoice": "Missing Invoice",
  };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[type]}
    </Badge>
  );
}

// ── Main Page Component ─────────────────────────────────────

export default function ThreeWayMatchingPage() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [metrics, setMetrics] = useState<MatchingMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("queue");

  // Dialog state
  const [selectedRecord, setSelectedRecord] = useState<MatchRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<ExceptionType | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | "all">("all");

  // Batch matching
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    matched: number;
    partial: number;
    exceptions: number;
    total: number;
  } | null>(null);

  // Bulk selection for exceptions
  const [selectedExceptionIds, setSelectedExceptionIds] = useState<Set<string>>(new Set());
  // Delete
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────

  const refreshData = useCallback(() => {
    setRecords(matchingStore.getAll());
    setMetrics(matchingStore.getMetrics());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Filtered records ─────────────────────────────────────

  const filteredRecords = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.matchNumber.toLowerCase().includes(q) ||
          r.poNumber.toLowerCase().includes(q) ||
          (r.grnNumber && r.grnNumber.toLowerCase().includes(q)) ||
          (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q)) ||
          r.vendorName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, statusFilter, searchQuery]);

  // ── Queue records (pending + exception + partial-match + mismatch) ──

  const queueRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) =>
        r.status === "pending" ||
        r.status === "exception" ||
        r.status === "partial-match" ||
        r.status === "mismatch"
    );
  }, [filteredRecords]);

  // ── Exception records ────────────────────────────────────

  const exceptionRecords = useMemo(() => {
    let result = records.filter(
      (r) => r.status === "exception" || r.exceptions.some((e) => !e.resolved)
    );

    if (exceptionTypeFilter !== "all") {
      result = result.filter((r) =>
        r.exceptions.some((e) => e.type === exceptionTypeFilter && !e.resolved)
      );
    }
    if (severityFilter !== "all") {
      result = result.filter((r) =>
        r.exceptions.some((e) => e.severity === severityFilter && !e.resolved)
      );
    }

    return result;
  }, [records, exceptionTypeFilter, severityFilter]);

  // ── Handlers ─────────────────────────────────────────────

  function handleViewDetail(record: MatchRecord) {
    setSelectedRecord(record);
    setDetailOpen(true);
  }

  async function handleRunMatching() {
    setMatchingInProgress(true);
    setMatchResult(null);
    try {
      const result = await matchingStore.runMatching();
      setMatchResult(result);
    } finally {
      setMatchingInProgress(false);
      refreshData();
    }
  }

  async function handleResolveException(
    matchId: string,
    exceptionId: string,
    action: ResolutionAction
  ) {
    await matchingStore.resolveException(
      matchId,
      exceptionId,
      action,
      "Current User",
      action === "approve"
        ? "Variance accepted within business limits"
        : action === "reject"
        ? "Variance rejected — vendor credit note required"
        : "Escalated to Finance Manager for review"
    );
    refreshData();
    // Refresh selected record if dialog is open
    if (selectedRecord && selectedRecord.id === matchId) {
      setSelectedRecord(matchingStore.getById(matchId) || null);
    }
  }

  async function handleBulkResolve(action: ResolutionAction) {
    if (selectedExceptionIds.size === 0) return;
    await matchingStore.bulkResolve(
      Array.from(selectedExceptionIds),
      action,
      "Current User",
      action === "approve"
        ? "Bulk approved — variance within acceptable limits"
        : action === "reject"
        ? "Bulk rejected — credit notes required"
        : "Bulk escalated to management"
    );
    setSelectedExceptionIds(new Set());
    refreshData();
  }

  async function handleDeleteMatch() {
    if (!deleteMatchId) return;
    await matchingStore.delete(deleteMatchId);
    setDeleteMatchId(null);
    if (selectedRecord?.id === deleteMatchId) { setSelectedRecord(null); setDetailOpen(false); }
    refreshData();
  }

  function toggleExceptionSelection(matchId: string) {
    setSelectedExceptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }

  // ── Stats Cards ──────────────────────────────────────────

  const statsCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        title: "Total Matches",
        value: metrics.totalMatches,
        icon: GitCompare,
        iconColor: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
        subtitle: `${metrics.pending} awaiting processing`,
      },
      {
        title: "Fully Matched",
        value: metrics.fullyMatched,
        icon: CheckCircle2,
        iconColor: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
        subtitle: `${metrics.partialMatches} partial matches`,
      },
      {
        title: "Exceptions",
        value: metrics.exceptions,
        icon: ShieldAlert,
        iconColor: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
        subtitle: `${metrics.resolved} resolved`,
      },
      {
        title: "Match Rate",
        value: `${metrics.matchRatePct}%`,
        icon: Percent,
        iconColor: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
        change: 3,
        changeLabel: "vs last month",
      },
      {
        title: "Avg Resolution",
        value: `${metrics.avgResolutionDays}d`,
        icon: CalendarDays,
        iconColor: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400",
        subtitle: "Average days to resolve",
      },
    ];
  }, [metrics]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="3-Way Matching"
        description="Reconcile Purchase Orders, Goods Receipts, and Vendor Invoices to ensure accuracy before payment authorization."
        icon={<GitCompare className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={handleRunMatching} disabled={matchingInProgress}>
            {matchingInProgress ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Matching
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            subtitle={card.subtitle}
            change={card.change}
            changeLabel={card.changeLabel}
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Matching Queue</span>
            <span className="sm:hidden">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="run" className="gap-1.5">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run Matching</span>
            <span className="sm:hidden">Run</span>
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Exceptions</span>
            <span className="sm:hidden">Exc.</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Matching Queue ──────────────────────────── */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Matching Queue</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search PO, GRN, Invoice, Vendor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {/* Status Filter */}
                  <div className="relative">
                    <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as MatchStatus | "all")}
                      className="h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring appearance-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="matched">Matched</option>
                      <option value="partial-match">Partial Match</option>
                      <option value="exception">Exception</option>
                      <option value="mismatch">Mismatch</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Show full table when "all" is selected, queue-only when filtering */}
              <QueueTable
                records={statusFilter === "all" ? filteredRecords : filteredRecords}
                onViewDetail={handleViewDetail}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Run Matching ────────────────────────────── */}
        <TabsContent value="run">
          <RunMatchingTab
            records={records}
            matchingInProgress={matchingInProgress}
            matchResult={matchResult}
            onRunMatching={handleRunMatching}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* ─── Tab: Exceptions ──────────────────────────────── */}
        <TabsContent value="exceptions">
          <ExceptionsTab
            records={exceptionRecords}
            exceptionTypeFilter={exceptionTypeFilter}
            severityFilter={severityFilter}
            onExceptionTypeFilter={setExceptionTypeFilter}
            onSeverityFilter={setSeverityFilter}
            selectedIds={selectedExceptionIds}
            onToggleSelect={toggleExceptionSelection}
            onBulkResolve={handleBulkResolve}
            onResolveException={handleResolveException}
            onViewDetail={handleViewDetail}
          />
        </TabsContent>

        {/* ─── Tab: Analytics ───────────────────────────────── */}
        <TabsContent value="analytics">
          <AnalyticsTab metrics={metrics} records={records} />
        </TabsContent>
      </Tabs>

      {/* ─── Detail Dialog ────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-primary" />
                  {selectedRecord.matchNumber}
                </DialogTitle>
                <DialogDescription>
                  {selectedRecord.vendorName} | {statusBadge(selectedRecord.status)}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <MatchComparison record={selectedRecord} />

              {/* Exceptions in detail */}
              {selectedRecord.exceptions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-orange-500" />
                      Exceptions ({selectedRecord.exceptions.filter((e) => !e.resolved).length} unresolved)
                    </h4>
                    <div className="space-y-2">
                      {selectedRecord.exceptions.map((exc) => (
                        <div
                          key={exc.id}
                          className={cn(
                            "rounded-lg border p-3",
                            exc.resolved
                              ? "bg-muted/30 opacity-60"
                              : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {exceptionTypeBadge(exc.type)}
                                {severityBadge(exc.severity)}
                                {exc.resolved && (
                                  <Badge variant="secondary" className="text-xs">
                                    {exc.resolution === "approve"
                                      ? "Approved"
                                      : exc.resolution === "reject"
                                      ? "Rejected"
                                      : "Escalated"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{exc.description}</p>
                              {exc.variancePct !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  Variance: {exc.variancePct}%
                                  {exc.varianceAmount !== undefined &&
                                    ` (${exc.varianceAmount} units/EGP)`}
                                </p>
                              )}
                              {exc.resolvedBy && (
                                <p className="text-xs text-muted-foreground">
                                  Resolved by {exc.resolvedBy} on {exc.resolvedAt ? formatDate(exc.resolvedAt) : '—'}
                                  {exc.resolutionNotes && ` — ${exc.resolutionNotes}`}
                                </p>
                              )}
                            </div>
                            {!exc.resolved && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    handleResolveException(
                                      selectedRecord.id,
                                      exc.id,
                                      "approve"
                                    )
                                  }
                                >
                                  <ThumbsUp className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    handleResolveException(
                                      selectedRecord.id,
                                      exc.id,
                                      "reject"
                                    )
                                  }
                                >
                                  <ThumbsDown className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-orange-700 hover:bg-orange-50"
                                  onClick={() =>
                                    handleResolveException(
                                      selectedRecord.id,
                                      exc.id,
                                      "escalate"
                                    )
                                  }
                                >
                                  <ChevronUp className="mr-1 h-3 w-3" />
                                  Escalate
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
                {selectedRecord && (
                  <Button variant="destructive" onClick={() => { setDetailOpen(false); setDeleteMatchId(selectedRecord.id); }}>
                    Delete Record
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE MATCH RECORD CONFIRMATION */}
      <Dialog open={!!deleteMatchId} onOpenChange={(open) => !open && setDeleteMatchId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Match Record</DialogTitle>
            <DialogDescription>Are you sure you want to delete this match record? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteMatchId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMatch}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sub-Components
   ──────────────────────────────────────────────────────────── */

// ── Queue Table ─────────────────────────────────────────────

function QueueTable({
  records,
  onViewDetail,
}: {
  records: MatchRecord[];
  onViewDetail: (r: MatchRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileCheck className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No matching records found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Match #</TableHead>
            <TableHead>PO Number</TableHead>
            <TableHead>GRN</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">PO Amount</TableHead>
            <TableHead className="text-right">Invoice Amount</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Lines</TableHead>
            <TableHead className="text-center">Exceptions</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onViewDetail(r)}
            >
              <TableCell className="font-medium text-sm">{r.matchNumber}</TableCell>
              <TableCell className="text-sm">{r.poNumber}</TableCell>
              <TableCell className="text-sm">{r.grnNumber || <span className="text-muted-foreground italic">—</span>}</TableCell>
              <TableCell className="text-sm">{r.invoiceNumber || <span className="text-muted-foreground italic">—</span>}</TableCell>
              <TableCell className="text-sm max-w-[160px] truncate">{r.vendorName}</TableCell>
              <TableCell className="text-right text-sm font-mono">
                {formatCurrency(r.totalPOAmount)}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">
                {r.invoiceNumber ? formatCurrency(r.totalInvoiceAmount) : "—"}
              </TableCell>
              <TableCell className="text-center">{statusBadge(r.status)}</TableCell>
              <TableCell className="text-center text-sm">{r.lineItems.length}</TableCell>
              <TableCell className="text-center">
                {r.exceptions.filter((e) => !e.resolved).length > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {r.exceptions.filter((e) => !e.resolved).length}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Run Matching Tab ────────────────────────────────────────

function RunMatchingTab({
  records,
  matchingInProgress,
  matchResult,
  onRunMatching,
  onRefresh,
}: {
  records: MatchRecord[];
  matchingInProgress: boolean;
  matchResult: { matched: number; partial: number; exceptions: number; total: number } | null;
  onRunMatching: () => void;
  onRefresh: () => void;
}) {
  const pendingCount = records.filter(
    (r) => r.status === "pending" || r.status === "mismatch"
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Batch Matching Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold">Matching Configuration</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quantity Tolerance</p>
                <p className="text-sm font-semibold">+/- 2%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Price Tolerance</p>
                <p className="text-sm font-semibold">+/- 1%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Auto-Match</p>
                <p className="text-sm font-semibold">Enabled</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Escalation After</p>
                <p className="text-sm font-semibold">5 days</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Records to Process
              </h4>
            </div>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">
              Pending and mismatched records awaiting matching
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onRunMatching}
              disabled={matchingInProgress || pendingCount === 0}
              className="flex-1"
            >
              {matchingInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Batch Matching
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Matching Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchResult ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">Matching Complete</p>
                <p className="text-sm text-muted-foreground">
                  {matchResult.total} records processed
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {matchResult.matched}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Fully Matched</p>
                </div>
                <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                    {matchResult.partial}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Partial Match</p>
                </div>
                <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {matchResult.exceptions}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Exceptions</p>
                </div>
              </div>

              {matchResult.total > 0 && (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Match Success Rate</span>
                    <span className="font-bold">
                      {matchResult.total > 0
                        ? Math.round(
                            ((matchResult.matched + matchResult.partial) / matchResult.total) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                      style={{
                        width: `${
                          matchResult.total > 0
                            ? ((matchResult.matched + matchResult.partial) / matchResult.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Play className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Run batch matching to see results here.</p>
              <p className="text-xs mt-1">
                The engine will compare PO, GRN, and Invoice data line by line.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Exceptions Tab ──────────────────────────────────────────

function ExceptionsTab({
  records,
  exceptionTypeFilter,
  severityFilter,
  onExceptionTypeFilter,
  onSeverityFilter,
  selectedIds,
  onToggleSelect,
  onBulkResolve,
  onResolveException,
  onViewDetail,
}: {
  records: MatchRecord[];
  exceptionTypeFilter: ExceptionType | "all";
  severityFilter: ExceptionSeverity | "all";
  onExceptionTypeFilter: (v: ExceptionType | "all") => void;
  onSeverityFilter: (v: ExceptionSeverity | "all") => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBulkResolve: (action: ResolutionAction) => void;
  onResolveException: (matchId: string, excId: string, action: ResolutionAction) => void;
  onViewDetail: (r: MatchRecord) => void;
}) {
  const totalUnresolved = records.reduce(
    (sum, r) => sum + r.exceptions.filter((e) => !e.resolved).length,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            Exception Management
            <Badge variant="destructive" className="ml-1">
              {totalUnresolved} unresolved
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Exception type filter */}
            <select
              value={exceptionTypeFilter}
              onChange={(e) => onExceptionTypeFilter(e.target.value as ExceptionType | "all")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              <option value="all">All Types</option>
              <option value="qty-variance">Qty Variance</option>
              <option value="price-variance">Price Variance</option>
              <option value="missing-grn">Missing GRN</option>
              <option value="missing-invoice">Missing Invoice</option>
            </select>
            {/* Severity filter */}
            <select
              value={severityFilter}
              onChange={(e) => onSeverityFilter(e.target.value as ExceptionSeverity | "all")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Separator orientation="vertical" className="h-5" />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700"
              onClick={() => onBulkResolve("approve")}
            >
              <ThumbsUp className="mr-1 h-3 w-3" />
              Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-700"
              onClick={() => onBulkResolve("reject")}
            >
              <ThumbsDown className="mr-1 h-3 w-3" />
              Bulk Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-orange-700"
              onClick={() => onBulkResolve("escalate")}
            >
              <ChevronUp className="mr-1 h-3 w-3" />
              Bulk Escalate
            </Button>
          </div>
        )}

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No exceptions found with current filters.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={selectedIds.size === records.length && records.length > 0}
                      onChange={() => {
                        if (selectedIds.size === records.length) {
                          onToggleSelect("__clear__");
                        } else {
                          records.forEach((r) => {
                            if (!selectedIds.has(r.id)) onToggleSelect(r.id);
                          });
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Match #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Exception Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Variance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.flatMap((r) =>
                  r.exceptions
                    .filter((e) => !e.resolved)
                    .map((exc) => (
                      <TableRow key={`${r.id}-${exc.id}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(r.id)}
                            onChange={() => onToggleSelect(r.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-sm font-medium text-primary hover:underline"
                            onClick={() => onViewDetail(r)}
                          >
                            {r.matchNumber}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate">
                          {r.vendorName}
                        </TableCell>
                        <TableCell>{exceptionTypeBadge(exc.type)}</TableCell>
                        <TableCell>{severityBadge(exc.severity)}</TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate">
                          {exc.description}
                        </TableCell>
                        <TableCell className="text-center">
                          {exc.variancePct !== undefined ? (
                            <Badge variant="destructive" className="text-xs">
                              {exc.variancePct}%
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                              onClick={() => onResolveException(r.id, exc.id, "approve")}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                              onClick={() => onResolveException(r.id, exc.id, "reject")}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Escalate"
                              onClick={() => onResolveException(r.id, exc.id, "escalate")}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Analytics Tab ───────────────────────────────────────────

function AnalyticsTab({
  metrics,
  records,
}: {
  metrics: MatchingMetrics | null;
  records: MatchRecord[];
}) {
  if (!metrics) return null;

  const maxTrendTotal = Math.max(...metrics.monthlyTrend.map((m) => m.total), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Match Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Match Rate Trend (6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.monthlyTrend.map((month) => {
              const matchRate =
                month.total > 0
                  ? Math.round((month.matched / month.total) * 100)
                  : 0;
              return (
                <div key={month.month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-20">{month.month}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600">{month.matched} matched</span>
                      <span className="text-orange-600">{month.exceptions} exc.</span>
                      <span className="font-semibold">{month.total} total</span>
                    </div>
                  </div>
                  <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                    {month.total > 0 && (
                      <>
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${(month.matched / maxTrendTotal) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-orange-400 transition-all duration-500"
                          style={{
                            width: `${(month.exceptions / maxTrendTotal) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                          style={{
                            width: `${
                              ((month.total - month.matched - month.exceptions) /
                                maxTrendTotal) *
                              100
                            }%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Matched
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Exceptions
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Other
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Exception Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            Common Exception Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.byExceptionType.length > 0 ? (
            <div className="space-y-4">
              {metrics.byExceptionType
                .sort((a, b) => b.count - a.count)
                .map((item) => {
                  const maxCount = Math.max(
                    ...metrics.byExceptionType.map((e) => e.count),
                    1
                  );
                  const labels: Record<ExceptionType, { label: string; color: string; icon: typeof Package }> = {
                    "qty-variance": { label: "Quantity Variance", color: "bg-blue-500", icon: Package },
                    "price-variance": { label: "Price Variance", color: "bg-purple-500", icon: Receipt },
                    "missing-grn": { label: "Missing GRN", color: "bg-orange-500", icon: FileText },
                    "missing-invoice": { label: "Missing Invoice", color: "bg-red-500", icon: FileText },
                  };
                  const cfg = labels[item.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold">{item.count}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", cfg.color)}
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No exceptions recorded.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Match Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Vendor Match Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Matched</TableHead>
                  <TableHead className="text-center">Exceptions</TableHead>
                  <TableHead className="text-center">Match Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.byVendor
                  .sort((a, b) => b.total - a.total)
                  .map((v) => {
                    const rate =
                      v.total > 0 ? Math.round((v.matched / v.total) * 100) : 0;
                    return (
                      <TableRow key={v.vendorName}>
                        <TableCell className="text-sm font-medium max-w-[180px] truncate">
                          {v.vendorName}
                        </TableCell>
                        <TableCell className="text-center text-sm">{v.total}</TableCell>
                        <TableCell className="text-center text-sm text-green-600 font-medium">
                          {v.matched}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {v.exceptions > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {v.exceptions}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  rate >= 80
                                    ? "bg-green-500"
                                    : rate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold w-8">{rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Processing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Processing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-4 text-center">
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                {metrics.matchRatePct}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Overall Match Rate</p>
            </div>
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 text-center">
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {metrics.avgResolutionDays}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Resolution Days</p>
            </div>
          </div>

          <Separator />

          {/* Status breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Status Breakdown</h4>
            {[
              { label: "Fully Matched", count: metrics.fullyMatched, color: "bg-green-500" },
              { label: "Partial Matches", count: metrics.partialMatches, color: "bg-yellow-500" },
              { label: "Exceptions", count: metrics.exceptions, color: "bg-orange-500" },
              { label: "Pending", count: metrics.pending, color: "bg-slate-400" },
              { label: "Resolved", count: metrics.resolved, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                  {item.label}
                </span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Financial summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Financial Summary</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total PO Value</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(records.reduce((s, r) => s + r.totalPOAmount, 0))} EGP
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total GRN Value</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(records.reduce((s, r) => s + r.totalGRNAmount, 0))} EGP
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Invoice Value</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(records.reduce((s, r) => s + r.totalInvoiceAmount, 0))} EGP
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Variance (PO vs Invoice)</span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    records.reduce((s, r) => s + r.totalInvoiceAmount - r.totalPOAmount, 0) > 0
                      ? "text-red-600"
                      : "text-green-600"
                  )}
                >
                  {formatCurrency(
                    Math.abs(
                      records.reduce(
                        (s, r) => s + r.totalInvoiceAmount - r.totalPOAmount,
                        0
                      )
                    )
                  )}{" "}
                  EGP
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
