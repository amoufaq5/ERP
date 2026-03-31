"use client";

import { type ReactNode } from "react";
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  trend?: { value: number; label?: string };
  iconColor?: string;
  className?: string;
}

export default function StatsCard({
  icon,
  title,
  value,
  subtitle,
  change,
  changeLabel = "vs last period",
  trend,
  iconColor,
  className,
}: StatsCardProps) {
  const effectiveChange = change ?? trend?.value;
  const effectiveLabel = changeLabel ?? trend?.label ?? "vs last period";
  const isPositive = effectiveChange != null && effectiveChange > 0;
  const isNegative = effectiveChange != null && effectiveChange < 0;
  const isNeutral  = effectiveChange != null && effectiveChange === 0;

  const isIconComponent = typeof icon === "function";
  const Icon = isIconComponent ? (icon as LucideIcon) : null;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const trendColorClass = isPositive
    ? "text-green-600"
    : isNegative
    ? "text-red-500"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm overflow-hidden transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground leading-none">
          {title}
        </span>

        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconColor ?? "bg-primary/10 text-primary"
            )}
          >
            {Icon ? <Icon className="h-[18px] w-[18px]" /> : (icon as ReactNode)}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Trend */}
      {effectiveChange != null && (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", trendColorClass)}>
          <TrendIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isNeutral ? "0%" : `${isPositive ? "+" : ""}${effectiveChange}%`}
          </span>
          <span className="font-normal text-muted-foreground">{effectiveLabel}</span>
        </div>
      )}
    </div>
  );
}
