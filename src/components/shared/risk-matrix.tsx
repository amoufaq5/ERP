"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

/* ───── types ───── */
export interface RiskDot {
  id: string;
  label: string;
  severity: number;
  occurrence: number;
  rpn: number;
  riskLevel: string;
  failureMode?: string;
  effect?: string;
  cause?: string;
  currentControls?: string;
  /* residual (post-mitigation) */
  residualSeverity?: number;
  residualOccurrence?: number;
  residualRPN?: number;
  residualRiskLevel?: string;
}

interface RiskMatrixProps {
  items: RiskDot[];
  showResidual?: boolean;
  className?: string;
}

/* ───── 5x5 colour mapping ───── */
// severity rows (top = 5/highest), occurrence columns (left = 1/lowest)
// Matrix[severity_bucket][occurrence_bucket]
const COLORS: Record<string, string> = {
  green: "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700",
  yellow: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700",
  orange: "bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700",
  red: "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700",
};

// [severity_row (5=top → 0 index)][occurrence_col (1=left → 0 index)]
const MATRIX_COLORS: string[][] = [
  // sev 9-10 (row index 0, displayed at top)
  ["yellow", "orange", "red",    "red",    "red"],
  // sev 7-8
  ["yellow", "yellow", "orange", "red",    "red"],
  // sev 5-6
  ["green",  "yellow", "yellow", "orange", "red"],
  // sev 3-4
  ["green",  "green",  "yellow", "yellow", "orange"],
  // sev 1-2
  ["green",  "green",  "green",  "yellow", "yellow"],
];

function severityBucket(s: number): number {
  if (s >= 9) return 0;
  if (s >= 7) return 1;
  if (s >= 5) return 2;
  if (s >= 3) return 3;
  return 4;
}

function occurrenceBucket(o: number): number {
  if (o >= 9) return 4;
  if (o >= 7) return 3;
  if (o >= 5) return 2;
  if (o >= 3) return 1;
  return 0;
}

const SEV_LABELS = ["9-10", "7-8", "5-6", "3-4", "1-2"];
const OCC_LABELS = ["1-2", "3-4", "5-6", "7-8", "9-10"];

/* ───── Component ───── */
export default function RiskMatrix({
  items,
  showResidual = false,
  className,
}: RiskMatrixProps) {
  const [selected, setSelected] = useState<RiskDot | null>(null);

  /* group items into cells */
  const cellMap = useMemo(() => {
    const map = new Map<string, RiskDot[]>();
    for (const item of items) {
      const sev = item.severity;
      const occ = item.occurrence;
      const key = `${severityBucket(sev)}-${occurrenceBucket(occ)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  /* residual dots */
  const residualCellMap = useMemo(() => {
    if (!showResidual) return new Map<string, RiskDot[]>();
    const map = new Map<string, RiskDot[]>();
    for (const item of items) {
      if (item.residualSeverity == null || item.residualOccurrence == null) continue;
      const key = `${severityBucket(item.residualSeverity)}-${occurrenceBucket(item.residualOccurrence)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items, showResidual]);

  return (
    <>
      <div className={cn("w-full", className)}>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
            Original Risk
          </span>
          {showResidual && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-dashed border-emerald-700 inline-block" />
              Residual Risk
            </span>
          )}
        </div>

        <div className="flex">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center mr-2">
            <span className="text-xs font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180 tracking-widest">
              SEVERITY
            </span>
          </div>

          <div className="flex-1">
            {/* Grid */}
            <div className="grid grid-cols-5 gap-0.5">
              {MATRIX_COLORS.flatMap((row, sRow) =>
                row.map((color, oCol) => {
                  const key = `${sRow}-${oCol}`;
                  const dots = cellMap.get(key) || [];
                  const resDots = residualCellMap.get(key) || [];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative flex flex-wrap items-center justify-center gap-0.5 min-h-[52px] rounded border p-1",
                        COLORS[color]
                      )}
                    >
                      {/* Original risk dots */}
                      {dots.map((dot) => (
                        <button
                          key={dot.id}
                          onClick={() => setSelected(dot)}
                          title={dot.label}
                          className="h-4 w-4 rounded-full bg-blue-500 hover:bg-blue-600 border border-blue-700 shadow-sm transition-transform hover:scale-125 cursor-pointer"
                        />
                      ))}
                      {/* Residual dots */}
                      {showResidual &&
                        resDots.map((dot) => (
                          <button
                            key={`res-${dot.id}`}
                            onClick={() => setSelected(dot)}
                            title={`${dot.label} (residual)`}
                            className="h-4 w-4 rounded-full bg-emerald-500 hover:bg-emerald-600 border-2 border-dashed border-emerald-700 shadow-sm transition-transform hover:scale-125 cursor-pointer"
                          />
                        ))}
                    </div>
                  );
                })
              )}
            </div>

            {/* X-axis labels */}
            <div className="grid grid-cols-5 gap-0.5 mt-1">
              {OCC_LABELS.map((l) => (
                <div
                  key={l}
                  className="text-[10px] font-medium text-muted-foreground text-center"
                >
                  {l}
                </div>
              ))}
            </div>
            <div className="text-center mt-1">
              <span className="text-xs font-semibold text-muted-foreground tracking-widest">
                OCCURRENCE / LIKELIHOOD
              </span>
            </div>
          </div>

          {/* Y-axis labels */}
          <div className="flex flex-col gap-0.5 ml-1 justify-start">
            {SEV_LABELS.map((l) => (
              <div
                key={l}
                className="min-h-[52px] flex items-center text-[10px] font-medium text-muted-foreground"
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.label}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.failureMode && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Failure Mode:
                  </span>{" "}
                  {selected.failureMode}
                </div>
              )}
              {selected.effect && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Effect:
                  </span>{" "}
                  {selected.effect}
                </div>
              )}
              {selected.cause && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Cause:
                  </span>{" "}
                  {selected.cause}
                </div>
              )}
              {selected.currentControls && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Current Controls:
                  </span>{" "}
                  {selected.currentControls}
                </div>
              )}
              <Separator />
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-medium text-muted-foreground">S:</span>{" "}
                  {selected.severity}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">O:</span>{" "}
                  {selected.occurrence}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    RPN:
                  </span>{" "}
                  <span className="font-bold">{selected.rpn}</span>
                </div>
                <Badge
                  variant={
                    selected.riskLevel === "critical"
                      ? "destructive"
                      : selected.riskLevel === "high"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selected.riskLevel}
                </Badge>
              </div>
              {selected.residualSeverity != null && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    After Mitigation
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        S:
                      </span>{" "}
                      {selected.residualSeverity}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        O:
                      </span>{" "}
                      {selected.residualOccurrence}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        RPN:
                      </span>{" "}
                      <span className="font-bold">{selected.residualRPN}</span>
                    </div>
                    {selected.residualRiskLevel && (
                      <Badge variant="secondary">
                        {selected.residualRiskLevel}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
