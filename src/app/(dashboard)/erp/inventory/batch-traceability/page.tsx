"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Package,
  GitBranch,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  Plus,
  ShieldAlert,
  Eye,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import BatchTraceTree from "@/components/shared/batch-trace-tree";
import BatchTimeline from "@/components/shared/batch-timeline";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { batchStore } from "@/lib/traceability/batch-store";
import {
  traceForward,
  traceBackward,
  getAffectedBatches,
  generateGenealogyReport,
} from "@/lib/traceability/trace-engine";
import type {
  Batch,
  TraceabilityNode,
} from "@/lib/traceability/batch-types";
import {
  BATCH_STATUS_COLORS,
  QC_STATUS_COLORS,
} from "@/lib/traceability/batch-types";
import type { GenealogyReport } from "@/lib/traceability/trace-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Create Batch Dialog
// ---------------------------------------------------------------------------

function CreateBatchDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [batchNumber, setBatchNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const products = [
    { id: "prod-amox", name: "Amoxicillin 500mg" },
    { id: "prod-omep", name: "Omeprazole 20mg" },
    { id: "prod-metf", name: "Metformin 850mg" },
    { id: "prod-ator", name: "Atorvastatin 10mg" },
    { id: "prod-losa", name: "Losartan 50mg" },
  ];

  function handleCreate() {
    if (!batchNumber || !productId || !quantity) return;
    const now = new Date().toISOString();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2);

    batchStore.createBatch({
      batchNumber,
      productId,
      productName,
      quantity: parseInt(quantity, 10),
      manufacturedDate: now,
      expiryDate: expiry.toISOString(),
      status: "quarantine",
      qcStatus: "pending",
      rawMaterials: [],
      notes,
    });

    setBatchNumber("");
    setProductName("");
    setProductId("");
    setQuantity("");
    setNotes("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
          <DialogDescription>
            Register a new manufacturing batch in quarantine.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="batchNum">Batch Number</Label>
            <Input
              id="batchNum"
              placeholder="BN-AMOX-500-2026016"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product">Product</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                const p = products.find((pr) => pr.id === v);
                if (p) setProductName(p.name);
              }}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              placeholder="5000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!batchNumber || !productId || !quantity}>
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Batch Detail Side Panel
// ---------------------------------------------------------------------------

function BatchDetailPanel({
  batch,
  onClose,
}: {
  batch: Batch;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-background border-l border-border shadow-xl overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Batch Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div>
            <span className="text-muted-foreground">Batch #</span>
            <p className="font-mono font-medium">{batch.batchNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Product</span>
            <p className="font-medium">{batch.productName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Quantity</span>
            <p className="font-medium">{batch.quantity.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <div className="mt-0.5">
              <Badge className={cn("text-xs", BATCH_STATUS_COLORS[batch.status])}>
                {batch.status}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">QC Status</span>
            <div className="mt-0.5">
              <Badge className={cn("text-xs", QC_STATUS_COLORS[batch.qcStatus])}>
                {batch.qcStatus}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Mfg Date</span>
            <p className="font-medium">{fmtDate(batch.manufacturedDate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Expiry Date</span>
            <p className="font-medium">{fmtDate(batch.expiryDate)}</p>
          </div>
          {batch.manufacturingOrderId && (
            <div>
              <span className="text-muted-foreground">MO #</span>
              <p className="font-mono font-medium">{batch.manufacturingOrderId}</p>
            </div>
          )}
        </div>

        {batch.notes && (
          <div className="text-sm mb-6">
            <span className="text-muted-foreground">Notes</span>
            <p className="mt-1">{batch.notes}</p>
          </div>
        )}

        <Separator className="mb-4" />

        {/* Raw Materials */}
        <h3 className="text-sm font-semibold mb-2">Raw Materials</h3>
        {batch.rawMaterials.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">No raw materials recorded.</p>
        ) : (
          <div className="mb-6 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Material</TableHead>
                  <TableHead className="text-xs">Batch #</TableHead>
                  <TableHead className="text-xs">Qty</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.rawMaterials.map((rm, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{rm.materialName}</TableCell>
                    <TableCell className="text-xs font-mono">{rm.batchNumber}</TableCell>
                    <TableCell className="text-xs">
                      {rm.quantity} {rm.unit}
                    </TableCell>
                    <TableCell className="text-xs">{rm.supplierName || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Separator className="mb-4" />

        {/* Event Timeline */}
        <h3 className="text-sm font-semibold mb-2">Event Timeline</h3>
        <BatchTimeline batchId={batch.id} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch Registry Tab
// ---------------------------------------------------------------------------

function BatchRegistryTab() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function refresh() {
    setBatches(batchStore.getBatches());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let list = batches;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(q) ||
          b.productName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }
    return list;
  }, [batches, search, statusFilter]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="quarantine">Quarantine</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="recalled">Recalled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Batch
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Mfg Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>QC Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No batches found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedBatch(b)}
                  >
                    <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                    <TableCell>{b.productName}</TableCell>
                    <TableCell className="text-right">{b.quantity.toLocaleString()}</TableCell>
                    <TableCell>{fmtDate(b.manufacturedDate)}</TableCell>
                    <TableCell>{fmtDate(b.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", QC_STATUS_COLORS[b.qcStatus])}>
                        {b.qcStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", BATCH_STATUS_COLORS[b.status])}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatch(b);
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

      {/* Side panel */}
      {selectedBatch && (
        <BatchDetailPanel
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {/* Create dialog */}
      <CreateBatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Trace Tab
// ---------------------------------------------------------------------------

function TraceTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [traceNode, setTraceNode] = useState<TraceabilityNode | null>(null);
  const [affected, setAffected] = useState<Batch[]>([]);
  const [error, setError] = useState("");

  function handleTrace() {
    setError("");
    setTraceNode(null);
    setAffected([]);

    const batches = batchStore.searchBatches(searchQuery);
    if (batches.length === 0) {
      setError("No batch found matching that query.");
      return;
    }

    const batch = batches[0];
    const node =
      direction === "forward"
        ? traceForward(batch.id)
        : traceBackward(batch.id);

    setTraceNode(node);
    setAffected(getAffectedBatches(batch.id));
  }

  return (
    <div className="space-y-6">
      {/* Search + controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter batch number or product name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrace()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={direction === "forward" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("forward")}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Forward
              </Button>
              <Button
                variant={direction === "backward" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("backward")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Backward
              </Button>
              <Button size="sm" onClick={handleTrace}>
                <GitBranch className="h-4 w-4 mr-1" />
                Trace
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Trace tree */}
      {traceNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Traceability Tree
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BatchTraceTree rootNode={traceNode} direction={direction} />
          </CardContent>
        </Card>
      )}

      {/* Affected batches */}
      {affected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Affected Batches (Recall Scenario)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These batches share raw materials with the traced batch and may be
              affected in a recall scenario.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affected.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                    <TableCell>{b.productName}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", BATCH_STATUS_COLORS[b.status])}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{b.quantity.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Genealogy Tab
// ---------------------------------------------------------------------------

function GenealogyTab() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<GenealogyReport | null>(null);

  useEffect(() => {
    setBatches(batchStore.getBatches());
  }, []);

  function handleGenerate() {
    if (!selectedId) return;
    setReport(generateGenealogyReport(selectedId));
  }

  function handleExport() {
    if (!report) return;
    // eslint-disable-next-line no-console
    console.log("=== Genealogy Report Export ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    alert("Report exported to console. Check DevTools.");
  }

  return (
    <div className="space-y-6">
      {/* Select batch */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a batch..." />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchNumber} — {b.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleGenerate} disabled={!selectedId}>
              <FileText className="h-4 w-4 mr-1" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Batch info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Batch Information</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileText className="h-4 w-4 mr-1" />
                Export Report
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Batch #</span>
                  <p className="font-mono font-medium">{report.batch.batchNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Product</span>
                  <p className="font-medium">{report.batch.productName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5">
                    <Badge className={cn("text-xs", BATCH_STATUS_COLORS[report.batch.status])}>
                      {report.batch.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity</span>
                  <p className="font-medium">{report.batch.quantity.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {report.rawMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No raw materials recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rawMaterials.map((rm, i) => (
                      <TableRow key={i}>
                        <TableCell>{rm.materialName}</TableCell>
                        <TableCell className="font-mono text-sm">{rm.batchNumber}</TableCell>
                        <TableCell>{rm.quantity}</TableCell>
                        <TableCell>{rm.unit}</TableCell>
                        <TableCell>{rm.supplierName || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Movement history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {report.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movements recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{m.fromLocation || "-"}</TableCell>
                        <TableCell className="text-sm">{m.toLocation || "-"}</TableCell>
                        <TableCell className="text-right">{m.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">
                          {m.reason || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{m.performedBy}</TableCell>
                        <TableCell className="text-sm">{fmtDate(m.performedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Event timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <BatchTimeline batchId={report.batch.id} />
            </CardContent>
          </Card>

          {/* Forward trace */}
          {report.forwardTrace && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Forward Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BatchTraceTree
                  rootNode={report.forwardTrace}
                  direction="forward"
                />
              </CardContent>
            </Card>
          )}

          {/* Backward trace */}
          {report.backwardTrace && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Backward Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BatchTraceTree
                  rootNode={report.backwardTrace}
                  direction="backward"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BatchTraceabilityPage() {
  const [stats, setStats] = useState({
    total: 0,
    released: 0,
    quarantine: 0,
    expiring: 0,
  });

  useEffect(() => {
    const all = batchStore.getBatches();
    setStats({
      total: all.length,
      released: all.filter((b) => b.status === "released").length,
      quarantine: all.filter((b) => b.status === "quarantine").length,
      expiring: batchStore.getExpiringBatches(30).length,
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Traceability"
        description="Track pharmaceutical batches from raw materials to finished products"
        icon={<GitBranch className="h-6 w-6" />}
      />

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Package}
          title="Total Batches"
          value={stats.total}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={CheckCircle}
          title="Released"
          value={stats.released}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="In Quarantine"
          value={stats.quarantine}
          iconColor="bg-yellow-100 text-yellow-600"
        />
        <StatsCard
          icon={Clock}
          title="Expiring Soon (30d)"
          value={stats.expiring}
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="registry" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registry">
            <Package className="h-4 w-4 mr-1" />
            Batch Registry
          </TabsTrigger>
          <TabsTrigger value="trace">
            <GitBranch className="h-4 w-4 mr-1" />
            Trace
          </TabsTrigger>
          <TabsTrigger value="genealogy">
            <FileText className="h-4 w-4 mr-1" />
            Genealogy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry">
          <BatchRegistryTab />
        </TabsContent>

        <TabsContent value="trace">
          <TraceTab />
        </TabsContent>

        <TabsContent value="genealogy">
          <GenealogyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
