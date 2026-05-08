"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeviationTrend } from "@/lib/quality/deviation-types";

interface DeviationTrendChartProps {
  trends: DeviationTrend[];
}

function getClassificationCount(
  trend: DeviationTrend,
  classification: "critical" | "major" | "minor"
): number {
  const entry = trend.byClassification.find(
    (b) => b.classification === classification
  );
  return entry?.count ?? 0;
}

export default function DeviationTrendChart({
  trends,
}: DeviationTrendChartProps) {
  const maxTotal = useMemo(
    () => Math.max(...trends.map((t) => t.total), 1),
    [trends]
  );

  // Aggregate top categories and departments across all trend periods
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trends) {
      for (const c of t.byCategory) {
        map.set(c.category, (map.get(c.category) || 0) + c.count);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [trends]);

  const topDepartments = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trends) {
      for (const d of t.byDepartment) {
        map.set(d.department, (map.get(d.department) || 0) + d.count);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [trends]);

  // Simple trend direction
  const trendDirection = useMemo(() => {
    if (trends.length < 2) return "stable";
    const recent = trends[trends.length - 1].total;
    const previous = trends[trends.length - 2].total;
    if (recent > previous) return "up";
    if (recent < previous) return "down";
    return "stable";
  }, [trends]);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Monthly Deviation Trend
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
                Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                Major
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
                Minor
              </span>
              <Badge
                variant={
                  trendDirection === "down"
                    ? "default"
                    : trendDirection === "up"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {trendDirection === "down"
                  ? "Improving"
                  : trendDirection === "up"
                  ? "Increasing"
                  : "Stable"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stacked bar chart */}
          <div className="flex items-end gap-2 h-48 pt-4">
            {trends.map((trend, i) => {
              const critical = getClassificationCount(trend, "critical");
              const major = getClassificationCount(trend, "major");
              const minor = getClassificationCount(trend, "minor");
              const totalHeight =
                maxTotal > 0 ? (trend.total / maxTotal) * 100 : 0;
              const criticalPct =
                trend.total > 0 ? (critical / trend.total) * totalHeight : 0;
              const majorPct =
                trend.total > 0 ? (major / trend.total) * totalHeight : 0;
              const minorPct =
                trend.total > 0 ? (minor / trend.total) * totalHeight : 0;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  {/* Count label */}
                  <span className="text-xs font-medium text-muted-foreground">
                    {trend.total > 0 ? trend.total : ""}
                  </span>
                  {/* Stacked bar */}
                  <div
                    className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                    style={{ height: `${totalHeight}%`, minHeight: trend.total > 0 ? 4 : 0 }}
                  >
                    {minor > 0 && (
                      <div
                        className="bg-blue-500 w-full"
                        style={{ height: `${minorPct}%`, minHeight: 2 }}
                        title={`Minor: ${minor}`}
                      />
                    )}
                    {major > 0 && (
                      <div
                        className="bg-amber-500 w-full"
                        style={{ height: `${majorPct}%`, minHeight: 2 }}
                        title={`Major: ${major}`}
                      />
                    )}
                    {critical > 0 && (
                      <div
                        className="bg-red-500 w-full"
                        style={{ height: `${criticalPct}%`, minHeight: 2 }}
                        title={`Critical: ${critical}`}
                      />
                    )}
                  </div>
                  {/* Month label */}
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">
                    {trend.period}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Trend line overlay */}
          {trends.length > 1 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <svg
                viewBox={`0 0 ${trends.length * 40} 30`}
                className="h-6 w-full"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trends
                    .map((t, i) => {
                      const x = i * 40 + 20;
                      const y =
                        maxTotal > 0
                          ? 28 - (t.total / maxTotal) * 24
                          : 14;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCategories.map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm capitalize">
                    {category.replace(/-/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded-full w-20 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${
                            topCategories[0]
                              ? (count / topCategories[0][1]) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
              {topCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDepartments.map(([department, count]) => (
                <div
                  key={department}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{department}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded-full w-20 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${
                            topDepartments[0]
                              ? (count / topDepartments[0][1]) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
              {topDepartments.length === 0 && (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
