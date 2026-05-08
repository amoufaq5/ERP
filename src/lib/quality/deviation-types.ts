"use client";

// ─── GMP Deviation Management Type Definitions ─────────────────────────────

export type DeviationCategory =
  | "process"
  | "equipment"
  | "material"
  | "facility"
  | "documentation"
  | "environmental"
  | "personnel"
  | "utilities";

export type DeviationClassification = "critical" | "major" | "minor";

export type DeviationStatus =
  | "open"
  | "investigation"
  | "root-cause"
  | "capa-required"
  | "capa-implementation"
  | "effectiveness-check"
  | "closed";

export type ImpactOnProduct = "none" | "potential" | "confirmed";

export type DispositionDecision =
  | "release"
  | "reject"
  | "rework"
  | "return-to-supplier";

export type RootCauseCategory =
  | "human-error"
  | "equipment-failure"
  | "material-defect"
  | "process-gap"
  | "environmental"
  | "design-flaw"
  | "training-gap"
  | "documentation-gap";

// ─── Investigation ─────────────────────────────────────────────────────────

export interface DeviationTimelineEvent {
  date: string;
  event: string;
  description: string;
}

export interface DeviationInvestigation {
  investigator: string;
  startedAt: string;
  findings: string;
  timeline: DeviationTimelineEvent[];
  contributingFactors: string[];
  rootCauseCategory: RootCauseCategory;
  rootCauseDetails: string;
  completedAt?: string;
}

// ─── Deviation ─────────────────────────────────────────────────────────────

export interface Deviation {
  id: string;
  number: string; // DEV-YYYY-NNN
  title: string;
  description: string;
  category: DeviationCategory;
  classification: DeviationClassification;
  status: DeviationStatus;
  detectedAt: string;
  detectedBy: string;
  department: string;
  area: string;
  batchesAffected: string[];
  productsAffected: string[];
  immediateAction?: string;
  investigation?: DeviationInvestigation;
  rootCause?: string;
  capaId?: string;
  impactOnProduct: ImpactOnProduct;
  dispositionDecision?: DispositionDecision;
  closedAt?: string;
  closedBy?: string;
  dueDate: string;
  isOverdue: boolean;
}

// ─── Trends ────────────────────────────────────────────────────────────────

export interface DeviationTrend {
  period: string;
  total: number;
  byClassification: { classification: DeviationClassification; count: number }[];
  byCategory: { category: DeviationCategory; count: number }[];
  byDepartment: { department: string; count: number }[];
  repeatDeviations: number;
}

// ─── Metrics ───────────────────────────────────────────────────────────────

export interface DeviationMetrics {
  totalOpen: number;
  totalClosed: number;
  avgClosureDays: number;
  overdueCount: number;
  criticalOpen: number;
  capaLinkedPct: number;
  repeatRate: number;
  mttr: number; // mean time to resolve in days
}
