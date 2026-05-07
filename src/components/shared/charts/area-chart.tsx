"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import ChartContainer from "./chart-container";
import { CHART_COLORS } from "./chart-colors";
import { cn } from "@/lib/utils";

export interface AreaChartWidgetProps<T extends Record<string, unknown>> {
  title?: string;
  data: T[];
  dataKey: string & keyof T;
  xAxisKey: string & keyof T;
  color?: string;
  height?: number;
  showGrid?: boolean;
  tooltip?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AreaChartWidget<T extends Record<string, unknown>>({
  title,
  data,
  dataKey,
  xAxisKey,
  color = CHART_COLORS.primary,
  height = 300,
  showGrid = true,
  tooltip = true,
  className,
}: AreaChartWidgetProps<T>) {
  const gradientId = `area-gradient-${dataKey as string}`;

  return (
    <ChartContainer title={title} height={height} className={cn(className)}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis
          dataKey={xAxisKey as string}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
          className="text-muted-foreground"
        />
        {tooltip && <RechartsTooltip content={<CustomTooltip />} />}
        <Area
          type="monotone"
          dataKey={dataKey as string}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
