"use client";

// ─── Complaint Management Type Definitions ──────────────────────────────────

export type ComplaintSource =
  | "customer"
  | "patient"
  | "distributor"
  | "regulatory"
  | "internal";

export type ComplaintCategory =
  | "quality"
  | "packaging"
  | "labeling"
  | "foreign-matter"
  | "potency"
  | "stability"
  | "adverse-event";

export type ComplaintSeverity = "critical" | "major" | "minor";

export type ComplaintStatus =
  | "received"
  | "acknowledged"
  | "investigation"
  | "root-cause"
  | "capa-required"
  | "response-sent"
  | "closed";

// ─── Complainant Info ───────────────────────────────────────────────────────

export interface ComplainantInfo {
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// ─── Timeline Event ─────────────────────────────────────────────────────────

export interface ComplaintTimelineEvent {
  status: ComplaintStatus;
  date: string;
  actor: string;
  notes?: string;
}

// ─── Complaint Investigation ────────────────────────────────────────────────

export interface ComplaintInvestigation {
  investigator: string;
  startedAt: string;
  completedAt?: string;
  findings: string;
  rootCause?: string;
  impactAssessment?: string;
  affectedBatches?: string[];
  method?: string;
}

// ─── Complaint Response ─────────────────────────────────────────────────────

export interface ComplaintResponse {
  responseText: string;
  sentTo: string;
  sentDate: string;
  sentBy: string;
  acknowledgment?: boolean;
  acknowledgmentDate?: string;
}

// ─── Regulatory Report ──────────────────────────────────────────────────────

export interface RegulatoryReport {
  reportable: boolean;
  reportType?: string; // "MedWatch" | "EDA" | "field-alert"
  reportNumber?: string;
  submittedDate?: string;
  submittedBy?: string;
  agency?: string;
  description?: string;
  patientOutcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  status?: "draft" | "submitted" | "acknowledged" | "closed";
}

// ─── Complaint Record ───────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  number: string; // CMP-YYYY-NNN
  title: string;
  description: string;
  source: ComplaintSource;
  category: ComplaintCategory;
  product: string;
  batch: string;
  lotNumber?: string;
  complainant: ComplainantInfo;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  receivedAt: string;
  receivedBy: string;
  dueDate: string;
  department?: string;
  timeline: ComplaintTimelineEvent[];
  investigation?: ComplaintInvestigation;
  response?: ComplaintResponse;
  regulatoryReport?: RegulatoryReport;
  capaId?: string;
  capaNumber?: string;
  closedAt?: string;
  closedBy?: string;
}

// ─── Complaint Metrics ──────────────────────────────────────────────────────

export interface ComplaintMetrics {
  total: number;
  open: number;
  avgResponseDays: number;
  regulatoryReports: number;
  overdue: number;
  bySource: { source: string; count: number }[];
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}
