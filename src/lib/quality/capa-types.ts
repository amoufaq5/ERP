"use client";

// ─── CAPA (Corrective and Preventive Action) Type Definitions ────────────────

export type CAPASource =
  | "deviation"
  | "OOS"
  | "audit"
  | "complaint"
  | "recall"
  | "self-inspection";

export type CAPAType = "corrective" | "preventive" | "both";

export type CAPAStatus =
  | "initiated"
  | "investigation"
  | "action-plan"
  | "implementation"
  | "verification"
  | "effectiveness-check"
  | "closed";

export type CAPAPriority = "low" | "medium" | "high" | "critical";

export type RootCauseMethod = "5-why" | "fishbone" | "fault-tree";

export type ActionStatus = "pending" | "in-progress" | "completed" | "overdue";

// ─── Root Cause Analysis ─────────────────────────────────────────────────────

export interface RootCauseAnalysis {
  method: RootCauseMethod;
  findings: string;
  investigator: string;
  completedAt?: string;
}

// ─── CAPA Action ─────────────────────────────────────────────────────────────

export interface CAPAAction {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: ActionStatus;
  evidence?: string;
  completionDate?: string;
}

// ─── Effectiveness Check ─────────────────────────────────────────────────────

export interface EffectivenessCheck {
  id: string;
  criteria: string;
  result: "effective" | "partially-effective" | "not-effective";
  checkedBy: string;
  date: string;
  notes?: string;
}

// ─── CAPA Record ─────────────────────────────────────────────────────────────

export interface CAPARecord {
  id: string;
  number: string; // CAPA-YYYY-NNN
  title: string;
  description: string;
  source: CAPASource;
  sourceRecordId?: string; // linked deviation ID, OOS ID, audit finding ref
  sourceRecordNumber?: string;
  type: CAPAType;
  priority: CAPAPriority;
  status: CAPAStatus;
  initiatedBy: string;
  initiatedAt: string;
  department: string;
  rootCauseAnalysis?: RootCauseAnalysis;
  actions: CAPAAction[];
  effectivenessChecks: EffectivenessCheck[];
  closedAt?: string;
  closedBy?: string;
  dueDate: string;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface CAPAMetrics {
  total: number;
  open: number;
  overdue: number;
  avgClosureDays: number;
  effectivenessRate: number;
  bySource: { source: string; count: number }[];
}
