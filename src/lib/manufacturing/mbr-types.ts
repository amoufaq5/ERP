"use client";

// ── MBR Status ────────────────────────────────────────────────────
export type MBRStatus = "draft" | "approved" | "superseded";

// ── BPR Status ────────────────────────────────────────────────────
export type BPRStatus =
  | "planned"
  | "in-progress"
  | "weighing"
  | "processing"
  | "ipc-hold"
  | "packaging"
  | "review"
  | "qa-release"
  | "released"
  | "rejected";

// ── Operation Types ───────────────────────────────────────────────
export type OperationType =
  | "weighing"
  | "granulation"
  | "blending"
  | "compression"
  | "coating"
  | "packaging"
  | "drying"
  | "sieving"
  | "encapsulation"
  | "ipc-testing";

// ── Ingredient Role ───────────────────────────────────────────────
export type IngredientRole = "API" | "excipient" | "coating" | "packaging";

// ── Process Parameter ─────────────────────────────────────────────
export interface ProcessParameter {
  name: string;
  targetValue: number;
  unit: string;
  tolerancePercent: number; // ±%
}

// ── MBR Step ──────────────────────────────────────────────────────
export interface MBRStep {
  id: string;
  stepNumber: number;
  operation: OperationType;
  description: string;
  equipment: string;
  parameters: ProcessParameter[];
  estimatedDuration?: string;
  criticalStep: boolean;
}

// ── MBR Formulation Ingredient ────────────────────────────────────
export interface MBRIngredient {
  id: string;
  materialName: string;
  materialCode: string;
  role: IngredientRole;
  theoreticalQuantity: number;
  unit: string;
  percentageOfBatch: number;
}

// ── MBR Formulation ───────────────────────────────────────────────
export interface MBRFormulation {
  id: string;
  mbrId: string;
  ingredients: MBRIngredient[];
  totalBatchWeight: number;
  unit: string;
}

// ── Master Batch Record ───────────────────────────────────────────
export interface MasterBatchRecord {
  id: string;
  number: string; // MBR-YYYY-NNN
  product: string;
  dosageForm: string;
  strength: string;
  approvedBatchSize: number;
  batchSizeUnit: string;
  version: number;
  edaApprovalDate: string;
  status: MBRStatus;
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  supersededBy?: string;
  steps: MBRStep[];
  formulation: MBRFormulation;
  shelfLife: string;
  storageConditions: string;
}

// ── BPR Step Execution ────────────────────────────────────────────
export interface BPRStepExecution {
  id: string;
  bprId: string;
  mbrStepId: string;
  stepNumber: number;
  operation: OperationType;
  actualValues: BPRParameterValue[];
  operator: string;
  verifiedBy?: string;
  timestamp: string;
  endTimestamp?: string;
  equipmentId: string;
  equipmentName: string;
  deviationFlag: boolean;
  deviationId?: string;
  remarks?: string;
}

export interface BPRParameterValue {
  parameterName: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  tolerancePercent: number;
  withinTolerance: boolean;
}

// ── BPR Material Usage ────────────────────────────────────────────
export interface BPRMaterialUsage {
  id: string;
  bprId: string;
  ingredientId: string;
  materialName: string;
  materialCode: string;
  role: IngredientRole;
  theoreticalQuantity: number;
  actualQuantity: number;
  unit: string;
  batchNumber: string;
  lotNumber: string;
  dispensedBy: string;
  verifiedBy: string;
  dispensedAt: string;
  variancePercent: number;
  withinTolerance: boolean;
}

// ── Batch Production Record ───────────────────────────────────────
export interface BatchProductionRecord {
  id: string;
  number: string; // BPR-YYYY-NNN
  mbrId: string;
  mbrNumber: string;
  product: string;
  batchNumber: string;
  batchSize: number;
  batchSizeUnit: string;
  startDate?: string;
  endDate?: string;
  status: BPRStatus;
  createdAt: string;
  createdBy: string;
  productionLine: string;
  stepExecutions: BPRStepExecution[];
  materialUsage: BPRMaterialUsage[];
  yieldReconciliation?: YieldReconciliation;
  releasedBy?: string;
  releasedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

// ── Variance Record ───────────────────────────────────────────────
export interface VarianceRecord {
  id: string;
  bprId: string;
  bprNumber: string;
  stepNumber: number;
  parameter: string;
  theoretical: number;
  actual: number;
  unit: string;
  variancePercent: number;
  withinTolerance: boolean;
  tolerancePercent: number;
  deviationTriggered: boolean;
  deviationId?: string;
  timestamp: string;
}

// ── Yield Reconciliation ──────────────────────────────────────────
export interface YieldReconciliation {
  theoreticalYield: number;
  actualYield: number;
  yieldPercent: number;
  unit: string;
  acceptableRangeMin: number;
  acceptableRangeMax: number;
  reconciliationStatus: "pass" | "investigation" | "fail";
  materialBalance: number;
  rejectedQuantity: number;
  sampledQuantity: number;
  reconciledBy?: string;
  reconciledAt?: string;
}

// ── MBR Metrics (dashboard) ──────────────────────────────────────
export interface MBRMetrics {
  activeMBRs: number;
  activeBPRs: number;
  inProgressBPRs: number;
  averageYieldPercent: number;
  deviationsThisMonth: number;
  totalBPRsCompleted: number;
  totalBPRsRejected: number;
  yieldByProduct: { product: string; avgYield: number; batchCount: number }[];
  commonVarianceParameters: { parameter: string; count: number; avgVariance: number }[];
  monthlyBatches: { month: string; completed: number; rejected: number }[];
  statusDistribution: { status: BPRStatus; count: number }[];
}
