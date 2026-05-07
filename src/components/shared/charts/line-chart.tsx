"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import ChartContainer from "./chart-container";
import { CHART_COLOR_ARRAY } from "./chart-colors";
import { cn } from "@/lib/utils";

export interface LineConfig {
  dataKey: string;
  color?: string;
  name?: string;
}

export interface LineChartWidgetProps<T extends Record<string, unknown>> {
  title?: string;
  data: T[];
  lines: LineConfig[];
  xAxisKey: string & keyof T;
  height?: number;
  showDots?: boolean;
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

export default function LineChartWidget<T extends Record<string, unknown>>({
  title,
  data,
  lines,
  xAxisKey,
  height = 300,
  showDots = false,
  className,
}: LineChartWidgetProps<T>) {
  return (
    <ChartContainer title={title} height={height} className={cn(className)}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
        <RechartsTooltip content={<CustomTooltip />} />
        {lines.length > 1 && <Legend />}
        {lines.map((line, i) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name ?? line.dataKey}
            stroke={line.color ?? CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
            strokeWidth={2}
            dot={showDots ? { r: 3 } : false}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
