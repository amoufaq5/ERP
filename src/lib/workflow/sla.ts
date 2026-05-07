// ─── SLA Timer Utility ───
// Checks whether an approval has breached its SLA window and formats remaining time.

export interface SLAStatus {
  /** Whether the SLA window has been exceeded. */
  breached: boolean;
  /** Milliseconds remaining before breach (negative if already breached). */
  remainingMs: number;
  /** ISO timestamp when the SLA was/will be breached. */
  breachedAt?: string;
}

/** Default SLA window for approval actions: 48 hours. */
export const DEFAULT_SLA_HOURS = 48;

/**
 * Check the SLA status for a submission.
 *
 * @param submittedAt - ISO timestamp when the item entered the pending state.
 * @param slaHours    - Number of hours allowed before SLA breach (default: 48).
 * @returns SLAStatus with breach flag, remaining milliseconds, and breach timestamp.
 */
export function checkSLA(submittedAt: string, slaHours: number = DEFAULT_SLA_HOURS): SLAStatus {
  const submittedMs = new Date(submittedAt).getTime();
  const slaMs = slaHours * 60 * 60 * 1000;
  const deadlineMs = submittedMs + slaMs;
  const nowMs = Date.now();
  const remainingMs = deadlineMs - nowMs;
  const breached = remainingMs <= 0;

  return {
    breached,
    remainingMs,
    breachedAt: breached ? new Date(deadlineMs).toISOString() : undefined,
  };
}

/**
 * Format milliseconds into a human-readable time string.
 *
 * Positive values:  "23h 45m", "2d 5h", "45m"
 * Negative values:  "Overdue by 2h 30m", "Overdue by 1d 4h"
 * Zero:             "Due now"
 */
export function formatTimeRemaining(ms: number): string {
  if (ms === 0) return "Due now";

  const absMs = Math.abs(ms);
  const totalMinutes = Math.floor(absMs / (60 * 1000));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  // Fallback for very small durations
  if (parts.length === 0) parts.push("<1m");

  const timeStr = parts.join(" ");
  return ms < 0 ? `Overdue by ${timeStr}` : timeStr;
}

/**
 * Get a CSS-friendly urgency level for the SLA.
 * Useful for colour-coding badges or indicators.
 */
export function getSLAUrgency(
  submittedAt: string,
  slaHours: number = DEFAULT_SLA_HOURS
): "ok" | "warning" | "critical" | "breached" {
  const { breached, remainingMs } = checkSLA(submittedAt, slaHours);
  if (breached) return "breached";

  const slaMs = slaHours * 60 * 60 * 1000;
  const percentRemaining = remainingMs / slaMs;

  if (percentRemaining <= 0.1) return "critical";  // Less than 10% time left
  if (percentRemaining <= 0.25) return "warning";   // Less than 25% time left
  return "ok";
}
