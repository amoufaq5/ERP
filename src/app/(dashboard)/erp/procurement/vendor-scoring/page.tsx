"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import {
  VendorScorecardCard,
  VendorScorecardDetail,
  QualificationBadge,
  ScoreBadge,
  RadarChart,
  DimensionBar,
  TrendIndicator,
  ScoreTrendChart,
  scoreColor,
  scoreBg,
} from "@/components/shared/vendor-scorecard";
import { cn } from "@/lib/utils";
import { vendorScoringStore } from "@/lib/quality/vendor-scoring-store";
import type {
  VendorScore,
  VendorAudit,
  QualificationStatus,
  VendorCategory,
  VendorScorecardMetrics,
} from "@/lib/quality/vendor-scoring-types";
import {
  Award,
  Users,
  ShieldCheck,
  Star,
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Loader2,
} from "lucide-react";

/* ── Category label mapping ── */

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  "api-supplier": "API Supplier",
  "api-manufacturer": "API Manufacturer",
  "excipient-supplier": "Excipient Supplier",
  "packaging-supplier": "Packaging Supplier",
  "equipment-vendor": "Equipment Vendor",
  "contract-manufacturer": "Contract Manufacturer",
  "distributor": "Distributor",
  "service-provider": "Service Provider",
};

const STATUS_LABELS: Record<QualificationStatus, string> = {
  new: "New",
  qualified: "Qualified",
  preferred: "Preferred",
  probation: "Probation",
  disqualified: "Disqualified",
};

/* ── Audit type labels ── */

const AUDIT_TYPE_LABELS: Record<string, string> = {
  initial: "Initial Qualification",
  periodic: "Periodic Review",
  "for-cause": "For-Cause",
  "follow-up": "Follow-Up",
};

const AUDIT_STATUS_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  scheduled: "secondary",
  "in-progress": "warning",
  completed: "success",
  cancelled: "destructive",
};

/* ── Severity colors ── */

const SEVERITY_BADGE: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  major: "warning",
  minor: "secondary",
  observation: "outline",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function VendorScoringPage() {
  const [vendors, setVendors] = useState<VendorScore[]>([]);
  const [metrics, setMetrics] = useState<VendorScorecardMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("scorecards");
  const [selectedVendor, setSelectedVendor] = useState<VendorScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<QualificationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "all">("all");
  const [sortField, setSortField] = useState<"score" | "name" | "status">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Audit scheduling
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [auditVendorId, setAuditVendorId] = useState("");
  const [auditType, setAuditType] = useState<string>("periodic");
  const [auditDate, setAuditDate] = useState("");
  const [auditAuditor, setAuditAuditor] = useState("");

  // Qualification workflow
  const [qualVendorId, setQualVendorId] = useState("");
  const [qualAction, setQualAction] = useState<QualificationStatus | "">("");

  // Vendor CRUD
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vfName, setVfName] = useState("");
  const [vfContact, setVfContact] = useState("");
  const [vfCategory, setVfCategory] = useState<string>("api-manufacturer");
  const [vfCountry, setVfCountry] = useState("");
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setVendors(vendorScoringStore.getAll());
    setMetrics(vendorScoringStore.getMetrics());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* ── Filtered & sorted vendors ── */

  const filteredVendors = useMemo(() => {
    let list = [...vendors];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(q) ||
          v.vendorCode.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((v) => v.qualificationStatus === statusFilter);
    }

    if (categoryFilter !== "all") {
      list = list.filter((v) => v.category === categoryFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") cmp = a.overallScore - b.overallScore;
      else if (sortField === "name") cmp = a.vendorName.localeCompare(b.vendorName);
      else cmp = a.qualificationStatus.localeCompare(b.qualificationStatus);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [vendors, searchTerm, statusFilter, categoryFilter, sortField, sortDir]);

  /* ── All audits ── */

  const allAudits = useMemo(() => {
    const audits: (VendorAudit & { vendorName: string })[] = [];
    for (const v of vendors) {
      for (const a of v.audits) {
        audits.push({ ...a, vendorName: v.vendorName });
      }
    }
    return audits;
  }, [vendors]);

  const upcomingAudits = useMemo(
    () =>
      allAudits
        .filter((a) => a.status === "scheduled")
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [allAudits]
  );

  const completedAudits = useMemo(
    () =>
      allAudits
        .filter((a) => a.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completedDate || b.scheduledDate).getTime() -
            new Date(a.completedDate || a.scheduledDate).getTime()
        ),
    [allAudits]
  );

  /* ── Handlers ── */

  function openDetail(vendor: VendorScore) {
    setSelectedVendor(vendor);
    setDetailOpen(true);
  }

  function handleScheduleAudit() {
    if (!auditVendorId || !auditDate || !auditAuditor) return;
    vendorScoringStore.addAudit(auditVendorId, {
      auditType: auditType as VendorAudit["auditType"],
      scheduledDate: new Date(auditDate).toISOString(),
      auditor: auditAuditor,
      status: "scheduled",
      findings: [],
    });
    setShowAuditForm(false);
    setAuditVendorId("");
    setAuditType("periodic");
    setAuditDate("");
    setAuditAuditor("");
    reload();
  }

  function handleQualificationChange() {
    if (!qualVendorId || !qualAction) return;
    vendorScoringStore.setQualificationStatus(qualVendorId, qualAction as QualificationStatus);
    setQualVendorId("");
    setQualAction("");
    reload();
  }

  function handleCreateVendor() {
    if (!vfName) return;
    vendorScoringStore.create({
      vendorName: vfName,
      vendorCode: `V-${Date.now().toString(36).toUpperCase()}`,
      contactPerson: vfContact || "N/A",
      contactEmail: "",
      category: vfCategory as VendorCategory,
      country: vfCountry || "Egypt",
      qualificationStatus: "new" as QualificationStatus,
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      quality: { defectRate: 0, oosRate: 0, capaCount: 0, score: 0 },
      delivery: { onTimePercent: 100, leadTimeVariance: 0, score: 0 },
      compliance: { auditScore: 0, certifications: [], regulatoryStatus: "clear" as const, score: 0 },
      commercial: { pricingCompetitiveness: 50, paymentTermsDays: 30, score: 0 },
      qualityScore: 0,
      deliveryScore: 0,
      complianceScore: 0,
      commercialScore: 0,
      responsiveness: 0,
      audits: [],
      certifications: [],
      incidents: [],
      contractValue: 0,
      activeContracts: 0,
    });
    setShowVendorForm(false);
    setVfName(""); setVfContact(""); setVfCategory("api-manufacturer"); setVfCountry("");
    reload();
  }

  function handleDeleteVendor() {
    if (!deleteVendorId) return;
    vendorScoringStore.delete(deleteVendorId);
    setDeleteVendorId(null);
    if (selectedVendor?.id === deleteVendorId) { setSelectedVendor(null); setDetailOpen(false); }
    reload();
  }

  function handleToggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  /* ── Format date helper ── */

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function daysUntil(iso: string): number {
    return Math.round(
      (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Vendor Scoring & Qualification"
        description="Evaluate, score, and qualify pharmaceutical suppliers across quality, delivery, compliance, and commercial dimensions."
        icon={<Award className="h-6 w-6 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowVendorForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Vendor
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Users}
          title="Total Vendors"
          value={metrics.totalVendors}
          subtitle={`${metrics.newCount} pending qualification`}
        />
        <StatsCard
          icon={ShieldCheck}
          title="Qualified"
          value={metrics.qualifiedCount}
          iconColor="bg-blue-500/10 text-blue-600"
        />
        <StatsCard
          icon={Star}
          title="Preferred"
          value={metrics.preferredCount}
          iconColor="bg-green-500/10 text-green-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="On Probation"
          value={metrics.probationCount}
          iconColor="bg-amber-500/10 text-amber-600"
        />
        <StatsCard
          icon={BarChart3}
          title="Average Score"
          value={`${metrics.averageScore}`}
          subtitle="Across active vendors"
          iconColor="bg-primary/10 text-primary"
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scorecards" className="gap-1.5">
            <Award className="h-4 w-4" />
            Scorecards
          </TabsTrigger>
          <TabsTrigger value="audits" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            Audits
          </TabsTrigger>
          <TabsTrigger value="qualification" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Qualification
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
           TAB: Scorecards
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="scorecards">
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as QualificationStatus | "all")}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    {(Object.keys(STATUS_LABELS) as QualificationStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>

                  {/* Category filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | "all")}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Categories</option>
                    {(Object.keys(CATEGORY_LABELS) as VendorCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>

                  {/* Sort */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9"
                    onClick={() => handleToggleSort(sortField === "score" ? "name" : "score")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortField === "score" ? "Score" : sortField === "name" ? "Name" : "Status"}
                    {sortDir === "desc" ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronUp className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVendors.map((vendor) => (
                <VendorScorecardCard
                  key={vendor.id}
                  vendor={vendor}
                  onClick={() => openDetail(vendor)}
                />
              ))}
              {filteredVendors.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No vendors match your filters</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
           TAB: Audits
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="audits">
          <div className="space-y-6">
            {/* Schedule button */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Vendor Audits</h3>
              <Button
                size="sm"
                onClick={() => setShowAuditForm(!showAuditForm)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Schedule Audit
              </Button>
            </div>

            {/* Schedule audit form */}
            {showAuditForm && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Schedule New Audit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Vendor
                      </label>
                      <select
                        value={auditVendorId}
                        onChange={(e) => setAuditVendorId(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select vendor...</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vendorName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Audit Type
                      </label>
                      <select
                        value={auditType}
                        onChange={(e) => setAuditType(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        value={auditDate}
                        onChange={(e) => setAuditDate(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Auditor
                      </label>
                      <input
                        type="text"
                        placeholder="Auditor name"
                        value={auditAuditor}
                        onChange={(e) => setAuditAuditor(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" onClick={handleScheduleAudit}>
                      Schedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAuditForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Audits */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Audits ({upcomingAudits.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAudits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No upcoming audits scheduled
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Audit Type</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Auditor</TableHead>
                        <TableHead>Days Until</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAudits.map((audit) => {
                        const days = daysUntil(audit.scheduledDate);
                        return (
                          <TableRow key={audit.id}>
                            <TableCell className="font-medium">
                              {audit.vendorName}
                            </TableCell>
                            <TableCell>
                              {AUDIT_TYPE_LABELS[audit.auditType] || audit.auditType}
                            </TableCell>
                            <TableCell>{fmtDate(audit.scheduledDate)}</TableCell>
                            <TableCell>{audit.auditor}</TableCell>
                            <TableCell>
                              <Badge
                                variant={days <= 7 ? "warning" : days <= 14 ? "secondary" : "outline"}
                              >
                                {days <= 0 ? "Overdue" : `${days} days`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={AUDIT_STATUS_BADGE[audit.status]}>
                                {audit.status}
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

            {/* Completed Audits */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed Audits ({completedAudits.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedAudits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No completed audits
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Audit Type</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Auditor</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Findings</TableHead>
                        <TableHead>CAs Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedAudits.map((audit) => (
                        <TableRow key={audit.id}>
                          <TableCell className="font-medium">
                            {audit.vendorName}
                          </TableCell>
                          <TableCell>
                            {AUDIT_TYPE_LABELS[audit.auditType] || audit.auditType}
                          </TableCell>
                          <TableCell>
                            {audit.completedDate ? fmtDate(audit.completedDate) : "-"}
                          </TableCell>
                          <TableCell>{audit.auditor}</TableCell>
                          <TableCell>
                            {audit.score != null ? (
                              <span className={cn("font-semibold", scoreColor(audit.score))}>
                                {audit.score}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {audit.findings.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {audit.findings.filter((f) => f.severity === "critical").length > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5">
                                    {audit.findings.filter((f) => f.severity === "critical").length} Critical
                                  </Badge>
                                )}
                                {audit.findings.filter((f) => f.severity === "major").length > 0 && (
                                  <Badge variant="warning" className="text-[10px] px-1.5">
                                    {audit.findings.filter((f) => f.severity === "major").length} Major
                                  </Badge>
                                )}
                                {audit.findings.filter((f) => f.severity === "minor" || f.severity === "observation").length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5">
                                    {audit.findings.filter((f) => f.severity === "minor" || f.severity === "observation").length} Minor
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-green-600 font-medium">No findings</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {audit.correctiveActionsRequired - audit.correctiveActionsClosed > 0 ? (
                              <Badge variant="warning" className="text-[10px]">
                                {audit.correctiveActionsRequired - audit.correctiveActionsClosed} open
                              </Badge>
                            ) : audit.correctiveActionsRequired > 0 ? (
                              <Badge variant="success" className="text-[10px]">
                                All closed
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
           TAB: Qualification
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="qualification">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Vendor Qualification Workflow</h3>
            </div>

            {/* Qualification action form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Change Qualification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Select Vendor
                    </label>
                    <select
                      value={qualVendorId}
                      onChange={(e) => setQualVendorId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} ({STATUS_LABELS[v.qualificationStatus]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      New Status
                    </label>
                    <select
                      value={qualAction}
                      onChange={(e) => setQualAction(e.target.value as QualificationStatus)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select status...</option>
                      {(Object.keys(STATUS_LABELS) as QualificationStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={handleQualificationChange}>
                      Update Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Qualification pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {(["new", "qualified", "preferred", "probation", "disqualified"] as QualificationStatus[]).map(
                (status) => {
                  const inStatus = vendors.filter((v) => v.qualificationStatus === status);
                  const statusColors: Record<QualificationStatus, string> = {
                    new: "border-t-blue-400",
                    qualified: "border-t-primary",
                    preferred: "border-t-green-500",
                    probation: "border-t-amber-500",
                    disqualified: "border-t-red-500",
                  };
                  return (
                    <Card key={status} className={cn("border-t-2", statusColors[status])}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{STATUS_LABELS[status]}</span>
                          <Badge variant="secondary" className="text-xs">
                            {inStatus.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {inStatus.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No vendors
                            </p>
                          ) : (
                            inStatus.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between rounded-md border border-border p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => openDetail(v)}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {v.vendorName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {v.vendorCode}
                                  </p>
                                </div>
                                <ScoreBadge score={v.overallScore} size="sm" />
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>

            {/* Qualification checklist / requirements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Qualification Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Approval Steps</h4>
                    <div className="space-y-2">
                      {[
                        { step: 1, label: "Vendor Application & Documentation Review", desc: "Collect and verify vendor documentation, GMP certificates, DMFs" },
                        { step: 2, label: "Initial Risk Assessment", desc: "Evaluate supply risk, regulatory status, and financial stability" },
                        { step: 3, label: "On-Site Audit (if required)", desc: "GMP audit for API and critical excipient suppliers" },
                        { step: 4, label: "Sample Testing & Evaluation", desc: "QC testing of sample materials against pharmacopoeial standards" },
                        { step: 5, label: "QA Approval & Classification", desc: "Final approval by QA Head with qualification status assignment" },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3 rounded-md border border-border p-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {item.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Score Thresholds</h4>
                    <div className="space-y-2">
                      {[
                        { status: "Preferred", threshold: "85+", color: "bg-green-500", desc: "Highest rated vendors. Priority for new procurement." },
                        { status: "Qualified", threshold: "70-84", color: "bg-blue-500", desc: "Approved for routine procurement." },
                        { status: "Probation", threshold: "55-69", color: "bg-amber-500", desc: "Under corrective action plan. Limited orders." },
                        { status: "Disqualified", threshold: "<55", color: "bg-red-500", desc: "Not approved for procurement. Requires re-qualification." },
                      ].map((item) => (
                        <div key={item.status} className="flex items-center gap-3 rounded-md border border-border p-3">
                          <div className={cn("h-3 w-3 rounded-full shrink-0", item.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{item.status}</p>
                              <Badge variant="outline" className="text-xs">
                                {item.threshold}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <h4 className="text-sm font-medium">Dimension Weights</h4>
                    <div className="space-y-1.5">
                      {[
                        { dim: "Quality", weight: 35, color: "bg-red-500" },
                        { dim: "Delivery", weight: 25, color: "bg-blue-500" },
                        { dim: "Compliance", weight: 25, color: "bg-amber-500" },
                        { dim: "Commercial", weight: 15, color: "bg-green-500" },
                      ].map((item) => (
                        <div key={item.dim} className="flex items-center gap-2">
                          <span className="text-xs w-20">{item.dim}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", item.color)}
                              style={{ width: `${item.weight}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{item.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
           TAB: Analytics
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreDistributionChart vendors={vendors} />
              </CardContent>
            </Card>

            {/* Top & Bottom performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top performers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.topPerformers.map((v, i) => (
                      <div
                        key={v.vendorName}
                        className="flex items-center justify-between rounded-md border border-border p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600 text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium">{v.vendorName}</span>
                        </div>
                        <span className={cn("text-sm font-semibold", scoreColor(v.score))}>
                          {v.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* At-risk vendors */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    At-Risk Vendors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.atRiskVendors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No at-risk vendors
                      </p>
                    ) : (
                      metrics.atRiskVendors.map((v) => (
                        <div
                          key={v.vendorName}
                          className="flex items-center justify-between rounded-md border border-border p-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{v.vendorName}</p>
                            <p className="text-xs text-muted-foreground">{v.reason}</p>
                          </div>
                          <span className={cn("text-sm font-semibold shrink-0", scoreColor(v.score))}>
                            {v.score}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dimension Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dimension Comparison by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <DimensionComparisonChart vendors={vendors} />
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vendors by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.byCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {CATEGORY_LABELS[cat.category] || cat.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cat.count} vendor{cat.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-lg font-bold", scoreColor(cat.avgScore))}>
                          {cat.avgScore}
                        </p>
                        <p className="text-[10px] text-muted-foreground">avg score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Score trend over time (aggregate) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Score Trend (12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <AggregateScoreTrend vendors={vendors} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════
         Vendor Detail Dialog
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Scorecard</DialogTitle>
            <DialogDescription>
              Detailed performance scorecard and audit history
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              <VendorScorecardDetail vendor={selectedVendor} />

              {/* Audit history in dialog */}
              {selectedVendor.audits.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Audit History</h4>
                  <div className="space-y-2">
                    {selectedVendor.audits.map((audit) => (
                      <div
                        key={audit.id}
                        className="rounded-md border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={AUDIT_STATUS_BADGE[audit.status]}>
                              {audit.status}
                            </Badge>
                            <span className="text-sm font-medium">
                              {AUDIT_TYPE_LABELS[audit.auditType] || audit.auditType}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {audit.completedDate
                              ? fmtDate(audit.completedDate)
                              : fmtDate(audit.scheduledDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Auditor: {audit.auditor}</span>
                          {audit.score != null && (
                            <span>
                              Score:{" "}
                              <span className={cn("font-semibold", scoreColor(audit.score))}>
                                {audit.score}
                              </span>
                            </span>
                          )}
                          {audit.findings.length > 0 && (
                            <span>Findings: {audit.findings.length}</span>
                          )}
                        </div>
                        {audit.findings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {audit.findings.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2"
                              >
                                <Badge
                                  variant={SEVERITY_BADGE[f.severity]}
                                  className="text-[9px] shrink-0 mt-0.5"
                                >
                                  {f.severity}
                                </Badge>
                                <div className="min-w-0">
                                  <p>{f.description}</p>
                                  {f.correctiveAction && (
                                    <p className="text-muted-foreground mt-0.5">
                                      CA: {f.correctiveAction}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant={f.status === "closed" ? "success" : "warning"}
                                  className="text-[9px] shrink-0"
                                >
                                  {f.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {audit.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {audit.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD VENDOR DIALOG */}
      <Dialog open={showVendorForm} onOpenChange={(open) => !open && setShowVendorForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input value={vfName} onChange={(e) => setVfName(e.target.value)} placeholder="e.g. PharmaChem Industries" className="mt-1" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={vfContact} onChange={(e) => setVfContact(e.target.value)} placeholder="Contact name" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={vfCategory} onValueChange={setVfCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api-manufacturer">API Manufacturer</SelectItem>
                  <SelectItem value="excipient-supplier">Excipient Supplier</SelectItem>
                  <SelectItem value="packaging-supplier">Packaging Supplier</SelectItem>
                  <SelectItem value="contract-manufacturer">Contract Manufacturer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="service-provider">Service Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country</Label>
              <Input value={vfCountry} onChange={(e) => setVfCountry(e.target.value)} placeholder="e.g. Egypt" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorForm(false)}>Cancel</Button>
            <Button onClick={handleCreateVendor} disabled={!vfName}>Create Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE VENDOR CONFIRMATION */}
      <Dialog open={!!deleteVendorId} onOpenChange={(open) => !open && setDeleteVendorId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>Are you sure you want to delete this vendor? All scoring data and audit history will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteVendorId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteVendor}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components for Analytics tab
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Score Distribution Histogram ── */

function ScoreDistributionChart({ vendors }: { vendors: VendorScore[] }) {
  const buckets = useMemo(() => {
    const ranges = [
      { label: "0-20", min: 0, max: 20, color: "bg-red-600" },
      { label: "21-40", min: 21, max: 40, color: "bg-red-400" },
      { label: "41-55", min: 41, max: 55, color: "bg-amber-500" },
      { label: "56-70", min: 56, max: 70, color: "bg-amber-400" },
      { label: "71-85", min: 71, max: 85, color: "bg-blue-500" },
      { label: "86-100", min: 86, max: 100, color: "bg-green-500" },
    ];

    const active = vendors.filter((v) => v.qualificationStatus !== "new");

    return ranges.map((r) => ({
      ...r,
      count: active.filter((v) => v.overallScore >= r.min && v.overallScore <= r.max).length,
    }));
  }, [vendors]);

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 h-32">
        {buckets.map((bucket) => {
          const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          return (
            <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {bucket.count > 0 ? bucket.count : ""}
              </span>
              <div
                className={cn("w-full rounded-t-sm", bucket.color)}
                style={{ height: `${height}%`, minHeight: bucket.count > 0 ? 4 : 0 }}
              />
              <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-center text-muted-foreground">Overall Score Range</p>
    </div>
  );
}

/* ── Dimension Comparison ── */

function DimensionComparisonChart({ vendors }: { vendors: VendorScore[] }) {
  const catData = useMemo(() => {
    const cats = new Map<
      VendorCategory,
      { count: number; quality: number; delivery: number; compliance: number; commercial: number }
    >();

    for (const v of vendors) {
      if (v.qualificationStatus === "new") continue;
      const entry = cats.get(v.category) || { count: 0, quality: 0, delivery: 0, compliance: 0, commercial: 0 };
      entry.count++;
      entry.quality += v.quality.score;
      entry.delivery += v.delivery.score;
      entry.compliance += v.compliance.score;
      entry.commercial += v.commercial.score;
      cats.set(v.category, entry);
    }

    return Array.from(cats.entries()).map(([cat, data]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      quality: Math.round(data.quality / data.count),
      delivery: Math.round(data.delivery / data.count),
      compliance: Math.round(data.compliance / data.count),
      commercial: Math.round(data.commercial / data.count),
    }));
  }, [vendors]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
          Quality
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" />
          Delivery
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
          Compliance
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
          Commercial
        </span>
      </div>

      {/* Grouped bar chart */}
      <div className="space-y-4">
        {catData.map((cat) => (
          <div key={cat.category} className="space-y-1.5">
            <p className="text-xs font-medium">{cat.label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              <DimBar label="Q" value={cat.quality} color="bg-red-500" />
              <DimBar label="D" value={cat.delivery} color="bg-blue-500" />
              <DimBar label="C" value={cat.compliance} color="bg-amber-500" />
              <DimBar label="$" value={cat.commercial} color="bg-green-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-medium w-6 text-right">{value}</span>
    </div>
  );
}

/* ── Aggregate Score Trend ── */

function AggregateScoreTrend({ vendors }: { vendors: VendorScore[] }) {
  const monthlyData = useMemo(() => {
    const active = vendors.filter(
      (v) => v.qualificationStatus !== "new" && v.scoreHistory.length > 0
    );
    if (active.length === 0) return [];

    // Use the first vendor's history length as reference (all are 12 months)
    const monthCount = Math.min(12, ...active.map((v) => v.scoreHistory.length));
    const result: { month: string; avgScore: number }[] = [];

    for (let i = 0; i < monthCount; i++) {
      let total = 0;
      let count = 0;
      for (const v of active) {
        if (v.scoreHistory[i]) {
          total += v.scoreHistory[i].overallScore;
          count++;
        }
      }
      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      const date = active[0].scoreHistory[i]?.date
        ? new Date(active[0].scoreHistory[i].date)
        : new Date();
      result.push({
        month: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        avgScore: avg,
      });
    }

    return result;
  }, [vendors]);

  if (monthlyData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No trend data available</p>;
  }

  const maxScore = 100;
  const chartHeight = 120;
  const chartWidth = monthlyData.length * 48;

  return (
    <div className="overflow-x-auto">
      <svg
        width={chartWidth}
        height={chartHeight + 24}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {/* Grid */}
        {[25, 50, 75, 100].map((v) => {
          const y = chartHeight - (v / maxScore) * chartHeight;
          return (
            <g key={v}>
              <line
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-muted-foreground/20"
                strokeDasharray="4 4"
              />
              <text
                x={4}
                y={y - 2}
                className="fill-muted-foreground text-[8px]"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <polygon
          points={[
            ...monthlyData.map((d, i) => {
              const x = i * 48 + 24;
              const y = chartHeight - (d.avgScore / maxScore) * chartHeight;
              return `${x},${y}`;
            }),
            `${(monthlyData.length - 1) * 48 + 24},${chartHeight}`,
            `24,${chartHeight}`,
          ].join(" ")}
          fill="hsl(var(--primary) / 0.1)"
        />

        {/* Line */}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={monthlyData
            .map((d, i) => {
              const x = i * 48 + 24;
              const y = chartHeight - (d.avgScore / maxScore) * chartHeight;
              return `${x},${y}`;
            })
            .join(" ")}
        />

        {/* Dots + values */}
        {monthlyData.map((d, i) => {
          const x = i * 48 + 24;
          const y = chartHeight - (d.avgScore / maxScore) * chartHeight;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill="hsl(var(--primary))" />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-medium"
              >
                {d.avgScore}
              </text>
            </g>
          );
        })}

        {/* Month labels */}
        {monthlyData.map((d, i) => (
          <text
            key={i}
            x={i * 48 + 24}
            y={chartHeight + 16}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  );
}
