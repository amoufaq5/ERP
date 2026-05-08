"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Clock,
} from "lucide-react";
import type {
  VendorScore,
  QualificationStatus,
} from "@/lib/quality/vendor-scoring-types";

/* ── Status badge mapping ── */

const STATUS_CONFIG: Record<
  QualificationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "outline"; icon: React.ElementType }
> = {
  preferred: { label: "Preferred", variant: "success", icon: Award },
  qualified: { label: "Qualified", variant: "default", icon: ShieldCheck },
  new: { label: "New", variant: "secondary", icon: ShieldQuestion },
  probation: { label: "Probation", variant: "warning", icon: ShieldAlert },
  disqualified: { label: "Disqualified", variant: "destructive", icon: ShieldX },
};

function QualificationBadge({ status }: { status: QualificationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

/* ── Score color helper ── */

function scoreColor(score: number): string {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-blue-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-red-500";
}

/* ── Trend indicator ── */

function TrendIndicator({ history }: { history: { overallScore: number }[] }) {
  const trend = useMemo(() => {
    if (history.length < 2) return 0;
    const recent = history[history.length - 1].overallScore;
    const prev = history[history.length - 2].overallScore;
    return Math.round((recent - prev) * 10) / 10;
  }, [history]);

  if (trend === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }

  const isUp = trend > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-green-600" : "text-red-500"
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}
      {trend}
    </span>
  );
}

/* ── Score badge circle ── */

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-20 w-20 text-2xl",
  };
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white",
        scoreBg(score),
        sizeClasses[size]
      )}
    >
      {Math.round(score)}
    </div>
  );
}

/* ── Radar/spider chart using CSS + SVG ── */

interface RadarChartProps {
  quality: number;
  delivery: number;
  compliance: number;
  commercial: number;
  size?: number;
}

function RadarChart({
  quality,
  delivery,
  compliance,
  commercial,
  size = 180,
}: RadarChartProps) {
  const center = size / 2;
  const maxR = size / 2 - 16;

  // 4 axes: top (quality), right (delivery), bottom (compliance), left (commercial)
  const axes = [
    { label: "Quality", value: quality, angle: -90 },
    { label: "Delivery", value: delivery, angle: 0 },
    { label: "Compliance", value: compliance, angle: 90 },
    { label: "Commercial", value: commercial, angle: 180 },
  ];

  function polarToCartesian(angleDeg: number, r: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon points
  const dataPoints = axes.map((a) => {
    const r = (a.value / 100) * maxR;
    return polarToCartesian(a.angle, r);
  });

  const polygonStr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Axis endpoints
  const axisEnds = axes.map((a) => polarToCartesian(a.angle, maxR));

  // Label positions (slightly beyond the grid)
  const labelPositions = axes.map((a) => polarToCartesian(a.angle, maxR + 12));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((r, i) => {
          const ringR = r * maxR;
          const ringPoints = axes
            .map((a) => {
              const pt = polarToCartesian(a.angle, ringR);
              return `${pt.x},${pt.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={i}
              points={ringPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/30"
            />
          );
        })}

        {/* Axis lines */}
        {axisEnds.map((end, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/30"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonStr}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="hsl(var(--primary))"
          />
        ))}

        {/* Labels */}
        {labelPositions.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {axes[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Mini score bars ── */

function DimensionBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", scoreColor(score))}>{Math.round(score)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBg(score))}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

/* ── Compact card variant ── */

interface VendorScorecardCardProps {
  vendor: VendorScore;
  onClick?: () => void;
  className?: string;
}

export function VendorScorecardCard({ vendor, onClick, className }: VendorScorecardCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm leading-tight truncate">
              {vendor.vendorName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vendor.vendorCode} &middot; {vendor.country}
            </p>
          </div>
          <ScoreBadge score={vendor.overallScore} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <QualificationBadge status={vendor.qualificationStatus} />
          <TrendIndicator history={vendor.scoreHistory} />
        </div>

        <div className="flex items-center justify-center">
          <RadarChart
            quality={vendor.quality.score}
            delivery={vendor.delivery.score}
            compliance={vendor.compliance.score}
            commercial={vendor.commercial.score}
            size={140}
          />
        </div>

        <div className="space-y-1.5">
          <DimensionBar label="Quality" score={vendor.quality.score} />
          <DimensionBar label="Delivery" score={vendor.delivery.score} />
          <DimensionBar label="Compliance" score={vendor.compliance.score} />
          <DimensionBar label="Commercial" score={vendor.commercial.score} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          <span>
            Review: {new Date(vendor.nextReviewDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Full scorecard detail view ── */

interface VendorScorecardDetailProps {
  vendor: VendorScore;
  className?: string;
}

export function VendorScorecardDetail({ vendor, className }: VendorScorecardDetailProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{vendor.vendorName}</h3>
          <p className="text-sm text-muted-foreground">
            {vendor.vendorCode} &middot; {vendor.category.replace(/-/g, " ")} &middot; {vendor.country}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact: {vendor.contactPerson} ({vendor.contactEmail})
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ScoreBadge score={vendor.overallScore} size="lg" />
          <TrendIndicator history={vendor.scoreHistory} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <QualificationBadge status={vendor.qualificationStatus} />
        {vendor.qualifiedDate && (
          <span className="text-xs text-muted-foreground">
            Since {new Date(vendor.qualifiedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Radar + Dimension bars side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-center">
          <RadarChart
            quality={vendor.quality.score}
            delivery={vendor.delivery.score}
            compliance={vendor.compliance.score}
            commercial={vendor.commercial.score}
            size={200}
          />
        </div>
        <div className="space-y-3 flex flex-col justify-center">
          <DimensionBar label="Quality (35%)" score={vendor.quality.score} />
          <DimensionBar label="Delivery (25%)" score={vendor.delivery.score} />
          <DimensionBar label="Compliance (25%)" score={vendor.compliance.score} />
          <DimensionBar label="Commercial (15%)" score={vendor.commercial.score} />
        </div>
      </div>

      {/* Detailed metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Defect Rate" value={`${vendor.quality.defectRate}%`} />
        <MetricBox label="OOS Rate" value={`${vendor.quality.oosRate}%`} />
        <MetricBox label="Open CAPAs" value={String(vendor.quality.capaCount)} />
        <MetricBox label="On-Time %" value={`${vendor.delivery.onTimePercent}%`} />
        <MetricBox label="Lead Time Var." value={`${vendor.delivery.leadTimeVariance} days`} />
        <MetricBox label="Audit Score" value={String(vendor.compliance.auditScore)} />
        <MetricBox label="Pricing Comp." value={`${vendor.commercial.pricingCompetitiveness}`} />
        <MetricBox label="Payment Terms" value={`Net ${vendor.commercial.paymentTermsDays}`} />
      </div>

      {/* Certifications */}
      {vendor.compliance.certifications.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Certifications</h4>
          <div className="flex flex-wrap gap-1.5">
            {vendor.compliance.certifications.map((cert) => (
              <Badge key={cert} variant="outline" className="text-xs">
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Score history trend line */}
      {vendor.scoreHistory.length > 1 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Score Trend (12 months)</h4>
          <ScoreTrendChart history={vendor.scoreHistory} />
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div>
          <h4 className="text-sm font-medium mb-1">Notes</h4>
          <p className="text-sm text-muted-foreground">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ── Small metric box ── */

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

/* ── Score trend mini-chart ── */

function ScoreTrendChart({ history }: { history: { date: string; overallScore: number }[] }) {
  const maxScore = 100;
  const chartHeight = 60;
  const chartWidth = history.length * 32;

  return (
    <div className="overflow-x-auto">
      <svg
        width={chartWidth}
        height={chartHeight + 20}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {/* Background grid lines */}
        {[25, 50, 75, 100].map((v) => {
          const y = chartHeight - (v / maxScore) * chartHeight;
          return (
            <line
              key={v}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/20"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Area fill */}
        <polygon
          points={[
            ...history.map((h, i) => {
              const x = i * 32 + 16;
              const y = chartHeight - (h.overallScore / maxScore) * chartHeight;
              return `${x},${y}`;
            }),
            `${(history.length - 1) * 32 + 16},${chartHeight}`,
            `16,${chartHeight}`,
          ].join(" ")}
          fill="hsl(var(--primary) / 0.1)"
        />

        {/* Line */}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={history
            .map((h, i) => {
              const x = i * 32 + 16;
              const y = chartHeight - (h.overallScore / maxScore) * chartHeight;
              return `${x},${y}`;
            })
            .join(" ")}
        />

        {/* Dots */}
        {history.map((h, i) => {
          const x = i * 32 + 16;
          const y = chartHeight - (h.overallScore / maxScore) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill="hsl(var(--primary))"
            />
          );
        })}

        {/* Month labels */}
        {history.map((h, i) => {
          const x = i * 32 + 16;
          const d = new Date(h.date);
          const label = d.toLocaleDateString("en-GB", { month: "short" });
          return (
            <text
              key={i}
              x={x}
              y={chartHeight + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export {
  QualificationBadge,
  ScoreBadge,
  RadarChart,
  DimensionBar,
  TrendIndicator,
  ScoreTrendChart,
  scoreColor,
  scoreBg,
};
