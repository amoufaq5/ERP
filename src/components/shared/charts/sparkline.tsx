"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";
import { CHART_COLORS } from "./chart-colors";
import { cn } from "@/lib/utils";

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function Sparkline({
  data,
  color = CHART_COLORS.primary,
  width = 80,
  height = 32,
  className,
}: SparklineProps) {
  const chartData = data.map((value) => ({ value }));

  return (
    <div className={cn("inline-block", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
