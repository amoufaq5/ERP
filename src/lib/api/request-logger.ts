export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  ip?: string;
  error?: string;
}

// In-memory log buffer (in production, use proper logging service)
const LOG_BUFFER: RequestLog[] = [];
const MAX_LOGS = 1000;

export function logRequest(log: RequestLog) {
  LOG_BUFFER.push(log);
  if (LOG_BUFFER.length > MAX_LOGS) {
    LOG_BUFFER.splice(0, LOG_BUFFER.length - MAX_LOGS);
  }

  // Console log for dev
  const color = log.status >= 400 ? "\x1b[31m" : log.status >= 300 ? "\x1b[33m" : "\x1b[32m";
  const reset = "\x1b[0m";
  console.log(
    `${color}[API]${reset} ${log.method} ${log.path} ${log.status} ${log.duration}ms${log.userId ? ` (${log.userId})` : ""}`
  );
}

export function getRecentLogs(limit = 100): RequestLog[] {
  return LOG_BUFFER.slice(-limit);
}

export function getLogStats() {
  const last5min = Date.now() - 5 * 60_000;
  const recent = LOG_BUFFER.filter(l => new Date(l.timestamp).getTime() > last5min);

  return {
    total: LOG_BUFFER.length,
    last5min: recent.length,
    errors: recent.filter(l => l.status >= 400).length,
    avgDuration: recent.length ? Math.round(recent.reduce((s, l) => s + l.duration, 0) / recent.length) : 0,
    byMethod: {
      GET: recent.filter(l => l.method === "GET").length,
      POST: recent.filter(l => l.method === "POST").length,
      PATCH: recent.filter(l => l.method === "PATCH").length,
      DELETE: recent.filter(l => l.method === "DELETE").length,
    },
  };
}
