"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SPCDataPoint, ControlLimits } from "@/lib/quality/spc-types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SPCChartViewProps {
  dataPoints: SPCDataPoint[];
  controlLimits: ControlLimits;
  title?: string;
  unit?: string;
  height?: number; // chart area height in px
  showWarningLimits?: boolean;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING_LEFT = 60;
const PADDING_RIGHT = 24;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;
const POINT_RADIUS = 4;
const OOC_RADIUS = 7;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SPCChartView({
  dataPoints,
  controlLimits,
  title,
  unit,
  height = 320,
  showWarningLimits = true,
  className,
}: SPCChartViewProps) {
  const chartMetrics = useMemo(() => {
    if (dataPoints.length === 0) {
      return {
        minY: 0,
        maxY: 1,
        rangeY: 1,
        chartWidth: 600,
        chartHeight: height - PADDING_TOP - PADDING_BOTTOM,
        yTicks: [] as number[],
        points: [] as { x: number; y: number; dp: SPCDataPoint }[],
        limitLines: [] as { y: number; value: number; label: string; color: string; dash: boolean }[],
      };
    }

    // Determine Y range including control limits and data
    const allValues = dataPoints.map((dp) => dp.value);
    const allYCandidates = [
      ...allValues,
      controlLimits.UCL,
      controlLimits.LCL,
      controlLimits.CL,
    ];
    if (showWarningLimits) {
      allYCandidates.push(controlLimits.UWL, controlLimits.LWL);
    }

    const dataMin = Math.min(...allYCandidates);
    const dataMax = Math.max(...allYCandidates);
    const dataRange = dataMax - dataMin || 1;
    const margin = dataRange * 0.1;
    const minY = dataMin - margin;
    const maxY = dataMax + margin;
    const rangeY = maxY - minY;

    // Chart dimensions
    const n = dataPoints.length;
    const chartWidth = Math.max(n * 18, 400);
    const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

    // Y-axis ticks (5-7 ticks)
    const yTicks: number[] = [];
    const tickStep = rangeY / 6;
    for (let i = 0; i <= 6; i++) {
      yTicks.push(minY + i * tickStep);
    }

    // Map value to Y coordinate
    const valToY = (v: number) =>
      PADDING_TOP + chartHeight - ((v - minY) / rangeY) * chartHeight;

    // Map index to X coordinate
    const xStep = chartWidth / Math.max(n - 1, 1);
    const valToX = (i: number) => PADDING_LEFT + i * xStep;

    // Data points
    const points = dataPoints.map((dp, i) => ({
      x: valToX(i),
      y: valToY(dp.value),
      dp,
    }));

    // Limit lines
    const limitLines = [
      { y: valToY(controlLimits.UCL), value: controlLimits.UCL, label: "UCL", color: "#ef4444", dash: true },
      { y: valToY(controlLimits.CL), value: controlLimits.CL, label: "CL", color: "#22c55e", dash: false },
      { y: valToY(controlLimits.LCL), value: controlLimits.LCL, label: "LCL", color: "#ef4444", dash: true },
    ];

    if (showWarningLimits) {
      limitLines.push(
        { y: valToY(controlLimits.UWL), value: controlLimits.UWL, label: "UWL", color: "#eab308", dash: true },
        { y: valToY(controlLimits.LWL), value: controlLimits.LWL, label: "LWL", color: "#eab308", dash: true }
      );
    }

    return { minY, maxY, rangeY, chartWidth, chartHeight, yTicks, points, limitLines };
  }, [dataPoints, controlLimits, height, showWarningLimits]);

  const {
    chartWidth,
    chartHeight,
    yTicks,
    points,
    limitLines,
    minY,
    rangeY,
  } = chartMetrics;

  const svgWidth = chartWidth + PADDING_LEFT + PADDING_RIGHT;
  const svgHeight = height;

  // Y coordinate helper for ticks
  const tickToY = (v: number) =>
    PADDING_TOP + chartHeight - ((v - minY) / rangeY) * chartHeight;

  // Data line path
  const linePath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  // X-axis labels: show every Nth label to avoid crowding
  const labelInterval = Math.max(1, Math.ceil(dataPoints.length / 20));

  if (dataPoints.length === 0) {
    return (
      <div className={cn("border rounded-lg bg-muted/30 flex items-center justify-center", className)} style={{ height }}>
        <p className="text-sm text-muted-foreground">No data points available</p>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-card overflow-x-auto", className)}>
      {title && (
        <div className="px-4 pt-3 pb-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-2 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
          UCL / LCL
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0 border-t-2" style={{ borderColor: "#22c55e" }} />
          CL
        </span>
        {showWarningLimits && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#eab308" }} />
            UWL / LWL
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
          In Control
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
          Out of Control
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
          {/* Background zones (1-sigma, 2-sigma) */}
          {showWarningLimits && (
            <>
              {/* 1-sigma zone (green tint) */}
              <rect
                x={PADDING_LEFT}
                y={tickToY(controlLimits.oneσUpper)}
                width={chartWidth}
                height={tickToY(controlLimits.oneσLower) - tickToY(controlLimits.oneσUpper)}
                fill="#22c55e"
                fillOpacity={0.04}
              />
              {/* 2-sigma zone (yellow tint) */}
              <rect
                x={PADDING_LEFT}
                y={tickToY(controlLimits.UWL)}
                width={chartWidth}
                height={tickToY(controlLimits.oneσUpper) - tickToY(controlLimits.UWL)}
                fill="#eab308"
                fillOpacity={0.04}
              />
              <rect
                x={PADDING_LEFT}
                y={tickToY(controlLimits.oneσLower)}
                width={chartWidth}
                height={tickToY(controlLimits.LWL) - tickToY(controlLimits.oneσLower)}
                fill="#eab308"
                fillOpacity={0.04}
              />
              {/* 3-sigma zone (red tint) */}
              <rect
                x={PADDING_LEFT}
                y={tickToY(controlLimits.UCL)}
                width={chartWidth}
                height={tickToY(controlLimits.UWL) - tickToY(controlLimits.UCL)}
                fill="#ef4444"
                fillOpacity={0.03}
              />
              <rect
                x={PADDING_LEFT}
                y={tickToY(controlLimits.LWL)}
                width={chartWidth}
                height={tickToY(controlLimits.LCL) - tickToY(controlLimits.LWL)}
                fill="#ef4444"
                fillOpacity={0.03}
              />
            </>
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
                  {tick.toFixed(tick >= 100 ? 1 : tick >= 10 ? 2 : 3)}
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

          {/* Control limit lines */}
          {limitLines.map((ll, i) => (
            <g key={`limit-${i}`}>
              <line
                x1={PADDING_LEFT}
                y1={ll.y}
                x2={PADDING_LEFT + chartWidth}
                y2={ll.y}
                stroke={ll.color}
                strokeWidth={1.5}
                strokeDasharray={ll.dash ? "6 3" : undefined}
              />
              <text
                x={PADDING_LEFT + chartWidth + 3}
                y={ll.y + 3}
                fontSize={8}
                fill={ll.color}
                fontWeight={600}
              >
                {ll.label}
              </text>
            </g>
          ))}

          {/* Data line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data points */}
          {points.map((pt, i) => {
            const ooc = !pt.dp.inControl;
            return (
              <g key={`point-${i}`}>
                {/* Out-of-control highlight ring */}
                {ooc && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={OOC_RADIUS}
                    fill="rgba(239, 68, 68, 0.15)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                  />
                )}
                {/* Data point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={ooc ? POINT_RADIUS + 1 : POINT_RADIUS}
                  fill={ooc ? "#ef4444" : "#3b82f6"}
                  stroke="white"
                  strokeWidth={1.5}
                />
                {/* Violation marker */}
                {ooc && pt.dp.violations.length > 0 && (
                  <text
                    x={pt.x}
                    y={pt.y - OOC_RADIUS - 4}
                    textAnchor="middle"
                    fontSize={7}
                    fill="#ef4444"
                    fontWeight={700}
                  >
                    {pt.dp.violations.map((v) => v.replace("rule", "R")).join(",")}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {dataPoints.map((dp, i) => {
            if (i % labelInterval !== 0) return null;
            const x = points[i]?.x;
            if (x == null) return null;
            return (
              <text
                key={`xlabel-${i}`}
                x={x}
                y={svgHeight - 6}
                textAnchor="middle"
                fontSize={8}
                fill="#9ca3af"
              >
                {dp.sampleNumber}
              </text>
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
            Sample Number
          </text>

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
