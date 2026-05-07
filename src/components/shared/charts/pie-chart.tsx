"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import ChartContainer from "./chart-container";
import { CHART_COLOR_ARRAY } from "./chart-colors";
import { cn } from "@/lib/utils";

export interface PieDataItem {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartWidgetProps {
  title?: string;
  data: PieDataItem[];
  height?: number;
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieDataItem }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{entry.name}</p>
      <p className="text-muted-foreground">{entry.value.toLocaleString()}</p>
    </div>
  );
}

function renderCustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = props.midAngle ?? 0;
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = props.percent ?? 0;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function PieChartWidget({
  title,
  data,
  height = 300,
  donut = false,
  showLabels = false,
  showLegend = true,
  className,
}: PieChartWidgetProps) {
  return (
    <ChartContainer title={title} height={height} className={cn(className)}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={donut ? "55%" : 0}
          outerRadius="80%"
          dataKey="value"
          nameKey="name"
          label={showLabels ? renderCustomLabel : undefined}
          labelLine={false}
          style={{ cursor: "pointer" }}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={entry.color ?? CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
            />
          ))}
        </Pie>
        <RechartsTooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
      </PieChart>
    </ChartContainer>
  );
}
