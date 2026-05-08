"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Beaker,
  FlaskConical,
  Scale,
} from "lucide-react";
import type {
  MasterBatchRecord,
  BatchProductionRecord,
  VarianceRecord,
} from "@/lib/manufacturing/mbr-types";

// ── Helpers ───────────────────────────────────────────────────────
function varianceColor(variancePct: number, tolerancePct: number): string {
  const absVar = Math.abs(variancePct);
  if (absVar <= tolerancePct * 0.5) return "text-green-700 bg-green-50";
  if (absVar <= tolerancePct) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

function varianceBadge(withinTolerance: boolean, variancePct: number, tolerancePct: number) {
  const absVar = Math.abs(variancePct);
  if (withinTolerance && absVar <= tolerancePct * 0.5) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(2)}%
      </Badge>
    );
  }
  if (withinTolerance) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
        <AlertTriangle className="h-3 w-3" />
        {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(2)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
      <XCircle className="h-3 w-3" />
      {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(2)}%
    </Badge>
  );
}

function yieldStatusColor(status: "pass" | "investigation" | "fail"): string {
  if (status === "pass") return "text-green-700";
  if (status === "investigation") return "text-yellow-700";
  return "text-red-700";
}

// ── Props ─────────────────────────────────────────────────────────
interface MBRBPRComparisonProps {
  mbr: MasterBatchRecord;
  bpr: BatchProductionRecord;
  variances: VarianceRecord[];
  className?: string;
}

export default function MBRBPRComparison({
  mbr,
  bpr,
  variances,
  className,
}: MBRBPRComparisonProps) {
  // Map variances by step+parameter for quick lookup
  const varianceMap = new Map<string, VarianceRecord>();
  for (const v of variances) {
    varianceMap.set(`${v.stepNumber}-${v.parameter}`, v);
  }

  // Summary counts
  const totalParams = variances.length;
  const withinTol = variances.filter((v) => v.withinTolerance).length;
  const nearLimit = variances.filter(
    (v) => v.withinTolerance && Math.abs(v.variancePercent) > v.tolerancePercent * 0.5
  ).length;
  const outOfTol = variances.filter((v) => !v.withinTolerance).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <FlaskConical className="h-4 w-4" />
              Master Batch Record (Theoretical)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">MBR Number:</span>
              <span className="font-medium">{mbr.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{mbr.product}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">v{mbr.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batch Size:</span>
              <span className="font-medium">
                {mbr.approvedBatchSize.toLocaleString()} {mbr.batchSizeUnit}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <Beaker className="h-4 w-4" />
              Batch Production Record (Actual)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">BPR Number:</span>
              <span className="font-medium">{bpr.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batch #:</span>
              <span className="font-medium">{bpr.batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="capitalize">{bpr.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Size:</span>
              <span className="font-medium">
                {bpr.batchSize.toLocaleString()} {bpr.batchSizeUnit}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Summary Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Variance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Within Tolerance: {withinTol - nearLimit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Near Limit: {nearLimit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Out of Tolerance: {outOfTol}</span>
            </div>
          </div>
          {totalParams > 0 && (
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {(withinTol - nearLimit) > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${((withinTol - nearLimit) / totalParams) * 100}%` }}
                />
              )}
              {nearLimit > 0 && (
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${(nearLimit / totalParams) * 100}%` }}
                />
              )}
              {outOfTol > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(outOfTol / totalParams) * 100}%` }}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step-by-Step Parameter Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mbr.steps.map((mbrStep) => {
            const execution = bpr.stepExecutions.find(
              (e) => e.mbrStepId === mbrStep.id
            );
            const isExecuted = !!execution;

            return (
              <div key={mbrStep.id}>
                <div className="px-4 py-3 bg-muted/50 border-y flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      Step {mbrStep.stepNumber}
                    </Badge>
                    <span className="font-medium text-sm capitalize">
                      {mbrStep.operation}
                    </span>
                    <span className="text-muted-foreground text-xs hidden md:inline">
                      {mbrStep.description}
                    </span>
                  </div>
                  {isExecuted ? (
                    execution.deviationFlag ? (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <XCircle className="h-3 w-3" />
                        Deviation
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Compliant
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Not Executed
                    </Badge>
                  )}
                </div>

                {isExecuted && (
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-[200px]">Parameter</TableHead>
                        <TableHead className="text-blue-700">
                          Target (MBR)
                        </TableHead>
                        <TableHead className="text-emerald-700">
                          Actual (BPR)
                        </TableHead>
                        <TableHead>Tolerance</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mbrStep.parameters.map((p) => {
                        const v = varianceMap.get(
                          `${mbrStep.stepNumber}-${p.name}`
                        );
                        const actualParam = execution.actualValues.find(
                          (a) => a.parameterName === p.name
                        );
                        if (!v || !actualParam) return null;

                        return (
                          <TableRow
                            key={p.name}
                            className={cn(
                              "text-sm",
                              !v.withinTolerance && "bg-red-50/50"
                            )}
                          >
                            <TableCell className="font-medium">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-blue-700 font-mono">
                              {p.targetValue} {p.unit}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "font-mono",
                                varianceColor(v.variancePercent, v.tolerancePercent)
                              )}
                            >
                              {actualParam.actualValue} {p.unit}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              ±{p.tolerancePercent}%
                            </TableCell>
                            <TableCell>
                              {varianceBadge(
                                v.withinTolerance,
                                v.variancePercent,
                                v.tolerancePercent
                              )}
                            </TableCell>
                            <TableCell>
                              {v.withinTolerance ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Formulation Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Formulation: Theoretical vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Material</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-blue-700">Theoretical</TableHead>
                <TableHead className="text-emerald-700">Actual</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mbr.formulation.ingredients.map((ing) => {
                const usage = bpr.materialUsage.find(
                  (u) => u.materialCode === ing.materialCode
                );
                if (!usage) {
                  return (
                    <TableRow key={ing.id} className="text-sm bg-muted/30">
                      <TableCell className="font-medium">
                        {ing.materialName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ing.materialCode}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {ing.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-700 font-mono">
                        {ing.theoreticalQuantity.toLocaleString()} {ing.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Not dispensed
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          Pending
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow
                    key={ing.id}
                    className={cn(
                      "text-sm",
                      !usage.withinTolerance && "bg-red-50/50"
                    )}
                  >
                    <TableCell className="font-medium">
                      {ing.materialName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {ing.materialCode}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ing.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-blue-700 font-mono">
                      {ing.theoreticalQuantity.toLocaleString()} {ing.unit}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono",
                        varianceColor(
                          usage.variancePercent,
                          1.0
                        )
                      )}
                    >
                      {usage.actualQuantity.toLocaleString()} {ing.unit}
                    </TableCell>
                    <TableCell>
                      {varianceBadge(usage.withinTolerance, usage.variancePercent, 1.0)}
                    </TableCell>
                    <TableCell>
                      {usage.withinTolerance ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Yield Reconciliation Bar */}
      {bpr.yieldReconciliation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Yield Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">
                  Theoretical Yield
                </span>
                <span className="text-lg font-semibold">
                  {bpr.yieldReconciliation.theoreticalYield.toLocaleString()}{" "}
                  {bpr.yieldReconciliation.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Actual Yield
                </span>
                <span className="text-lg font-semibold">
                  {bpr.yieldReconciliation.actualYield.toLocaleString()}{" "}
                  {bpr.yieldReconciliation.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Yield %</span>
                <span
                  className={cn(
                    "text-lg font-semibold",
                    yieldStatusColor(bpr.yieldReconciliation.reconciliationStatus)
                  )}
                >
                  {bpr.yieldReconciliation.yieldPercent}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status</span>
                <Badge
                  variant={
                    bpr.yieldReconciliation.reconciliationStatus === "pass"
                      ? "outline"
                      : bpr.yieldReconciliation.reconciliationStatus === "investigation"
                      ? "secondary"
                      : "destructive"
                  }
                  className={cn(
                    bpr.yieldReconciliation.reconciliationStatus === "pass" &&
                      "bg-green-50 text-green-700 border-green-200"
                  )}
                >
                  {bpr.yieldReconciliation.reconciliationStatus === "pass"
                    ? "Acceptable"
                    : bpr.yieldReconciliation.reconciliationStatus === "investigation"
                    ? "Under Investigation"
                    : "Failed"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Yield bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Acceptable Range: {bpr.yieldReconciliation.acceptableRangeMin}% -{" "}
                  {bpr.yieldReconciliation.acceptableRangeMax}%
                </span>
                <span>
                  Material Balance: {bpr.yieldReconciliation.materialBalance}%
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(bpr.yieldReconciliation.yieldPercent, 100)}
                  className="h-6"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {bpr.yieldReconciliation.yieldPercent}% Yield
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Rejected: {bpr.yieldReconciliation.rejectedQuantity.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  Sampled: {bpr.yieldReconciliation.sampledQuantity.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Arrow graphic showing flow */}
            <div className="flex items-center gap-2 text-sm justify-center pt-2">
              <div className="text-center px-3 py-1.5 rounded bg-blue-50 text-blue-700 font-medium">
                {bpr.yieldReconciliation.theoreticalYield.toLocaleString()}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div
                className={cn(
                  "text-center px-3 py-1.5 rounded font-medium",
                  bpr.yieldReconciliation.reconciliationStatus === "pass"
                    ? "bg-green-50 text-green-700"
                    : bpr.yieldReconciliation.reconciliationStatus === "investigation"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {bpr.yieldReconciliation.actualYield.toLocaleString()}
              </div>
              <span className="text-muted-foreground">
                ({bpr.yieldReconciliation.yieldPercent}%)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
