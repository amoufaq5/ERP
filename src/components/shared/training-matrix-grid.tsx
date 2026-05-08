"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Info } from "lucide-react";
import type { TrainingMatrixCell, CompetencyLevel, TrainingStatus } from "@/lib/quality/training-types";

/* ─── helpers ─── */

function cellBg(
  status: TrainingStatus | "not-required",
  competency: CompetencyLevel,
  daysUntilExpiry?: number
): string {
  if (status === "not-required") return "bg-gray-100 dark:bg-gray-800";
  if (status === "overdue" || status === "expired") return "bg-red-100 dark:bg-red-900/40";
  if (status === "in-progress") return "bg-blue-100 dark:bg-blue-900/40";
  if (status === "scheduled") return "bg-amber-50 dark:bg-amber-900/30";
  if (status === "completed") {
    if (daysUntilExpiry != null && daysUntilExpiry <= 30) {
      return "bg-yellow-100 dark:bg-yellow-900/40";
    }
    if (competency === "expert") return "bg-emerald-100 dark:bg-emerald-900/40";
    return "bg-green-100 dark:bg-green-900/40";
  }
  return "bg-gray-50 dark:bg-gray-800";
}

function cellBorder(
  status: TrainingStatus | "not-required",
  competency: CompetencyLevel,
  daysUntilExpiry?: number
): string {
  if (status === "not-required") return "border-gray-200 dark:border-gray-700";
  if (status === "overdue" || status === "expired") return "border-red-300 dark:border-red-700";
  if (status === "in-progress") return "border-blue-300 dark:border-blue-700";
  if (status === "scheduled") return "border-amber-300 dark:border-amber-700";
  if (status === "completed") {
    if (daysUntilExpiry != null && daysUntilExpiry <= 30) {
      return "border-yellow-400 dark:border-yellow-600";
    }
    return "border-green-300 dark:border-green-700";
  }
  return "border-gray-200 dark:border-gray-700";
}

function statusLabel(status: TrainingStatus | "not-required"): string {
  const labels: Record<string, string> = {
    "not-required": "N/A",
    scheduled: "Scheduled",
    "in-progress": "In Progress",
    completed: "Completed",
    overdue: "Overdue",
    expired: "Expired",
  };
  return labels[status] || status;
}

function competencyAbbrev(level: CompetencyLevel): string {
  const abbrev: Record<CompetencyLevel, string> = {
    "not-trained": "--",
    "in-training": "IT",
    competent: "C",
    expert: "E",
  };
  return abbrev[level];
}

function competencyLabel(level: CompetencyLevel): string {
  const labels: Record<CompetencyLevel, string> = {
    "not-trained": "Not Trained",
    "in-training": "In Training",
    competent: "Competent",
    expert: "Expert",
  };
  return labels[level];
}

/* ─── types ─── */

interface TrainingMatrixGridProps {
  cells: TrainingMatrixCell[];
  onCellClick?: (cell: TrainingMatrixCell) => void;
  compact?: boolean;
  className?: string;
}

/* ─── component ─── */

export default function TrainingMatrixGrid({
  cells,
  onCellClick,
  compact: initialCompact = false,
  className,
}: TrainingMatrixGridProps) {
  const [compact, setCompact] = useState(initialCompact);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Derive unique employees (rows) and documents (columns)
  const employees = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; role: string; department: string }>();
    for (const c of cells) {
      if (!seen.has(c.employeeId)) {
        seen.set(c.employeeId, {
          id: c.employeeId,
          name: c.employeeName,
          role: c.employeeRole,
          department: c.department,
        });
      }
    }
    return Array.from(seen.values());
  }, [cells]);

  const documents = useMemo(() => {
    const seen = new Map<string, { id: string; title: string }>();
    for (const c of cells) {
      if (!seen.has(c.documentId)) {
        seen.set(c.documentId, { id: c.documentId, title: c.documentTitle });
      }
    }
    return Array.from(seen.values());
  }, [cells]);

  const getCellData = useCallback(
    (empId: string, docId: string): TrainingMatrixCell | undefined =>
      cells.find((c) => c.employeeId === empId && c.documentId === docId),
    [cells]
  );

  const cellSize = compact ? "h-8 w-8" : "h-12 w-12";
  const fontSize = compact ? "text-[9px]" : "text-xs";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Training Matrix</CardTitle>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs mr-4">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-green-200 border border-green-400" />
                Competent
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200 border border-emerald-400" />
                Expert
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-200 border border-blue-400" />
                In Training
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-200 border border-red-400" />
                Overdue
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-yellow-200 border border-yellow-400" />
                Expiring
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-gray-200 border border-gray-400" />
                N/A
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompact(!compact)}
              className="h-7 gap-1"
            >
              {compact ? <ZoomIn className="h-3.5 w-3.5" /> : <ZoomOut className="h-3.5 w-3.5" />}
              {compact ? "Expand" : "Compact"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[600px]">
          <table className="border-collapse w-full">
            <thead>
              <tr>
                {/* Sticky top-left corner */}
                <th
                  className="sticky top-0 left-0 z-30 bg-background border-b border-r px-3 py-2 text-left text-xs font-semibold min-w-[180px]"
                >
                  Employee / Role
                </th>
                {documents.map((doc) => (
                  <th
                    key={doc.id}
                    className="sticky top-0 z-20 bg-background border-b px-1 py-2 text-center"
                  >
                    <div
                      className={cn(
                        "writing-mode-vertical whitespace-nowrap font-medium",
                        compact ? "text-[9px]" : "text-[10px]"
                      )}
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        maxHeight: compact ? 90 : 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={`${doc.id}: ${doc.title}`}
                    >
                      {doc.title}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="group">
                  {/* Sticky row header */}
                  <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1.5">
                    <div className="flex flex-col">
                      <span className={cn("font-medium leading-tight", compact ? "text-xs" : "text-sm")}>
                        {emp.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {emp.role} &middot; {emp.department}
                      </span>
                    </div>
                  </td>
                  {documents.map((doc) => {
                    const cell = getCellData(emp.id, doc.id);
                    if (!cell) return <td key={doc.id} className="border-b p-0.5" />;

                    const cellKey = `${emp.id}-${doc.id}`;
                    const isHovered = hoveredCell === cellKey;

                    return (
                      <td key={doc.id} className="border-b p-0.5 text-center">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center justify-center rounded border transition-all",
                              cellSize,
                              fontSize,
                              "font-semibold",
                              cellBg(cell.status, cell.competencyLevel, cell.daysUntilExpiry),
                              cellBorder(cell.status, cell.competencyLevel, cell.daysUntilExpiry),
                              cell.status !== "not-required" && "cursor-pointer hover:ring-2 hover:ring-primary/40",
                              cell.status === "not-required" && "cursor-default opacity-50"
                            )}
                            onClick={() => {
                              if (cell.status !== "not-required" && onCellClick) {
                                onCellClick(cell);
                              }
                            }}
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            title={`${emp.name} - ${doc.title}: ${statusLabel(cell.status)}`}
                          >
                            {competencyAbbrev(cell.competencyLevel)}
                          </button>

                          {/* Hover tooltip */}
                          {isHovered && cell.status !== "not-required" && (
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border bg-popover p-3 shadow-lg text-left pointer-events-none">
                              <p className="text-xs font-semibold text-foreground mb-1">
                                {doc.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground mb-2">
                                {doc.id}
                              </p>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge
                                    variant={
                                      cell.status === "completed"
                                        ? "default"
                                        : cell.status === "overdue" || cell.status === "expired"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="text-[10px] h-4"
                                  >
                                    {statusLabel(cell.status)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Competency:</span>
                                  <span className="font-medium">{competencyLabel(cell.competencyLevel)}</span>
                                </div>
                                {cell.lastTrainingDate && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last trained:</span>
                                    <span>{new Date(cell.lastTrainingDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {cell.expiryDate && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expires:</span>
                                    <span
                                      className={cn(
                                        cell.daysUntilExpiry != null && cell.daysUntilExpiry <= 30
                                          ? "text-amber-600 font-medium"
                                          : ""
                                      )}
                                    >
                                      {new Date(cell.expiryDate).toLocaleDateString()}
                                      {cell.daysUntilExpiry != null && cell.daysUntilExpiry > 0 && (
                                        <span className="ml-1">({cell.daysUntilExpiry}d)</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Info className="h-3 w-3" />
                                Click to view details
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile legend */}
        <div className="md:hidden flex flex-wrap gap-2 p-3 border-t text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200 border border-green-400" />
            Competent
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 border border-emerald-400" />
            Expert
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-200 border border-blue-400" />
            In Training
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200 border border-red-400" />
            Overdue
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-200 border border-yellow-400" />
            Expiring
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200 border border-gray-400" />
            N/A
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
