"use client";

/* ───────────────────────── Enums / Unions ───────────────────────── */

export type CleaningStatus =
  | "draft"
  | "approved"
  | "in-progress"
  | "sampling"
  | "analysis"
  | "passed"
  | "failed"
  | "revalidation-due";

export type CleaningMethod = "swab" | "rinse" | "visual" | "TOC";

export type EquipmentType =
  | "tablet-press"
  | "fbd"
  | "coating-pan"
  | "mixer"
  | "filling-line"
  | "granulator"
  | "dryer"
  | "encapsulator";

/* ───────────────────── MACO / Acceptance Limits ─────────────────── */

export interface MACOParams {
  /** Minimum therapeutic dose of previous product (mg) */
  minTherapeuticDose: number;
  /** Maximum daily dose of next product (mg) */
  maxDailyDoseNext: number;
  /** Minimum batch size of next product (kg) */
  minBatchSizeNext: number;
  /** Shared equipment surface area (cm²) */
  sharedSurfaceArea: number;
  /** Safety factor (default 1/1000) */
  safetyFactor: number;
}

export interface CleaningLimit {
  id: string;
  method: CleaningMethod;
  /** Maximum allowable carryover in mg */
  macoMg: number;
  /** Limit per swab (µg/swab) or per rinse (µg/mL) or visual description */
  acceptanceValue: number;
  acceptanceUnit: string;
  /** Description of how limit was derived */
  rationale: string;
  macoParams?: MACOParams;
}

/* ──────────────────── Sampling Point & Sample ───────────────────── */

export interface SamplingPoint {
  id: string;
  label: string;
  description: string;
  /** Location on equipment diagram (percentage x, y) */
  x: number;
  y: number;
  method: CleaningMethod;
  /** Is this a worst-case / hardest-to-clean point? */
  worstCase: boolean;
}

export interface CleaningSample {
  id: string;
  samplingPointId: string;
  location: string;
  method: CleaningMethod;
  /** Measured result value */
  result: number;
  resultUnit: string;
  /** Applicable limit value */
  limit: number;
  limitUnit: string;
  passFail: "pass" | "fail";
  sampledBy?: string;
  sampledAt?: string;
  analyzedBy?: string;
  analyzedAt?: string;
  notes?: string;
}

/* ──────────────────────── Cleaning Protocol ─────────────────────── */

export interface CleaningProcedureStep {
  step: number;
  instruction: string;
  duration?: string;
  agent?: string;
  concentration?: string;
  temperature?: string;
}

export interface CleaningProtocol {
  id: string;
  /** Format: CLN-YYYY-NNN */
  number: string;
  title: string;
  equipment: string;
  equipmentId: string;
  equipmentType: EquipmentType;
  /** Product changeover from */
  fromProduct: string;
  /** Product changeover to */
  toProduct: string;
  cleaningProcedure: CleaningProcedureStep[];
  samplingPlan: SamplingPoint[];
  acceptanceCriteria: CleaningLimit[];
  status: CleaningStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  /** Revalidation interval in days */
  revalidationIntervalDays: number;
  /** Date when next revalidation is due */
  nextRevalidationDate?: string;
  version: number;
  notes?: string;
}

/* ─────────────────────── Cleaning Run ────────────────────────────── */

export interface CleaningRun {
  id: string;
  protocolId: string;
  protocolNumber: string;
  equipment: string;
  equipmentType: EquipmentType;
  fromProduct: string;
  toProduct: string;
  runDate: string;
  operator: string;
  verifiedBy?: string;
  samples: CleaningSample[];
  overallResult: "pass" | "fail" | "pending";
  status: CleaningStatus;
  startedAt: string;
  completedAt?: string;
  comments?: string;
  batchNumber?: string;
}

/* ─────────────────────── Dashboard Metrics ───────────────────────── */

export interface CleaningMetrics {
  totalProtocols: number;
  activeProtocols: number;
  runsThisMonth: number;
  passRate: number;
  dueForRevalidation: number;
  failedRuns: number;
  passByEquipment: { equipment: string; passRate: number; total: number }[];
  failuresByPoint: { point: string; failures: number; total: number }[];
  monthlyTrend: { month: string; runs: number; passed: number; failed: number }[];
  revalidationSchedule: { protocolNumber: string; equipment: string; dueDate: string; daysUntilDue: number }[];
}
