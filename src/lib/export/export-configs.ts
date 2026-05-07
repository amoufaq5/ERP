// Pre-built export configurations for common reports.
// Each function accepts the relevant data array and returns `{ headers, data }`
// ready for CSV, Excel, or PDF export.

import type { Doctor, Visit, WeeklyPlan, MarketRequest, KPIRecord } from "@/lib/data-store";

// ── Shared helpers ──────────────────────────────────────────────────────────

function safe(val: unknown): string {
  if (val == null) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function pct(num: number, den: number): string {
  if (den === 0) return "0%";
  return `${Math.round((num / den) * 100)}%`;
}

// ── Types for configs that need extra context ───────────────────────────────

interface NameLookup {
  /** Map an ID to a display name. Falls back to the raw ID. */
  resolve: (id: string | null | undefined) => string;
}

// ── Doctor List ─────────────────────────────────────────────────────────────

export function doctorListExport(
  doctors: Doctor[],
  userLookup?: NameLookup,
  buLookup?: NameLookup
): { headers: string[]; data: string[][] } {
  const headers = [
    "Name",
    "Specialty",
    "Classification",
    "Phone",
    "Assigned Rep",
    "Business Unit",
  ];

  const data = doctors.map((d) => [
    safe(d.name),
    safe(d.specialty),
    safe(d.classification),
    safe(d.phone),
    userLookup ? userLookup.resolve(d.assignedRepId) : safe(d.assignedRepId),
    buLookup ? buLookup.resolve(d.buId) : safe(d.buId),
  ]);

  return { headers, data };
}

// ── Visit Report ────────────────────────────────────────────────────────────

export function visitReportExport(
  visits: Visit[],
  userLookup?: NameLookup,
  doctorLookup?: NameLookup,
  productLookup?: NameLookup
): { headers: string[]; data: string[][] } {
  const headers = [
    "Date",
    "Rep",
    "Doctor",
    "Type",
    "Status",
    "Duration (min)",
    "Products",
  ];

  const data = visits.map((v) => [
    formatDate(v.dateTime),
    userLookup ? userLookup.resolve(v.repId) : safe(v.repId),
    doctorLookup ? doctorLookup.resolve(v.doctorId) : safe(v.doctorId),
    safe(v.type),
    safe(v.status),
    String(v.durationMin),
    productLookup
      ? v.productIds.map((pid) => productLookup.resolve(pid)).join(", ")
      : v.productIds.join(", "),
  ]);

  return { headers, data };
}

// ── Expense Report ──────────────────────────────────────────────────────────

interface ExpenseRow {
  date: string;
  userName: string;
  type: string;
  amount: number;
  status: string;
  receiptPhoto?: string;
  description?: string;
}

export function expenseReportExport(
  expenses: ExpenseRow[]
): { headers: string[]; data: string[][] } {
  const headers = [
    "Date",
    "Submitter",
    "Type",
    "Amount",
    "Status",
    "Receipt",
  ];

  const data = expenses.map((e) => [
    formatDate(e.date),
    safe(e.userName),
    safe(e.type),
    typeof e.amount === "number" ? e.amount.toFixed(2) : safe(e.amount),
    safe(e.status),
    e.receiptPhoto ? "Yes" : "No",
  ]);

  return { headers, data };
}

// ── Market Request ──────────────────────────────────────────────────────────

export function marketRequestExport(
  requests: MarketRequest[],
  userLookup?: NameLookup
): { headers: string[]; data: string[][] } {
  const headers = [
    "Date",
    "Requester",
    "Type",
    "Description",
    "Amount",
    "Priority",
    "Status",
  ];

  const data = requests.map((r) => [
    formatDate(r.createdAt),
    userLookup ? userLookup.resolve(r.requestedById) : safe(r.requestedById),
    safe(r.type),
    safe(r.description),
    r.amount != null ? r.amount.toFixed(2) : "",
    safe(r.priority),
    safe(r.status),
  ]);

  return { headers, data };
}

// ── Weekly Plan ─────────────────────────────────────────────────────────────

export function weeklyPlanExport(
  plans: WeeklyPlan[],
  userLookup?: NameLookup
): { headers: string[]; data: string[][] } {
  const headers = [
    "Week",
    "Rep",
    "Status",
    "Total Visits",
    "AM Visits",
    "PM Visits",
    "Compliance",
  ];

  const data = plans.map((p) => {
    const allVisits = p.days.flatMap((d) => d.visits);
    const amVisits = allVisits.filter((v) => v.session === "AM").length;
    const pmVisits = allVisits.filter((v) => v.session === "PM").length;
    const total = allVisits.length;

    return [
      formatDate(p.weekStartDate),
      userLookup ? userLookup.resolve(p.repId) : safe(p.repId),
      safe(p.status),
      String(total),
      String(amVisits),
      String(pmVisits),
      p.status === "APPROVED" ? "Yes" : "No",
    ];
  });

  return { headers, data };
}

// ── Call Analysis ───────────────────────────────────────────────────────────

interface CallAnalysisRow {
  name: string;
  role: string;
  callFrequency: number;
  callRate: number;
  amVisits: number;
  pmVisits: number;
  coveragePct: number;
  planCompliancePct: number;
}

export function callAnalysisExport(
  rows: CallAnalysisRow[]
): { headers: string[]; data: string[][] } {
  const headers = [
    "Rep",
    "Role",
    "Call Frequency",
    "Call Rate",
    "AM Visits",
    "PM Visits",
    "Coverage %",
    "Compliance %",
  ];

  const data = rows.map((r) => [
    safe(r.name),
    safe(r.role),
    String(r.callFrequency),
    typeof r.callRate === "number" ? r.callRate.toFixed(1) : safe(r.callRate),
    String(r.amVisits),
    String(r.pmVisits),
    typeof r.coveragePct === "number"
      ? `${Math.round(r.coveragePct)}%`
      : safe(r.coveragePct),
    typeof r.planCompliancePct === "number"
      ? `${Math.round(r.planCompliancePct)}%`
      : safe(r.planCompliancePct),
  ]);

  return { headers, data };
}

// ── KPI Report ──────────────────────────────────────────────────────────────

export function kpiReportExport(
  kpis: KPIRecord[],
  userLookup?: NameLookup
): { headers: string[]; data: string[][] } {
  const headers = [
    "Rep",
    "Metric",
    "Value",
    "Target",
    "Achievement %",
    "Period",
  ];

  const data = kpis.map((k) => [
    userLookup ? userLookup.resolve(k.userId) : safe(k.userId),
    safe(k.metric),
    String(k.actual),
    String(k.target),
    pct(k.actual, k.target),
    safe(k.period),
  ]);

  return { headers, data };
}
