"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreFactor } from "@/lib/ai/scoring";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ScoreCardProps {
  label: string;
  score: number; // 0-100
  factors: ScoreFactor[];
  trend: "up" | "down" | "stable";
  size?: "sm" | "md" | "lg";
}

// ─── Size configs ───────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: { ring: 64, stroke: 4, fontSize: "text-lg", labelSize: "text-xs", gap: "gap-2" },
  md: { ring: 80, stroke: 5, fontSize: "text-2xl", labelSize: "text-sm", gap: "gap-3" },
  lg: { ring: 100, stroke: 6, fontSize: "text-3xl", labelSize: "text-base", gap: "gap-4" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScoreCard({
  label,
  score,
  factors,
  trend,
  size = "md",
}: ScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = SIZE_MAP[size];

  // Animate score on mount
  useEffect(() => {
    const target = Math.round(score);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedScore(current);
      if (current >= target) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  // SVG ring
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  // Color based on score
  const scoreColor =
    animatedScore > 70
      ? "text-green-600 dark:text-green-400"
      : animatedScore >= 40
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const strokeColor =
    score > 70
      ? "stroke-green-500"
      : score >= 40
      ? "stroke-amber-500"
      : "stroke-red-500";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-600 dark:text-green-400"
      : trend === "down"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <div className={cn("flex flex-col items-center", config.gap)}>
      {/* Label */}
      <span
        className={cn(
          "font-medium text-muted-foreground text-center leading-tight",
          config.labelSize
        )}
      >
        {label}
      </span>

      {/* Circular progress ring */}
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        <svg
          viewBox={`0 0 ${config.ring} ${config.ring}`}
          className="transform -rotate-90"
          width={config.ring}
          height={config.ring}
        >
          {/* Background ring */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/30"
          />
          {/* Progress ring */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-700 ease-out", strokeColor)}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", config.fontSize, scoreColor)}>
            {animatedScore}
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
        <TrendIcon className="h-3.5 w-3.5" />
        <span className="capitalize">{trend}</span>
      </div>

      {/* Factor breakdown */}
      {factors.length > 0 && (
        <div className="w-full space-y-1.5 mt-1">
          {factors.map((factor) => (
            <div key={factor.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground truncate mr-2">
                  {factor.name}
                </span>
                <span className="font-medium tabular-nums shrink-0">
                  {factor.value}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    factor.value > 70
                      ? "bg-green-500"
                      : factor.value >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(factor.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
