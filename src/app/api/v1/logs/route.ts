import { apiResponse, corsOptions } from "@/lib/api/api-helpers";
import { getRecentLogs, getLogStats } from "@/lib/api/request-logger";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "100");

  return apiResponse({
    stats: getLogStats(),
    logs: getRecentLogs(Math.min(limit, 500)),
  });
}
