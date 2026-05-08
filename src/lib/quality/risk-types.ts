"use client";

/* ───────── Risk Assessment Method ───────── */
export type RiskMethod = "FMEA" | "HACCP" | "FTA" | "PHA";

/* ───────── Status ───────── */
export type RiskStatus =
  | "draft"
  | "in-progress"
  | "review"
  | "approved"
  | "closed";

/* ───────── Category ───────── */
export type RiskCategory =
  | "quality"
  | "safety"
  | "regulatory"
  | "operational"
  | "supply-chain";

/* ───────── Risk Level (RPN-based thresholds) ───────── */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/* ───────── Mitigation Action Status ───────── */
export type MitigationStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "verified";

/* ───────── Mitigation Action ───────── */
export interface MitigationAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: MitigationStatus;
  completedDate?: string;
  effectiveness?: "effective" | "partially-effective" | "ineffective";
  verifiedBy?: string;
  verifiedDate?: string;
}

/* ───────── FMEA Entry ───────── */
export interface FMEAEntry {
  id: string;
  failureMode: string;
  effect: string;
  cause: string;
  currentControls: string;
  severity: number;     // 1-10
  occurrence: number;   // 1-10
  detection: number;    // 1-10
  rpn: number;          // S x O x D (calculated)
  riskLevel: RiskLevel;
  category: RiskCategory;
  recommendedAction: string;
  mitigationActions: MitigationAction[];
  /* Residual (post-mitigation) scores */
  residualSeverity?: number;
  residualOccurrence?: number;
  residualDetection?: number;
  residualRPN?: number;
  residualRiskLevel?: RiskLevel;
}

/* ───────── Risk Assessment ───────── */
export interface RiskAssessment {
  id: string;
  number: string;       // RA-YYYY-NNN
  title: string;
  scope: string;
  method: RiskMethod;
  product: string;
  process: string;
  status: RiskStatus;
  category: RiskCategory;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  entries: FMEAEntry[];
  notes?: string;
}

/* ───────── Dashboard Metrics ───────── */
export interface RiskMetrics {
  totalAssessments: number;
  highRiskItems: number;
  avgRPN: number;
  mitigationsPending: number;
  riskReductionPct: number;
  byStatus: { status: RiskStatus; count: number }[];
  byCategory: { category: RiskCategory; count: number }[];
  byMethod: { method: RiskMethod; count: number }[];
  rpnDistribution: { range: string; count: number }[];
}
