// ---------------------------------------------------------------------------
// Scheduled Report Service
// ---------------------------------------------------------------------------

import { reportDeliveryEmail } from "./templates/report-delivery";
import type { EmailOptions } from "./email-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportType =
  | "daily_visit_report"
  | "weekly_plan_summary"
  | "monthly_kpi"
  | "expense_report"
  | "market_request_summary";

export type Frequency = "daily" | "weekly" | "monthly";

export interface ScheduleConfig {
  id: string;
  reportType: ReportType;
  frequency: Frequency;
  recipients: string[];
  /** 0 = Sunday, 1 = Monday, ... 6 = Saturday (used for weekly) */
  dayOfWeek?: number;
  /** "HH:mm" 24h format, e.g. "08:00" */
  timeOfDay?: string;
  enabled?: boolean;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Report metadata lookup
// ---------------------------------------------------------------------------

const REPORT_TITLES: Record<ReportType, string> = {
  daily_visit_report: "Daily Visit Report",
  weekly_plan_summary: "Weekly Plan Summary",
  monthly_kpi: "Monthly KPI Report",
  expense_report: "Expense Report",
  market_request_summary: "Market Request Summary",
};

function currentPeriodLabel(frequency: Frequency): string {
  const now = new Date();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  switch (frequency) {
    case "daily":
      return fmt(now);
    case "weekly": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${fmt(start)} – ${fmt(end)}`;
    }
    case "monthly":
      return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
}

function generateSummary(reportType: ReportType): string {
  switch (reportType) {
    case "daily_visit_report":
      return "Summary of all customer and facility visits completed today including outcomes and follow-up items.";
    case "weekly_plan_summary":
      return "Overview of weekly visit plans, targets achieved, and variances across all territories.";
    case "monthly_kpi":
      return "Key performance indicators for the month including revenue, visit coverage, and compliance metrics.";
    case "expense_report":
      return "Consolidated expense submissions, approvals, and reimbursement status for the reporting period.";
    case "market_request_summary":
      return "Summary of market access requests, pending approvals, and regulatory submissions.";
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (localStorage on client, in-memory on server)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "pharmacrm_report_schedules";

function isClient(): boolean {
  return typeof window !== "undefined";
}

// In-memory store for server-side usage
let serverStore: ScheduleConfig[] = [];

function loadSchedules(): ScheduleConfig[] {
  if (isClient()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ScheduleConfig[]) : [];
    } catch {
      return [];
    }
  }
  return serverStore;
}

function saveSchedules(schedules: ScheduleConfig[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } else {
    serverStore = schedules;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an EmailOptions object for a given schedule config.
 */
export function generateReportEmail(config: ScheduleConfig): EmailOptions {
  const title = REPORT_TITLES[config.reportType];
  const period = currentPeriodLabel(config.frequency);
  const summary = generateSummary(config.reportType);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/crm/reports`;

  const html = reportDeliveryEmail({
    recipientName: "Team",
    reportTitle: title,
    period,
    summary,
    link,
  });

  return {
    to: config.recipients,
    subject: `[PharmaCRM] ${title} — ${period}`,
    html,
    text: `${title} for ${period} is ready.\n\n${summary}\n\nView the full report: ${link}`,
  };
}

/**
 * Return all active (enabled) schedules.
 */
export function getActiveSchedules(): ScheduleConfig[] {
  return loadSchedules().filter((s) => s.enabled !== false);
}

/**
 * Return all schedules regardless of enabled status.
 */
export function getAllSchedules(): ScheduleConfig[] {
  return loadSchedules();
}

/**
 * Create or add a new schedule.
 */
export function createSchedule(config: Omit<ScheduleConfig, "id" | "createdAt">): ScheduleConfig {
  const schedules = loadSchedules();
  const newSchedule: ScheduleConfig = {
    ...config,
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: config.enabled ?? true,
    createdAt: new Date().toISOString(),
  };
  schedules.push(newSchedule);
  saveSchedules(schedules);
  return newSchedule;
}

/**
 * Delete a schedule by ID.
 */
export function deleteSchedule(id: string): boolean {
  const schedules = loadSchedules();
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  schedules.splice(idx, 1);
  saveSchedules(schedules);
  return true;
}
