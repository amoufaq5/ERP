"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import DocumentWorkflow from "@/components/shared/document-workflow";
import { cn } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  GraduationCap,
  Plus,
  Search,
  Eye,
  FileCheck,
  FileClock,
  BarChart3,
  CalendarClock,
  History,
  BookOpen,
  Shield,
  RefreshCw,
} from "lucide-react";
import { documentControlStore } from "@/lib/quality/document-control-store";
import type {
  ControlledDocument,
  DocumentStatus,
  DocumentCategory,
  DocumentMetrics,
  DocumentVersion,
  DocumentReview,
  DocumentTraining,
} from "@/lib/quality/document-control-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function daysFromNow(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.round(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  "in-review": "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  effective: "bg-green-100 text-green-800",
  superseded: "bg-orange-100 text-orange-800",
  obsolete: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  "in-review": "In Review",
  approved: "Approved",
  effective: "Effective",
  superseded: "Superseded",
  obsolete: "Obsolete",
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  SOP: "bg-blue-100 text-blue-800",
  "Work Instruction": "bg-purple-100 text-purple-800",
  Form: "bg-teal-100 text-teal-800",
  Policy: "bg-indigo-100 text-indigo-800",
  Specification: "bg-orange-100 text-orange-800",
  "Validation Protocol": "bg-pink-100 text-pink-800",
};

const CATEGORY_OPTIONS: DocumentCategory[] = [
  "SOP",
  "Work Instruction",
  "Form",
  "Policy",
  "Specification",
  "Validation Protocol",
];

const DEPARTMENT_OPTIONS = [
  "Production",
  "Quality Control",
  "Quality Assurance",
  "R&D",
  "Engineering",
  "Warehouse",
  "Regulatory Affairs",
  "Supply Chain",
];

const CONFIDENTIALITY_OPTIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentControlPage() {
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ControlledDocument | null>(null);
  const [activeTab, setActiveTab] = useState("documents");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // New document form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DocumentCategory>("SOP");
  const [newDepartment, setNewDepartment] = useState("Production");
  const [newDescription, setNewDescription] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newConfidentiality, setNewConfidentiality] = useState<"public" | "internal" | "confidential" | "restricted">("internal");
  const [newRetention, setNewRetention] = useState("10");
  const [newKeywords, setNewKeywords] = useState("");

  // Review filter
  const [reviewFilter, setReviewFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    const allDocs = documentControlStore.getAll();
    setDocuments(allDocs);
    setMetrics(documentControlStore.getMetrics());
  }

  // ─── Filtered Documents ─────────────────────────────────────────

  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== "all") {
      result = result.filter((d) => d.category === filterCategory);
    }

    if (filterDepartment !== "all") {
      result = result.filter((d) => d.department === filterDepartment);
    }

    if (filterStatus !== "all") {
      result = result.filter((d) => d.status === filterStatus);
    }

    return result;
  }, [documents, searchQuery, filterCategory, filterDepartment, filterStatus]);

  // ─── All Reviews (for Reviews tab) ──────────────────────────────

  const allReviews = useMemo(() => {
    const reviews: (DocumentReview & { docTitle: string; docNumber: string })[] = [];
    documents.forEach((doc) => {
      doc.reviews.forEach((r) => {
        reviews.push({
          ...r,
          docTitle: doc.title,
          docNumber: doc.documentNumber,
        });
      });
    });
    return reviews;
  }, [documents]);

  const filteredReviews = useMemo(() => {
    if (reviewFilter === "all") return allReviews;
    if (reviewFilter === "overdue") {
      const now = new Date();
      return allReviews.filter(
        (r) =>
          (r.status === "pending" || r.status === "in-progress" || r.status === "overdue") &&
          new Date(r.dueDate) < now
      );
    }
    return allReviews.filter((r) => r.status === reviewFilter);
  }, [allReviews, reviewFilter]);

  // ─── Due for review (documents whose nextReviewDate is approaching) ──

  const docsNeedingReview = useMemo(() => {
    const now = new Date();
    return documents
      .filter(
        (d) =>
          d.status === "effective" && d.nextReviewDate
      )
      .map((d) => ({
        ...d,
        daysUntilReview: daysFromNow(d.nextReviewDate),
      }))
      .sort((a, b) => a.daysUntilReview - b.daysUntilReview);
  }, [documents]);

  // ─── Create Document ────────────────────────────────────────────

  function handleCreateDocument() {
    if (!newTitle.trim() || !newAuthor.trim()) return;

    const now = new Date().toISOString();
    documentControlStore.create({
      title: newTitle,
      category: newCategory,
      department: newDepartment,
      currentVersion: "0.1",
      effectiveDate: "",
      reviewDate: "",
      nextReviewDate: "",
      status: "draft",
      description: newDescription,
      author: newAuthor,
      reviewer: "",
      approver: "",
      versions: [
        {
          versionNumber: "0.1",
          changeSummary: "Initial draft",
          author: newAuthor,
          reviewer: "",
          approver: "",
          createdAt: now,
        },
      ],
      reviews: [],
      training: null,
      relatedDocuments: [],
      keywords: newKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      confidentiality: newConfidentiality,
      retentionYears: parseInt(newRetention, 10) || 10,
    });

    // Reset form
    setNewTitle("");
    setNewDescription("");
    setNewAuthor("");
    setNewKeywords("");
    setNewCategory("SOP");
    setNewDepartment("Production");
    setNewConfidentiality("internal");
    setNewRetention("10");
    loadData();
    setActiveTab("documents");
  }

  // ─── Advance Status ─────────────────────────────────────────────

  function handleAdvanceStatus(doc: ControlledDocument) {
    const statusFlow: DocumentStatus[] = [
      "draft",
      "in-review",
      "approved",
      "effective",
    ];
    const currentIdx = statusFlow.indexOf(doc.status);
    if (currentIdx < 0 || currentIdx >= statusFlow.length - 1) return;

    const nextStatus = statusFlow[currentIdx + 1];
    const updates: Partial<ControlledDocument> = { status: nextStatus };

    if (nextStatus === "effective") {
      const now = new Date().toISOString();
      const reviewDate = new Date();
      reviewDate.setFullYear(reviewDate.getFullYear() + 1);
      updates.effectiveDate = now;
      updates.reviewDate = now;
      updates.nextReviewDate = reviewDate.toISOString();
    }

    documentControlStore.update(doc.id, updates);
    loadData();
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(documentControlStore.getById(doc.id) ?? null);
    }
  }

  function handleMarkSuperseded(doc: ControlledDocument) {
    documentControlStore.update(doc.id, { status: "superseded" });
    loadData();
    setSelectedDoc(null);
  }

  function handleMarkObsolete(doc: ControlledDocument) {
    documentControlStore.update(doc.id, { status: "obsolete" });
    loadData();
    setSelectedDoc(null);
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Control"
        description="GMP document lifecycle management - SOPs, Work Instructions, Forms, Policies, Specifications, and Validation Protocols"
        icon={<FileText className="h-6 w-6 text-blue-600" />}
      />

      {/* ─── Stats Cards ─────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={FileText}
            title="Total Documents"
            value={metrics.total}
            subtitle={`${metrics.avgVersionsPerDoc} avg versions/doc`}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard
            icon={CheckCircle}
            title="Effective"
            value={metrics.effective}
            subtitle="Currently in use"
            iconColor="bg-green-100 text-green-600"
          />
          <StatsCard
            icon={CalendarClock}
            title="Due for Review"
            value={metrics.dueForReview}
            subtitle="Within 30 days"
            iconColor="bg-amber-100 text-amber-600"
          />
          <StatsCard
            icon={AlertTriangle}
            title="Overdue Reviews"
            value={metrics.overdueReviews}
            subtitle="Past review date"
            iconColor="bg-red-100 text-red-600"
          />
          <StatsCard
            icon={GraduationCap}
            title="Training Pending"
            value={metrics.trainingPending}
            subtitle="Documents with pending training"
            iconColor="bg-purple-100 text-purple-600"
          />
        </div>
      )}

      {/* ─── Main Tabs ───────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="new-document" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            New Document
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-1">
            <FileClock className="h-4 w-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: Documents
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controlled Documents</CardTitle>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterDepartment}
                  onValueChange={setFilterDepartment}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {(
                      Object.keys(STATUS_LABELS) as DocumentStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Doc #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[130px]">Category</TableHead>
                    <TableHead className="w-[120px]">Department</TableHead>
                    <TableHead className="w-[70px]">Version</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[110px]">Effective Date</TableHead>
                    <TableHead className="w-[110px]">Next Review</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-8"
                      >
                        No documents match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const reviewDays = doc.nextReviewDate
                        ? daysFromNow(doc.nextReviewDate)
                        : null;
                      const isOverdue = reviewDays !== null && reviewDays < 0;
                      const isDueSoon =
                        reviewDays !== null &&
                        reviewDays >= 0 &&
                        reviewDays <= 30;

                      return (
                        <TableRow
                          key={doc.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {doc.documentNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm leading-tight">
                                {doc.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {doc.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-medium",
                                CATEGORY_COLORS[doc.category]
                              )}
                            >
                              {doc.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {doc.department}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            v{doc.currentVersion}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                STATUS_COLORS[doc.status]
                              )}
                            >
                              {STATUS_LABELS[doc.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(doc.effectiveDate)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-sm",
                                isOverdue && "text-red-600 font-medium",
                                isDueSoon && "text-amber-600 font-medium"
                              )}
                            >
                              {doc.nextReviewDate
                                ? formatDate(doc.nextReviewDate)
                                : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
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
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {filteredDocuments.length} of {documents.length}{" "}
                documents
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: New Document
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="new-document">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Controlled Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doc-title">Document Title *</Label>
                    <Input
                      id="doc-title"
                      placeholder="e.g., Tablet Compression Process Parameters"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-category">Category *</Label>
                    <Select
                      value={newCategory}
                      onValueChange={(v) =>
                        setNewCategory(v as DocumentCategory)
                      }
                    >
                      <SelectTrigger id="doc-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doc-dept">Department *</Label>
                    <Select
                      value={newDepartment}
                      onValueChange={setNewDepartment}
                    >
                      <SelectTrigger id="doc-dept">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doc-author">Author *</Label>
                    <Input
                      id="doc-author"
                      placeholder="e.g., Dr. Ahmed Hassan"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doc-desc">Description</Label>
                    <Textarea
                      id="doc-desc"
                      placeholder="Provide a detailed description of the document scope and purpose..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-conf">Confidentiality</Label>
                    <Select
                      value={newConfidentiality}
                      onValueChange={(v) =>
                        setNewConfidentiality(
                          v as "public" | "internal" | "confidential" | "restricted"
                        )
                      }
                    >
                      <SelectTrigger id="doc-conf">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONFIDENTIALITY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doc-retention">
                      Retention Period (years)
                    </Label>
                    <Input
                      id="doc-retention"
                      type="number"
                      min="1"
                      max="50"
                      value={newRetention}
                      onChange={(e) => setNewRetention(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-keywords">
                      Keywords (comma-separated)
                    </Label>
                    <Input
                      id="doc-keywords"
                      placeholder="e.g., tablet, compression, IPC"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Document will be created in <strong>Draft</strong> status
                  with version <strong>0.1</strong>. A document number will be
                  auto-generated based on the selected category.
                </p>
                <Button
                  onClick={handleCreateDocument}
                  disabled={!newTitle.trim() || !newAuthor.trim()}
                  className="min-w-[160px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: Reviews
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="reviews">
          <div className="space-y-6">
            {/* Review Calendar / Due Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  Document Review Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Doc #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead className="w-[90px]">Version</TableHead>
                      <TableHead className="w-[120px]">Next Review</TableHead>
                      <TableHead className="w-[110px]">Status</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsNeedingReview.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No documents scheduled for review
                        </TableCell>
                      </TableRow>
                    ) : (
                      docsNeedingReview.map((doc) => {
                        const isOverdue = doc.daysUntilReview < 0;
                        const isDueSoon =
                          doc.daysUntilReview >= 0 &&
                          doc.daysUntilReview <= 30;
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-mono text-sm font-medium">
                              {doc.documentNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              {doc.title}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  CATEGORY_COLORS[doc.category]
                                )}
                              >
                                {doc.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              v{doc.currentVersion}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  isOverdue && "text-red-600",
                                  isDueSoon && "text-amber-600",
                                  !isOverdue && !isDueSoon && "text-green-600"
                                )}
                              >
                                {formatDate(doc.nextReviewDate)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isOverdue ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-red-100 text-red-800 text-[10px]"
                                >
                                  Overdue ({Math.abs(doc.daysUntilReview)}d)
                                </Badge>
                              ) : isDueSoon ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-100 text-amber-800 text-[10px]"
                                >
                                  Due in {doc.daysUntilReview}d
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 text-[10px]"
                                >
                                  {doc.daysUntilReview}d remaining
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDoc(doc)}
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

            {/* Active Review Assignments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Review Assignments
                  </CardTitle>
                  <Select
                    value={reviewFilter}
                    onValueChange={setReviewFilter}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Doc #</TableHead>
                      <TableHead>Document Title</TableHead>
                      <TableHead className="w-[160px]">Reviewer</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[110px]">Due Date</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReviews.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No reviews match the current filter
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReviews.map((r) => {
                        const isOverdue =
                          (r.status === "pending" ||
                            r.status === "in-progress" ||
                            r.status === "overdue") &&
                          new Date(r.dueDate) < new Date();
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-sm font-medium">
                              {r.docNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.docTitle}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.reviewer}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  r.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : r.status === "in-progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : isOverdue
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                )}
                              >
                                {isOverdue && r.status !== "completed"
                                  ? "Overdue"
                                  : r.status
                                      .split("-")
                                      .map(
                                        (w) =>
                                          w.charAt(0).toUpperCase() + w.slice(1)
                                      )
                                      .join(" ")}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-sm",
                                isOverdue && "text-red-600 font-medium"
                              )}
                            >
                              {formatDate(r.dueDate)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {r.comments || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: Analytics
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics">
          {metrics && <AnalyticsDashboard metrics={metrics} documents={documents} />}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          Detail Dialog
          ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={selectedDoc !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <DocumentDetailDialog
              document={selectedDoc}
              onAdvance={() => handleAdvanceStatus(selectedDoc)}
              onSupersede={() => handleMarkSuperseded(selectedDoc)}
              onObsolete={() => handleMarkObsolete(selectedDoc)}
              onClose={() => setSelectedDoc(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Document Detail Dialog ───────────────────────────────────────────────────

interface DocumentDetailDialogProps {
  document: ControlledDocument;
  onAdvance: () => void;
  onSupersede: () => void;
  onObsolete: () => void;
  onClose: () => void;
}

function DocumentDetailDialog({
  document: doc,
  onAdvance,
  onSupersede,
  onObsolete,
  onClose,
}: DocumentDetailDialogProps) {
  const canAdvance =
    doc.status === "draft" ||
    doc.status === "in-review" ||
    doc.status === "approved";

  const nextStatusLabel: Record<string, string> = {
    draft: "Submit for Review",
    "in-review": "Mark as Approved",
    approved: "Make Effective",
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="font-mono">{doc.documentNumber}</span>
          <Badge
            variant="secondary"
            className={cn("text-xs ml-2", STATUS_COLORS[doc.status])}
          >
            {STATUS_LABELS[doc.status]}
          </Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Title and description */}
        <div>
          <h3 className="font-semibold text-lg">{doc.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {doc.description}
          </p>
        </div>

        {/* Workflow stepper */}
        <div className="bg-muted/30 rounded-lg p-4">
          <DocumentWorkflow document={doc} />
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Category</span>
            <p className="font-medium">{doc.category}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Department</span>
            <p className="font-medium">{doc.department}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current Version</span>
            <p className="font-medium font-mono">v{doc.currentVersion}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Confidentiality</span>
            <p className="font-medium capitalize">{doc.confidentiality}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Effective Date</span>
            <p className="font-medium">{formatDate(doc.effectiveDate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Review</span>
            <p className="font-medium">{formatDate(doc.reviewDate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Next Review</span>
            <p
              className={cn(
                "font-medium",
                doc.nextReviewDate &&
                  daysFromNow(doc.nextReviewDate) < 0 &&
                  "text-red-600"
              )}
            >
              {formatDate(doc.nextReviewDate)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Retention</span>
            <p className="font-medium">{doc.retentionYears} years</p>
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Author</span>
            <p className="font-medium">{doc.author || "Not assigned"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reviewer</span>
            <p className="font-medium">{doc.reviewer || "Not assigned"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Approver</span>
            <p className="font-medium">{doc.approver || "Not assigned"}</p>
          </div>
        </div>

        <Separator />

        {/* Version History */}
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            Version History
          </h4>
          <div className="space-y-2">
            {doc.versions.map((v, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-sm",
                  idx === doc.versions.length - 1
                    ? "bg-blue-50 border-blue-200"
                    : "bg-muted/30"
                )}
              >
                <div className="flex-shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono",
                      idx === doc.versions.length - 1
                        ? "bg-blue-100 text-blue-800"
                        : ""
                    )}
                  >
                    v{v.versionNumber}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{v.changeSummary}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Author: {v.author}</span>
                    {v.reviewer && <span>Reviewer: {v.reviewer}</span>}
                    {v.approver && <span>Approver: {v.approver}</span>}
                    <span>Created: {formatDate(v.createdAt)}</span>
                    {v.effectiveAt && (
                      <span>Effective: {formatDate(v.effectiveAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Cycle */}
        {doc.reviews.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <FileCheck className="h-4 w-4" />
                Review Assignments
              </h4>
              <div className="space-y-2">
                {doc.reviews.map((r) => {
                  const isOverdue =
                    (r.status === "pending" ||
                      r.status === "in-progress" ||
                      r.status === "overdue") &&
                    new Date(r.dueDate) < new Date();
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-lg border text-sm"
                    >
                      <div>
                        <p className="font-medium">{r.reviewer}</p>
                        {r.comments && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.comments}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-xs",
                            isOverdue && "text-red-600 font-medium"
                          )}
                        >
                          Due: {formatDate(r.dueDate)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            r.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : r.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : isOverdue
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {isOverdue && r.status !== "completed"
                            ? "Overdue"
                            : r.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Training Requirements */}
        {doc.training && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4" />
                Training Requirements
              </h4>
              <div className="p-3 rounded-lg border text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Training Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {doc.training.trainingType.replace(/-/g, " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Required For:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {doc.training.requiredFor.map((r, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                {doc.training.completedBy.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Completed By:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.training.completedBy.map((c, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] bg-green-100 text-green-800"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {doc.training.pendingFor.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Pending For:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.training.pendingFor.map((p, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] bg-amber-100 text-amber-800"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{formatDate(doc.training.dueDate)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Related Documents */}
        {doc.relatedDocuments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" />
                Related Documents
              </h4>
              <div className="flex flex-wrap gap-2">
                {doc.relatedDocuments.map((rd, i) => (
                  <Badge key={i} variant="outline" className="font-mono">
                    {rd}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Keywords */}
        {doc.keywords.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-1">
              {doc.keywords.map((k, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] bg-gray-100"
                >
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          {canAdvance && (
            <Button onClick={onAdvance}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {nextStatusLabel[doc.status] || "Advance"}
            </Button>
          )}
          {doc.status === "effective" && (
            <>
              <Button variant="outline" onClick={onSupersede}>
                Supersede
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={onObsolete}
              >
                Mark Obsolete
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

interface AnalyticsDashboardProps {
  metrics: DocumentMetrics;
  documents: ControlledDocument[];
}

function AnalyticsDashboard({ metrics, documents }: AnalyticsDashboardProps) {
  // Calculate additional analytics
  const versionFrequency = useMemo(() => {
    const buckets: Record<string, number> = {
      "1 version": 0,
      "2-3 versions": 0,
      "4-5 versions": 0,
      "6+ versions": 0,
    };
    documents.forEach((d) => {
      const count = d.versions.length;
      if (count <= 1) buckets["1 version"]++;
      else if (count <= 3) buckets["2-3 versions"]++;
      else if (count <= 5) buckets["4-5 versions"]++;
      else buckets["6+ versions"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
    }));
  }, [documents]);

  const overdueByDepartment = useMemo(() => {
    const now = new Date();
    const deptMap = new Map<string, number>();
    documents.forEach((d) => {
      if (
        d.status === "effective" &&
        d.nextReviewDate &&
        new Date(d.nextReviewDate) < now
      ) {
        deptMap.set(d.department, (deptMap.get(d.department) || 0) + 1);
      }
    });
    return Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [documents]);

  const maxCatCount = Math.max(
    ...metrics.byCategory.map((c) => c.count),
    1
  );
  const maxDeptCount = Math.max(
    ...metrics.byDepartment.map((d) => d.count),
    1
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Documents by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Documents by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.byCategory
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(item.count / maxCatCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Department */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Documents by Department
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.byDepartment
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <div key={item.department}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{item.department}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${(item.count / maxDeptCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Review Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Compliance gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${metrics.reviewCompliancePct * 2.51} 251`}
                    className={cn(
                      metrics.reviewCompliancePct >= 80
                        ? "text-green-500"
                        : metrics.reviewCompliancePct >= 60
                        ? "text-amber-500"
                        : "text-red-500"
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {metrics.reviewCompliancePct}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Review completion rate
              </p>
            </div>

            {/* Status breakdown */}
            <div className="space-y-2">
              {metrics.byStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        STATUS_COLORS[item.status as DocumentStatus] ||
                          "bg-gray-100"
                      )}
                    >
                      {STATUS_LABELS[item.status as DocumentStatus] ||
                        item.status}
                    </Badge>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Frequency & Overdue Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Version Frequency & Overdue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Version distribution */}
            <div>
              <h5 className="text-sm font-medium mb-3">
                Version Distribution
              </h5>
              <div className="space-y-2">
                {versionFrequency.map((item) => {
                  const maxVer = Math.max(
                    ...versionFrequency.map((v) => v.count),
                    1
                  );
                  return (
                    <div key={item.range}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{item.range}</span>
                        <span className="text-muted-foreground font-medium">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{
                            width: `${(item.count / maxVer) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Overdue by department */}
            <div>
              <h5 className="text-sm font-medium mb-3">
                Overdue Reviews by Department
              </h5>
              {overdueByDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overdue reviews
                </p>
              ) : (
                <div className="space-y-2">
                  {overdueByDepartment.map((item) => (
                    <div
                      key={item.department}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-red-50"
                    >
                      <span className="font-medium text-red-800">
                        {item.department}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800"
                      >
                        {item.count} overdue
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">
                  {metrics.avgVersionsPerDoc}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Versions / Doc
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">
                  {metrics.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Controlled Docs
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
