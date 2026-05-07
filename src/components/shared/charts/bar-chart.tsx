"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import ChartContainer from "./chart-container";
import { CHART_COLORS, CHART_COLOR_ARRAY } from "./chart-colors";
import { cn } from "@/lib/utils";

export interface BarConfig {
  dataKey: string;
  color?: string;
  name?: string;
}

export interface BarChartWidgetProps<T extends Record<string, unknown>> {
  title?: string;
  data: T[];
  bars: BarConfig[];
  xAxisKey: string & keyof T;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
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

export default function BarChartWidget<T extends Record<string, unknown>>({
  title,
  data,
  bars,
  xAxisKey,
  height = 300,
  stacked = false,
  horizontal = false,
  className,
}: BarChartWidgetProps<T>) {
  const layout = horizontal ? "vertical" : "horizontal";

  return (
    <ChartContainer title={title} height={height} className={cn(className)}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toLocaleString()}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey={xAxisKey as string}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={80}
              className="text-muted-foreground"
            />
          </>
        ) : (
          <>
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
          </>
        )}
        <RechartsTooltip content={<CustomTooltip />} />
        {bars.length > 1 && <Legend />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name ?? bar.dataKey}
            fill={bar.color ?? CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? undefined : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
