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
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import CoAReview from "@/components/shared/coa-review";
import { cn } from "@/lib/utils";
import { supplierQualityStore } from "@/lib/quality/supplier-quality-store";
import type {
  SupplierQualityAgreement,
  SQAStatus,
  MaterialSpecification,
  CertificateOfAnalysis,
  ApprovedSupplierEntry,
  MaterialQualification,
  SupplierQualityMetrics,
  MaterialType,
  CoAComplianceStatus,
} from "@/lib/quality/supplier-quality-types";
import {
  FileCheck,
  ShieldCheck,
  ClipboardCheck,
  Users,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Building2,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Package,
  FlaskConical,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Helper: format date
   ───────────────────────────────────────────── */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

/* ─────────────────────────────────────────────
   Badge helpers
   ───────────────────────────────────────────── */

const SQA_STATUS_STYLE: Record<SQAStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "under-review":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  terminated:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

function sqaStatusBadge(status: SQAStatus) {
  return (
    <Badge className={cn("capitalize", SQA_STATUS_STYLE[status])}>
      {status.replace("-", " ")}
    </Badge>
  );
}

const COA_STATUS_STYLE: Record<CoAComplianceStatus, string> = {
  compliant:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "non-compliant":
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "pending-review":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

function coaStatusBadge(status: CoAComplianceStatus) {
  const labels: Record<CoAComplianceStatus, string> = {
    compliant: "Compliant",
    "non-compliant": "Non-Compliant",
    "pending-review": "Pending Review",
  };
  return <Badge className={cn(COA_STATUS_STYLE[status])}>{labels[status]}</Badge>;
}

const SUPPLIER_STATUS_STYLE: Record<ApprovedSupplierEntry["status"], string> = {
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  conditional:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disqualified:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

function supplierStatusBadge(status: ApprovedSupplierEntry["status"]) {
  return (
    <Badge className={cn("capitalize", SUPPLIER_STATUS_STYLE[status])}>
      {status}
    </Badge>
  );
}

function materialTypeBadge(type: MaterialType) {
  const styles: Record<MaterialType, string> = {
    api: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    excipient:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    packaging:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    raw: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return (
    <Badge className={cn("uppercase text-xs", styles[type])}>{type}</Badge>
  );
}

function ratingStars(rating: number) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          )}
        />
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Bar helper for analytics
   ───────────────────────────────────────────── */

function PercentBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-2 rounded-full", color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   PAGE COMPONENT
   ═════════════════════════════════════════════ */

export default function SupplierQualityPage() {
  /* ── State ── */
  const [agreements, setAgreements] = useState<SupplierQualityAgreement[]>([]);
  const [specifications, setSpecifications] = useState<MaterialSpecification[]>(
    []
  );
  const [coas, setCoAs] = useState<CertificateOfAnalysis[]>([]);
  const [approvedSuppliers, setApprovedSuppliers] = useState<
    ApprovedSupplierEntry[]
  >([]);
  const [qualifications, setQualifications] = useState<MaterialQualification[]>(
    []
  );
  const [metrics, setMetrics] = useState<SupplierQualityMetrics | null>(null);

  const [activeTab, setActiveTab] = useState("agreements");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  /* Dialogs */
  const [agreementDetail, setAgreementDetail] =
    useState<SupplierQualityAgreement | null>(null);
  const [coaReviewItem, setCoaReviewItem] =
    useState<CertificateOfAnalysis | null>(null);
  const [supplierDetail, setSupplierDetail] =
    useState<ApprovedSupplierEntry | null>(null);
  const [specDetail, setSpecDetail] = useState<MaterialSpecification | null>(
    null
  );

  /* ── Load data ── */
  const reload = useCallback(() => {
    setAgreements(supplierQualityStore.getAllAgreements());
    setSpecifications(supplierQualityStore.getAllSpecifications());
    setCoAs(supplierQualityStore.getAllCoAs());
    setApprovedSuppliers(supplierQualityStore.getAllApprovedSuppliers());
    setQualifications(supplierQualityStore.getAllQualifications());
    setMetrics(supplierQualityStore.getMetrics());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* ── Filtered data ── */
  const filteredAgreements = useMemo(() => {
    let result = agreements;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((a) => a.materialType === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.supplierName.toLowerCase().includes(q) ||
          a.number.toLowerCase().includes(q) ||
          a.materialsScope.some((m) => m.toLowerCase().includes(q))
      );
    }
    return result;
  }, [agreements, statusFilter, typeFilter, searchQuery]);

  const filteredSpecs = useMemo(() => {
    let result = specifications;
    if (typeFilter !== "all") {
      result = result.filter((s) => s.materialType === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.materialName.toLowerCase().includes(q) ||
          s.materialCode.toLowerCase().includes(q)
      );
    }
    return result;
  }, [specifications, typeFilter, searchQuery]);

  const filteredCoAs = useMemo(() => {
    let result = coas;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.complianceStatus === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.materialName.toLowerCase().includes(q) ||
          c.coaNumber.toLowerCase().includes(q) ||
          c.supplierName.toLowerCase().includes(q) ||
          c.batchNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [coas, statusFilter, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    let result = approvedSuppliers;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((s) =>
        s.materialTypes.includes(typeFilter as MaterialType)
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.supplierName.toLowerCase().includes(q) ||
          s.supplierCode.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q)
      );
    }
    return result;
  }, [approvedSuppliers, statusFilter, typeFilter, searchQuery]);

  /* ── Handlers ── */
  const handleCoAApprove = useCallback(
    (reviewerName: string, notes: string) => {
      if (!coaReviewItem) return;
      supplierQualityStore.reviewCoA(
        coaReviewItem.id,
        reviewerName,
        "compliant",
        notes || "Batch approved - all results within specification."
      );
      setCoaReviewItem(null);
      reload();
    },
    [coaReviewItem, reload]
  );

  const handleCoAReject = useCallback(
    (reviewerName: string, notes: string) => {
      if (!coaReviewItem) return;
      supplierQualityStore.reviewCoA(
        coaReviewItem.id,
        reviewerName,
        "non-compliant",
        notes || "Batch rejected - out-of-specification results."
      );
      setCoaReviewItem(null);
      reload();
    },
    [coaReviewItem, reload]
  );

  const handleRenewAgreement = useCallback(
    (id: string) => {
      const agreement = supplierQualityStore.getAgreementById(id);
      if (!agreement) return;
      const newExpiry = new Date(agreement.expiryDate);
      newExpiry.setFullYear(newExpiry.getFullYear() + 2);
      const newReview = new Date();
      newReview.setFullYear(newReview.getFullYear() + 1);
      supplierQualityStore.updateAgreement(id, {
        expiryDate: newExpiry.toISOString(),
        reviewDate: newReview.toISOString(),
        status: "active",
        version: String(
          (parseFloat(agreement.version) + 1).toFixed(1)
        ),
        reviewHistory: [
          ...agreement.reviewHistory,
          {
            date: new Date().toISOString(),
            reviewer: "Current User",
            notes: "Agreement renewed for 2 years.",
          },
        ],
      });
      setAgreementDetail(null);
      reload();
    },
    [reload]
  );

  /* ── Spec linked to CoA ── */
  const getSpecForCoA = useCallback(
    (coa: CertificateOfAnalysis): MaterialSpecification | null => {
      return (
        specifications.find((s) => s.id === coa.specificationId) ?? null
      );
    },
    [specifications]
  );

  /* ── Qualifications for a supplier ── */
  const getQualificationsForSupplier = useCallback(
    (supplierCode: string) => {
      return qualifications.filter((q) => q.supplierCode === supplierCode);
    },
    [qualifications]
  );

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Supplier Quality & Materials"
        description="Manage quality agreements, material specifications, certificates of analysis, and approved supplier list"
        icon={<FileCheck className="h-6 w-6 text-blue-600" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Agreement
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={FileCheck}
            title="Active Agreements"
            value={metrics.activeAgreements}
            subtitle={`${metrics.totalAgreements} total`}
            iconColor="text-blue-600"
          />
          <StatsCard
            icon={Users}
            title="Approved Suppliers"
            value={metrics.totalApprovedSuppliers}
            subtitle={`Avg rating ${metrics.averageSupplierRating}/5`}
            iconColor="text-emerald-600"
          />
          <StatsCard
            icon={Clock}
            title="Pending CoAs"
            value={metrics.pendingCoAs}
            subtitle={`${metrics.totalCoAs} total CoAs`}
            iconColor="text-amber-600"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Expiring Agreements"
            value={metrics.expiringSoonCount}
            subtitle="Within 90 days"
            iconColor="text-red-600"
          />
          <StatsCard
            icon={FlaskConical}
            title="Material Specs"
            value={metrics.totalMaterialSpecs}
            subtitle={`${metrics.qualifiedMaterials} qualified`}
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search suppliers, materials, CoAs..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                {activeTab === "agreements" && (
                  <>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="under-review">Under Review</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </>
                )}
                {activeTab === "materials" && (
                  <>
                    <option value="compliant">Compliant</option>
                    <option value="non-compliant">Non-Compliant</option>
                    <option value="pending-review">Pending Review</option>
                  </>
                )}
                {activeTab === "suppliers" && (
                  <>
                    <option value="approved">Approved</option>
                    <option value="conditional">Conditional</option>
                    <option value="suspended">Suspended</option>
                    <option value="disqualified">Disqualified</option>
                  </>
                )}
              </select>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="api">API</option>
                <option value="excipient">Excipient</option>
                <option value="packaging">Packaging</option>
                <option value="raw">Raw Material</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setStatusFilter("all");
          setTypeFilter("all");
          setSearchQuery("");
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agreements" className="gap-1.5">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Agreements</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Materials</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Approved Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* ──────────────────────────────────────
           TAB 1: AGREEMENTS
           ────────────────────────────────────── */}
        <TabsContent value="agreements" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                Supplier Quality Agreements ({filteredAgreements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Materials Scope</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgreements.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No agreements found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAgreements.map((a) => {
                        const daysLeft = daysUntil(a.expiryDate);
                        const expiringSoon =
                          a.status === "active" && daysLeft <= 90 && daysLeft > 0;
                        return (
                          <TableRow
                            key={a.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              expiringSoon && "bg-amber-50/50 dark:bg-amber-950/10"
                            )}
                            onClick={() => setAgreementDetail(a)}
                          >
                            <TableCell className="font-medium text-sm">
                              {a.number}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="font-medium">{a.supplierName}</div>
                              <div className="text-xs text-muted-foreground">
                                {a.supplierCode}
                              </div>
                            </TableCell>
                            <TableCell>{materialTypeBadge(a.materialType)}</TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              <span className="line-clamp-1">
                                {a.materialsScope.join(", ")}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {fmtDate(a.effectiveDate)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span
                                className={cn(
                                  expiringSoon && "text-amber-600 font-medium"
                                )}
                              >
                                {fmtDate(a.expiryDate)}
                              </span>
                              {expiringSoon && (
                                <div className="text-xs text-amber-600">
                                  {daysLeft}d remaining
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{sqaStatusBadge(a.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgreementDetail(a);
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────
           TAB 2: MATERIALS
           ────────────────────────────────────── */}
        <TabsContent value="materials" className="space-y-4 mt-4">
          {/* Material Specifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Material Specifications ({filteredSpecs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Pharmacopoeia</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpecs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No specifications found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSpecs.map((s) => (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSpecDetail(s)}
                        >
                          <TableCell className="font-medium text-sm">
                            {s.materialName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.materialCode}
                          </TableCell>
                          <TableCell>{materialTypeBadge(s.materialType)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{s.pharmacopoeiaRef}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.tests.length} tests
                          </TableCell>
                          <TableCell className="text-sm">v{s.version}</TableCell>
                          <TableCell className="text-sm">{s.approvedBy}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSpecDetail(s);
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

          {/* Certificates of Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Certificates of Analysis ({filteredCoAs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CoA Number</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoAs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No certificates of analysis found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCoAs.map((c) => (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            c.hasDeviations &&
                              "bg-red-50/30 dark:bg-red-950/10",
                            c.complianceStatus === "pending-review" &&
                              "bg-amber-50/30 dark:bg-amber-950/10"
                          )}
                          onClick={() => setCoaReviewItem(c)}
                        >
                          <TableCell className="font-medium text-sm">
                            {c.coaNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{c.materialName}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.materialCode}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {c.batchNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.supplierName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {fmtDate(c.receivedDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="flex items-center gap-1">
                              {c.testsPerformed.filter((t) => t.pass).length}/
                              {c.testsPerformed.length}
                              {c.hasDeviations && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                            </span>
                          </TableCell>
                          <TableCell>{coaStatusBadge(c.complianceStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoaReviewItem(c);
                              }}
                            >
                              {c.complianceStatus === "pending-review" ? (
                                <ClipboardCheck className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
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

        {/* ──────────────────────────────────────
           TAB 3: APPROVED SUPPLIERS
           ────────────────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Approved Supplier List ({filteredSuppliers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Materials Approved</TableHead>
                      <TableHead>Types</TableHead>
                      <TableHead>Qualification Date</TableHead>
                      <TableHead>Next Audit</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground py-8"
                        >
                          No suppliers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers.map((s) => {
                        const auditDays = daysUntil(s.nextAuditDue);
                        const auditOverdue = auditDays < 0;
                        const auditSoon = auditDays >= 0 && auditDays <= 60;
                        return (
                          <TableRow
                            key={s.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              auditOverdue && "bg-red-50/30 dark:bg-red-950/10",
                              s.status === "suspended" &&
                                "bg-red-50/30 dark:bg-red-950/10"
                            )}
                            onClick={() => setSupplierDetail(s)}
                          >
                            <TableCell className="text-sm">
                              <div className="font-medium">{s.supplierName}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.supplierCode}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{s.country}</TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              <span className="line-clamp-2">
                                {s.materialsApprovedFor.join(", ")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {s.materialTypes.map((t) => (
                                  <span key={t}>{materialTypeBadge(t)}</span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {fmtDate(s.qualificationDate)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span
                                className={cn(
                                  auditOverdue && "text-red-600 font-medium",
                                  auditSoon && "text-amber-600 font-medium"
                                )}
                              >
                                {fmtDate(s.nextAuditDue)}
                              </span>
                              {auditOverdue && (
                                <div className="text-xs text-red-600 font-medium">
                                  Overdue
                                </div>
                              )}
                              {auditSoon && !auditOverdue && (
                                <div className="text-xs text-amber-600">
                                  In {auditDays}d
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{ratingStars(s.rating)}</TableCell>
                            <TableCell>
                              {supplierStatusBadge(s.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSupplierDetail(s);
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────
           TAB 4: ANALYTICS
           ────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agreement Compliance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    Agreement Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metrics.byAgreementStatus.map((item) => {
                    const pct =
                      metrics.totalAgreements > 0
                        ? Math.round(
                            (item.count / metrics.totalAgreements) * 100
                          )
                        : 0;
                    const colors: Record<string, string> = {
                      active: "bg-emerald-500",
                      draft: "bg-gray-400",
                      "under-review": "bg-amber-500",
                      expired: "bg-red-500",
                      terminated: "bg-rose-600",
                    };
                    return (
                      <PercentBar
                        key={item.status}
                        value={pct}
                        color={colors[item.status] || "bg-blue-500"}
                        label={`${item.status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())} (${item.count})`}
                      />
                    );
                  })}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total Agreements
                    </span>
                    <span className="font-medium">
                      {metrics.totalAgreements}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Expiring within 90 days
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        metrics.expiringSoonCount > 0 && "text-amber-600"
                      )}
                    >
                      {metrics.expiringSoonCount}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* CoA Acceptance Rate */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                    CoA Acceptance Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative h-36 w-36">
                      <svg
                        className="h-36 w-36 -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <circle
                          className="text-gray-100 dark:text-gray-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="transparent"
                          r="16"
                          cx="18"
                          cy="18"
                        />
                        <circle
                          className="text-emerald-500"
                          strokeWidth="3"
                          strokeDasharray={`${metrics.coaAcceptanceRate} 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="16"
                          cx="18"
                          cy="18"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">
                          {metrics.coaAcceptanceRate}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Acceptance
                        </span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-medium text-emerald-600">
                        {coas.filter((c) => c.complianceStatus === "compliant").length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Compliant
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">
                        {coas.filter((c) => c.complianceStatus === "non-compliant").length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Non-Compliant
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-amber-600">
                        {metrics.pendingCoAs}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pending
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier Performance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Supplier Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">CoAs</TableHead>
                        <TableHead className="text-center">
                          Accept Rate
                        </TableHead>
                        <TableHead className="text-center">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.supplierPerformance
                        .sort((a, b) => b.acceptRate - a.acceptRate)
                        .map((sp) => (
                          <TableRow key={sp.supplier}>
                            <TableCell className="text-sm font-medium">
                              {sp.supplier.length > 25
                                ? sp.supplier.substring(0, 25) + "..."
                                : sp.supplier}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {sp.coaCount}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={cn(
                                  sp.acceptRate >= 90
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : sp.acceptRate >= 70
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                )}
                              >
                                {sp.acceptRate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {ratingStars(sp.rating)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Material Qualification Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    Material Qualification Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* By material type */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Specifications by Type
                  </p>
                  {metrics.byMaterialType.map((item) => {
                    const pct =
                      metrics.totalMaterialSpecs > 0
                        ? Math.round(
                            (item.count / metrics.totalMaterialSpecs) * 100
                          )
                        : 0;
                    const colors: Record<string, string> = {
                      api: "bg-blue-500",
                      excipient: "bg-purple-500",
                      packaging: "bg-teal-500",
                      raw: "bg-orange-500",
                    };
                    return (
                      <PercentBar
                        key={item.type}
                        value={pct}
                        color={colors[item.type] || "bg-gray-500"}
                        label={`${item.type.toUpperCase()} (${item.count})`}
                      />
                    );
                  })}
                  <Separator className="my-2" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Qualification Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { label: "Qualified", status: "qualified" },
                        { label: "In Progress", status: "in-progress" },
                        { label: "Expired", status: "expired" },
                        { label: "Failed", status: "failed" },
                      ] as const
                    ).map(({ label, status }) => {
                      const count = qualifications.filter(
                        (q) => q.qualificationStatus === status
                      ).length;
                      return (
                        <div
                          key={status}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <span className="text-sm text-muted-foreground">
                            {label}
                          </span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════
         DIALOGS
         ═══════════════════════════════════════ */}

      {/* Agreement Detail Dialog */}
      <Dialog
        open={!!agreementDetail}
        onOpenChange={() => setAgreementDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {agreementDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  {agreementDetail.number}
                </DialogTitle>
                <DialogDescription>
                  Quality Agreement with {agreementDetail.supplierName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Supplier</span>
                    <p className="font-medium">{agreementDetail.supplierName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Material Type</span>
                    <p>{materialTypeBadge(agreementDetail.materialType)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p>{sqaStatusBadge(agreementDetail.status)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version</span>
                    <p className="font-medium">v{agreementDetail.version}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effective Date</span>
                    <p className="font-medium">
                      {fmtDate(agreementDetail.effectiveDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expiry Date</span>
                    <p
                      className={cn(
                        "font-medium",
                        daysUntil(agreementDetail.expiryDate) <= 90 &&
                          daysUntil(agreementDetail.expiryDate) > 0 &&
                          "text-amber-600",
                        daysUntil(agreementDetail.expiryDate) <= 0 &&
                          "text-red-600"
                      )}
                    >
                      {fmtDate(agreementDetail.expiryDate)}
                      {daysUntil(agreementDetail.expiryDate) <= 0 && " (Expired)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Review Date</span>
                    <p className="font-medium">
                      {fmtDate(agreementDetail.reviewDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact</span>
                    <p className="font-medium">
                      {agreementDetail.contactPerson}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agreementDetail.contactEmail}
                    </p>
                  </div>
                </div>

                {/* Materials Scope */}
                <div>
                  <p className="text-sm font-medium mb-1">Materials Scope</p>
                  <div className="flex flex-wrap gap-1">
                    {agreementDetail.materialsScope.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Terms */}
                <div>
                  <p className="text-sm font-medium mb-2">Agreement Terms</p>
                  <ul className="space-y-1.5">
                    {agreementDetail.terms.map((term, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Review History */}
                {agreementDetail.reviewHistory.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Review History</p>
                      <div className="space-y-2">
                        {agreementDetail.reviewHistory.map((r, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 rounded-md border p-3 text-sm"
                          >
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{fmtDate(r.date)}</p>
                              <p className="text-muted-foreground">
                                {r.reviewer} - {r.notes}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex gap-2">
                  {(agreementDetail.status === "expired" ||
                    agreementDetail.status === "active") && (
                    <Button
                      size="sm"
                      onClick={() => handleRenewAgreement(agreementDetail.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renew Agreement
                    </Button>
                  )}
                  {agreementDetail.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        supplierQualityStore.updateAgreement(
                          agreementDetail.id,
                          { status: "under-review" }
                        );
                        setAgreementDetail(null);
                        reload();
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Submit for Review
                    </Button>
                  )}
                  {agreementDetail.status === "under-review" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        supplierQualityStore.updateAgreement(
                          agreementDetail.id,
                          { status: "active" }
                        );
                        setAgreementDetail(null);
                        reload();
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Activate Agreement
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAgreementDetail(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CoA Review Dialog */}
      <Dialog
        open={!!coaReviewItem}
        onOpenChange={() => setCoaReviewItem(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {coaReviewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  {coaReviewItem.coaNumber} - CoA Review
                </DialogTitle>
                <DialogDescription>
                  {coaReviewItem.materialName} | Batch: {coaReviewItem.batchNumber} |
                  Supplier: {coaReviewItem.supplierName}
                </DialogDescription>
              </DialogHeader>
              <CoAReview
                coa={coaReviewItem}
                specification={getSpecForCoA(coaReviewItem)}
                onApprove={handleCoAApprove}
                onReject={handleCoAReject}
                readOnly={coaReviewItem.complianceStatus !== "pending-review"}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog
        open={!!supplierDetail}
        onOpenChange={() => setSupplierDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {supplierDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  {supplierDetail.supplierName}
                </DialogTitle>
                <DialogDescription>
                  {supplierDetail.supplierCode} | {supplierDetail.country}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p>{supplierStatusBadge(supplierDetail.status)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rating</span>
                    <p>{ratingStars(supplierDetail.rating)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Qualification Date
                    </span>
                    <p className="font-medium">
                      {fmtDate(supplierDetail.qualificationDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Audit</span>
                    <p className="font-medium">
                      {fmtDate(supplierDetail.lastAuditDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Audit Due</span>
                    <p
                      className={cn(
                        "font-medium",
                        daysUntil(supplierDetail.nextAuditDue) < 0 &&
                          "text-red-600",
                        daysUntil(supplierDetail.nextAuditDue) >= 0 &&
                          daysUntil(supplierDetail.nextAuditDue) <= 60 &&
                          "text-amber-600"
                      )}
                    >
                      {fmtDate(supplierDetail.nextAuditDue)}
                      {daysUntil(supplierDetail.nextAuditDue) < 0 && " (Overdue)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GMP Certificate</span>
                    <p className="font-medium">
                      {supplierDetail.gmpCertificate || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Material Types */}
                <div>
                  <p className="text-sm font-medium mb-1">Material Types</p>
                  <div className="flex gap-1">
                    {supplierDetail.materialTypes.map((t) => (
                      <span key={t}>{materialTypeBadge(t)}</span>
                    ))}
                  </div>
                </div>

                {/* Materials Approved */}
                <div>
                  <p className="text-sm font-medium mb-1">
                    Materials Approved For
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {supplierDetail.materialsApprovedFor.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Qualifications */}
                {(() => {
                  const quals = getQualificationsForSupplier(
                    supplierDetail.supplierCode
                  );
                  if (quals.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Material Qualifications
                      </p>
                      <div className="space-y-2">
                        {quals.map((q) => (
                          <div
                            key={q.id}
                            className="rounded-md border p-3 text-sm space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {q.materialName}
                              </span>
                              <Badge
                                className={cn(
                                  q.qualificationStatus === "qualified"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : q.qualificationStatus === "in-progress"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                      : q.qualificationStatus === "expired"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                )}
                              >
                                {q.qualificationStatus}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {q.notes}
                            </p>
                            {q.qualifiedBy && q.qualifiedAt && (
                              <p className="text-xs text-muted-foreground">
                                Qualified by {q.qualifiedBy} on{" "}
                                {fmtDate(q.qualifiedAt)}
                              </p>
                            )}
                            {q.stabilityData.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Stability Data:
                                </p>
                                {q.stabilityData.map((sd, idx) => (
                                  <p key={idx} className="text-xs ml-2">
                                    {sd.condition} ({sd.duration}): {sd.result}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Notes */}
                {supplierDetail.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">
                        {supplierDetail.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Recent CoAs */}
                {(() => {
                  const supplierCoAs = coas
                    .filter(
                      (c) => c.supplierName === supplierDetail.supplierName
                    )
                    .slice(0, 5);
                  if (supplierCoAs.length === 0) return null;
                  return (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Recent Certificates of Analysis
                        </p>
                        <div className="space-y-1">
                          {supplierCoAs.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {c.coaNumber}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  {c.materialName} - {c.batchNumber}
                                </span>
                              </div>
                              {coaStatusBadge(c.complianceStatus)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierDetail(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Specification Detail Dialog */}
      <Dialog open={!!specDetail} onOpenChange={() => setSpecDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {specDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  {specDetail.materialName}
                </DialogTitle>
                <DialogDescription>
                  {specDetail.materialCode} | {specDetail.pharmacopoeiaRef}{" "}
                  Monograph | v{specDetail.version}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Material Type</span>
                    <p>{materialTypeBadge(specDetail.materialType)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pharmacopoeia</span>
                    <p>
                      <Badge variant="outline">
                        {specDetail.pharmacopoeiaRef}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effective Date</span>
                    <p className="font-medium">
                      {fmtDate(specDetail.effectiveDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved By</span>
                    <p className="font-medium">{specDetail.approvedBy}</p>
                  </div>
                </div>

                <Separator />

                {/* Tests Table */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Test Parameters ({specDetail.tests.length})
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Acceptance Criteria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specDetail.tests.map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm font-medium">
                            {t.testName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.method}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.acceptanceCriteria}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Related CoAs */}
                {(() => {
                  const relatedCoAs = coas
                    .filter((c) => c.specificationId === specDetail.id)
                    .slice(0, 5);
                  if (relatedCoAs.length === 0) return null;
                  return (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Related Certificates of Analysis
                        </p>
                        <div className="space-y-1">
                          {relatedCoAs.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSpecDetail(null);
                                setCoaReviewItem(c);
                              }}
                            >
                              <div>
                                <span className="font-medium">
                                  {c.coaNumber}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  Batch {c.batchNumber} | {c.supplierName}
                                </span>
                              </div>
                              {coaStatusBadge(c.complianceStatus)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSpecDetail(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
