"use client";

// ─── Audit Management Type Definitions ──────────────────────────────────────

export type AuditType =
  | "internal"
  | "external"
  | "supplier"
  | "regulatory"
  | "self-inspection";

export type AuditStatus = "planned" | "in-progress" | "completed" | "cancelled";

export type FindingCategory =
  | "critical"
  | "major"
  | "minor"
  | "observation"
  | "opportunity";

export type FindingStatus = "open" | "responded" | "capa-linked" | "closed" | "overdue";

export type AuditorType = "internal" | "external";

export type GMPArea =
  | "documentation"
  | "facilities"
  | "equipment"
  | "personnel"
  | "production"
  | "quality-control"
  | "warehousing"
  | "complaints";

export type OverallRating =
  | "satisfactory"
  | "needs-improvement"
  | "unsatisfactory"
  | "critical";

// ─── Auditor ────────────────────────────────────────────────────────────────

export interface Auditor {
  id: string;
  name: string;
  role: string;
  qualification: string;
  type: AuditorType;
  department?: string;
  certifications?: string[];
}

// ─── Checklist ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  question: string;
  gmpArea: GMPArea;
  requirement: string;
  status: "conforming" | "non-conforming" | "not-applicable" | "not-checked";
  comments?: string;
  evidence?: string;
}

export interface AuditChecklist {
  id: string;
  name: string;
  auditType: AuditType;
  items: ChecklistItem[];
}

// ─── Finding ────────────────────────────────────────────────────────────────

export interface AuditFinding {
  id: string;
  findingNumber: string; // FND-YYYY-NNN
  auditId: string;
  auditNumber: string;
  category: FindingCategory;
  gmpArea: GMPArea;
  description: string;
  area: string;
  evidence: string;
  requirement: string;
  response?: string;
  responseDueDate?: string;
  responseDate?: string;
  capaId?: string;
  capaNumber?: string;
  status: FindingStatus;
  assignedTo?: string;
  detectedAt: string;
  closedAt?: string;
}

// ─── Audit Report ───────────────────────────────────────────────────────────

export interface AuditReport {
  id: string;
  auditId: string;
  summary: string;
  findingsCount: {
    critical: number;
    major: number;
    minor: number;
    observation: number;
    opportunity: number;
  };
  overallRating: OverallRating;
  recommendations: string[];
  scoreByArea: { area: GMPArea; score: number }[];
  generatedAt: string;
  generatedBy: string;
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export interface Audit {
  id: string;
  number: string; // AUD-YYYY-NNN
  title: string;
  type: AuditType;
  status: AuditStatus;
  scope: string;
  department: string;
  scheduledDate: string;
  startDate?: string;
  endDate?: string;
  leadAuditor: string;
  auditors: string[]; // auditor IDs
  objectives: string[];
  checklist?: AuditChecklist;
  findings: AuditFinding[];
  report?: AuditReport;
  createdAt: string;
  updatedAt?: string;
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export interface AuditMetrics {
  totalAudits: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  findingClosureRate: number;
  byType: { type: AuditType; count: number }[];
  byDepartment: { department: string; count: number }[];
  findingsByCategory: { category: FindingCategory; count: number }[];
  findingsByGMPArea: { area: GMPArea; count: number }[];
  quarterlyTrend: {
    quarter: string;
    audits: number;
    findings: number;
    critical: number;
    major: number;
    minor: number;
    observation: number;
  }[];
}
