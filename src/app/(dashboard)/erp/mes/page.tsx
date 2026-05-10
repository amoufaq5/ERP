"use client";

import { useMemo, useState } from "react";
import {
  Activity, Clock, Gauge, Package, Plus, Play, Pause, Square,
  RotateCcw, Timer, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

/* ─── Types ─── */

type RunStatus = "SETUP" | "RUNNING" | "PAUSED" | "STOPPED" | "COMPLETED";

interface ProductionRun {
  id: string;
  runId: string;
  workOrder: string;
  product: string;
  line: string;
  status: RunStatus;
  shift: string;
  startTime: string;
  targetQty: number;
  actualQty: number;
  oee: number;
}

/* ─── Mock Data ─── */

const PRODUCTION_LINES = ["Line A", "Line B", "Line C", "Line D"];
const SHIFTS = ["Morning (06:00-14:00)", "Afternoon (14:00-22:00)", "Night (22:00-06:00)"];

const SEED_RUNS: ProductionRun[] = [
  { id: "run-1", runId: "PR-2026-0451", workOrder: "WO-1120", product: "Paracetamol 500mg Tablet", line: "Line A", status: "RUNNING", shift: "Morning (06:00-14:00)", startTime: "2026-05-10 06:15", targetQty: 50000, actualQty: 32150, oee: 87.2 },
  { id: "run-2", runId: "PR-2026-0452", workOrder: "WO-1121", product: "Amoxicillin 250mg Capsule", line: "Line B", status: "RUNNING", shift: "Morning (06:00-14:00)", startTime: "2026-05-10 06:30", targetQty: 30000, actualQty: 18400, oee: 82.5 },
  { id: "run-3", runId: "PR-2026-0453", workOrder: "WO-1118", product: "Ibuprofen 400mg Tablet", line: "Line C", status: "PAUSED", shift: "Morning (06:00-14:00)", startTime: "2026-05-10 07:00", targetQty: 40000, actualQty: 12800, oee: 64.0 },
  { id: "run-4", runId: "PR-2026-0450", workOrder: "WO-1117", product: "Omeprazole 20mg Capsule", line: "Line D", status: "COMPLETED", shift: "Night (22:00-06:00)", startTime: "2026-05-09 22:00", targetQty: 25000, actualQty: 25000, oee: 91.3 },
  { id: "run-5", runId: "PR-2026-0449", workOrder: "WO-1115", product: "Metformin 500mg Tablet", line: "Line A", status: "COMPLETED", shift: "Night (22:00-06:00)", startTime: "2026-05-09 22:15", targetQty: 60000, actualQty: 58200, oee: 88.7 },
  { id: "run-6", runId: "PR-2026-0454", workOrder: "WO-1122", product: "Vitamin C 1000mg Effervescent", line: "Line D", status: "SETUP", shift: "Morning (06:00-14:00)", startTime: "2026-05-10 08:00", targetQty: 20000, actualQty: 0, oee: 0 },
  { id: "run-7", runId: "PR-2026-0448", workOrder: "WO-1114", product: "Aspirin 100mg Tablet", line: "Line B", status: "STOPPED", shift: "Afternoon (14:00-22:00)", startTime: "2026-05-09 14:00", targetQty: 35000, actualQty: 8900, oee: 45.2 },
];

const statusColor: Record<RunStatus, string> = {
  SETUP: "bg-gray-100 text-gray-800",
  RUNNING: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  STOPPED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

export default function MESPage() {
  const [runs, setRuns] = useState<ProductionRun[]>(SEED_RUNS);
  const [search, setSearch] = useState("");
  const [filterLine, setFilterLine] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [downtimeOpen, setDowntimeOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null);
  const [outputQty, setOutputQty] = useState(0);
  const [downtimeReason, setDowntimeReason] = useState("");
  const [downtimeMinutes, setDowntimeMinutes] = useState(0);

  // Form state
  const [formWorkOrder, setFormWorkOrder] = useState("");
  const [formProduct, setFormProduct] = useState("");
  const [formLine, setFormLine] = useState("");
  const [formShift, setFormShift] = useState("");
  const [formTargetQty, setFormTargetQty] = useState(0);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.runId.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterLine !== "all" && r.line !== filterLine) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [runs, search, filterLine, filterStatus]);

  // Stats
  const activeRuns = runs.filter((r) => r.status === "RUNNING").length;
  const avgOEE = runs.filter((r) => r.oee > 0).reduce((s, r) => s + r.oee, 0) / (runs.filter((r) => r.oee > 0).length || 1);
  const downtimeHours = runs.filter((r) => r.status === "PAUSED" || r.status === "STOPPED").length * 1.5;
  const unitsProduced = runs.reduce((s, r) => s + r.actualQty, 0);

  let _n = Date.now();
  const genId = () => `PR-2026-${String((_n++) % 10000).padStart(4, "0")}`;

  function handleStartRun(run: ProductionRun) {
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: "RUNNING" as RunStatus } : r));
  }
  function handlePauseRun(run: ProductionRun) {
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: "PAUSED" as RunStatus } : r));
  }
  function handleResumeRun(run: ProductionRun) {
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: "RUNNING" as RunStatus } : r));
  }
  function handleStopRun(run: ProductionRun) {
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: "STOPPED" as RunStatus } : r));
  }

  function handleRecordOutput(run: ProductionRun) {
    setSelectedRun(run);
    setOutputQty(0);
    setOutputOpen(true);
  }
  function submitOutput() {
    if (!selectedRun || outputQty <= 0) return;
    setRuns((prev) => prev.map((r) => r.id === selectedRun.id ? { ...r, actualQty: r.actualQty + outputQty } : r));
    setOutputOpen(false);
    setSelectedRun(null);
  }

  function handleLogDowntime(run: ProductionRun) {
    setSelectedRun(run);
    setDowntimeReason("");
    setDowntimeMinutes(0);
    setDowntimeOpen(true);
  }
  function submitDowntime() {
    if (!selectedRun || downtimeMinutes <= 0) return;
    setRuns((prev) => prev.map((r) => r.id === selectedRun.id ? { ...r, oee: Math.max(0, r.oee - (downtimeMinutes * 0.1)) } : r));
    setDowntimeOpen(false);
    setSelectedRun(null);
  }

  function handleCreateRun() {
    setFormWorkOrder(""); setFormProduct(""); setFormLine(""); setFormShift(""); setFormTargetQty(0);
    setFormOpen(true);
  }
  function submitNewRun() {
    if (!formWorkOrder || !formProduct || !formLine || formTargetQty <= 0) return;
    const newRun: ProductionRun = {
      id: `run-${Date.now()}`,
      runId: genId(),
      workOrder: formWorkOrder,
      product: formProduct,
      line: formLine,
      status: "SETUP",
      shift: formShift || SHIFTS[0],
      startTime: new Date().toISOString().replace("T", " ").slice(0, 16),
      targetQty: formTargetQty,
      actualQty: 0,
      oee: 0,
    };
    setRuns((prev) => [newRun, ...prev]);
    setFormOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "runId", label: "Run ID", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "workOrder", label: "Work Order", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "product", label: "Product", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "line", label: "Line" },
    { key: "shift", label: "Shift", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "status", label: "Status", render: (v) => <Badge className={statusColor[v as RunStatus]}>{v as string}</Badge> },
    { key: "startTime", label: "Start Time", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "targetQty", label: "Target Qty", className: "text-right", render: (v) => <span>{((v as number) ?? 0).toLocaleString()}</span> },
    { key: "actualQty", label: "Actual Qty", className: "text-right", render: (v) => <span className="font-medium">{((v as number) ?? 0).toLocaleString()}</span> },
    { key: "oee", label: "OEE %", className: "text-right", render: (v) => {
      const val = v as number;
      const color = val >= 85 ? "text-green-700" : val >= 60 ? "text-yellow-700" : "text-red-700";
      return <span className={`font-medium ${color}`}>{val > 0 ? `${val.toFixed(1)}%` : "—"}</span>;
    }},
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const r = row as unknown as ProductionRun;
      return (
        <div className="flex items-center justify-end gap-1">
          {r.status === "SETUP" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleStartRun(r)} title="Start">
              <Play className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
          {r.status === "RUNNING" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handlePauseRun(r)} title="Pause">
                <Pause className="h-3.5 w-3.5 text-yellow-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleStopRun(r)} title="Stop">
                <Square className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </>
          )}
          {r.status === "PAUSED" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleResumeRun(r)} title="Resume">
              <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          {(r.status === "RUNNING" || r.status === "PAUSED") && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRecordOutput(r)} title="Record Output">
                <Package className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleLogDowntime(r)} title="Log Downtime">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              </Button>
            </>
          )}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing Execution System"
        description="Real-time production monitoring, run control, and OEE tracking"
        actions={<Button onClick={handleCreateRun}><Plus className="h-4 w-4 mr-2" />New Production Run</Button>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Activity} title="Active Production Runs" value={activeRuns} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Gauge} title="Avg OEE %" value={`${avgOEE.toFixed(1)}%`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Clock} title="Downtime Hours Today" value={downtimeHours.toFixed(1)} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={Package} title="Units Produced Today" value={unitsProduced.toLocaleString()} iconColor="bg-purple-100 text-purple-600" />
      </div>

      {/* Shift Info */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4 text-sm">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Current Shift:</span>
            <Badge variant="outline">Morning (06:00-14:00)</Badge>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Shift Supervisor: J. Martinez</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Lines Active: {PRODUCTION_LINES.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by product or run ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={filterLine} onValueChange={setFilterLine}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Lines" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lines</SelectItem>
            {PRODUCTION_LINES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SETUP">Setup</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="STOPPED">Stopped</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredRuns as unknown as Record<string, unknown>[]}
            exportable
            exportFilename="mes-production-runs.csv"
            emptyMessage="No production runs match your filters."
          />
        </CardContent>
      </Card>

      {/* New Run Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Production Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Work Order</Label>
                <Input value={formWorkOrder} onChange={(e) => setFormWorkOrder(e.target.value)} placeholder="WO-1123" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Product</Label>
                <Input value={formProduct} onChange={(e) => setFormProduct(e.target.value)} placeholder="Product name" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Production Line</Label>
                <Select value={formLine} onValueChange={setFormLine}>
                  <SelectTrigger><SelectValue placeholder="Select line..." /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_LINES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Shift</Label>
                <Select value={formShift} onValueChange={setFormShift}>
                  <SelectTrigger><SelectValue placeholder="Select shift..." /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Target Quantity</Label>
                <Input type="number" min={1} value={formTargetQty || ""} onChange={(e) => setFormTargetQty(Number(e.target.value))} placeholder="50000" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitNewRun} disabled={!formWorkOrder || !formProduct || !formLine || formTargetQty <= 0}>Create Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Output Dialog */}
      <Dialog open={outputOpen} onOpenChange={setOutputOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Output — {selectedRun?.runId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="block text-sm">Units Produced</Label>
            <Input type="number" min={1} value={outputQty || ""} onChange={(e) => setOutputQty(Number(e.target.value))} placeholder="Enter quantity..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutputOpen(false)}>Cancel</Button>
            <Button onClick={submitOutput} disabled={outputQty <= 0}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Downtime Dialog */}
      <Dialog open={downtimeOpen} onOpenChange={setDowntimeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Downtime — {selectedRun?.runId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="block text-sm mb-1.5">Reason</Label>
              <Input value={downtimeReason} onChange={(e) => setDowntimeReason(e.target.value)} placeholder="Equipment failure, material shortage..." />
            </div>
            <div>
              <Label className="block text-sm mb-1.5">Duration (minutes)</Label>
              <Input type="number" min={1} value={downtimeMinutes || ""} onChange={(e) => setDowntimeMinutes(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDowntimeOpen(false)}>Cancel</Button>
            <Button onClick={submitDowntime} disabled={downtimeMinutes <= 0}>Log Downtime</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
