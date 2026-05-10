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
import { Progress } from "@/components/ui/progress";
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
import RecallProgress from "@/components/shared/recall-progress";
import { cn, formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Eye,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Bell,
  Activity,
  BarChart3,
  TrendingUp,
  MapPin,
  Truck,
  FileWarning,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useRecallStore } from "@/lib/quality/recall-store";
import type {
  RecallRecord,
  RecallStatus,
  RecallClass,
  RecallType,
  RecallMetrics,
  RecallNotification,
  RecallRetrieval,
  RecallEffectivenessCheck,
  AffectedBatch,
  RecallRiskAssessment,
  RecallPriority,
  RecipientType,
  NotificationMethod,
} from "@/lib/quality/recall-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RecallStatus, string> = {
  initiated: "bg-gray-100 text-gray-800",
  "risk-assessment": "bg-purple-100 text-purple-800",
  notification: "bg-blue-100 text-blue-800",
  retrieval: "bg-amber-100 text-amber-800",
  reconciliation: "bg-indigo-100 text-indigo-800",
  "effectiveness-check": "bg-cyan-100 text-cyan-800",
  closed: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<RecallStatus, string> = {
  initiated: "Initiated",
  "risk-assessment": "Risk Assessment",
  notification: "Notification",
  retrieval: "Retrieval",
  reconciliation: "Reconciliation",
  "effectiveness-check": "Effectiveness Check",
  closed: "Closed",
};

const CLASS_COLORS: Record<RecallClass, string> = {
  I: "bg-red-100 text-red-800",
  II: "bg-orange-100 text-orange-800",
  III: "bg-yellow-100 text-yellow-800",
};

const CLASS_LABELS: Record<RecallClass, string> = {
  I: "Class I - Critical Safety",
  II: "Class II - Health Risk",
  III: "Class III - Unlikely Harm",
};

const TYPE_COLORS: Record<RecallType, string> = {
  voluntary: "bg-blue-100 text-blue-800",
  mandatory: "bg-red-100 text-red-800",
  "market-withdrawal": "bg-gray-100 text-gray-800",
};

const TYPE_LABELS: Record<RecallType, string> = {
  voluntary: "Voluntary",
  mandatory: "Mandatory",
  "market-withdrawal": "Market Withdrawal",
};

const PRIORITY_COLORS: Record<RecallPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const ALL_STATUSES: RecallStatus[] = [
  "initiated",
  "risk-assessment",
  "notification",
  "retrieval",
  "reconciliation",
  "effectiveness-check",
  "closed",
];

const ALL_CLASSES: RecallClass[] = ["I", "II", "III"];

const ALL_TYPES: RecallType[] = ["voluntary", "mandatory", "market-withdrawal"];

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function RecallsPage() {
  const { items: recallItems, fetchAll, create: recallCreate, update: recallUpdate, updateStatus: recallUpdateStatus } = useRecallStore();
  const recalls = recallItems as unknown as RecallRecord[];
  const [activeTab, setActiveTab] = useState("recalls");
  const [selectedRecall, setSelectedRecall] = useState<RecallRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Compute metrics from items ─────────────────────────────────────────

  const metrics: RecallMetrics | null = useMemo(() => {
    if (recalls.length === 0) return null;
    const active = recalls.filter((r) => r.status !== "closed").length;
    const classIActive = recalls.filter((r) => r.recallClass === "I" && r.status !== "closed").length;
    const classIIActive = recalls.filter((r) => r.recallClass === "II" && r.status !== "closed").length;
    const classIIIActive = recalls.filter((r) => r.recallClass === "III" && r.status !== "closed").length;
    const recallsWithRetrievals = recalls.filter((r) => r.retrievals && r.retrievals.length > 0);
    const avgRecoveryRate = recallsWithRetrievals.length > 0
      ? Math.round(
          recallsWithRetrievals.reduce((s, r) => {
            const totalShipped = r.retrievals.reduce((a: number, ret: RecallRetrieval) => a + ret.quantityShipped, 0);
            const totalReturned = r.retrievals.reduce((a: number, ret: RecallRetrieval) => a + ret.quantityReturned, 0);
            return s + (totalShipped > 0 ? (totalReturned / totalShipped) * 100 : 0);
          }, 0) / recallsWithRetrievals.length
        )
      : 0;
    const pendingNotifications = recalls.reduce(
      (s, r) => s + (r.notifications?.filter((n: RecallNotification) => !n.acknowledged).length ?? 0),
      0
    );
    const byClass: { recallClass: RecallClass; count: number }[] = ALL_CLASSES.map((c) => ({
      recallClass: c,
      count: recalls.filter((r) => r.recallClass === c).length,
    }));
    const byType: { type: RecallType; count: number }[] = ALL_TYPES.map((t) => ({
      type: t,
      count: recalls.filter((r) => r.type === t).length,
    }));
    const byStatus: { status: RecallStatus; count: number }[] = ALL_STATUSES.map((st) => ({
      status: st,
      count: recalls.filter((r) => r.status === st).length,
    }));
    const avgResponseTimeDays = recalls.length > 0
      ? Math.round(recalls.reduce((s, r) => s + daysSince(r.initiatedAt), 0) / recalls.length)
      : 0;

    return {
      total: recalls.length,
      active,
      classIActive,
      classIIActive,
      classIIIActive,
      avgRecoveryRate,
      pendingNotifications,
      byClass,
      byType,
      byStatus,
      avgResponseTimeDays,
    };
  }, [recalls]);

  // ─── Filtered Recalls ──────────────────────────────────────────────────

  const filteredRecalls = useMemo(() => {
    return recalls.filter((r) => {
      const matchesSearch =
        searchTerm === "" ||
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || r.status === filterStatus;
      const matchesClass =
        filterClass === "all" || r.recallClass === filterClass;
      const matchesType = filterType === "all" || r.type === filterType;
      return matchesSearch && matchesStatus && matchesClass && matchesType;
    });
  }, [recalls, searchTerm, filterStatus, filterClass, filterType]);

  // ─── Open Detail ───────────────────────────────────────────────────────

  const openDetail = (recall: RecallRecord) => {
    setSelectedRecall(recall);
    setDetailOpen(true);
  };

  // ─── Recovery rate helper ──────────────────────────────────────────────

  const calcRecoveryRate = (r: RecallRecord): number => {
    if (!r.retrievals || r.retrievals.length === 0) return 0;
    const totalShipped = r.retrievals.reduce((a: number, ret: RecallRetrieval) => a + ret.quantityShipped, 0);
    const totalReturned = r.retrievals.reduce((a: number, ret: RecallRetrieval) => a + ret.quantityReturned, 0);
    return totalShipped > 0 ? Math.round((totalReturned / totalShipped) * 100) : 0;
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Product Recall Management"
        description="FDA-classified recall tracking, notification management, retrieval monitoring, and effectiveness verification per EDA/WHO GMP requirements."
        icon={<ShieldAlert className="h-6 w-6 text-red-600" />}
        actions={
          <Button onClick={() => setActiveTab("initiate")} className="gap-2">
            <Plus className="h-4 w-4" />
            Initiate Recall
          </Button>
        }
      />

      {/* ── Stats Cards ───────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={ShieldAlert}
            title="Total Recalls"
            value={metrics.total}
            subtitle={`${metrics.byClass.find((b) => b.recallClass === "I")?.count || 0} Class I, ${metrics.byClass.find((b) => b.recallClass === "II")?.count || 0} Class II, ${metrics.byClass.find((b) => b.recallClass === "III")?.count || 0} Class III`}
            iconColor="bg-red-100 text-red-600"
          />
          <StatsCard
            icon={Activity}
            title="Active Recalls"
            value={metrics.active}
            subtitle="Currently in progress"
            iconColor="bg-amber-100 text-amber-600"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Class I Active"
            value={metrics.classIActive}
            subtitle="Critical safety recalls"
            iconColor="bg-red-100 text-red-700"
          />
          <StatsCard
            icon={Package}
            title="Avg Recovery Rate"
            value={`${metrics.avgRecoveryRate}%`}
            subtitle="Across all recalls with retrievals"
            iconColor="bg-green-100 text-green-600"
          />
          <StatsCard
            icon={Bell}
            title="Notifications Pending"
            value={metrics.pendingNotifications}
            subtitle="Awaiting acknowledgment"
            iconColor="bg-blue-100 text-blue-600"
          />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recalls" className="gap-1">
            <ShieldAlert className="h-4 w-4" />
            Recalls
          </TabsTrigger>
          <TabsTrigger value="initiate" className="gap-1">
            <Plus className="h-4 w-4" />
            Initiate Recall
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-1">
            <Truck className="h-4 w-4" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Recalls ──────────────────────────────────────────── */}
        <TabsContent value="recalls" className="space-y-4">
          <RecallsTab
            recalls={filteredRecalls}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterClass={filterClass}
            setFilterClass={setFilterClass}
            filterType={filterType}
            setFilterType={setFilterType}
            onViewDetail={openDetail}
            calcRecoveryRate={calcRecoveryRate}
          />
        </TabsContent>

        {/* ─── Tab: Initiate Recall ──────────────────────────────────── */}
        <TabsContent value="initiate" className="space-y-4">
          <InitiateRecallTab onCreated={() => fetchAll()} />
        </TabsContent>

        {/* ─── Tab: Tracking ─────────────────────────────────────────── */}
        <TabsContent value="tracking" className="space-y-4">
          <TrackingTab recalls={recalls} onUpdate={() => fetchAll()} />
        </TabsContent>

        {/* ─── Tab: Analytics ────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab recalls={recalls} metrics={metrics} />
        </TabsContent>
      </Tabs>

      {/* ── Detail Dialog ─────────────────────────────────────────────── */}
      {selectedRecall && (
        <RecallDetailDialog
          recall={selectedRecall}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdate={() => {
            fetchAll();
            const updated = recalls.find((i) => i.id === selectedRecall.id);
            if (updated) setSelectedRecall(updated);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECALLS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface RecallsTabProps {
  recalls: RecallRecord[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterClass: string;
  setFilterClass: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  onViewDetail: (r: RecallRecord) => void;
  calcRecoveryRate: (r: RecallRecord) => number;
}

function RecallsTab({
  recalls,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterClass,
  setFilterClass,
  filterType,
  setFilterType,
  onViewDetail,
  calcRecoveryRate,
}: RecallsTabProps) {
  return (
    <>
      {/* Filters Row */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number, product, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Status
              </Label>
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
              <Label className="text-xs text-muted-foreground mb-1 block">
                Class
              </Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {ALL_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recalls Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[90px]">Class</TableHead>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[100px]">Recovery</TableHead>
                <TableHead className="w-[80px]">Age</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recalls.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No recalls found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                recalls.map((recall) => {
                  const rate = calcRecoveryRate(recall);
                  return (
                    <TableRow
                      key={recall.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewDetail(recall)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {recall.number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{recall.product}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {recall.reason}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", CLASS_COLORS[recall.recallClass])}>
                          Class {recall.recallClass}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", TYPE_COLORS[recall.type])}>
                          {TYPE_LABELS[recall.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", STATUS_COLORS[recall.status])}>
                          {STATUS_LABELS[recall.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {recall.retrievals.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={rate}
                              className="h-2 w-16"
                            />
                            <span className="text-xs font-medium">
                              {rate}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {daysSince(recall.initiatedAt)}d
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(recall);
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

interface RecallDetailDialogProps {
  recall: RecallRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

function RecallDetailDialog({
  recall,
  open,
  onOpenChange,
  onUpdate,
}: RecallDetailDialogProps) {
  const { updateStatus: recallUpdateStatus } = useRecallStore();
  const [detailTab, setDetailTab] = useState("overview");

  const handleAdvanceStatus = () => {
    // Determine next status from the current one
    const statusOrder: RecallStatus[] = [
      "initiated", "risk-assessment", "notification", "retrieval",
      "reconciliation", "effectiveness-check", "closed",
    ];
    const idx = statusOrder.indexOf(recall.status);
    if (idx >= 0 && idx < statusOrder.length - 1) {
      recallUpdateStatus(recall.id, statusOrder[idx + 1]);
    }
    onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">
              {recall.number} - {recall.product}
            </DialogTitle>
            <Badge className={cn(CLASS_COLORS[recall.recallClass])}>
              Class {recall.recallClass}
            </Badge>
            <Badge className={cn(STATUS_COLORS[recall.status])}>
              {STATUS_LABELS[recall.status]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="retrievals">Retrievals</TabsTrigger>
            <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ─────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <RecallProgress recall={recall} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recall Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <Badge className={cn("mt-0.5", TYPE_COLORS[recall.type])}>
                      {TYPE_LABELS[recall.type]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Priority</p>
                    <Badge
                      className={cn(
                        "mt-0.5",
                        PRIORITY_COLORS[recall.priority]
                      )}
                    >
                      {recall.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Initiated By</p>
                    <p className="font-medium">{recall.initiatedBy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium">{recall.department}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Initiated Date
                    </p>
                    <p className="font-medium">
                      {formatDate(recall.initiatedAt)}
                    </p>
                  </div>
                  {recall.regulatoryReportNumber && (
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Regulatory Report #
                      </p>
                      <p className="font-medium font-mono">
                        {recall.regulatoryReportNumber}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground text-xs mb-1">Reason</p>
                  <p className="text-sm">{recall.reason}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Description
                  </p>
                  <p className="text-sm">{recall.description}</p>
                </div>

                {recall.riskAssessment && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium mb-2">
                        Risk Assessment
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Health Hazard
                          </p>
                          <p className="font-medium capitalize">
                            {recall.riskAssessment.healthHazard}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Likelihood of Harm
                          </p>
                          <p className="font-medium capitalize">
                            {recall.riskAssessment.likelihoodOfHarm}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Population Exposed
                          </p>
                          <p className="font-medium">
                            {recall.riskAssessment.populationExposed.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Assessed By
                          </p>
                          <p className="font-medium">
                            {recall.riskAssessment.assessedBy}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm mt-2 text-muted-foreground">
                        {recall.riskAssessment.notes}
                      </p>
                    </div>
                  </>
                )}

                {recall.rootCause && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">
                        Root Cause
                      </p>
                      <p className="text-sm">{recall.rootCause}</p>
                    </div>
                  </>
                )}
                {recall.correctiveActions && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Corrective Actions
                    </p>
                    <p className="text-sm">{recall.correctiveActions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {recall.status !== "closed" && (
              <div className="flex justify-end">
                <Button onClick={handleAdvanceStatus} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Advance to Next Stage
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Batches Tab ──────────────────────────────────────────── */}
          <TabsContent value="batches" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Affected Batches ({recall.affectedBatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recall.affectedBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No batches recorded
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recall.affectedBatches.map((batch) => (
                      <BatchCard key={batch.batchNumber} batch={batch} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications Tab ────────────────────────────────────── */}
          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Notification Tracking ({recall.notifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recall.notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications sent yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[80px]">Method</TableHead>
                        <TableHead className="w-[100px]">Sent</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recall.notifications.map((notif) => (
                        <TableRow key={notif.id}>
                          <TableCell className="font-medium text-sm">
                            {notif.recipientName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px]",
                                notif.recipientType === "regulatory"
                                  ? "bg-red-100 text-red-800"
                                  : notif.recipientType === "hospitals"
                                  ? "bg-purple-100 text-purple-800"
                                  : notif.recipientType === "distributors"
                                  ? "bg-blue-100 text-blue-800"
                                  : notif.recipientType === "pharmacies"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {notif.recipientType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {notif.method}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(notif.dateSent)}
                          </TableCell>
                          <TableCell>
                            {notif.acknowledged ? (
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span className="text-xs">Ack</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs">Pending</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Retrievals Tab ───────────────────────────────────────── */}
          <TabsContent value="retrievals" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Retrieval Log ({recall.retrievals.length} locations)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recall.retrievals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No retrieval records yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[100px]">Region</TableHead>
                        <TableHead className="w-[90px] text-right">
                          Shipped
                        </TableHead>
                        <TableHead className="w-[90px] text-right">
                          Returned
                        </TableHead>
                        <TableHead className="w-[90px] text-right">
                          Remaining
                        </TableHead>
                        <TableHead className="w-[80px]">Rate</TableHead>
                        <TableHead className="w-[90px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recall.retrievals.map((ret) => {
                        const rate =
                          ret.quantityShipped > 0
                            ? Math.round(
                                (ret.quantityReturned / ret.quantityShipped) *
                                  100
                              )
                            : 0;
                        return (
                          <TableRow key={ret.id}>
                            <TableCell className="font-medium text-sm">
                              {ret.location}
                            </TableCell>
                            <TableCell className="text-xs">
                              {ret.region}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {ret.quantityShipped.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {ret.quantityReturned.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-red-600">
                              {ret.quantityRemaining.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Progress
                                  value={rate}
                                  className="h-1.5 w-10"
                                />
                                <span className="text-xs">{rate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  ret.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : ret.status === "in-progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                )}
                              >
                                {ret.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Effectiveness Tab ────────────────────────────────────── */}
          <TabsContent value="effectiveness" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Effectiveness Checks ({recall.effectivenessChecks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recall.effectivenessChecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No effectiveness checks conducted yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recall.effectivenessChecks.map((check) => (
                      <EffectivenessCard key={check.id} check={check} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Card ──────────────────────────────────────────────────────────────

function BatchCard({ batch }: { batch: AffectedBatch }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono font-semibold text-sm">{batch.batchNumber}</p>
          <p className="text-xs text-muted-foreground">{batch.productName}</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {batch.quantityManufactured.toLocaleString()} units
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Mfg Date</p>
          <p className="font-medium">{formatDate(batch.manufacturingDate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Expiry</p>
          <p className="font-medium">{formatDate(batch.expiryDate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Distributed</p>
          <p className="font-medium">
            {batch.quantityDistributed.toLocaleString()}
          </p>
        </div>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Distributed To</p>
        <div className="flex flex-wrap gap-1">
          {batch.distributedTo.map((loc) => (
            <Badge key={loc} variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {loc}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Effectiveness Card ──────────────────────────────────────────────────────

function EffectivenessCard({ check }: { check: RecallEffectivenessCheck }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-100 text-cyan-800">
            Level {check.checkLevel}
          </Badge>
          <span className="text-sm font-medium">
            Recovery Rate: {check.recoveryRate}%
          </span>
        </div>
        <Badge
          className={cn(
            check.recommendation === "close"
              ? "bg-green-100 text-green-800"
              : check.recommendation === "extend"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          )}
        >
          {check.recommendation}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Remaining Risk</p>
          <p className="font-medium capitalize">{check.remainingRisk}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Regulatory Closure</p>
          <p className="font-medium">
            {check.regulatoryClosure ? (
              <span className="text-green-700 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Yes
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Pending
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Conducted By</p>
          <p className="font-medium">{check.conductedBy}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Date</p>
          <p className="font-medium">{formatDate(check.conductedAt)}</p>
        </div>
      </div>
      {check.regulatoryReference && (
        <div>
          <p className="text-muted-foreground text-xs">Regulatory Reference</p>
          <p className="text-sm font-mono">{check.regulatoryReference}</p>
        </div>
      )}
      <div>
        <p className="text-muted-foreground text-xs mb-1">Findings</p>
        <p className="text-sm">{check.findings}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIATE RECALL TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface InitiateRecallTabProps {
  onCreated: () => void;
}

function InitiateRecallTab({ onCreated }: InitiateRecallTabProps) {
  const { create: recallCreate } = useRecallStore();
  const [product, setProduct] = useState("");
  const [recallClass, setRecallClass] = useState<RecallClass>("II");
  const [recallType, setRecallType] = useState<RecallType>("voluntary");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RecallPriority>("high");
  const [department, setDepartment] = useState("");
  const [initiatedBy, setInitiatedBy] = useState("");

  // Batch fields
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQtyMfg, setBatchQtyMfg] = useState("");
  const [batchQtyDist, setBatchQtyDist] = useState("");
  const [addedBatches, setAddedBatches] = useState<AffectedBatch[]>([]);

  // Risk assessment fields
  const [healthHazard, setHealthHazard] = useState<
    "none" | "low" | "moderate" | "serious" | "life-threatening"
  >("moderate");
  const [likelihoodOfHarm, setLikelihoodOfHarm] = useState<
    "remote" | "low" | "moderate" | "high"
  >("moderate");
  const [populationExposed, setPopulationExposed] = useState("");
  const [riskNotes, setRiskNotes] = useState("");

  // Wizard step
  const [wizardStep, setWizardStep] = useState(1);

  const handleAddBatch = () => {
    if (!batchNumber || !batchQtyMfg) return;
    const newBatch: AffectedBatch = {
      batchNumber,
      productName: product,
      manufacturingDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
      quantityManufactured: parseInt(batchQtyMfg, 10) || 0,
      quantityDistributed: parseInt(batchQtyDist, 10) || 0,
      quantityOnHand:
        (parseInt(batchQtyMfg, 10) || 0) - (parseInt(batchQtyDist, 10) || 0),
      distributedTo: [],
    };
    setAddedBatches((prev) => [...prev, newBatch]);
    setBatchNumber("");
    setBatchQtyMfg("");
    setBatchQtyDist("");
  };

  const handleSubmit = () => {
    if (!product || !reason || !description || !initiatedBy) return;

    const riskAssessment: RecallRiskAssessment = {
      healthHazard,
      populationExposed: parseInt(populationExposed, 10) || 0,
      likelihoodOfHarm,
      assessedBy: initiatedBy,
      assessedAt: new Date().toISOString(),
      notes: riskNotes,
    };

    recallCreate({
      product,
      affectedBatches: addedBatches,
      recallClass,
      type: recallType,
      reason,
      description,
      status: "initiated",
      priority,
      initiatedBy,
      initiatedAt: new Date().toISOString(),
      department,
      riskAssessment,
      notifications: [],
      retrievals: [],
      effectivenessChecks: [],
    } as any);

    // Reset form
    setProduct("");
    setRecallClass("II");
    setRecallType("voluntary");
    setReason("");
    setDescription("");
    setPriority("high");
    setDepartment("");
    setInitiatedBy("");
    setAddedBatches([]);
    setHealthHazard("moderate");
    setLikelihoodOfHarm("moderate");
    setPopulationExposed("");
    setRiskNotes("");
    setWizardStep(1);
    onCreated();
  };

  return (
    <div className="space-y-4">
      {/* Wizard Step Indicator */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-center gap-2">
            {[
              { num: 1, label: "Product & Classification" },
              { num: 2, label: "Batch Selection" },
              { num: 3, label: "Risk Assessment" },
              { num: 4, label: "Review & Submit" },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center gap-2">
                <button
                  onClick={() => setWizardStep(step.num)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    wizardStep === step.num
                      ? "bg-primary text-primary-foreground"
                      : wizardStep > step.num
                      ? "bg-green-100 text-green-800"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs">
                    {wizardStep > step.num ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      step.num
                    )}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < 3 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Product & Classification */}
      {wizardStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product & Classification</CardTitle>
            <CardDescription>
              Identify the product and determine the recall classification per
              FDA/EDA guidelines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Product Name</Label>
                <Input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g., Amoxicillin 500mg Tablets"
                />
              </div>
              <div>
                <Label>Recall Class</Label>
                <Select
                  value={recallClass}
                  onValueChange={(v) => setRecallClass(v as RecallClass)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">
                      Class I - Critical Safety
                    </SelectItem>
                    <SelectItem value="II">
                      Class II - Health Risk
                    </SelectItem>
                    <SelectItem value="III">
                      Class III - Unlikely Harm
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recall Type</Label>
                <Select
                  value={recallType}
                  onValueChange={(v) => setRecallType(v as RecallType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary">Voluntary</SelectItem>
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                    <SelectItem value="market-withdrawal">
                      Market Withdrawal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as RecallPriority)}
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
              <div>
                <Label>Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Quality Assurance"
                />
              </div>
              <div className="col-span-2">
                <Label>Initiated By</Label>
                <Input
                  value={initiatedBy}
                  onChange={(e) => setInitiatedBy(e.target.value)}
                  placeholder="e.g., Dr. Laila Farouk"
                />
              </div>
              <div className="col-span-2">
                <Label>Reason for Recall</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for the recall"
                />
              </div>
              <div className="col-span-2">
                <Label>Detailed Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the issue, investigation findings, and justification..."
                  rows={4}
                />
              </div>
            </div>

            {/* Class determination guidance */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold mb-2">
                  FDA Recall Classification Guide
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-red-100 text-red-800 shrink-0">
                      Class I
                    </Badge>
                    <p>
                      Reasonable probability of serious adverse health
                      consequences or death.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-orange-100 text-orange-800 shrink-0">
                      Class II
                    </Badge>
                    <p>
                      May cause temporary or reversible adverse health
                      consequences; probability of serious consequences is
                      remote.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800 shrink-0">
                      Class III
                    </Badge>
                    <p>
                      Not likely to cause adverse health consequences.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setWizardStep(2)} disabled={!product}>
                Next: Batch Selection
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Batch Selection */}
      {wizardStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Selection</CardTitle>
            <CardDescription>
              Add the affected batches for this recall. Each batch can have its
              own distribution profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Batch Number</Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g., AMX-2026-200"
                />
              </div>
              <div>
                <Label>Qty Manufactured</Label>
                <Input
                  type="number"
                  value={batchQtyMfg}
                  onChange={(e) => setBatchQtyMfg(e.target.value)}
                  placeholder="e.g., 100000"
                />
              </div>
              <div>
                <Label>Qty Distributed</Label>
                <Input
                  type="number"
                  value={batchQtyDist}
                  onChange={(e) => setBatchQtyDist(e.target.value)}
                  placeholder="e.g., 85000"
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleAddBatch} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Batch
            </Button>

            {addedBatches.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead className="text-right">Manufactured</TableHead>
                    <TableHead className="text-right">Distributed</TableHead>
                    <TableHead className="text-right">On-Hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addedBatches.map((b) => (
                    <TableRow key={b.batchNumber}>
                      <TableCell className="font-mono text-sm">
                        {b.batchNumber}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {b.quantityManufactured.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {b.quantityDistributed.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {b.quantityOnHand.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setWizardStep(1)}>
                Back
              </Button>
              <Button onClick={() => setWizardStep(3)}>
                Next: Risk Assessment
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Risk Assessment */}
      {wizardStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Initial Risk Assessment</CardTitle>
            <CardDescription>
              Evaluate the health hazard and risk associated with this recall.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Health Hazard Level</Label>
                <Select
                  value={healthHazard}
                  onValueChange={(v) =>
                    setHealthHazard(
                      v as "none" | "low" | "moderate" | "serious" | "life-threatening"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="life-threatening">
                      Life-Threatening
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Likelihood of Harm</Label>
                <Select
                  value={likelihoodOfHarm}
                  onValueChange={(v) =>
                    setLikelihoodOfHarm(v as "remote" | "low" | "moderate" | "high")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Population Exposed (Estimated)</Label>
                <Input
                  type="number"
                  value={populationExposed}
                  onChange={(e) => setPopulationExposed(e.target.value)}
                  placeholder="e.g., 50000"
                />
              </div>
            </div>
            <div>
              <Label>Risk Assessment Notes</Label>
              <Textarea
                value={riskNotes}
                onChange={(e) => setRiskNotes(e.target.value)}
                placeholder="Detailed risk assessment notes..."
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setWizardStep(2)}>
                Back
              </Button>
              <Button onClick={() => setWizardStep(4)}>
                Next: Review & Submit
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Submit */}
      {wizardStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & Submit</CardTitle>
            <CardDescription>
              Review all recall details before submitting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Product</p>
                <p className="font-medium">{product || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Classification</p>
                <div className="flex gap-2 mt-0.5">
                  <Badge className={cn(CLASS_COLORS[recallClass])}>
                    Class {recallClass}
                  </Badge>
                  <Badge className={cn(TYPE_COLORS[recallType])}>
                    {TYPE_LABELS[recallType]}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Priority</p>
                <Badge className={cn("mt-0.5", PRIORITY_COLORS[priority])}>
                  {priority}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Department</p>
                <p className="font-medium">{department || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Initiated By</p>
                <p className="font-medium">{initiatedBy || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Affected Batches
                </p>
                <p className="font-medium">{addedBatches.length} batch(es)</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-muted-foreground text-xs mb-1">Reason</p>
              <p className="text-sm">{reason || "Not specified"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Description</p>
              <p className="text-sm">{description || "Not specified"}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium mb-2">Risk Assessment Summary</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Health Hazard</p>
                  <p className="font-medium capitalize">{healthHazard}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Likelihood</p>
                  <p className="font-medium capitalize">{likelihoodOfHarm}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Population</p>
                  <p className="font-medium">
                    {populationExposed
                      ? parseInt(populationExposed, 10).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setWizardStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!product || !reason || !description || !initiatedBy}
                className="gap-2"
              >
                <ShieldAlert className="h-4 w-4" />
                Submit Recall
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface TrackingTabProps {
  recalls: RecallRecord[];
  onUpdate: () => void;
}

function TrackingTab({ recalls, onUpdate }: TrackingTabProps) {
  const { update: recallUpdate } = useRecallStore();
  const activeRecalls = recalls.filter((r) => r.status !== "closed");
  const [selectedRecallId, setSelectedRecallId] = useState<string>("");
  const selectedRecall = recalls.find((r) => r.id === selectedRecallId);

  // Reconciliation form
  const [reconLocation, setReconLocation] = useState("");
  const [reconDistributor, setReconDistributor] = useState("");
  const [reconRegion, setReconRegion] = useState("");
  const [reconQtyShipped, setReconQtyShipped] = useState("");
  const [reconQtyReturned, setReconQtyReturned] = useState("");

  const handleAddRetrieval = () => {
    if (!selectedRecallId || !reconLocation || !selectedRecall) return;
    const qtyShipped = parseInt(reconQtyShipped, 10) || 0;
    const qtyReturned = parseInt(reconQtyReturned, 10) || 0;
    const newRetrieval: RecallRetrieval = {
      id: `ret-${Date.now()}`,
      location: reconLocation,
      distributor: reconDistributor || reconLocation,
      region: reconRegion,
      quantityShipped: qtyShipped,
      quantityReturned: qtyReturned,
      quantityDestroyed: 0,
      quantityRemaining: qtyShipped - qtyReturned,
      status: qtyReturned >= qtyShipped ? "completed" : "in-progress",
      lastUpdated: new Date().toISOString(),
    };
    recallUpdate(selectedRecallId, {
      retrievals: [...(selectedRecall.retrievals || []), newRetrieval],
    } as any);
    setReconLocation("");
    setReconDistributor("");
    setReconRegion("");
    setReconQtyShipped("");
    setReconQtyReturned("");
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Select recall */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <Label className="mb-2 block">Select Recall to Track</Label>
          <Select
            value={selectedRecallId}
            onValueChange={setSelectedRecallId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an active recall..." />
            </SelectTrigger>
            <SelectContent>
              {activeRecalls.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.number} - {r.product} (Class {r.recallClass})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRecall && (
        <>
          {/* Retrieval Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Shipped</p>
                <p className="text-2xl font-bold">
                  {selectedRecall.retrievals
                    .reduce((s, r) => s + r.quantityShipped, 0)
                    .toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Returned</p>
                <p className="text-2xl font-bold text-green-700">
                  {selectedRecall.retrievals
                    .reduce((s, r) => s + r.quantityReturned, 0)
                    .toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Still Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {selectedRecall.retrievals
                    .reduce((s, r) => s + r.quantityRemaining, 0)
                    .toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Retrieval by distributor/location */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Retrieval by Location ({selectedRecall.retrievals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRecall.retrievals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No retrieval records yet. Use the form below to add.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Distributor</TableHead>
                      <TableHead className="w-[90px]">Region</TableHead>
                      <TableHead className="w-[90px] text-right">
                        Shipped
                      </TableHead>
                      <TableHead className="w-[90px] text-right">
                        Returned
                      </TableHead>
                      <TableHead className="w-[90px] text-right">
                        Remaining
                      </TableHead>
                      <TableHead className="w-[100px]">Progress</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecall.retrievals.map((ret) => {
                      const rate =
                        ret.quantityShipped > 0
                          ? Math.round(
                              (ret.quantityReturned / ret.quantityShipped) * 100
                            )
                          : 0;
                      return (
                        <TableRow key={ret.id}>
                          <TableCell className="font-medium text-sm">
                            {ret.location}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ret.distributor}
                          </TableCell>
                          <TableCell className="text-xs">{ret.region}</TableCell>
                          <TableCell className="text-right text-xs">
                            {ret.quantityShipped.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs text-green-700">
                            {ret.quantityReturned.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs text-red-600 font-medium">
                            {ret.quantityRemaining.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Progress value={rate} className="h-1.5 w-12" />
                              <span className="text-xs">{rate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px]",
                                ret.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : ret.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {ret.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Reconciliation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Add Retrieval Record
              </CardTitle>
              <CardDescription>
                Record returned quantities from a distributor or location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={reconLocation}
                    onChange={(e) => setReconLocation(e.target.value)}
                    placeholder="e.g., Cairo Central Pharmacy"
                  />
                </div>
                <div>
                  <Label>Distributor</Label>
                  <Input
                    value={reconDistributor}
                    onChange={(e) => setReconDistributor(e.target.value)}
                    placeholder="e.g., MedPharma Distributors"
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    value={reconRegion}
                    onChange={(e) => setReconRegion(e.target.value)}
                    placeholder="e.g., Greater Cairo"
                  />
                </div>
                <div>
                  <Label>Qty Shipped</Label>
                  <Input
                    type="number"
                    value={reconQtyShipped}
                    onChange={(e) => setReconQtyShipped(e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>
                <div>
                  <Label>Qty Returned</Label>
                  <Input
                    type="number"
                    value={reconQtyReturned}
                    onChange={(e) => setReconQtyReturned(e.target.value)}
                    placeholder="e.g., 8500"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddRetrieval}
                disabled={!reconLocation || !reconQtyShipped}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Retrieval Record
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface AnalyticsTabProps {
  recalls: RecallRecord[];
  metrics: RecallMetrics | null;
}

function AnalyticsTab({ recalls, metrics }: AnalyticsTabProps) {
  if (!metrics) return null;

  // Recovery rates by recall
  const recoveryData = recalls
    .filter((r) => r.retrievals.length > 0)
    .map((r) => {
      const totalShipped = r.retrievals.reduce(
        (s, ret) => s + ret.quantityShipped,
        0
      );
      const totalReturned = r.retrievals.reduce(
        (s, ret) => s + ret.quantityReturned,
        0
      );
      return {
        number: r.number,
        product: r.product,
        recallClass: r.recallClass,
        rate:
          totalShipped > 0
            ? Math.round((totalReturned / totalShipped) * 1000) / 10
            : 0,
      };
    });

  // Response time by recall
  const responseData = recalls
    .filter((r) => r.notifications.length > 0)
    .map((r) => {
      const firstNotif = r.notifications.reduce((earliest, n) =>
        new Date(n.dateSent) < new Date(earliest.dateSent) ? n : earliest
      );
      return {
        number: r.number,
        product: r.product,
        days: daysSince(r.initiatedAt) - daysSince(firstNotif.dateSent),
      };
    });

  // Root cause analysis
  const rootCauses = recalls
    .filter((r) => r.rootCause)
    .map((r) => ({
      number: r.number,
      product: r.product,
      recallClass: r.recallClass,
      rootCause: r.rootCause!,
    }));

  return (
    <div className="space-y-4">
      {/* Recalls by Class / Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recalls by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.byClass.map((item) => {
                const pct =
                  metrics.total > 0
                    ? Math.round((item.count / metrics.total) * 100)
                    : 0;
                return (
                  <div key={item.recallClass} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            CLASS_COLORS[item.recallClass]
                          )}
                        >
                          Class {item.recallClass}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {CLASS_LABELS[item.recallClass]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recalls by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.byType.map((item) => {
                const pct =
                  metrics.total > 0
                    ? Math.round((item.count / metrics.total) * 100)
                    : 0;
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Badge
                        className={cn(
                          "text-xs",
                          TYPE_COLORS[item.type as RecallType] ||
                            "bg-gray-100 text-gray-800"
                        )}
                      >
                        {TYPE_LABELS[item.type as RecallType] || item.type}
                      </Badge>
                      <span className="font-medium">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Rates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Recovery Rates by Recall
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recoveryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No retrieval data available yet
            </p>
          ) : (
            <div className="space-y-3">
              {recoveryData.map((item) => (
                <div key={item.number} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">
                        {item.number}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {item.product}
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          CLASS_COLORS[item.recallClass]
                        )}
                      >
                        {item.recallClass}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        "font-medium text-sm",
                        item.rate >= 90
                          ? "text-green-700"
                          : item.rate >= 70
                          ? "text-amber-700"
                          : "text-red-700"
                      )}
                    >
                      {item.rate}%
                    </span>
                  </div>
                  <Progress
                    value={item.rate}
                    className={cn(
                      "h-2",
                      item.rate >= 90
                        ? "[&>div]:bg-green-500"
                        : item.rate >= 70
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-red-500"
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Response Time (Initiation to First Notification)
          </CardTitle>
          <CardDescription>
            Average: {metrics.avgResponseTimeDays} day(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responseData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notification data available yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recall #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Response Time
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responseData.map((item) => (
                  <TableRow key={item.number}>
                    <TableCell className="font-mono text-sm">
                      {item.number}
                    </TableCell>
                    <TableCell className="text-sm">{item.product}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={cn(
                          item.days <= 1
                            ? "bg-green-100 text-green-800"
                            : item.days <= 3
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {item.days} day(s)
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Root Cause Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Root Cause Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rootCauses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No root cause data available yet
            </p>
          ) : (
            <div className="space-y-3">
              {rootCauses.map((item) => (
                <div
                  key={item.number}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">
                      {item.number}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        CLASS_COLORS[item.recallClass]
                      )}
                    >
                      Class {item.recallClass}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.product}
                    </span>
                  </div>
                  <p className="text-sm">{item.rootCause}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recall Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recall Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {ALL_STATUSES.map((status) => {
              const count =
                metrics.byStatus.find((b) => b.status === status)?.count || 0;
              return (
                <div key={status} className="text-center p-3 rounded-lg border">
                  <Badge className={cn("text-[10px] mb-2", STATUS_COLORS[status])}>
                    {STATUS_LABELS[status]}
                  </Badge>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
