"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { StabilityTimepoint, ShelfLifePrediction } from "@/lib/quality/stability-types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StabilityChartProps {
  /** Completed timepoints with test data */
  timepoints: StabilityTimepoint[];
  /** Test parameter to chart (e.g. "assay", "dissolution") */
  parameter: string;
  /** Display label for the parameter */
  parameterLabel?: string;
  /** Unit for Y-axis */
  unit?: string;
  /** Lower specification limit */
  specMin?: number;
  /** Upper specification limit */
  specMax?: number;
  /** Shelf life prediction for projected trend line */
  prediction?: ShelfLifePrediction;
  /** Planned duration in months (for x-axis range) */
  plannedMonths?: number;
  /** Chart height in px */
  height?: number;
  /** Additional CSS class */
  className?: string;
  /** Overlay datasets with different conditions */
  overlays?: {
    label: string;
    color: string;
    timepoints: StabilityTimepoint[];
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING_LEFT = 60;
const PADDING_RIGHT = 40;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 44;
const POINT_RADIUS = 5;
const OOS_RADIUS = 8;

const CONDITION_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StabilityChart({
  timepoints,
  parameter,
  parameterLabel,
  unit,
  specMin,
  specMax,
  prediction,
  plannedMonths,
  height = 320,
  className,
  overlays,
}: StabilityChartProps) {
  const chartMetrics = useMemo(() => {
    // Extract data points from timepoints for the main dataset
    const mainData = extractDataPoints(timepoints, parameter);

    // Extract overlay data
    const overlayData = (overlays ?? []).map((o) => ({
      label: o.label,
      color: o.color,
      points: extractDataPoints(o.timepoints, parameter),
    }));

    // Combine all values for Y-range calculation
    const allValues = [
      ...mainData.map((d) => d.value),
      ...overlayData.flatMap((o) => o.points.map((p) => p.value)),
    ];
    if (specMin != null) allValues.push(specMin);
    if (specMax != null) allValues.push(specMax);
    if (prediction) allValues.push(prediction.predictedEndValue);

    if (allValues.length === 0) {
      return {
        minY: 0,
        maxY: 100,
        rangeY: 100,
        chartWidth: 500,
        chartHeight: height - PADDING_TOP - PADDING_BOTTOM,
        maxMonth: 36,
        mainPoints: [] as { x: number; y: number; month: number; value: number; oos: boolean }[],
        overlayPoints: [] as { label: string; color: string; points: { x: number; y: number; month: number; value: number; oos: boolean }[] }[],
        specLines: [] as { y: number; value: number; label: string }[],
        yTicks: [] as number[],
        xTicks: [] as number[],
        projectedLine: null as { x1: number; y1: number; x2: number; y2: number } | null,
      };
    }

    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const range = dataMax - dataMin || 10;
    const margin = range * 0.15;
    const minY = dataMin - margin;
    const maxY = dataMax + margin;
    const rangeY = maxY - minY;

    // X-axis: months
    const allMonths = [
      ...mainData.map((d) => d.month),
      ...overlayData.flatMap((o) => o.points.map((p) => p.month)),
    ];
    const maxDataMonth = allMonths.length > 0 ? Math.max(...allMonths) : 0;
    const maxMonth = Math.max(
      maxDataMonth,
      plannedMonths ?? 0,
      prediction ? prediction.estimatedShelfLifeMonths : 0,
      12
    );

    const chartWidth = Math.max(maxMonth * 25 + 60, 400);
    const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

    // Coordinate helpers
    const valToY = (v: number) =>
      PADDING_TOP + chartHeight - ((v - minY) / rangeY) * chartHeight;
    const monthToX = (m: number) =>
      PADDING_LEFT + (m / maxMonth) * chartWidth;

    // Map main data to pixel coords
    const mainPoints = mainData.map((d) => ({
      x: monthToX(d.month),
      y: valToY(d.value),
      month: d.month,
      value: d.value,
      oos: d.oos,
    }));

    // Map overlay data
    const overlayPoints = overlayData.map((o) => ({
      label: o.label,
      color: o.color,
      points: o.points.map((d) => ({
        x: monthToX(d.month),
        y: valToY(d.value),
        month: d.month,
        value: d.value,
        oos: d.oos,
      })),
    }));

    // Spec lines
    const specLines: { y: number; value: number; label: string }[] = [];
    if (specMin != null) {
      specLines.push({ y: valToY(specMin), value: specMin, label: "LSL" });
    }
    if (specMax != null) {
      specLines.push({ y: valToY(specMax), value: specMax, label: "USL" });
    }

    // Y-axis ticks
    const yTicks: number[] = [];
    const tickCount = 6;
    const tickStep = rangeY / tickCount;
    for (let i = 0; i <= tickCount; i++) {
      yTicks.push(minY + i * tickStep);
    }

    // X-axis ticks
    const xTicks: number[] = [];
    const standardMonths = [0, 1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60];
    for (const m of standardMonths) {
      if (m <= maxMonth) xTicks.push(m);
    }

    // Projected trend line (dashed)
    let projectedLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
    if (prediction && mainPoints.length > 0) {
      const lastPoint = mainPoints[mainPoints.length - 1];
      const lastMonth = mainData[mainData.length - 1].month;
      const projectedMonth = Math.min(prediction.estimatedShelfLifeMonths, maxMonth);
      const projectedValue =
        mainData[mainData.length - 1].value +
        prediction.degradationRatePerMonth * (projectedMonth - lastMonth);
      projectedLine = {
        x1: lastPoint.x,
        y1: lastPoint.y,
        x2: monthToX(projectedMonth),
        y2: valToY(projectedValue),
      };
    }

    return {
      minY,
      maxY,
      rangeY,
      chartWidth,
      chartHeight,
      maxMonth,
      mainPoints,
      overlayPoints,
      specLines,
      yTicks,
      xTicks,
      projectedLine,
    };
  }, [timepoints, parameter, specMin, specMax, prediction, plannedMonths, height, overlays]);

  const {
    chartWidth,
    chartHeight,
    mainPoints,
    overlayPoints,
    specLines,
    yTicks,
    xTicks,
    projectedLine,
    minY,
    rangeY,
    maxMonth,
  } = chartMetrics;

  const svgWidth = chartWidth + PADDING_LEFT + PADDING_RIGHT;
  const svgHeight = height;

  const tickToY = (v: number) =>
    PADDING_TOP + chartHeight - ((v - minY) / rangeY) * chartHeight;
  const monthToX = (m: number) =>
    PADDING_LEFT + (m / maxMonth) * chartWidth;

  // Build SVG paths
  const mainLinePath =
    mainPoints.length > 1
      ? mainPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";

  const overlayLinePaths = overlayPoints.map((o) => ({
    ...o,
    path:
      o.points.length > 1
        ? o.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
        : "",
  }));

  if (mainPoints.length === 0 && overlayPoints.every((o) => o.points.length === 0)) {
    return (
      <div
        className={cn(
          "border rounded-lg bg-muted/30 flex items-center justify-center",
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No stability data available for this parameter</p>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-card overflow-x-auto", className)}>
      {/* Title */}
      {parameterLabel && (
        <div className="px-4 pt-3 pb-1">
          <h4 className="text-sm font-semibold text-foreground">
            {parameterLabel}
            {unit ? ` (${unit})` : ""} - Stability Trend
          </h4>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-2 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0 border-t-2" style={{ borderColor: CONDITION_COLORS[0] }} />
          Primary data
        </span>
        {overlayPoints.map((o, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="inline-block w-3 h-0 border-t-2" style={{ borderColor: o.color }} />
            {o.label}
          </span>
        ))}
        {specLines.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0 border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
            Spec Limits
          </span>
        )}
        {projectedLine && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0 border-t-2 border-dashed" style={{ borderColor: "#9ca3af" }} />
            Projected Trend
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
          OOS
        </span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto px-2 pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width={svgWidth}
          height={svgHeight}
          className="block"
          style={{ minWidth: svgWidth }}
        >
          {/* Spec zone fill */}
          {specMin != null && specMax != null && (
            <rect
              x={PADDING_LEFT}
              y={tickToY(specMax)}
              width={chartWidth}
              height={tickToY(specMin) - tickToY(specMax)}
              fill="#22c55e"
              fillOpacity={0.04}
            />
          )}

          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, i) => {
            const y = tickToY(tick);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={PADDING_LEFT + chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
                <text
                  x={PADDING_LEFT - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {tick.toFixed(tick >= 100 ? 1 : 2)}
                </text>
              </g>
            );
          })}

          {/* Unit label on Y-axis */}
          {unit && (
            <text
              x={12}
              y={PADDING_TOP + chartHeight / 2}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
              transform={`rotate(-90, 12, ${PADDING_TOP + chartHeight / 2})`}
            >
              {unit}
            </text>
          )}

          {/* X-axis grid and labels */}
          {xTicks.map((month) => {
            const x = monthToX(month);
            return (
              <g key={`xtick-${month}`}>
                <line
                  x1={x}
                  y1={PADDING_TOP}
                  x2={x}
                  y2={PADDING_TOP + chartHeight}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {month}M
                </text>
              </g>
            );
          })}

          {/* X-axis label */}
          <text
            x={PADDING_LEFT + chartWidth / 2}
            y={svgHeight - 1}
            textAnchor="middle"
            fontSize={9}
            fill="#6b7280"
          >
            Time (Months)
          </text>

          {/* Specification limit lines */}
          {specLines.map((sl, i) => (
            <g key={`spec-${i}`}>
              <line
                x1={PADDING_LEFT}
                y1={sl.y}
                x2={PADDING_LEFT + chartWidth}
                y2={sl.y}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
              <text
                x={PADDING_LEFT + chartWidth + 3}
                y={sl.y + 3}
                fontSize={8}
                fill="#ef4444"
                fontWeight={600}
              >
                {sl.label} ({sl.value})
              </text>
            </g>
          ))}

          {/* Overlay data lines */}
          {overlayLinePaths.map((o, idx) => (
            <g key={`overlay-${idx}`}>
              {o.path && (
                <path
                  d={o.path}
                  fill="none"
                  stroke={o.color}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeOpacity={0.7}
                />
              )}
              {o.points.map((pt, pi) => (
                <g key={`overlay-pt-${idx}-${pi}`}>
                  {pt.oos && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={OOS_RADIUS}
                      fill="rgba(239, 68, 68, 0.15)"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.oos ? POINT_RADIUS + 1 : POINT_RADIUS - 1}
                    fill={pt.oos ? "#ef4444" : o.color}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </g>
              ))}
            </g>
          ))}

          {/* Projected trend line (dashed) */}
          {projectedLine && (
            <line
              x1={projectedLine.x1}
              y1={projectedLine.y1}
              x2={projectedLine.x2}
              y2={projectedLine.y2}
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="8 4"
              strokeOpacity={0.8}
            />
          )}

          {/* Main data line */}
          {mainLinePath && (
            <path
              d={mainLinePath}
              fill="none"
              stroke={CONDITION_COLORS[0]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Main data points */}
          {mainPoints.map((pt, i) => (
            <g key={`point-${i}`}>
              {/* OOS highlight ring */}
              {pt.oos && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={OOS_RADIUS}
                  fill="rgba(239, 68, 68, 0.15)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                />
              )}
              {/* Data point */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.oos ? POINT_RADIUS + 1 : POINT_RADIUS}
                fill={pt.oos ? "#ef4444" : CONDITION_COLORS[0]}
                stroke="white"
                strokeWidth={1.5}
              />
              {/* Value label */}
              <text
                x={pt.x}
                y={pt.y - POINT_RADIUS - 5}
                textAnchor="middle"
                fontSize={8}
                fill={pt.oos ? "#ef4444" : "#6b7280"}
                fontWeight={pt.oos ? 700 : 400}
              >
                {pt.value.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Chart border */}
          <rect
            x={PADDING_LEFT}
            y={PADDING_TOP}
            width={chartWidth}
            height={chartHeight}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDataPoints(
  timepoints: StabilityTimepoint[],
  parameter: string
): { month: number; value: number; oos: boolean }[] {
  const points: { month: number; value: number; oos: boolean }[] = [];

  for (const tp of timepoints) {
    if (tp.status !== "completed") continue;
    const test = tp.tests.find((t) => t.parameter === parameter);
    if (!test || test.result == null) continue;
    points.push({
      month: tp.month,
      value: test.result,
      oos: !test.passesSpec,
    });
  }

  return points.sort((a, b) => a.month - b.month);
}
