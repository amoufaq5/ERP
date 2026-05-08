"use client";

import { useState, useMemo } from "react";
import {
  Wind,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Thermometer,
  Droplets,
  Gauge,
  Fan,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { HVACUnit, HVACReading, GradeClassification } from "@/lib/operations/hvac-types";

// ─── Props ─────────────────────────────────────────────────────────────────

interface HVACFloorPlanProps {
  units: HVACUnit[];
  latestReadings: Record<string, HVACReading[]>;
  unitStatuses: Record<string, "normal" | "alert" | "action">;
  onSelectUnit: (unit: HVACUnit) => void;
}

// ─── Layout configuration ──────────────────────────────────────────────────

interface RoomConfig {
  unitId: string;
  label: string;
  grade: GradeClassification;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  airFlowTo?: string[];  // unit IDs this room sends air toward (pressure cascade)
}

function buildRoomLayout(units: HVACUnit[]): RoomConfig[] {
  // Map units by index for layout
  const layout: RoomConfig[] = [];

  // Row 0: Grade A zone (top)
  const gradeA = units.filter((u) => u.grade === "A");
  gradeA.forEach((u, i) => {
    layout.push({
      unitId: u.id,
      label: u.name,
      grade: "A",
      row: 0,
      col: i,
      colSpan: 1,
      airFlowTo: units.filter((t) => t.grade === "B").map((t) => t.id),
    });
  });

  // Row 1: Grade B zone
  const gradeB = units.filter((u) => u.grade === "B");
  gradeB.forEach((u, i) => {
    layout.push({
      unitId: u.id,
      label: u.name,
      grade: "B",
      row: 1,
      col: i,
      colSpan: 1,
      airFlowTo: units.filter((t) => t.grade === "C").map((t) => t.id),
    });
  });

  // Row 2: Grade C zone
  const gradeC = units.filter((u) => u.grade === "C");
  gradeC.forEach((u, i) => {
    layout.push({
      unitId: u.id,
      label: u.name,
      grade: "C",
      row: 2,
      col: i,
      colSpan: 1,
      airFlowTo: units.filter((t) => t.grade === "D").map((t) => t.id),
    });
  });

  // Row 3: Grade D zone
  const gradeD = units.filter((u) => u.grade === "D");
  gradeD.forEach((u, i) => {
    layout.push({
      unitId: u.id,
      label: u.name,
      grade: "D",
      row: 3,
      col: i,
      colSpan: 1,
    });
  });

  return layout;
}

// ─── Grade colors ──────────────────────────────────────────────────────────

const GRADE_BG: Record<GradeClassification, string> = {
  A: "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800",
  B: "bg-indigo-50 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-800",
  C: "bg-violet-50 border-violet-300 dark:bg-violet-950/30 dark:border-violet-800",
  D: "bg-slate-50 border-slate-300 dark:bg-slate-900/30 dark:border-slate-700",
};

const STATUS_INDICATOR: Record<string, string> = {
  normal: "bg-green-500",
  alert: "bg-yellow-500",
  action: "bg-red-500",
};

const STATUS_RING: Record<string, string> = {
  normal: "ring-green-400/30",
  alert: "ring-yellow-400/40 animate-pulse",
  action: "ring-red-400/50 animate-pulse",
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function HVACFloorPlan({
  units,
  latestReadings,
  unitStatuses,
  onSelectUnit,
}: HVACFloorPlanProps) {
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  const roomLayout = useMemo(() => buildRoomLayout(units), [units]);

  // Group rooms by row
  const rows = useMemo(() => {
    const map = new Map<number, RoomConfig[]>();
    for (const room of roomLayout) {
      const existing = map.get(room.row) ?? [];
      existing.push(room);
      map.set(room.row, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [roomLayout]);

  const gradeLabels: Record<number, { grade: GradeClassification; label: string }> = {
    0: { grade: "A", label: "Grade A - ISO 5 (Aseptic Core)" },
    1: { grade: "B", label: "Grade B - ISO 5/7 (Background)" },
    2: { grade: "C", label: "Grade C - ISO 7/8 (Manufacturing)" },
    3: { grade: "D", label: "Grade D - ISO 8 (Support)" },
  };

  function getReadingSummary(unitId: string): { temp?: number; rh?: number; dp?: number } {
    const readings = latestReadings[unitId] ?? [];
    const temp = readings.find((r) => r.parameter === "temperature")?.value;
    const rh = readings.find((r) => r.parameter === "humidity")?.value;
    const dp = readings.find((r) => r.parameter === "differential-pressure")?.value;
    return { temp, rh, dp };
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wind className="h-4 w-4" />
          Facility HVAC Zone Layout
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Click a room to view unit details. Arrows show pressure cascade direction (high to low).
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>All OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span>Alert</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Action Required</span>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <ArrowDown className="h-3 w-3 text-sky-500" />
            <span>Air flow direction (pressure cascade)</span>
          </div>
        </div>

        {/* Floor plan grid */}
        <div className="space-y-2">
          {rows.map(([rowIdx, rooms], ri) => {
            const rowMeta = gradeLabels[rowIdx];
            return (
              <div key={rowIdx}>
                {/* Row label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold",
                      rowMeta?.grade === "A" && "border-blue-400 text-blue-700 dark:text-blue-400",
                      rowMeta?.grade === "B" && "border-indigo-400 text-indigo-700 dark:text-indigo-400",
                      rowMeta?.grade === "C" && "border-violet-400 text-violet-700 dark:text-violet-400",
                      rowMeta?.grade === "D" && "border-slate-400 text-slate-700 dark:text-slate-400"
                    )}
                  >
                    {rowMeta?.label ?? `Row ${rowIdx}`}
                  </Badge>
                </div>

                {/* Room cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {rooms.map((room) => {
                    const unit = units.find((u) => u.id === room.unitId);
                    if (!unit) return null;
                    const status = unitStatuses[unit.id] ?? "normal";
                    const summary = getReadingSummary(unit.id);
                    const isHovered = hoveredUnit === unit.id;

                    return (
                      <button
                        key={unit.id}
                        type="button"
                        className={cn(
                          "relative rounded-lg border-2 p-3 text-left transition-all duration-150 cursor-pointer",
                          GRADE_BG[room.grade],
                          isHovered && "shadow-md scale-[1.02]",
                          status === "action" && "border-red-400 dark:border-red-600",
                          status === "alert" && "border-yellow-400 dark:border-yellow-600"
                        )}
                        onClick={() => onSelectUnit(unit)}
                        onMouseEnter={() => setHoveredUnit(unit.id)}
                        onMouseLeave={() => setHoveredUnit(null)}
                      >
                        {/* Status indicator */}
                        <div className="absolute top-2 right-2">
                          <div
                            className={cn(
                              "h-3 w-3 rounded-full ring-4",
                              STATUS_INDICATOR[status],
                              STATUS_RING[status]
                            )}
                          />
                        </div>

                        {/* Unit info */}
                        <div className="pr-6">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Fan className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold">{unit.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight mb-2 line-clamp-1">
                            {unit.areaServed}
                          </p>

                          {/* Live readings mini display */}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                            {summary.temp != null && (
                              <span className="flex items-center gap-0.5">
                                <Thermometer className="h-3 w-3 text-orange-500" />
                                {summary.temp}°C
                              </span>
                            )}
                            {summary.rh != null && (
                              <span className="flex items-center gap-0.5">
                                <Droplets className="h-3 w-3 text-blue-500" />
                                {summary.rh}%RH
                              </span>
                            )}
                            {summary.dp != null && (
                              <span className="flex items-center gap-0.5">
                                <Gauge className="h-3 w-3 text-purple-500" />
                                {summary.dp}Pa
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pressure cascade arrows between rows */}
                {ri < rows.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-sky-500">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                      Pressure Cascade
                    </span>
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pressure cascade summary */}
        <div className="mt-4 rounded-lg border bg-muted/40 p-3">
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Pressure Cascade Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {(["A", "B", "C", "D"] as GradeClassification[]).map((grade) => {
              const gradeUnits = units.filter((u) => u.grade === grade);
              const pressures = gradeUnits.map((u) => {
                const dp = (latestReadings[u.id] ?? []).find(
                  (r) => r.parameter === "differential-pressure"
                );
                return dp?.value;
              }).filter((v): v is number => v != null);
              const avgPressure = pressures.length > 0
                ? Math.round((pressures.reduce((a, b) => a + b, 0) / pressures.length) * 10) / 10
                : null;

              return (
                <div key={grade} className="flex flex-col items-center rounded border bg-background p-2">
                  <span className="font-semibold text-muted-foreground">Grade {grade}</span>
                  <span className="text-lg font-bold">
                    {avgPressure != null ? `${avgPressure} Pa` : "N/A"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
