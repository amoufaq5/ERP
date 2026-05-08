"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  FindingCategory,
  GMPArea,
  AuditMetrics,
} from "@/lib/quality/audit-types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FindingsByCategory {
  category: FindingCategory;
  count: number;
}

interface ScoreByArea {
  area: GMPArea;
  score: number;
}

interface AuditFindingsChartProps {
  findingsByCategory: FindingsByCategory[];
  closureRate: number;
  scoresByArea: ScoreByArea[];
  quarterlyTrend?: AuditMetrics["quarterlyTrend"];
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<FindingCategory, string> = {
  critical: "bg-red-500",
  major: "bg-orange-500",
  minor: "bg-yellow-500",
  observation: "bg-blue-500",
  opportunity: "bg-emerald-500",
};

const CATEGORY_TEXT_COLORS: Record<FindingCategory, string> = {
  critical: "text-red-700",
  major: "text-orange-700",
  minor: "text-yellow-700",
  observation: "text-blue-700",
  opportunity: "text-emerald-700",
};

const GMP_AREA_LABELS: Record<GMPArea, string> = {
  documentation: "Documentation",
  facilities: "Facilities",
  equipment: "Equipment",
  personnel: "Personnel",
  production: "Production",
  "quality-control": "Quality Control",
  warehousing: "Warehousing",
  complaints: "Complaints",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuditFindingsChart({
  findingsByCategory,
  closureRate,
  scoresByArea,
  quarterlyTrend,
}: AuditFindingsChartProps) {
  const totalFindings = useMemo(
    () => findingsByCategory.reduce((sum, f) => sum + f.count, 0),
    [findingsByCategory]
  );

  // Closure rate gauge angle (0–180 degrees for semicircle)
  const gaugeAngle = useMemo(
    () => Math.min(180, (closureRate / 100) * 180),
    [closureRate]
  );

  const gaugeColor = useMemo(() => {
    if (closureRate >= 80) return "text-emerald-500";
    if (closureRate >= 60) return "text-amber-500";
    return "text-red-500";
  }, [closureRate]);

  // Radar data: normalize scores to [0..1]
  const radarPoints = useMemo(() => {
    if (scoresByArea.length === 0) return [];
    const n = scoresByArea.length;
    const angleStep = (2 * Math.PI) / n;
    return scoresByArea.map((s, i) => {
      const angle = i * angleStep - Math.PI / 2; // start from top
      const r = s.score / 100;
      return {
        ...s,
        x: 50 + r * 40 * Math.cos(angle),
        y: 50 + r * 40 * Math.sin(angle),
        labelX: 50 + 48 * Math.cos(angle),
        labelY: 50 + 48 * Math.sin(angle),
      };
    });
  }, [scoresByArea]);

  const radarPolygon = useMemo(
    () => radarPoints.map((p) => `${p.x},${p.y}`).join(" "),
    [radarPoints]
  );

  // Max for quarterly trend chart
  const maxQuarterFindings = useMemo(() => {
    if (!quarterlyTrend || quarterlyTrend.length === 0) return 1;
    return Math.max(...quarterlyTrend.map((q) => q.findings), 1);
  }, [quarterlyTrend]);

  return (
    <div className="space-y-4">
      {/* ── Horizontal Stacked Bar: Findings by Category ───────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Findings by Category
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {totalFindings} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-3 text-xs">
            {(
              ["critical", "major", "minor", "observation", "opportunity"] as FindingCategory[]
            ).map((cat) => (
              <span key={cat} className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-sm",
                    CATEGORY_COLORS[cat]
                  )}
                />
                <span className="capitalize">{cat}</span>
              </span>
            ))}
          </div>

          {/* Stacked bar */}
          {totalFindings > 0 ? (
            <div className="space-y-3">
              <div className="h-8 flex rounded-md overflow-hidden">
                {(
                  ["critical", "major", "minor", "observation", "opportunity"] as FindingCategory[]
                ).map((cat) => {
                  const entry = findingsByCategory.find(
                    (f) => f.category === cat
                  );
                  const count = entry?.count ?? 0;
                  if (count === 0) return null;
                  const pct = (count / totalFindings) * 100;
                  return (
                    <div
                      key={cat}
                      className={cn(
                        "flex items-center justify-center text-xs font-medium text-white transition-all",
                        CATEGORY_COLORS[cat]
                      )}
                      style={{ width: `${pct}%`, minWidth: count > 0 ? 24 : 0 }}
                      title={`${cat}: ${count}`}
                    >
                      {pct > 8 ? count : ""}
                    </div>
                  );
                })}
              </div>
              {/* Individual counts */}
              <div className="grid grid-cols-5 gap-2 text-center">
                {(
                  ["critical", "major", "minor", "observation", "opportunity"] as FindingCategory[]
                ).map((cat) => {
                  const entry = findingsByCategory.find(
                    (f) => f.category === cat
                  );
                  const count = entry?.count ?? 0;
                  return (
                    <div key={cat} className="text-center">
                      <div
                        className={cn(
                          "text-lg font-bold",
                          CATEGORY_TEXT_COLORS[cat]
                        )}
                      >
                        {count}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {cat}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No findings recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Finding Closure Rate Gauge ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Finding Closure Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {/* Semi-circular gauge */}
            <div className="relative w-48 h-24 overflow-hidden">
              {/* Background arc */}
              <div className="absolute inset-0 w-48 h-48 rounded-full border-[12px] border-muted" />
              {/* Filled arc using conic gradient */}
              <div
                className="absolute inset-0 w-48 h-48 rounded-full border-[12px] border-transparent"
                style={{
                  borderTopColor:
                    closureRate >= 80
                      ? "#10b981"
                      : closureRate >= 60
                      ? "#f59e0b"
                      : "#ef4444",
                  borderRightColor:
                    closureRate >= 50
                      ? closureRate >= 80
                        ? "#10b981"
                        : closureRate >= 60
                        ? "#f59e0b"
                        : "#ef4444"
                      : "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor:
                    closureRate >= 75
                      ? closureRate >= 80
                        ? "#10b981"
                        : closureRate >= 60
                        ? "#f59e0b"
                        : "#ef4444"
                      : "transparent",
                  transform: `rotate(${gaugeAngle - 180}deg)`,
                  transition: "transform 0.5s ease",
                }}
              />
              {/* Center text */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <span className={cn("text-3xl font-bold", gaugeColor)}>
                  {closureRate}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {closureRate >= 80
                ? "Good closure rate"
                : closureRate >= 60
                ? "Needs improvement"
                : "Below target - action required"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Audit Score Radar by GMP Area ─────────────────────────────── */}
      {scoresByArea.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Audit Score by GMP Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <svg viewBox="0 0 100 100" className="w-64 h-64">
                {/* Grid circles */}
                {[20, 40, 60, 80, 100].map((pct) => (
                  <circle
                    key={pct}
                    cx="50"
                    cy="50"
                    r={(pct / 100) * 40}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.2"
                    className="text-muted-foreground/30"
                  />
                ))}
                {/* Grid lines from center to labels */}
                {radarPoints.map((p, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={50 + 40 * Math.cos(i * ((2 * Math.PI) / radarPoints.length) - Math.PI / 2)}
                    y2={50 + 40 * Math.sin(i * ((2 * Math.PI) / radarPoints.length) - Math.PI / 2)}
                    stroke="currentColor"
                    strokeWidth="0.15"
                    className="text-muted-foreground/30"
                  />
                ))}
                {/* Data polygon */}
                <polygon
                  points={radarPolygon}
                  fill="hsl(var(--primary) / 0.2)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.6"
                />
                {/* Data points */}
                {radarPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="1.2"
                    fill="hsl(var(--primary))"
                  />
                ))}
                {/* Labels */}
                {radarPoints.map((p, i) => (
                  <text
                    key={i}
                    x={p.labelX}
                    y={p.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize="3"
                  >
                    {GMP_AREA_LABELS[p.area]?.substring(0, 8) ?? p.area}
                  </text>
                ))}
              </svg>
            </div>
            {/* Score list */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              {scoresByArea.map((s) => (
                <div
                  key={s.area}
                  className="flex items-center justify-between"
                >
                  <span className="text-muted-foreground">
                    {GMP_AREA_LABELS[s.area] ?? s.area}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      s.score >= 85
                        ? "text-emerald-600"
                        : s.score >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {s.score}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quarterly Findings Trend ──────────────────────────────────── */}
      {quarterlyTrend && quarterlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Quarterly Findings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40 pt-4">
              {quarterlyTrend.map((q, i) => {
                const totalHeight =
                  maxQuarterFindings > 0
                    ? (q.findings / maxQuarterFindings) * 100
                    : 0;
                const critPct =
                  q.findings > 0
                    ? (q.critical / q.findings) * totalHeight
                    : 0;
                const majPct =
                  q.findings > 0
                    ? (q.major / q.findings) * totalHeight
                    : 0;
                const minPct =
                  q.findings > 0
                    ? (q.minor / q.findings) * totalHeight
                    : 0;
                const obsPct =
                  q.findings > 0
                    ? (q.observation / q.findings) * totalHeight
                    : 0;

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {q.findings > 0 ? q.findings : ""}
                    </span>
                    <div
                      className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                      style={{
                        height: `${totalHeight}%`,
                        minHeight: q.findings > 0 ? 4 : 0,
                      }}
                    >
                      {q.observation > 0 && (
                        <div
                          className="bg-blue-500 w-full"
                          style={{
                            height: `${obsPct}%`,
                            minHeight: 2,
                          }}
                          title={`Observation: ${q.observation}`}
                        />
                      )}
                      {q.minor > 0 && (
                        <div
                          className="bg-yellow-500 w-full"
                          style={{
                            height: `${minPct}%`,
                            minHeight: 2,
                          }}
                          title={`Minor: ${q.minor}`}
                        />
                      )}
                      {q.major > 0 && (
                        <div
                          className="bg-orange-500 w-full"
                          style={{
                            height: `${majPct}%`,
                            minHeight: 2,
                          }}
                          title={`Major: ${q.major}`}
                        />
                      )}
                      {q.critical > 0 && (
                        <div
                          className="bg-red-500 w-full"
                          style={{
                            height: `${critPct}%`,
                            minHeight: 2,
                          }}
                          title={`Critical: ${q.critical}`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">
                      {q.quarter}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-orange-500" />
                Major
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-yellow-500" />
                Minor
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" />
                Observation
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
