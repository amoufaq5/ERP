"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Droplet,
  ArrowRight,
  ArrowDown,
  CircleDot,
  X,
} from "lucide-react";
import type {
  WaterSystem,
  WaterSamplingPoint,
  WaterReading,
  WaterSystemStatus,
  SamplingPointLocation,
} from "@/lib/quality/water-system-types";
import {
  WATER_TYPE_LABELS,
  WATER_PARAMETER_LABELS,
  SAMPLING_LOCATION_LABELS,
} from "@/lib/quality/water-system-types";

// ─── Status Colors ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<WaterSystemStatus | "default", { dot: string; bg: string; border: string; text: string }> = {
  normal: { dot: "bg-green-500", bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  alert: { dot: "bg-yellow-500", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
  action: { dot: "bg-red-500", bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  shutdown: { dot: "bg-red-700", bg: "bg-red-100", border: "border-red-500", text: "text-red-900" },
  default: { dot: "bg-gray-400", bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-600" },
};

// ─── Point Status Helper ──────────────────────────────────────────────────

function getPointStatus(
  pointId: string,
  latestReadings: WaterReading[]
): WaterSystemStatus {
  const pointReadings = latestReadings.filter((r) => r.pointId === pointId);
  if (pointReadings.length === 0) return "normal";
  if (pointReadings.some((r) => r.result === "fail")) return "shutdown";
  if (pointReadings.some((r) => r.result === "action")) return "action";
  if (pointReadings.some((r) => r.result === "alert")) return "alert";
  return "normal";
}

// ─── Format Helpers ───────────────────────────────────────────────────────

// ─── Reading Popup ────────────────────────────────────────────────────────

function ReadingPopup({
  point,
  readings,
  onClose,
}: {
  point: WaterSamplingPoint;
  readings: WaterReading[];
  onClose: () => void;
}) {
  const pointReadings = readings
    .filter((r) => r.pointId === point.id)
    .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt))
    .slice(0, 10);

  return (
    <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white border rounded-lg shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-lg">
        <div>
          <p className="text-sm font-semibold">{point.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {SAMPLING_LOCATION_LABELS[point.location]} &bull; {point.samplingFrequency}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {pointReadings.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No readings recorded</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-2 py-1 text-left font-medium">Parameter</th>
                <th className="px-2 py-1 text-right font-medium">Value</th>
                <th className="px-2 py-1 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pointReadings.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-2 py-1.5">
                    <div>{WATER_PARAMETER_LABELS[r.parameter]}</div>
                    <div className="text-[9px] text-muted-foreground">{formatDateTime(r.sampledAt)}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {r.value} <span className="text-muted-foreground">{r.unit}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                        r.result === "pass"
                          ? "bg-green-100 text-green-700"
                          : r.result === "alert"
                            ? "bg-yellow-100 text-yellow-700"
                            : r.result === "action"
                              ? "bg-red-100 text-red-700"
                              : "bg-red-200 text-red-900"
                      )}
                    >
                      {r.result.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sampling Point Node ──────────────────────────────────────────────────

function SamplingPointNode({
  point,
  latestReadings,
  isSelected,
  onClick,
}: {
  point: WaterSamplingPoint;
  latestReadings: WaterReading[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = getPointStatus(point.id, latestReadings);
  const colors = STATUS_COLORS[status];

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all hover:shadow-md",
          colors.bg,
          colors.border,
          colors.text,
          isSelected && "ring-2 ring-primary ring-offset-1"
        )}
        title={`${point.name} - ${point.description}`}
      >
        <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
        <span className="truncate max-w-[100px]">{point.name}</span>
      </button>
    </div>
  );
}

// ─── Flow Arrow ───────────────────────────────────────────────────────────

function FlowArrow({ direction = "right", className }: { direction?: "right" | "down"; className?: string }) {
  return direction === "right" ? (
    <div className={cn("flex items-center text-blue-400 mx-1", className)}>
      <div className="w-6 h-0.5 bg-blue-300" />
      <ArrowRight className="w-4 h-4 -ml-1" />
    </div>
  ) : (
    <div className={cn("flex flex-col items-center text-blue-400 my-1", className)}>
      <div className="w-0.5 h-4 bg-blue-300" />
      <ArrowDown className="w-4 h-4 -mt-1" />
    </div>
  );
}

// ─── Stage Box ────────────────────────────────────────────────────────────

function StageBox({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border rounded-lg p-3 bg-white min-w-[140px]", className)}>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export interface WaterSystemDiagramProps {
  system: WaterSystem;
  points: WaterSamplingPoint[];
  latestReadings: WaterReading[];
  systemStatus: WaterSystemStatus;
  className?: string;
}

export default function WaterSystemDiagram({
  system,
  points,
  latestReadings,
  systemStatus,
  className,
}: WaterSystemDiagramProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const statusColors = STATUS_COLORS[systemStatus];

  // Group points by location
  const groupedPoints = useMemo(() => {
    const groups: Record<SamplingPointLocation, WaterSamplingPoint[]> = {
      generation: [],
      storage: [],
      "loop-supply": [],
      "loop-return": [],
      "point-of-use": [],
    };
    for (const p of points) {
      if (groups[p.location]) {
        groups[p.location].push(p);
      }
    }
    return groups;
  }, [points]);

  const selectedPoint = selectedPointId ? points.find((p) => p.id === selectedPointId) : null;

  const handlePointClick = (pointId: string) => {
    setSelectedPointId((prev) => (prev === pointId ? null : pointId));
  };

  return (
    <Card className={cn("relative overflow-visible", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplet className="w-4 h-4 text-blue-500" />
            {system.name}
          </CardTitle>
          <Badge
            className={cn(
              "text-[10px]",
              statusColors.bg,
              statusColors.text,
              statusColors.border
            )}
            variant="outline"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusColors.dot)} />
            {systemStatus.toUpperCase()}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {WATER_TYPE_LABELS[system.type]} &bull; {system.loopDescription}
        </p>
      </CardHeader>
      <CardContent>
        {/* Flow diagram: Generation -> Storage -> Loop Supply -> Points of Use -> Loop Return */}
        <div className="flex flex-col items-center gap-2">
          {/* Main flow row */}
          <div className="flex items-start gap-1 flex-wrap justify-center">
            {/* Generation */}
            <StageBox
              title="Generation"
              icon={<CircleDot className="w-3 h-3 text-blue-500" />}
            >
              {groupedPoints.generation.map((p) => (
                <div key={p.id} className="relative">
                  <SamplingPointNode
                    point={p}
                    latestReadings={latestReadings}
                    isSelected={selectedPointId === p.id}
                    onClick={() => handlePointClick(p.id)}
                  />
                  {selectedPointId === p.id && selectedPoint && (
                    <ReadingPopup
                      point={selectedPoint}
                      readings={latestReadings}
                      onClose={() => setSelectedPointId(null)}
                    />
                  )}
                </div>
              ))}
              {groupedPoints.generation.length === 0 && (
                <span className="text-[10px] text-muted-foreground">No points</span>
              )}
            </StageBox>

            <FlowArrow />

            {/* Storage */}
            <StageBox
              title="Storage"
              icon={<CircleDot className="w-3 h-3 text-cyan-500" />}
            >
              {groupedPoints.storage.map((p) => (
                <div key={p.id} className="relative">
                  <SamplingPointNode
                    point={p}
                    latestReadings={latestReadings}
                    isSelected={selectedPointId === p.id}
                    onClick={() => handlePointClick(p.id)}
                  />
                  {selectedPointId === p.id && selectedPoint && (
                    <ReadingPopup
                      point={selectedPoint}
                      readings={latestReadings}
                      onClose={() => setSelectedPointId(null)}
                    />
                  )}
                </div>
              ))}
              {groupedPoints.storage.length === 0 && (
                <span className="text-[10px] text-muted-foreground">No points</span>
              )}
            </StageBox>

            <FlowArrow />

            {/* Loop Supply */}
            <StageBox
              title="Loop Supply"
              icon={<CircleDot className="w-3 h-3 text-indigo-500" />}
            >
              {groupedPoints["loop-supply"].map((p) => (
                <div key={p.id} className="relative">
                  <SamplingPointNode
                    point={p}
                    latestReadings={latestReadings}
                    isSelected={selectedPointId === p.id}
                    onClick={() => handlePointClick(p.id)}
                  />
                  {selectedPointId === p.id && selectedPoint && (
                    <ReadingPopup
                      point={selectedPoint}
                      readings={latestReadings}
                      onClose={() => setSelectedPointId(null)}
                    />
                  )}
                </div>
              ))}
              {groupedPoints["loop-supply"].length === 0 && (
                <span className="text-[10px] text-muted-foreground">No points</span>
              )}
            </StageBox>

            <FlowArrow />

            {/* Points of Use */}
            <StageBox
              title="Points of Use"
              icon={<CircleDot className="w-3 h-3 text-emerald-500" />}
              className="min-w-[180px]"
            >
              {groupedPoints["point-of-use"].map((p) => (
                <div key={p.id} className="relative">
                  <SamplingPointNode
                    point={p}
                    latestReadings={latestReadings}
                    isSelected={selectedPointId === p.id}
                    onClick={() => handlePointClick(p.id)}
                  />
                  {selectedPointId === p.id && selectedPoint && (
                    <ReadingPopup
                      point={selectedPoint}
                      readings={latestReadings}
                      onClose={() => setSelectedPointId(null)}
                    />
                  )}
                </div>
              ))}
              {groupedPoints["point-of-use"].length === 0 && (
                <span className="text-[10px] text-muted-foreground">No points</span>
              )}
            </StageBox>

            <FlowArrow />

            {/* Loop Return */}
            <StageBox
              title="Loop Return"
              icon={<CircleDot className="w-3 h-3 text-amber-500" />}
            >
              {groupedPoints["loop-return"].map((p) => (
                <div key={p.id} className="relative">
                  <SamplingPointNode
                    point={p}
                    latestReadings={latestReadings}
                    isSelected={selectedPointId === p.id}
                    onClick={() => handlePointClick(p.id)}
                  />
                  {selectedPointId === p.id && selectedPoint && (
                    <ReadingPopup
                      point={selectedPoint}
                      readings={latestReadings}
                      onClose={() => setSelectedPointId(null)}
                    />
                  )}
                </div>
              ))}
              {groupedPoints["loop-return"].length === 0 && (
                <span className="text-[10px] text-muted-foreground">No points</span>
              )}
            </StageBox>
          </div>

          {/* Loop return arrow showing recirculation */}
          <div className="flex items-center gap-2 text-[10px] text-blue-400 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-16 h-0.5 bg-blue-200 rounded" />
              <span className="text-muted-foreground italic">recirculation loop</span>
              <div className="w-16 h-0.5 bg-blue-200 rounded" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t text-[10px] text-muted-foreground">
          <span className="font-medium">Status:</span>
          {(["normal", "alert", "action", "shutdown"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[s].dot)} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
