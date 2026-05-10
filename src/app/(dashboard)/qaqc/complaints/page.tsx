"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import StatsCard from "@/components/shared/stats-card";
import PageHeader from "@/components/shared/page-header";
import ComplaintTimeline from "@/components/shared/complaint-timeline";
import { PieChartWidget, BarChartWidget } from "@/components/shared/charts";
import { cn, formatDate } from "@/lib/utils";
import { useComplaintStore } from "@/lib/quality/complaint-store";
import type {
  Complaint,
  ComplaintStatus,
  ComplaintSource,
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintMetrics,
} from "@/lib/quality/complaint-types";
import {
  MessageSquareWarning,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Eye,
  ArrowRight,
  FileWarning,
  Activity,
  Calendar,
  User,
  ChevronRight,
  ShieldAlert,
  Send,
  Clipboard,
  AlertCircle,
  TrendingUp,
  Package,
  Tag,
  Building2,
  Phone,
  Mail,
  Link2,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  received: "Received",
  acknowledged: "Acknowledged",
  investigation: "Investigation",
  "root-cause": "Root Cause",
  "capa-required": "CAPA Required",
  "response-sent": "Response Sent",
  closed: "Closed",
};

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  received: "bg-gray-100 text-gray-800",
  acknowledged: "bg-blue-100 text-blue-800",
  investigation: "bg-purple-100 text-purple-800",
  "root-cause": "bg-orange-100 text-orange-800",
  "capa-required": "bg-amber-100 text-amber-800",
  "response-sent": "bg-cyan-100 text-cyan-800",
  closed: "bg-green-100 text-green-800",
};

const SOURCE_LABELS: Record<ComplaintSource, string> = {
  customer: "Customer",
  patient: "Patient",
  distributor: "Distributor",
  regulatory: "Regulatory",
  internal: "Internal",
};

const SOURCE_COLORS: Record<ComplaintSource, string> = {
  customer: "bg-blue-100 text-blue-800",
  patient: "bg-rose-100 text-rose-800",
  distributor: "bg-teal-100 text-teal-800",
  regulatory: "bg-red-100 text-red-800",
  internal: "bg-violet-100 text-violet-800",
};

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  quality: "Quality",
  packaging: "Packaging",
  labeling: "Labeling",
  "foreign-matter": "Foreign Matter",
  potency: "Potency",
  stability: "Stability",
  "adverse-event": "Adverse Event",
};

const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  quality: "bg-blue-50 text-blue-700",
  packaging: "bg-amber-50 text-amber-700",
  labeling: "bg-purple-50 text-purple-700",
  "foreign-matter": "bg-red-50 text-red-700",
  potency: "bg-orange-50 text-orange-700",
  stability: "bg-cyan-50 text-cyan-700",
  "adverse-event": "bg-rose-50 text-rose-700",
};

const SEVERITY_LABELS: Record<ComplaintSeverity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

const SEVERITY_COLORS: Record<ComplaintSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  major: "bg-orange-100 text-orange-800",
  minor: "bg-gray-100 text-gray-800",
};

const REGULATORY_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  acknowledged: "bg-green-100 text-green-800",
  closed: "bg-emerald-100 text-emerald-800",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string, status: string): boolean {
  return status !== "closed" && new Date(dueDate) < new Date();
}

function daysSince(iso: string): number {
  return Math.round(
    (new Date().getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function ComplaintsPage() {
  const store = useComplaintStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [metrics, setMetrics] = useState<ComplaintMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("complaints");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New complaint form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSource, setNewSource] = useState<ComplaintSource>("customer");
  const [newCategory, setNewCategory] = useState<ComplaintCategory>("quality");
  const [newProduct, setNewProduct] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [newSeverity, setNewSeverity] = useState<ComplaintSeverity>("major");
  const [newDueDate, setNewDueDate] = useState("");
  const [newComplainantName, setNewComplainantName] = useState("");
  const [newComplainantOrg, setNewComplainantOrg] = useState("");
  const [newComplainantPhone, setNewComplainantPhone] = useState("");
  const [newComplainantEmail, setNewComplainantEmail] = useState("");

  // Response form (in detail dialog)
  const [responseText, setResponseText] = useState("");
  const [responseSentTo, setResponseSentTo] = useState("");

  const reload = useCallback(() => {
    store.fetchAll();
  }, [store]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const items = store.items as Complaint[];
    setComplaints(items);
    const open = items.filter((c) => c.status !== "closed");
    const overdue = items.filter((c) => c.status !== "closed" && c.dueDate && new Date(c.dueDate) < new Date());
    const withResponse = items.filter((c) => c.response);
    const avgResponseDays = withResponse.length > 0
      ? Math.round(withResponse.reduce((s, c) => {
          const recv = new Date(c.receivedAt).getTime();
          const resp = c.response ? new Date(c.response.sentDate).getTime() : recv;
          return s + Math.round((resp - recv) / 86400000);
        }, 0) / withResponse.length)
      : 0;
    const regulatoryReports = items.filter((c) => c.regulatoryReport?.reportable).length;
    const srcMap = new Map<string, number>();
    items.forEach((c) => srcMap.set(c.source, (srcMap.get(c.source) || 0) + 1));
    const catMap = new Map<string, number>();
    items.forEach((c) => catMap.set(c.category, (catMap.get(c.category) || 0) + 1));
    const sevMap = new Map<string, number>();
    items.forEach((c) => sevMap.set(c.severity, (sevMap.get(c.severity) || 0) + 1));
    setMetrics({
      total: items.length,
      open: open.length,
      avgResponseDays,
      regulatoryReports,
      overdue: overdue.length,
      bySource: Array.from(srcMap.entries()).map(([source, count]) => ({ source, count })),
      byCategory: Array.from(catMap.entries()).map(([category, count]) => ({ category, count })),
      bySeverity: Array.from(sevMap.entries()).map(([severity, count]) => ({ severity, count })),
    });
  }, [store.items]);

  // ─── Filtered Complaints ────────────────────────────────────────────────

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter)
        return false;
      if (severityFilter !== "all" && c.severity !== severityFilter)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.product.toLowerCase().includes(q) ||
          c.batch.toLowerCase().includes(q) ||
          c.complainant.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    complaints,
    statusFilter,
    sourceFilter,
    categoryFilter,
    severityFilter,
    searchQuery,
  ]);

  // ─── Reportable complaints ──────────────────────────────────────────────

  const reportableComplaints = useMemo(() => {
    return complaints.filter((c) => c.regulatoryReport?.reportable === true);
  }, [complaints]);

  // ─── Analytics Data ─────────────────────────────────────────────────────

  const categoryPieData = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) =>
      map.set(c.category, (map.get(c.category) || 0) + 1)
    );
    return Array.from(map.entries()).map(([name, value]) => ({
      name: CATEGORY_LABELS[name as ComplaintCategory] || name,
      value,
    }));
  }, [complaints]);

  const sourcePieData = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) =>
      map.set(c.source, (map.get(c.source) || 0) + 1)
    );
    return Array.from(map.entries()).map(([name, value]) => ({
      name: SOURCE_LABELS[name as ComplaintSource] || name,
      value,
    }));
  }, [complaints]);

  const monthlyTrendData = useMemo(() => {
    const months: Record<string, number> = {};
    complaints.forEach((c) => {
      const d = new Date(c.receivedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        complaints: count,
      }));
  }, [complaints]);

  const severityBarData = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) =>
      map.set(c.severity, (map.get(c.severity) || 0) + 1)
    );
    return Array.from(map.entries()).map(([name, value]) => ({
      severity: SEVERITY_LABELS[name as ComplaintSeverity] || name,
      count: value,
    }));
  }, [complaints]);

  const productBarData = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) =>
      map.set(c.product, (map.get(c.product) || 0) + 1)
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([product, count]) => ({
        product: product.length > 25 ? product.slice(0, 22) + "..." : product,
        complaints: count,
      }));
  }, [complaints]);

  const rootCauseData = useMemo(() => {
    const map = new Map<string, number>();
    complaints.forEach((c) => {
      if (c.investigation?.rootCause) {
        // Extract a short root cause category
        const rc = c.investigation.rootCause.toLowerCase();
        let label = "Other";
        if (rc.includes("equipment") || rc.includes("tooling") || rc.includes("machine") || rc.includes("sensor"))
          label = "Equipment";
        else if (rc.includes("supplier") || rc.includes("material") || rc.includes("foil"))
          label = "Supplier/Material";
        else if (rc.includes("process") || rc.includes("procedure") || rc.includes("sop") || rc.includes("checklist"))
          label = "Process/SOP";
        else if (rc.includes("human") || rc.includes("operator") || rc.includes("training"))
          label = "Human Error";
        else if (rc.includes("storage") || rc.includes("temperature") || rc.includes("environment"))
          label = "Storage/Environment";
        else if (rc.includes("contamination") || rc.includes("cleaning"))
          label = "Contamination";
        else if (rc.includes("translation") || rc.includes("artwork") || rc.includes("labeling") || rc.includes("label"))
          label = "Labeling/Artwork";
        map.set(label, (map.get(label) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [complaints]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAdvanceStatus = useCallback(
    (id: string) => {
      const complaint = store.items.find((i: any) => i.id === id) as Complaint | undefined;
      if (!complaint) return;
      const nextStatusMap: Record<string, string> = {
        received: "acknowledged",
        acknowledged: "investigation",
        investigation: "root-cause",
        "root-cause": "capa-required",
        "capa-required": "response-sent",
        "response-sent": "closed",
      };
      const nextStatus = nextStatusMap[complaint.status];
      if (nextStatus) {
        store.updateStatus(id, nextStatus);
        reload();
      }
    },
    [store, reload]
  );

  const handleCreateComplaint = useCallback(() => {
    if (!newTitle || !newProduct || !newBatch || !newComplainantName) return;
    const now = new Date().toISOString();
    store.create({
      number: `CMP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      title: newTitle,
      description: newDescription,
      source: newSource,
      category: newCategory,
      product: newProduct,
      batch: newBatch,
      complainant: {
        name: newComplainantName,
        organization: newComplainantOrg || undefined,
        phone: newComplainantPhone || undefined,
        email: newComplainantEmail || undefined,
      },
      severity: newSeverity,
      status: "received",
      receivedAt: now,
      receivedBy: "Current User",
      dueDate: newDueDate
        ? new Date(newDueDate).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        {
          status: "received",
          date: now,
          actor: "Current User",
          notes: "Complaint received and logged.",
        },
      ],
    } as any);
    // Reset form
    setNewTitle("");
    setNewDescription("");
    setNewSource("customer");
    setNewCategory("quality");
    setNewProduct("");
    setNewBatch("");
    setNewSeverity("major");
    setNewDueDate("");
    setNewComplainantName("");
    setNewComplainantOrg("");
    setNewComplainantPhone("");
    setNewComplainantEmail("");
    reload();
    setActiveTab("complaints");
  }, [
    newTitle,
    newDescription,
    newSource,
    newCategory,
    newProduct,
    newBatch,
    newSeverity,
    newDueDate,
    newComplainantName,
    newComplainantOrg,
    newComplainantPhone,
    newComplainantEmail,
    reload,
    store,
  ]);

  const handleSendResponse = useCallback(
    (id: string) => {
      if (!responseText || !responseSentTo) return;
      const complaint = store.items.find((i: any) => i.id === id) as Complaint | undefined;
      if (!complaint) return;
      store.update(id, {
        response: {
          responseText,
          sentTo: responseSentTo,
          sentDate: new Date().toISOString(),
          sentBy: "Current User",
        },
        status: "response-sent",
        timeline: [
          ...complaint.timeline,
          {
            status: "response-sent",
            date: new Date().toISOString(),
            actor: "Current User",
            notes: `Response sent to ${responseSentTo}`,
          },
        ],
      } as any);
      setResponseText("");
      setResponseSentTo("");
      reload();
      const updated = store.items.find((i: any) => i.id === id) as Complaint | undefined;
      if (updated) setSelectedComplaint(updated);
    },
    [responseText, responseSentTo, reload, store]
  );

  const openDetail = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailOpen(true);
  }, []);

  if (!metrics) return null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Complaint Management"
        description="Customer, product, and regulatory complaint tracking for pharmaceutical GMP compliance"
        icon={<MessageSquareWarning className="h-6 w-6 text-amber-600" />}
        actions={
          <Button onClick={() => setActiveTab("new-complaint")}>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        }
      />

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          icon={Clipboard}
          title="Total Complaints"
          value={metrics.total}
          subtitle="All time"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Clock}
          title="Open"
          value={metrics.open}
          subtitle="Awaiting resolution"
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Avg Response Days"
          value={metrics.avgResponseDays}
          subtitle="For responded complaints"
          iconColor="bg-cyan-100 text-cyan-600"
        />
        <StatsCard
          icon={ShieldAlert}
          title="Regulatory Reports"
          value={metrics.regulatoryReports}
          subtitle="Reportable events"
          iconColor="bg-rose-100 text-rose-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Overdue"
          value={metrics.overdue}
          subtitle="Past due date"
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="new-complaint">New Complaint</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: COMPLAINTS TABLE
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="complaints" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search complaints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {(
                      Object.entries(STATUS_LABELS) as [
                        ComplaintStatus,
                        string,
                      ][]
                    ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {(
                      Object.entries(SOURCE_LABELS) as [
                        ComplaintSource,
                        string,
                      ][]
                    ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(
                      Object.entries(CATEGORY_LABELS) as [
                        ComplaintCategory,
                        string,
                      ][]
                    ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {(
                      Object.entries(SEVERITY_LABELS) as [
                        ComplaintSeverity,
                        string,
                      ][]
                    ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[110px]">Category</TableHead>
                    <TableHead className="w-[90px]">Severity</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Received</TableHead>
                    <TableHead className="w-[80px]">Due</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No complaints match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComplaints.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(c)}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {c.number}
                          {c.regulatoryReport?.reportable && (
                            <ShieldAlert className="inline ml-1 h-3.5 w-3.5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px] truncate text-sm font-medium">
                            {c.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {c.product} &mdash; {c.batch}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              SOURCE_COLORS[c.source]
                            )}
                          >
                            {SOURCE_LABELS[c.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              CATEGORY_COLORS[c.category]
                            )}
                          >
                            {CATEGORY_LABELS[c.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              SEVERITY_COLORS[c.severity]
                            )}
                          >
                            {SEVERITY_LABELS[c.severity]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              STATUS_COLORS[c.status]
                            )}
                          >
                            {STATUS_LABELS[c.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(c.receivedAt)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs",
                              isOverdue(c.dueDate, c.status)
                                ? "text-red-600 font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDate(c.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(c);
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
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-right">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </p>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: NEW COMPLAINT
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="new-complaint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Register New Complaint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Complainant Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Complainant Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cmp-name">
                      Complainant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cmp-name"
                      placeholder="Name or pharmacy"
                      value={newComplainantName}
                      onChange={(e) => setNewComplainantName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmp-org">Organization</Label>
                    <Input
                      id="cmp-org"
                      placeholder="Hospital, pharmacy chain, etc."
                      value={newComplainantOrg}
                      onChange={(e) => setNewComplainantOrg(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmp-phone">Phone</Label>
                    <Input
                      id="cmp-phone"
                      placeholder="+20-2-xxxx-xxxx"
                      value={newComplainantPhone}
                      onChange={(e) => setNewComplainantPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmp-email">Email</Label>
                    <Input
                      id="cmp-email"
                      type="email"
                      placeholder="email@example.com"
                      value={newComplainantEmail}
                      onChange={(e) => setNewComplainantEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Complaint Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  Complaint Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cmp-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cmp-title"
                      placeholder="Brief complaint title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cmp-desc">Description</Label>
                    <Textarea
                      id="cmp-desc"
                      rows={3}
                      placeholder="Detailed complaint description..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={newSource}
                      onValueChange={(v) =>
                        setNewSource(v as ComplaintSource)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(SOURCE_LABELS) as [
                            ComplaintSource,
                            string,
                          ][]
                        ).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newCategory}
                      onValueChange={(v) =>
                        setNewCategory(v as ComplaintCategory)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(CATEGORY_LABELS) as [
                            ComplaintCategory,
                            string,
                          ][]
                        ).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={newSeverity}
                      onValueChange={(v) =>
                        setNewSeverity(v as ComplaintSeverity)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(SEVERITY_LABELS) as [
                            ComplaintSeverity,
                            string,
                          ][]
                        ).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmp-due">Due Date</Label>
                    <Input
                      id="cmp-due"
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Product / Batch */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cmp-product">
                      Product <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cmp-product"
                      placeholder="e.g., Amoxicillin 500mg Capsules"
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmp-batch">
                      Batch Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cmp-batch"
                      placeholder="e.g., AMX-FP-2026-041"
                      value={newBatch}
                      onChange={(e) => setNewBatch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("complaints")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateComplaint}
                  disabled={
                    !newTitle || !newProduct || !newBatch || !newComplainantName
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Register Complaint
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: REGULATORY
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="regulatory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Regulatory Reportable Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportableComplaints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reportable events.
                </div>
              ) : (
                <div className="space-y-4">
                  {reportableComplaints.map((c) => (
                    <Card key={c.id} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold">
                                {c.number}
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-800 text-[10px]"
                              >
                                Reportable
                              </Badge>
                              {c.regulatoryReport?.status && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    REGULATORY_STATUS_COLORS[
                                      c.regulatoryReport.status
                                    ] || "bg-gray-100 text-gray-800"
                                  )}
                                >
                                  {c.regulatoryReport.status
                                    .charAt(0)
                                    .toUpperCase() +
                                    c.regulatoryReport.status.slice(1)}
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-sm font-medium">{c.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {c.product} &mdash; Batch: {c.batch}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(c)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        </div>

                        {c.regulatoryReport && (
                          <>
                            <Separator className="my-3" />
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  Report Type
                                </span>
                                <p className="font-medium">
                                  {c.regulatoryReport.reportType || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Report Number
                                </span>
                                <p className="font-medium font-mono">
                                  {c.regulatoryReport.reportNumber || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Agency
                                </span>
                                <p className="font-medium">
                                  {c.regulatoryReport.agency || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Submitted
                                </span>
                                <p className="font-medium">
                                  {c.regulatoryReport.submittedDate
                                    ? formatDate(
                                        c.regulatoryReport.submittedDate
                                      )
                                    : "Pending"}
                                </p>
                              </div>
                            </div>
                            {c.regulatoryReport.description && (
                              <div className="mt-3">
                                <span className="text-xs text-muted-foreground">
                                  Report Description
                                </span>
                                <p className="text-xs mt-1 leading-relaxed">
                                  {c.regulatoryReport.description}
                                </p>
                              </div>
                            )}
                            {c.regulatoryReport.patientOutcome && (
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Patient Outcome
                                </span>
                                <p className="text-xs font-medium mt-0.5">
                                  {c.regulatoryReport.patientOutcome}
                                </p>
                              </div>
                            )}
                            {c.regulatoryReport.followUpRequired && (
                              <div className="mt-2 flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-amber-700 font-medium">
                                  Follow-up required by{" "}
                                  {c.regulatoryReport.followUpDate
                                    ? formatDate(
                                        c.regulatoryReport.followUpDate
                                      )
                                    : "TBD"}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4: ANALYTICS
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Complaints by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartWidget
                  data={categoryPieData}
                  height={280}
                  donut
                  showLegend
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Complaints by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartWidget
                  data={sourcePieData}
                  height={280}
                  donut
                  showLegend
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Monthly Complaint Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={monthlyTrendData}
                  bars={[{ dataKey: "complaints", name: "Complaints", color: "#3b82f6" }]}
                  xAxisKey="month"
                  height={280}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Severity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={severityBarData}
                  bars={[{ dataKey: "count", name: "Count", color: "#f97316" }]}
                  xAxisKey="severity"
                  height={280}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Top Products with Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartWidget
                  data={productBarData}
                  bars={[
                    {
                      dataKey: "complaints",
                      name: "Complaints",
                      color: "#8b5cf6",
                    },
                  ]}
                  xAxisKey="product"
                  height={280}
                  horizontal
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Root Cause Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartWidget
                  data={rootCauseData}
                  height={280}
                  donut
                  showLegend
                />
              </CardContent>
            </Card>
          </div>

          {/* Response Time Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Response Time Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Complaint</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Response Sent</TableHead>
                    <TableHead>Days to Respond</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints
                    .filter((c) => c.response?.sentDate)
                    .map((c) => {
                      const days = Math.round(
                        (new Date(c.response!.sentDate).getTime() -
                          new Date(c.receivedAt).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">
                            {c.number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.product}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                SEVERITY_COLORS[c.severity]
                              )}
                            >
                              {SEVERITY_LABELS[c.severity]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(c.receivedAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(c.response!.sentDate)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                days <= 15
                                  ? "text-green-600"
                                  : days <= 30
                                    ? "text-amber-600"
                                    : "text-red-600"
                              )}
                            >
                              {days} days
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════
          DETAIL DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">
                    {selectedComplaint.number}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      STATUS_COLORS[selectedComplaint.status]
                    )}
                  >
                    {STATUS_LABELS[selectedComplaint.status]}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      SEVERITY_COLORS[selectedComplaint.severity]
                    )}
                  >
                    {SEVERITY_LABELS[selectedComplaint.severity]}
                  </Badge>
                  {selectedComplaint.regulatoryReport?.reportable && (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800 text-[10px]"
                    >
                      Reportable
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {selectedComplaint.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Overview section */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Source / Category
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          SOURCE_COLORS[selectedComplaint.source]
                        )}
                      >
                        {SOURCE_LABELS[selectedComplaint.source]}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          CATEGORY_COLORS[selectedComplaint.category]
                        )}
                      >
                        {CATEGORY_LABELS[selectedComplaint.category]}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" /> Product / Batch
                    </span>
                    <p className="text-sm font-medium">
                      {selectedComplaint.product}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedComplaint.batch}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Dates
                    </span>
                    <p className="text-xs">
                      Received: {formatDate(selectedComplaint.receivedAt)}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        isOverdue(
                          selectedComplaint.dueDate,
                          selectedComplaint.status
                        ) && "text-red-600 font-semibold"
                      )}
                    >
                      Due: {formatDate(selectedComplaint.dueDate)}
                      {isOverdue(
                        selectedComplaint.dueDate,
                        selectedComplaint.status
                      ) && " (OVERDUE)"}
                    </p>
                  </div>
                </div>

                {/* Complainant */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> Complainant
                  </h3>
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedComplaint.complainant.name}
                        </span>
                      </div>
                      {selectedComplaint.complainant.organization && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {selectedComplaint.complainant.organization}
                          </span>
                        </div>
                      )}
                      {selectedComplaint.complainant.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{selectedComplaint.complainant.phone}</span>
                        </div>
                      )}
                      {selectedComplaint.complainant.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{selectedComplaint.complainant.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                </div>

                <Separator />

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Complaint Lifecycle
                  </h3>
                  <ComplaintTimeline complaint={selectedComplaint} />
                </div>

                <Separator />

                {/* Investigation */}
                {selectedComplaint.investigation && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Search className="h-4 w-4" /> Investigation
                      </h3>
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Investigator
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.investigation.investigator}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Method
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.investigation.method || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Started
                            </span>
                            <p className="font-medium">
                              {formatDate(
                                selectedComplaint.investigation.startedAt
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Completed
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.investigation.completedAt
                                ? formatDate(
                                    selectedComplaint.investigation.completedAt
                                  )
                                : "In progress"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Findings
                          </span>
                          <p className="text-sm mt-1 leading-relaxed">
                            {selectedComplaint.investigation.findings}
                          </p>
                        </div>
                        {selectedComplaint.investigation.rootCause && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Root Cause
                            </span>
                            <p className="text-sm mt-1 leading-relaxed font-medium text-orange-800">
                              {selectedComplaint.investigation.rootCause}
                            </p>
                          </div>
                        )}
                        {selectedComplaint.investigation.impactAssessment && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Impact Assessment
                            </span>
                            <p className="text-sm mt-1 leading-relaxed">
                              {selectedComplaint.investigation.impactAssessment}
                            </p>
                          </div>
                        )}
                        {selectedComplaint.investigation.affectedBatches &&
                          selectedComplaint.investigation.affectedBatches
                            .length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground">
                                Affected Batches
                              </span>
                              <div className="flex gap-1.5 mt-1 flex-wrap">
                                {selectedComplaint.investigation.affectedBatches.map(
                                  (b) => (
                                    <Badge
                                      key={b}
                                      variant="outline"
                                      className="font-mono text-[10px]"
                                    >
                                      {b}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* CAPA Link */}
                {selectedComplaint.capaNumber && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Link2 className="h-4 w-4" /> Linked CAPA
                      </h3>
                      <div className="rounded-lg border p-3 bg-amber-50/50 border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm font-semibold text-amber-800">
                            {selectedComplaint.capaNumber}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Corrective/Preventive Action linked to this
                            complaint
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Response */}
                {selectedComplaint.response ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Send className="h-4 w-4" /> Response
                    </h3>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sent To</span>
                          <p className="font-medium">
                            {selectedComplaint.response.sentTo}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Sent Date
                          </span>
                          <p className="font-medium">
                            {formatDate(selectedComplaint.response.sentDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Acknowledgment
                          </span>
                          <p className="font-medium">
                            {selectedComplaint.response.acknowledgment
                              ? `Yes (${
                                  selectedComplaint.response.acknowledgmentDate
                                    ? formatDate(
                                        selectedComplaint.response
                                          .acknowledgmentDate
                                      )
                                    : "Date N/A"
                                })`
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Response Text
                        </span>
                        <p className="text-sm mt-1 leading-relaxed">
                          {selectedComplaint.response.responseText}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  selectedComplaint.status !== "closed" &&
                  selectedComplaint.status !== "received" &&
                  selectedComplaint.status !== "acknowledged" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Send className="h-4 w-4" /> Send Response
                      </h3>
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="resp-to">Send To</Label>
                          <Input
                            id="resp-to"
                            placeholder="Recipient name / organization"
                            value={responseSentTo}
                            onChange={(e) => setResponseSentTo(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp-text">Response</Label>
                          <Textarea
                            id="resp-text"
                            rows={3}
                            placeholder="Type your formal response..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleSendResponse(selectedComplaint.id)
                          }
                          disabled={!responseText || !responseSentTo}
                        >
                          <Send className="mr-2 h-3.5 w-3.5" />
                          Send Response
                        </Button>
                      </div>
                    </div>
                  )
                )}

                {/* Regulatory Report (in detail) */}
                {selectedComplaint.regulatoryReport?.reportable && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-500" />{" "}
                        Regulatory Report
                      </h3>
                      <div className="rounded-lg border border-red-200 p-4 bg-red-50/30 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Report Type
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.regulatoryReport.reportType ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Report Number
                            </span>
                            <p className="font-medium font-mono">
                              {selectedComplaint.regulatoryReport.reportNumber ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Agency
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.regulatoryReport.agency ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Status
                            </span>
                            <p className="font-medium">
                              {selectedComplaint.regulatoryReport.status
                                ? selectedComplaint.regulatoryReport.status
                                    .charAt(0)
                                    .toUpperCase() +
                                  selectedComplaint.regulatoryReport.status.slice(
                                    1
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        {selectedComplaint.regulatoryReport.description && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Description
                            </span>
                            <p className="text-sm mt-1 leading-relaxed">
                              {selectedComplaint.regulatoryReport.description}
                            </p>
                          </div>
                        )}
                        {selectedComplaint.regulatoryReport.patientOutcome && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Patient Outcome
                            </span>
                            <p className="text-sm font-medium mt-0.5">
                              {
                                selectedComplaint.regulatoryReport
                                  .patientOutcome
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex items-center justify-between">
                  {selectedComplaint.status !== "closed" && (
                    <Button
                      onClick={() =>
                        handleAdvanceStatus(selectedComplaint.id)
                      }
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Advance to Next Status
                    </Button>
                  )}
                  {selectedComplaint.status === "closed" && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Complaint closed
                      {selectedComplaint.closedAt &&
                        ` on ${formatDate(selectedComplaint.closedAt)}`}
                      {selectedComplaint.closedBy &&
                        ` by ${selectedComplaint.closedBy}`}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setDetailOpen(false)}
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
