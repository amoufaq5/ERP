"use client";

// ─── OOS Investigation Type Definitions ─────────────────────────────────────

export type OutOfSpecType = "OOS" | "OOT" | "OOE";

export type OOSStatus =
  | "initiated"
  | "phase1-lab"
  | "phase1-review"
  | "phase2-production"
  | "phase2-review"
  | "extended"
  | "closed-confirmed"
  | "closed-invalidated";

export type OOSPriority = "low" | "medium" | "high" | "critical";

export type Phase1Conclusion =
  | "lab-error-confirmed"
  | "no-lab-error"
  | "inconclusive";

export type RootCauseTool = "fishbone" | "5why" | "fmea";

// ─── Phase 1 Investigation ──────────────────────────────────────────────────

export interface RetestResult {
  testDate: string;
  result: number;
  analyst: string;
  equipment: string;
}

export interface HypothesisChecklistItem {
  item: string;
  checked: boolean;
  notes?: string;
}

export interface Phase1Investigation {
  labError: boolean;
  labErrorDetails?: string;
  retestResults: RetestResult[];
  hypothesisChecklist: HypothesisChecklistItem[];
  conclusion: Phase1Conclusion;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

// ─── Phase 2 Investigation ──────────────────────────────────────────────────

export interface ProductionReviewItem {
  area: string;
  finding: string;
  investigator: string;
}

export interface MaterialReviewItem {
  materialName: string;
  batchNumber: string;
  finding: string;
}

export interface EquipmentReviewItem {
  equipmentId: string;
  equipmentName: string;
  finding: string;
}

export interface ProcessReviewItem {
  step: string;
  parameter: string;
  finding: string;
}

export interface EnvironmentalReviewItem {
  factor: string;
  finding: string;
}

export interface RootCauseToolEntry {
  tool: RootCauseTool;
  data: string;
}

export interface Phase2Investigation {
  productionReview: ProductionReviewItem[];
  materialReview: MaterialReviewItem[];
  equipmentReview: EquipmentReviewItem[];
  processReview: ProcessReviewItem[];
  environmentalReview: EnvironmentalReviewItem[];
  rootCauseTools: RootCauseToolEntry[];
  conclusion?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─── OOS Investigation ──────────────────────────────────────────────────────

export interface OOSSpecification {
  min: number;
  max: number;
  unit: string;
}

export interface OOSInvestigation {
  id: string;
  number: string; // OOS-YYYY-NNN
  batchNumber: string;
  productName: string;
  testName: string;
  specification: OOSSpecification;
  actualResult: number;
  outOfSpecType: OutOfSpecType;
  status: OOSStatus;
  priority: OOSPriority;
  initiatedBy: string;
  initiatedAt: string;
  assignedTo?: string;
  phase1?: Phase1Investigation;
  phase2?: Phase2Investigation;
  rootCause?: string;
  capaId?: string;
  conclusion?: string;
  closedAt?: string;
  closedBy?: string;
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export interface OOSCategoryCount {
  category: string;
  count: number;
}

export interface OOSMetrics {
  totalInvestigations: number;
  openCount: number;
  closedCount: number;
  avgClosureDays: number;
  phase1OnlyPct: number;
  capaLinkedPct: number;
  byCategory: OOSCategoryCount[];
}
