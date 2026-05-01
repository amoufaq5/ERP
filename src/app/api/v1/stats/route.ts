import { corsOptions, apiResponse } from "@/lib/api/api-helpers";
import { getLogStats, getRecentLogs } from "@/lib/api/request-logger";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeLogs = url.searchParams.get("logs") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const stats = getLogStats();

  return apiResponse({
    ...stats,
    topEndpoints: getEndpointStats(),
    ...(includeLogs
      ? { recentLogs: getRecentLogs(Math.min(limit, 200)) }
      : {}),
  });
}

function getEndpointStats() {
  const logs = getRecentLogs(500);
  const counts: Record<
    string,
    { count: number; avgDuration: number; errors: number }
  > = {};

  for (const log of logs) {
    const key = `${log.method} ${log.path.replace(/\/[a-f0-9-]{36}/g, "/:id")}`;
    if (!counts[key]) counts[key] = { count: 0, avgDuration: 0, errors: 0 };
    counts[key].count++;
    counts[key].avgDuration += log.duration;
    if (log.status >= 400) counts[key].errors++;
  }

  return Object.entries(counts)
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgDuration: Math.round(data.avgDuration / data.count),
      errorRate:
        data.count > 0
          ? Math.round((data.errors / data.count) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
