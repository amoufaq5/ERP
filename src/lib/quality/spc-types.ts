"use client";

// ─── SPC Chart Type Definitions ──────────────────────────────────────────────

export type SPCChartType =
  | "x-bar"
  | "r-chart"
  | "p-chart"
  | "c-chart"
  | "cusum";

export type SPCChartStatus = "active" | "inactive" | "archived";

export type ViolationSeverity = "critical" | "major" | "minor";

// ─── Western Electric Rules ──────────────────────────────────────────────────

export type SPCRuleId =
  | "rule1" // 1 point beyond 3 sigma
  | "rule2" // 2 of 3 consecutive points beyond 2 sigma (same side)
  | "rule3" // 4 of 5 consecutive points beyond 1 sigma (same side)
  | "rule4" // 8 consecutive points on one side of center line
  | "rule5" // 6 consecutive points trending (increasing or decreasing)
  | "rule6" // 14 consecutive points alternating up and down
  | "rule7" // 15 consecutive points within 1 sigma (stratification)
  | "rule8"; // 8 consecutive points beyond 1 sigma on either side

export interface SPCRule {
  id: SPCRuleId;
  name: string;
  description: string;
  severity: ViolationSeverity;
  enabled: boolean;
}

// ─── Data Point ──────────────────────────────────────────────────────────────

export interface SPCDataPoint {
  id: string;
  timestamp: string; // ISO date
  sampleNumber: number;
  value: number;
  subgroupSize: number;
  subgroupValues?: number[];
  inControl: boolean;
  violations: string[]; // rule IDs that are violated at this point
  notes?: string;
}

// ─── Control Limits ──────────────────────────────────────────────────────────

export interface ControlLimits {
  UCL: number;   // Upper Control Limit (3 sigma)
  LCL: number;   // Lower Control Limit (3 sigma)
  CL: number;    // Center Line (mean)
  UWL: number;   // Upper Warning Limit (2 sigma)
  LWL: number;   // Lower Warning Limit (2 sigma)
  oneσUpper: number; // +1 sigma
  oneσLower: number; // -1 sigma
}

// ─── Specification Limits ────────────────────────────────────────────────────

export interface SpecificationLimits {
  USL: number;   // Upper Specification Limit
  LSL: number;   // Lower Specification Limit
  target?: number;
}

// ─── Process Capability ──────────────────────────────────────────────────────

export interface ProcessCapability {
  Cp: number;    // Process capability index
  Cpk: number;   // Process capability index (centered)
  Pp: number;    // Process performance index
  Ppk: number;   // Process performance index (centered)
  sigma: number; // Process standard deviation
  mean: number;  // Process mean
  ppmAboveUSL: number;
  ppmBelowLSL: number;
  ppmTotal: number;
}

// ─── SPC Violation ───────────────────────────────────────────────────────────

export interface SPCViolation {
  id: string;
  chartId: string;
  chartName: string;
  ruleId: SPCRuleId;
  ruleName: string;
  severity: ViolationSeverity;
  detectedAt: string;
  dataPointIds: string[];
  sampleNumbers: number[];
  value: number; // The primary point value
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  notes?: string;
  product: string;
  process: string;
  parameter: string;
}

// ─── SPC Chart ───────────────────────────────────────────────────────────────

export interface SPCChart {
  id: string;
  name: string;
  chartType: SPCChartType;
  product: string;
  process: string;
  parameter: string;
  unit: string;
  status: SPCChartStatus;
  createdAt: string;
  updatedAt: string;
  controlLimits: ControlLimits;
  specLimits?: SpecificationLimits;
  dataPoints: SPCDataPoint[];
  violations: SPCViolation[];
  capability?: ProcessCapability;
  enabledRules: SPCRuleId[];
  subgroupSize: number;
  samplingFrequency: string; // e.g. "Every batch", "Every 2 hours"
}

// ─── SPC Metrics (Dashboard) ─────────────────────────────────────────────────

export interface SPCMetrics {
  totalCharts: number;
  activeCharts: number;
  inControlCharts: number;
  outOfControlCharts: number;
  totalViolations: number;
  unresolvedViolations: number;
  avgCpk: number;
  chartsAboveCpk133: number; // charts with Cpk >= 1.33 (pharma target)
  chartsBelowCpk1: number;  // charts with Cpk < 1.0 (not capable)
}

// ─── Default Western Electric Rules ──────────────────────────────────────────

export const DEFAULT_SPC_RULES: SPCRule[] = [
  {
    id: "rule1",
    name: "Beyond 3-Sigma",
    description: "1 point beyond 3 standard deviations from center line",
    severity: "critical",
    enabled: true,
  },
  {
    id: "rule2",
    name: "2 of 3 Beyond 2-Sigma",
    description: "2 of 3 consecutive points beyond 2 standard deviations (same side)",
    severity: "major",
    enabled: true,
  },
  {
    id: "rule3",
    name: "4 of 5 Beyond 1-Sigma",
    description: "4 of 5 consecutive points beyond 1 standard deviation (same side)",
    severity: "major",
    enabled: true,
  },
  {
    id: "rule4",
    name: "8 Consecutive Same Side",
    description: "8 consecutive points on one side of the center line",
    severity: "minor",
    enabled: true,
  },
  {
    id: "rule5",
    name: "6 Trending",
    description: "6 consecutive points trending in one direction (increasing or decreasing)",
    severity: "minor",
    enabled: true,
  },
  {
    id: "rule6",
    name: "14 Alternating",
    description: "14 consecutive points alternating up and down",
    severity: "minor",
    enabled: true,
  },
  {
    id: "rule7",
    name: "15 Within 1-Sigma",
    description: "15 consecutive points within 1 standard deviation (stratification)",
    severity: "minor",
    enabled: false,
  },
  {
    id: "rule8",
    name: "8 Beyond 1-Sigma",
    description: "8 consecutive points beyond 1 standard deviation on either side",
    severity: "minor",
    enabled: false,
  },
];
