"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Droplets,
  FlaskConical,
  Eye,
  TestTube2,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Calculator,
  MapPin,
} from "lucide-react";
import type {
  CleaningProtocol,
  CleaningRun,
  CleaningSample,
  SamplingPoint,
  MACOParams,
  EquipmentType,
} from "@/lib/quality/cleaning-types";
import { calculateMACO, calculatePerAreaLimit } from "@/lib/quality/cleaning-store";

/* ─────────────────── Equipment outline SVG paths ────────────────── */

const EQUIPMENT_SHAPES: Record<EquipmentType, { viewBox: string; path: string; label: string }> = {
  "tablet-press": {
    viewBox: "0 0 200 200",
    path: "M60,20 L140,20 L150,40 L150,160 L140,180 L60,180 L50,160 L50,40 Z M70,50 L130,50 L130,150 L70,150 Z",
    label: "Tablet Press",
  },
  fbd: {
    viewBox: "0 0 200 200",
    path: "M50,10 L150,10 L160,10 L160,60 L150,60 L140,100 L130,140 L120,160 L80,160 L70,140 L60,100 L50,60 L40,60 L40,10 Z",
    label: "Fluid Bed Dryer",
  },
  "coating-pan": {
    viewBox: "0 0 200 200",
    path: "M30,100 Q30,40 100,30 Q170,40 170,100 Q170,160 100,170 Q30,160 30,100 Z M50,100 Q50,55 100,50 Q150,55 150,100 Q150,145 100,150 Q50,145 50,100 Z",
    label: "Coating Pan",
  },
  mixer: {
    viewBox: "0 0 200 200",
    path: "M40,30 L160,30 L170,40 L170,140 Q170,170 140,180 L60,180 Q30,170 30,140 L30,40 Z M90,60 L110,60 L110,120 L90,120 Z",
    label: "High Shear Mixer",
  },
  "filling-line": {
    viewBox: "0 0 200 200",
    path: "M70,10 L130,10 L140,30 L140,70 L160,80 L160,160 L140,170 L60,170 L40,160 L40,80 L60,70 L60,30 Z",
    label: "Capsule Filler",
  },
  granulator: {
    viewBox: "0 0 200 200",
    path: "M40,30 L160,30 L170,45 L170,155 L160,170 L40,170 L30,155 L30,45 Z",
    label: "Granulator",
  },
  dryer: {
    viewBox: "0 0 200 200",
    path: "M50,20 L150,20 L160,40 L160,160 L150,180 L50,180 L40,160 L40,40 Z",
    label: "Dryer",
  },
  encapsulator: {
    viewBox: "0 0 200 200",
    path: "M60,15 L140,15 L155,35 L155,165 L140,185 L60,185 L45,165 L45,35 Z",
    label: "Encapsulator",
  },
};

/* ─────────────────── Method icon helper ─────────────────────────── */

function MethodIcon({ method, className }: { method: string; className?: string }) {
  switch (method) {
    case "swab":
      return <Droplets className={cn("h-3.5 w-3.5", className)} />;
    case "rinse":
      return <FlaskConical className={cn("h-3.5 w-3.5", className)} />;
    case "visual":
      return <Eye className={cn("h-3.5 w-3.5", className)} />;
    case "TOC":
      return <TestTube2 className={cn("h-3.5 w-3.5", className)} />;
    default:
      return <Droplets className={cn("h-3.5 w-3.5", className)} />;
  }
}

/* ─────────────────── MACO Display ───────────────────────────────── */

interface MACODisplayProps {
  params: MACOParams;
  className?: string;
}

function MACODisplay({ params, className }: MACODisplayProps) {
  const macoMg = calculateMACO(params);
  const perArea = calculatePerAreaLimit(macoMg, params.sharedSurfaceArea);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" />
          MACO Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
          <div className="font-mono text-muted-foreground">
            MACO = (TD x MBS x SF) / MDD
          </div>
          <div className="font-mono">
            = ({params.minTherapeuticDose} x {params.minBatchSizeNext * 1_000_000} x {params.safetyFactor}) / {params.maxDailyDoseNext}
          </div>
          <div className="font-mono font-bold text-primary">
            = {macoMg.toFixed(2)} mg
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border p-2">
            <span className="text-muted-foreground block">Min Therapeutic Dose</span>
            <span className="font-semibold">{params.minTherapeuticDose} mg</span>
          </div>
          <div className="rounded border p-2">
            <span className="text-muted-foreground block">Max Daily Dose (Next)</span>
            <span className="font-semibold">{params.maxDailyDoseNext} mg</span>
          </div>
          <div className="rounded border p-2">
            <span className="text-muted-foreground block">Min Batch Size (Next)</span>
            <span className="font-semibold">{params.minBatchSizeNext} kg</span>
          </div>
          <div className="rounded border p-2">
            <span className="text-muted-foreground block">Surface Area</span>
            <span className="font-semibold">{params.sharedSurfaceArea.toLocaleString()} cm2</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Per-area limit:</span>
          <span className="font-bold text-primary">{perArea.toFixed(4)} mg/cm2</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────── Equipment Diagram ──────────────────────────── */

interface EquipmentDiagramProps {
  protocol: CleaningProtocol;
  /** If provided, show sample results on the diagram points */
  run?: CleaningRun;
  className?: string;
}

function EquipmentDiagram({ protocol, run, className }: EquipmentDiagramProps) {
  const shape = EQUIPMENT_SHAPES[protocol.equipmentType] || EQUIPMENT_SHAPES["tablet-press"];

  const pointResults = useMemo(() => {
    if (!run) return new Map<string, CleaningSample>();
    const map = new Map<string, CleaningSample>();
    run.samples.forEach((s) => {
      map.set(s.samplingPointId, s);
    });
    return map;
  }, [run]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-indigo-600" />
          {shape.label} - Sampling Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          <svg
            viewBox={shape.viewBox}
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Equipment outline */}
            <path
              d={shape.path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/40"
            />

            {/* Sampling points */}
            {protocol.samplingPlan.map((sp, idx) => {
              const sample = pointResults.get(sp.id);
              const isPassed = sample ? sample.passFail === "pass" : undefined;
              const fill = isPassed === true
                ? "#22c55e"
                : isPassed === false
                ? "#ef4444"
                : "#94a3b8";

              return (
                <g key={sp.id}>
                  {/* Outer ring */}
                  <circle
                    cx={(sp.x / 100) * 200}
                    cy={(sp.y / 100) * 200}
                    r={sp.worstCase ? 12 : 9}
                    fill={fill}
                    fillOpacity={0.2}
                    stroke={fill}
                    strokeWidth={sp.worstCase ? 2.5 : 1.5}
                  />
                  {/* Inner dot */}
                  <circle
                    cx={(sp.x / 100) * 200}
                    cy={(sp.y / 100) * 200}
                    r={4}
                    fill={fill}
                  />
                  {/* Number label */}
                  <text
                    x={(sp.x / 100) * 200}
                    y={(sp.y / 100) * 200 + 1.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="6"
                    fontWeight="bold"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-3 space-y-1.5">
          {protocol.samplingPlan.map((sp, idx) => {
            const sample = pointResults.get(sp.id);
            const isPassed = sample ? sample.passFail === "pass" : undefined;
            return (
              <div key={sp.id} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold",
                    isPassed === true
                      ? "bg-green-500"
                      : isPassed === false
                      ? "bg-red-500"
                      : "bg-slate-400"
                  )}
                >
                  {idx + 1}
                </span>
                <span className="font-medium">{sp.label}</span>
                <MethodIcon method={sp.method} className="text-muted-foreground" />
                <span className="text-muted-foreground capitalize">{sp.method}</span>
                {sp.worstCase && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                    Worst-case
                  </Badge>
                )}
                {sample && (
                  <span className="ml-auto flex items-center gap-1">
                    <span className="font-mono">{sample.result.toFixed(3)}</span>
                    <span className="text-muted-foreground">/ {sample.limit}</span>
                    {isPassed ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────── Effectiveness Trend ────────────────────────── */

interface EffectivenessTrendProps {
  runs: CleaningRun[];
  className?: string;
}

function EffectivenessTrend({ runs, className }: EffectivenessTrendProps) {
  const sortedRuns = useMemo(
    () => [...runs].sort((a, b) => new Date(a.runDate).getTime() - new Date(b.runDate).getTime()),
    [runs]
  );

  if (sortedRuns.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Cleaning Effectiveness Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No runs available for trend analysis.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate average residue as % of limit for each run
  const trendData = sortedRuns.map((run) => {
    const residuePercentages = run.samples
      .filter((s) => s.limit > 0)
      .map((s) => (s.result / s.limit) * 100);
    const avgResiduePercent = residuePercentages.length > 0
      ? residuePercentages.reduce((a, b) => a + b, 0) / residuePercentages.length
      : 0;
    return {
      date: new Date(run.runDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avgResiduePercent: Math.round(avgResiduePercent * 10) / 10,
      passed: run.overallResult === "pass",
    };
  });

  const maxVal = Math.max(...trendData.map((d) => d.avgResiduePercent), 100);
  const chartHeight = 120;
  const chartWidth = Math.max(trendData.length * 50, 300);
  const barWidth = Math.min(30, (chartWidth / trendData.length) * 0.6);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Cleaning Effectiveness Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            width={chartWidth + 40}
            height={chartHeight + 40}
            viewBox={`0 0 ${chartWidth + 40} ${chartHeight + 40}`}
            className="text-foreground"
          >
            {/* 100% threshold line */}
            <line
              x1={30}
              y1={chartHeight - (100 / maxVal) * chartHeight + 10}
              x2={chartWidth + 30}
              y2={chartHeight - (100 / maxVal) * chartHeight + 10}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity={0.6}
            />
            <text
              x={chartWidth + 32}
              y={chartHeight - (100 / maxVal) * chartHeight + 14}
              fontSize="8"
              fill="#ef4444"
            >
              Limit
            </text>

            {/* Bars */}
            {trendData.map((d, i) => {
              const barHeight = (d.avgResiduePercent / maxVal) * chartHeight;
              const x = 30 + i * (chartWidth / trendData.length) + (chartWidth / trendData.length - barWidth) / 2;
              const y = chartHeight - barHeight + 10;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={2}
                    fill={d.passed ? "#22c55e" : "#ef4444"}
                    opacity={0.7}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="7"
                    fill="currentColor"
                  >
                    {d.avgResiduePercent}%
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 24}
                    textAnchor="middle"
                    fontSize="7"
                    fill="currentColor"
                    opacity={0.6}
                  >
                    {d.date}
                  </text>
                </g>
              );
            })}

            {/* Y-axis label */}
            <text
              x={4}
              y={chartHeight / 2 + 10}
              textAnchor="middle"
              fontSize="7"
              fill="currentColor"
              opacity={0.5}
              transform={`rotate(-90, 8, ${chartHeight / 2 + 10})`}
            >
              % of Limit
            </text>
          </svg>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Pass
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Fail
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 border-t-2 border-dashed border-red-400 inline-block" /> Acceptance Limit
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────── Exported compound component ────────────────── */

export {
  EquipmentDiagram,
  MACODisplay,
  EffectivenessTrend,
  MethodIcon,
};

export default function CleaningDiagram({
  protocol,
  run,
  runs,
  className,
}: {
  protocol: CleaningProtocol;
  run?: CleaningRun;
  runs?: CleaningRun[];
  className?: string;
}) {
  const macoParams = protocol.acceptanceCriteria.find((c) => c.macoParams)?.macoParams;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <EquipmentDiagram protocol={protocol} run={run} />
      <div className="space-y-4">
        {macoParams && <MACODisplay params={macoParams} />}
        {runs && runs.length > 0 && <EffectivenessTrend runs={runs} />}
      </div>
    </div>
  );
}
