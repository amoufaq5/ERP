"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  EquipmentDiagram,
  MACODisplay,
  EffectivenessTrend,
  MethodIcon,
} from "@/components/shared/cleaning-diagram";
import { cn, formatDate } from "@/lib/utils";
import {
  Droplets,
  FileText,
  Play,
  BarChart3,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  FlaskConical,
  ShieldAlert,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpDown,
  ClipboardCheck,
  TestTube2,
  Beaker,
  Download,
} from "lucide-react";
import { cleaningStore, calculateMACO, calculatePerAreaLimit } from "@/lib/quality/cleaning-store";
import type {
  CleaningProtocol,
  CleaningRun,
  CleaningSample,
  CleaningStatus,
  CleaningMethod,
  CleaningMetrics,
  EquipmentType,
  SamplingPoint,
  MACOParams,
} from "@/lib/quality/cleaning-types";

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function statusBadge(status: CleaningStatus) {
  const map: Record<CleaningStatus, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-300" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700 border-blue-300" },
    "in-progress": { label: "In Progress", className: "bg-amber-100 text-amber-700 border-amber-300" },
    sampling: { label: "Sampling", className: "bg-purple-100 text-purple-700 border-purple-300" },
    analysis: { label: "Analysis", className: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    passed: { label: "Passed", className: "bg-green-100 text-green-700 border-green-300" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-300" },
    "revalidation-due": { label: "Revalidation Due", className: "bg-orange-100 text-orange-700 border-orange-300" },
  };
  const cfg = map[status] || map.draft;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function resultBadge(result: "pass" | "fail" | "pending") {
  if (result === "pass")
    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />
        Pass
      </Badge>
    );
  if (result === "fail")
    return (
      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
        <XCircle className="h-3 w-3 mr-1" />
        Fail
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}

function shortEquipmentName(name: string): string {
  // e.g. "Tablet Press TP-01 (Fette 1200i)" → "TP-01"
  const match = name.match(/([A-Z]{2,}-\d+)/);
  return match ? match[1] : name.slice(0, 20);
}

/* ═══════════════════════════════════════════════════════════════════
   Protocol Detail Dialog
   ═══════════════════════════════════════════════════════════════════ */

function ProtocolDetailDialog({
  protocol,
  open,
  onOpenChange,
}: {
  protocol: CleaningProtocol | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const runs = useMemo(() => {
    if (!protocol) return [];
    return cleaningStore
      .getRunsByProtocol(protocol.id)
      .sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());
  }, [protocol]);

  const latestRun = runs[0];
  const macoParams = protocol?.acceptanceCriteria.find((c) => c.macoParams)?.macoParams;

  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {protocol.number}
          </DialogTitle>
          <DialogDescription>{protocol.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Meta */}
          <div className="flex flex-wrap gap-3 items-center">
            {statusBadge(protocol.status)}
            <span className="text-sm text-muted-foreground">Version {protocol.version}</span>
            <span className="text-sm text-muted-foreground">Created {formatDate(protocol.createdAt)}</span>
            {protocol.approvedBy && (
              <span className="text-sm text-muted-foreground">
                Approved by {protocol.approvedBy} on {formatDate(protocol.approvedAt!)}
              </span>
            )}
          </div>

          {/* Equipment & Product Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Equipment:</span>{" "}
                  <span className="font-medium">{protocol.equipment}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">From Product:</span>{" "}
                  <span className="font-medium">{protocol.fromProduct}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">To Product:</span>{" "}
                  <span className="font-medium">{protocol.toProduct}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Revalidation Interval:</span>{" "}
                  <span className="font-medium">{protocol.revalidationIntervalDays} days</span>
                </div>
                {protocol.nextRevalidationDate && (
                  <div>
                    <span className="text-muted-foreground">Next Revalidation:</span>{" "}
                    <span className="font-medium">{formatDate(protocol.nextRevalidationDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {macoParams && <MACODisplay params={macoParams} />}
          </div>

          {/* Cleaning Procedure */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-600" />
              Cleaning Procedure
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Step</TableHead>
                    <TableHead>Instruction</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Temp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.cleaningProcedure.map((step) => (
                    <TableRow key={step.step}>
                      <TableCell className="font-mono font-medium">{step.step}</TableCell>
                      <TableCell className="text-sm">{step.instruction}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {step.agent || "-"}
                        {step.concentration && ` (${step.concentration})`}
                      </TableCell>
                      <TableCell className="text-sm">{step.duration || "-"}</TableCell>
                      <TableCell className="text-sm">{step.temperature || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sampling Plan & Equipment Diagram */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-600" />
              Sampling Plan
            </h3>
            <EquipmentDiagram protocol={protocol} run={latestRun} />
          </div>

          {/* Acceptance Criteria */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Acceptance Criteria
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>MACO (mg)</TableHead>
                    <TableHead>Acceptance Limit</TableHead>
                    <TableHead>Rationale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.acceptanceCriteria.map((crit) => (
                    <TableRow key={crit.id}>
                      <TableCell>
                        <span className="flex items-center gap-1.5 capitalize">
                          <MethodIcon method={crit.method} className="text-muted-foreground" />
                          {crit.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{crit.macoMg.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">
                        {crit.acceptanceValue > 0 ? crit.acceptanceValue : ""} {crit.acceptanceUnit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {crit.rationale}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Run History */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Run History ({runs.length} runs)
            </h3>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cleaning runs recorded yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Samples</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-sm">{formatDate(run.runDate)}</TableCell>
                        <TableCell className="text-sm">{run.operator}</TableCell>
                        <TableCell className="font-mono text-sm">{run.batchNumber || "-"}</TableCell>
                        <TableCell>{resultBadge(run.overallResult)}</TableCell>
                        <TableCell className="text-sm">
                          {run.samples.filter((s) => s.passFail === "pass").length}/{run.samples.length} pass
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Effectiveness Trend */}
          {runs.length > 1 && <EffectivenessTrend runs={runs} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Run Detail Dialog
   ═══════════════════════════════════════════════════════════════════ */

function RunDetailDialog({
  run,
  open,
  onOpenChange,
}: {
  run: CleaningRun | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const protocol = useMemo(() => {
    if (!run) return null;
    return cleaningStore.getProtocolById(run.protocolId) || null;
  }, [run]);

  if (!run) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-green-600" />
            Cleaning Run - {run.protocolNumber}
          </DialogTitle>
          <DialogDescription>
            {run.equipment} | {formatDate(run.runDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-3 items-center">
            {resultBadge(run.overallResult)}
            <span className="text-sm text-muted-foreground">Operator: {run.operator}</span>
            {run.verifiedBy && (
              <span className="text-sm text-muted-foreground">Verified by: {run.verifiedBy}</span>
            )}
            {run.batchNumber && (
              <span className="text-sm font-mono text-muted-foreground">Batch: {run.batchNumber}</span>
            )}
          </div>

          {/* Product changeover */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded border p-3">
              <span className="text-muted-foreground block text-xs">From Product</span>
              <span className="font-medium">{run.fromProduct}</span>
            </div>
            <div className="rounded border p-3">
              <span className="text-muted-foreground block text-xs">To Product</span>
              <span className="font-medium">{run.toProduct}</span>
            </div>
          </div>

          {/* Equipment diagram if protocol found */}
          {protocol && <EquipmentDiagram protocol={protocol} run={run} />}

          {/* Sample Results Table */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Sample Results</h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.samples.map((sample, idx) => (
                    <TableRow
                      key={sample.id}
                      className={sample.passFail === "fail" ? "bg-red-50/50" : ""}
                    >
                      <TableCell className="font-mono text-sm">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{sample.location}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm capitalize">
                          <MethodIcon method={sample.method} className="text-muted-foreground" />
                          {sample.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{sample.result.toFixed(3)} {sample.resultUnit}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{sample.limit} {sample.limitUnit}</TableCell>
                      <TableCell>
                        {sample.passFail === "pass" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1: Protocols
   ═══════════════════════════════════════════════════════════════════ */

function ProtocolsTab() {
  const [protocols, setProtocols] = useState<CleaningProtocol[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [selectedProtocol, setSelectedProtocol] = useState<CleaningProtocol | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setProtocols(cleaningStore.getAllProtocols());
  }, []);

  const filtered = useMemo(() => {
    return protocols.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (equipmentFilter !== "all" && p.equipmentType !== equipmentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.number.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.equipment.toLowerCase().includes(q) ||
          p.fromProduct.toLowerCase().includes(q) ||
          p.toProduct.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [protocols, search, statusFilter, equipmentFilter]);

  const equipmentTypes: EquipmentType[] = [
    "tablet-press",
    "fbd",
    "coating-pan",
    "mixer",
    "filling-line",
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search protocols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="revalidation-due">Revalidation Due</SelectItem>
          </SelectContent>
        </Select>
        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {equipmentTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol #</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>From Product</TableHead>
              <TableHead>To Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Revalidation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No protocols found matching the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const daysUntil = p.nextRevalidationDate
                  ? Math.round(
                      (new Date(p.nextRevalidationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  : null;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium text-sm">{p.number}</TableCell>
                    <TableCell className="text-sm">{shortEquipmentName(p.equipment)}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{p.fromProduct}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{p.toProduct}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-sm">
                      {daysUntil !== null ? (
                        <span
                          className={cn(
                            "font-medium",
                            daysUntil < 0 ? "text-red-600" : daysUntil < 30 ? "text-amber-600" : "text-muted-foreground"
                          )}
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProtocol(p);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProtocolDetailDialog
        protocol={selectedProtocol}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2: Execute Run
   ═══════════════════════════════════════════════════════════════════ */

function ExecuteRunTab() {
  const [protocols, setProtocols] = useState<CleaningProtocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [operator, setOperator] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<CleaningRun | null>(null);

  useEffect(() => {
    const allProtos = cleaningStore.getAllProtocols();
    // Only show approved or revalidation-due protocols for execution
    setProtocols(allProtos.filter((p) => p.status === "approved" || p.status === "revalidation-due"));
  }, []);

  const selectedProtocol = useMemo(
    () => protocols.find((p) => p.id === selectedProtocolId) || null,
    [protocols, selectedProtocolId]
  );

  const handleSampleValueChange = useCallback((pointId: string, value: string) => {
    setSampleValues((prev) => ({ ...prev, [pointId]: value }));
  }, []);

  const handleSubmitRun = useCallback(() => {
    if (!selectedProtocol || !operator) return;

    const samples: CleaningSample[] = selectedProtocol.samplingPlan.map((sp) => {
      const limit = selectedProtocol.acceptanceCriteria.find((c) => c.method === sp.method)
        || selectedProtocol.acceptanceCriteria[0];
      const resultValue = parseFloat(sampleValues[sp.id] || "0");
      const passFail: "pass" | "fail" =
        sp.method === "visual"
          ? (sampleValues[sp.id] === "pass" ? "pass" : "fail")
          : resultValue <= limit.acceptanceValue
          ? "pass"
          : "fail";

      return {
        id: `smp-new-${sp.id}-${Date.now()}`,
        samplingPointId: sp.id,
        location: sp.label,
        method: sp.method,
        result: sp.method === "visual" ? (passFail === "pass" ? 0 : 1) : resultValue,
        resultUnit: limit.acceptanceUnit,
        limit: limit.acceptanceValue,
        limitUnit: limit.acceptanceUnit,
        passFail,
        sampledBy: operator,
        sampledAt: new Date().toISOString(),
        analyzedBy: operator,
        analyzedAt: new Date().toISOString(),
      };
    });

    const hasFail = samples.some((s) => s.passFail === "fail");
    const now = new Date().toISOString();

    const newRun = cleaningStore.createRun({
      protocolId: selectedProtocol.id,
      protocolNumber: selectedProtocol.number,
      equipment: selectedProtocol.equipment,
      equipmentType: selectedProtocol.equipmentType,
      fromProduct: selectedProtocol.fromProduct,
      toProduct: selectedProtocol.toProduct,
      runDate: now,
      operator,
      samples,
      overallResult: hasFail ? "fail" : "pass",
      status: hasFail ? "failed" : "passed",
      startedAt: now,
      completedAt: now,
      batchNumber: batchNumber || undefined,
    });

    setLastResult(newRun);
    setSubmitted(true);
  }, [selectedProtocol, operator, batchNumber, sampleValues]);

  const handleReset = useCallback(() => {
    setSelectedProtocolId("");
    setOperator("");
    setBatchNumber("");
    setSampleValues({});
    setSubmitted(false);
    setLastResult(null);
  }, []);

  if (submitted && lastResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {lastResult.overallResult === "pass" ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              Cleaning Run {lastResult.overallResult === "pass" ? "PASSED" : "FAILED"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block">Protocol</span>
                <span className="font-mono font-medium">{lastResult.protocolNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Equipment</span>
                <span className="font-medium">{shortEquipmentName(lastResult.equipment)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Operator</span>
                <span className="font-medium">{lastResult.operator}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Date</span>
                <span className="font-medium">{formatDate(lastResult.runDate)}</span>
              </div>
            </div>

            <Separator />

            <h3 className="text-sm font-semibold">Sample Results</h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastResult.samples.map((s, i) => (
                    <TableRow
                      key={s.id}
                      className={s.passFail === "fail" ? "bg-red-50/50" : ""}
                    >
                      <TableCell className="font-mono">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{s.location}</TableCell>
                      <TableCell className="capitalize text-sm">{s.method}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {s.method === "visual" ? (s.passFail === "pass" ? "Clean" : "Residue") : s.result.toFixed(3)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {s.limit > 0 ? s.limit : ""} {s.limitUnit}
                      </TableCell>
                      <TableCell>
                        {s.passFail === "pass" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleReset} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Start New Run
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Protocol Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Play className="h-4 w-4 text-indigo-600" />
            Select Protocol & Enter Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Protocol</label>
              <Select value={selectedProtocolId} onValueChange={setSelectedProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol..." />
                </SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number} - {shortEquipmentName(p.equipment)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Operator</label>
              <Input
                placeholder="Enter operator name..."
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Batch Number (optional)</label>
              <Input
                placeholder="e.g. AMX-B2026-020"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sampling Form */}
      {selectedProtocol && (
        <>
          {/* Equipment Diagram */}
          <EquipmentDiagram protocol={selectedProtocol} />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                Record Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Sampling Point</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead className="w-[200px]">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProtocol.samplingPlan.map((sp, idx) => {
                      const limit = selectedProtocol.acceptanceCriteria.find(
                        (c) => c.method === sp.method
                      ) || selectedProtocol.acceptanceCriteria[0];
                      const value = sampleValues[sp.id] || "";
                      const numericValue = parseFloat(value);
                      const isOverLimit =
                        sp.method !== "visual" && !isNaN(numericValue) && numericValue > limit.acceptanceValue;

                      return (
                        <TableRow
                          key={sp.id}
                          className={cn(isOverLimit && "bg-red-50/50")}
                        >
                          <TableCell className="font-mono text-sm">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{sp.label}</span>
                              <span className="block text-xs text-muted-foreground">{sp.description}</span>
                              {sp.worstCase && (
                                <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0 h-4 border-amber-300 text-amber-700">
                                  Worst-case
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm capitalize">
                              <MethodIcon method={sp.method} className="text-muted-foreground" />
                              {sp.method}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {limit.acceptanceValue > 0 ? limit.acceptanceValue : ""} {limit.acceptanceUnit}
                          </TableCell>
                          <TableCell>
                            {sp.method === "visual" ? (
                              <Select
                                value={value || ""}
                                onValueChange={(v) => handleSampleValueChange(sp.id, v)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pass">Clean - No visible residue</SelectItem>
                                  <SelectItem value="fail">Residue detected</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={value}
                                onChange={(e) => handleSampleValueChange(sp.id, e.target.value)}
                                className={cn(
                                  "h-8 text-sm font-mono",
                                  isOverLimit && "border-red-400 focus-visible:ring-red-400"
                                )}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {selectedProtocol.samplingPlan.length} sampling points |{" "}
                  {Object.keys(sampleValues).filter((k) => sampleValues[k] !== "").length} recorded
                </p>
                <Button
                  onClick={handleSubmitRun}
                  disabled={
                    !operator ||
                    Object.keys(sampleValues).filter((k) => sampleValues[k] !== "").length <
                      selectedProtocol.samplingPlan.length
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedProtocol && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Droplets className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a cleaning protocol above to begin recording a cleaning validation run.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 3: Results
   ═══════════════════════════════════════════════════════════════════ */

function ResultsTab() {
  const [runs, setRuns] = useState<CleaningRun[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "result">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRun, setSelectedRun] = useState<CleaningRun | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setRuns(cleaningStore.getAllRuns());
  }, []);

  const filtered = useMemo(() => {
    let result = runs.filter((r) => {
      if (statusFilter !== "all" && r.overallResult !== statusFilter) return false;
      if (equipmentFilter !== "all" && r.equipmentType !== equipmentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.protocolNumber.toLowerCase().includes(q) ||
          r.equipment.toLowerCase().includes(q) ||
          r.operator.toLowerCase().includes(q) ||
          (r.batchNumber || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortField === "date") {
        const diff = new Date(a.runDate).getTime() - new Date(b.runDate).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      // Sort by result: pass < pending < fail
      const order = { pass: 0, pending: 1, fail: 2 };
      const diff = order[a.overallResult] - order[b.overallResult];
      return sortDir === "asc" ? diff : -diff;
    });

    return result;
  }, [runs, search, statusFilter, equipmentFilter, sortField, sortDir]);

  const toggleSort = (field: "date" | "result") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Trend: pass rate over last 6 months
  const trendData = useMemo(() => {
    const months: { month: string; passRate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthRuns = runs.filter((r) => {
        const rd = new Date(r.runDate);
        return rd >= start && rd <= end;
      });
      const passed = monthRuns.filter((r) => r.overallResult === "pass").length;
      months.push({
        month: start.toLocaleDateString("en-US", { month: "short" }),
        passRate: monthRuns.length > 0 ? Math.round((passed / monthRuns.length) * 100) : 100,
      });
    }
    return months;
  }, [runs]);

  return (
    <div className="space-y-4">
      {/* Trend Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Pass Rate Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-16">
            {trendData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t",
                    m.passRate >= 90
                      ? "bg-green-500"
                      : m.passRate >= 70
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ height: `${(m.passRate / 100) * 48}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{m.month}</span>
                <span className="text-[10px] font-medium">{m.passRate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search runs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            <SelectItem value="tablet-press">Tablet Press</SelectItem>
            <SelectItem value="fbd">Fluid Bed Dryer</SelectItem>
            <SelectItem value="coating-pan">Coating Pan</SelectItem>
            <SelectItem value="mixer">Mixer</SelectItem>
            <SelectItem value="filling-line">Filling Line</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Changeover</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("date")}
              >
                <span className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("result")}
              >
                <span className="flex items-center gap-1">
                  Result
                  <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead>Samples</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No runs found matching the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{r.protocolNumber}</TableCell>
                  <TableCell className="text-sm">{shortEquipmentName(r.equipment)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                    <span className="block truncate">{r.fromProduct}</span>
                    <span className="block truncate">→ {r.toProduct}</span>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(r.runDate)}</TableCell>
                  <TableCell className="text-sm">{r.operator}</TableCell>
                  <TableCell className="font-mono text-xs">{r.batchNumber || "-"}</TableCell>
                  <TableCell>{resultBadge(r.overallResult)}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium text-green-600">
                      {r.samples.filter((s) => s.passFail === "pass").length}
                    </span>
                    /
                    <span>{r.samples.length}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRun(r);
                        setDetailOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RunDetailDialog run={selectedRun} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 4: Analytics
   ═══════════════════════════════════════════════════════════════════ */

function AnalyticsTab() {
  const [metrics, setMetrics] = useState<CleaningMetrics | null>(null);

  useEffect(() => {
    setMetrics(cleaningStore.getMetrics());
  }, []);

  if (!metrics) return null;

  const maxBarHeight = 80;

  return (
    <div className="space-y-6">
      {/* Pass Rate by Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Pass Rate by Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.passByEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <div className="space-y-3">
              {metrics.passByEquipment.map((eq) => (
                <div key={eq.equipment} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[300px]">
                      {shortEquipmentName(eq.equipment)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold",
                          eq.passRate >= 90
                            ? "text-green-600"
                            : eq.passRate >= 70
                            ? "text-amber-600"
                            : "text-red-600"
                        )}
                      >
                        {eq.passRate}%
                      </span>
                      <span className="text-xs text-muted-foreground">({eq.total} runs)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        eq.passRate >= 90
                          ? "bg-green-500"
                          : eq.passRate >= 70
                          ? "bg-amber-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${eq.passRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sampling Point Failure Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Sampling Point Failure Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.failuresByPoint.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failures recorded across any sampling points.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sampling Point</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Total Samples</TableHead>
                    <TableHead>Failure Rate</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.failuresByPoint.map((fp) => {
                    const rate = Math.round((fp.failures / fp.total) * 100);
                    return (
                      <TableRow key={fp.point}>
                        <TableCell className="font-medium text-sm">{fp.point}</TableCell>
                        <TableCell className="font-mono text-red-600">{fp.failures}</TableCell>
                        <TableCell className="font-mono">{fp.total}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-bold",
                              rate > 20 ? "text-red-600" : rate > 10 ? "text-amber-600" : "text-green-600"
                            )}
                          >
                            {rate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {rate > 15 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Run Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            Monthly Cleaning Run Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-24">
            {metrics.monthlyTrend.map((m, i) => {
              const total = m.passed + m.failed;
              const maxVal = Math.max(...metrics.monthlyTrend.map((t) => t.passed + t.failed), 1);
              const passH = total > 0 ? (m.passed / maxVal) * maxBarHeight : 0;
              const failH = total > 0 ? (m.failed / maxVal) * maxBarHeight : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-medium">{total}</span>
                  <div className="w-full flex flex-col items-center">
                    {failH > 0 && (
                      <div
                        className="w-full bg-red-500 rounded-t"
                        style={{ height: `${failH}px` }}
                      />
                    )}
                    {passH > 0 && (
                      <div
                        className={cn("w-full bg-green-500", failH === 0 && "rounded-t")}
                        style={{ height: `${passH}px` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Passed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Failed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* MACO Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-green-600" />
            MACO Compliance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cleaningStore.getAllProtocols()
              .filter((p) => p.acceptanceCriteria.some((c) => c.macoParams))
              .map((p) => {
                const macoParam = p.acceptanceCriteria.find((c) => c.macoParams)?.macoParams;
                if (!macoParam) return null;
                const macoVal = calculateMACO(macoParam);
                const protocolRuns = cleaningStore.getRunsByProtocol(p.id);
                const latestRun = protocolRuns.sort(
                  (a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime()
                )[0];
                const worstResult = latestRun
                  ? Math.max(...latestRun.samples.filter((s) => s.limit > 0).map((s) => s.result))
                  : 0;
                const worstLimit = latestRun
                  ? Math.max(...latestRun.samples.filter((s) => s.limit > 0).map((s) => s.limit))
                  : 1;
                const compliancePct = worstLimit > 0 ? Math.round((worstResult / worstLimit) * 100) : 0;

                return (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="font-mono w-28 shrink-0">{p.number}</span>
                    <span className="truncate flex-1 text-muted-foreground">
                      {shortEquipmentName(p.equipment)}
                    </span>
                    <span className="font-mono text-xs w-24 text-right">
                      MACO: {macoVal.toFixed(2)} mg
                    </span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          compliancePct <= 50
                            ? "bg-green-500"
                            : compliancePct <= 80
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(compliancePct, 100)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs w-12 text-right",
                        compliancePct <= 50
                          ? "text-green-600"
                          : compliancePct <= 80
                          ? "text-amber-600"
                          : "text-red-600"
                      )}
                    >
                      {compliancePct}%
                    </span>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Bar shows worst-case sample result as percentage of acceptance limit from the latest run.
          </p>
        </CardContent>
      </Card>

      {/* Revalidation Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            Revalidation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.revalidationSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revalidation schedules configured.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Until Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.revalidationSchedule.map((item) => (
                    <TableRow key={item.protocolNumber}>
                      <TableCell className="font-mono text-sm">{item.protocolNumber}</TableCell>
                      <TableCell className="text-sm">{shortEquipmentName(item.equipment)}</TableCell>
                      <TableCell className="text-sm">{formatDate(item.dueDate)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono font-bold",
                            item.daysUntilDue < 0
                              ? "text-red-600"
                              : item.daysUntilDue < 30
                              ? "text-amber-600"
                              : "text-green-600"
                          )}
                        >
                          {item.daysUntilDue < 0
                            ? `${Math.abs(item.daysUntilDue)}d overdue`
                            : `${item.daysUntilDue}d`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.daysUntilDue < 0 ? (
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                            Overdue
                          </Badge>
                        ) : item.daysUntilDue < 30 ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                            Upcoming
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                            On Track
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export default function CleaningValidationPage() {
  const [metrics, setMetrics] = useState<CleaningMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("protocols");

  useEffect(() => {
    setMetrics(cleaningStore.getMetrics());
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Cleaning Validation"
        description="Manage cleaning validation protocols, execute cleaning runs, and monitor MACO compliance across all equipment."
        icon={<Droplets className="h-6 w-6 text-blue-600" />}
      />

      {/* Stats Cards */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            icon={FileText}
            title="Active Protocols"
            value={metrics.activeProtocols}
            subtitle={`${metrics.totalProtocols} total`}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard
            icon={Activity}
            title="Runs This Month"
            value={metrics.runsThisMonth}
            subtitle="Cleaning runs executed"
            iconColor="bg-indigo-100 text-indigo-600"
          />
          <StatsCard
            icon={CheckCircle}
            title="Pass Rate"
            value={`${metrics.passRate}%`}
            subtitle="Overall pass rate"
            iconColor="bg-green-100 text-green-600"
            change={metrics.passRate >= 95 ? 2 : metrics.passRate >= 85 ? 0 : -3}
          />
          <StatsCard
            icon={RefreshCw}
            title="Due for Revalidation"
            value={metrics.dueForRevalidation}
            subtitle="Protocols needing revalidation"
            iconColor="bg-orange-100 text-orange-600"
          />
          <StatsCard
            icon={XCircle}
            title="Failed Runs"
            value={metrics.failedRuns}
            subtitle="Requires investigation"
            iconColor="bg-red-100 text-red-600"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Protocols</span>
          </TabsTrigger>
          <TabsTrigger value="execute" className="flex items-center gap-1.5">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Execute Run</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocols">
          <ProtocolsTab />
        </TabsContent>
        <TabsContent value="execute">
          <ExecuteRunTab />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
