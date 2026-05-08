"use client";

// ─── Stability Study Type Definitions (ICH Q1A/Q1E) ────────────────────────

export type StabilityStudyType =
  | "long-term"
  | "accelerated"
  | "intermediate"
  | "in-use"
  | "photostability";

export type StabilityStatus =
  | "planned"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "failed";

export type TimepointStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "overdue"
  | "skipped";

export type StabilityTestParameter =
  | "assay"
  | "dissolution"
  | "moisture"
  | "appearance"
  | "pH"
  | "microbial"
  | "impurities"
  | "hardness"
  | "disintegration"
  | "uniformity";

export type TrendDirection = "stable" | "increasing" | "decreasing";

// ─── Storage Condition ──────────────────────────────────────────────────────

export interface StabilityCondition {
  id: string;
  label: string;            // e.g. "25C/60%RH"
  temperature: number;      // Celsius
  humidity: number;          // %RH
  lightExposure?: string;   // e.g. "1.2 million lux hours"
  description: string;      // e.g. "Long-term (ICH Zone IVa)"
}

// ─── Predefined ICH Conditions ──────────────────────────────────────────────

export const ICH_CONDITIONS: StabilityCondition[] = [
  {
    id: "cond-lt-25-60",
    label: "25°C/60%RH",
    temperature: 25,
    humidity: 60,
    description: "Long-term (ICH Zone II)",
  },
  {
    id: "cond-lt-30-65",
    label: "30°C/65%RH",
    temperature: 30,
    humidity: 65,
    description: "Long-term (ICH Zone IVa) / Intermediate",
  },
  {
    id: "cond-lt-30-75",
    label: "30°C/75%RH",
    temperature: 30,
    humidity: 75,
    description: "Long-term (ICH Zone IVb)",
  },
  {
    id: "cond-acc-40-75",
    label: "40°C/75%RH",
    temperature: 40,
    humidity: 75,
    description: "Accelerated",
  },
  {
    id: "cond-int-30-65",
    label: "30°C/65%RH",
    temperature: 30,
    humidity: 65,
    description: "Intermediate",
  },
  {
    id: "cond-photo",
    label: "Photostability",
    temperature: 25,
    humidity: 60,
    lightExposure: "1.2 million lux hours + 200 W-hr/m² UV",
    description: "ICH Q1B Photostability",
  },
  {
    id: "cond-fridge",
    label: "5°C/ambient",
    temperature: 5,
    humidity: 0,
    description: "Refrigerated",
  },
  {
    id: "cond-freeze",
    label: "-20°C",
    temperature: -20,
    humidity: 0,
    description: "Frozen",
  },
];

// ─── Stability Test Result ──────────────────────────────────────────────────

export interface StabilityTest {
  id: string;
  parameter: StabilityTestParameter;
  parameterLabel: string;
  unit: string;
  specificationMin?: number;
  specificationMax?: number;
  specificationText?: string;  // For non-numeric specs (e.g. appearance)
  result: number | null;
  resultText?: string;         // For qualitative results
  trend: TrendDirection;
  initialValue?: number;
  passesSpec: boolean;
}

// ─── Stability Timepoint ────────────────────────────────────────────────────

export interface StabilityTimepoint {
  id: string;
  studyId: string;
  month: number;               // 0, 1, 2, 3, 6, 9, 12, 18, 24, 36
  scheduledDate: string;       // ISO date
  actualDate?: string;         // ISO date
  status: TimepointStatus;
  tests: StabilityTest[];
  notes?: string;
  performedBy?: string;
  reviewedBy?: string;
}

// ─── Shelf Life Prediction ──────────────────────────────────────────────────

export interface ShelfLifePrediction {
  estimatedShelfLifeMonths: number;
  confidenceLevel: number;     // 0-100 %
  method: string;              // e.g. "Arrhenius extrapolation", "Linear regression"
  degradationRatePerMonth: number;
  predictedEndValue: number;   // Predicted assay/key parameter at shelf life
  r2: number;                  // Regression R-squared
}

// ─── Stability Study ────────────────────────────────────────────────────────

export interface StabilityStudy {
  id: string;
  protocolNumber: string;       // STB-YYYY-NNN
  product: string;
  productCode: string;
  batchNumber: string;
  batchSize: string;
  studyType: StabilityStudyType;
  condition: StabilityCondition;
  startDate: string;            // ISO date
  plannedDurationMonths: number;
  endDate?: string;             // ISO date (actual completion)
  status: StabilityStatus;
  timepoints: StabilityTimepoint[];
  testParameters: StabilityTestParameter[];
  shelfLifePrediction?: ShelfLifePrediction;
  packagingType: string;
  storageOrientation?: string;
  initiatedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// ─── Stability Metrics (Dashboard) ──────────────────────────────────────────

export interface StabilityMetrics {
  totalStudies: number;
  activeStudies: number;
  completedStudies: number;
  plannedStudies: number;
  upcomingTimepoints: number;
  overdueTimepoints: number;
  productsOnStability: number;
  avgShelfLifeMonths: number;
  complianceRate: number;        // % of timepoints completed on time
  studiesByType: Record<StabilityStudyType, number>;
  studiesByStatus: Record<StabilityStatus, number>;
}

// ─── Standard Timepoint Schedules ───────────────────────────────────────────

export const TIMEPOINT_SCHEDULES: Record<StabilityStudyType, number[]> = {
  "long-term":      [0, 3, 6, 9, 12, 18, 24, 36],
  accelerated:      [0, 1, 2, 3, 6],
  intermediate:     [0, 3, 6, 9, 12],
  "in-use":         [0, 1, 2, 3],
  photostability:   [0],
};

// ─── Standard Test Parameters by Study Type ─────────────────────────────────

export const DEFAULT_TEST_PARAMETERS: Record<string, {
  parameter: StabilityTestParameter;
  label: string;
  unit: string;
  specMin?: number;
  specMax?: number;
  specText?: string;
}[]> = {
  "Amoxicillin 500mg": [
    { parameter: "assay", label: "Assay", unit: "%", specMin: 90.0, specMax: 110.0 },
    { parameter: "dissolution", label: "Dissolution", unit: "%", specMin: 80.0 },
    { parameter: "moisture", label: "Moisture Content", unit: "%", specMax: 5.0 },
    { parameter: "appearance", label: "Appearance", unit: "", specText: "White to off-white capsules" },
    { parameter: "impurities", label: "Total Impurities", unit: "%", specMax: 2.0 },
  ],
  "Omeprazole 20mg": [
    { parameter: "assay", label: "Assay", unit: "%", specMin: 90.0, specMax: 110.0 },
    { parameter: "dissolution", label: "Dissolution (acid resist.)", unit: "%", specMin: 75.0 },
    { parameter: "moisture", label: "Moisture Content", unit: "%", specMax: 4.0 },
    { parameter: "appearance", label: "Appearance", unit: "", specText: "Purple enteric-coated capsules" },
    { parameter: "pH", label: "pH (solution)", unit: "", specMin: 8.0, specMax: 11.0 },
    { parameter: "impurities", label: "Related Substances", unit: "%", specMax: 1.5 },
  ],
  "Metformin 850mg": [
    { parameter: "assay", label: "Assay", unit: "%", specMin: 95.0, specMax: 105.0 },
    { parameter: "dissolution", label: "Dissolution", unit: "%", specMin: 80.0 },
    { parameter: "hardness", label: "Hardness", unit: "kP", specMin: 6.0, specMax: 16.0 },
    { parameter: "appearance", label: "Appearance", unit: "", specText: "White film-coated tablets" },
    { parameter: "impurities", label: "Total Impurities", unit: "%", specMax: 1.0 },
  ],
  "Atorvastatin 10mg": [
    { parameter: "assay", label: "Assay", unit: "%", specMin: 90.0, specMax: 110.0 },
    { parameter: "dissolution", label: "Dissolution", unit: "%", specMin: 80.0 },
    { parameter: "moisture", label: "Moisture Content", unit: "%", specMax: 3.0 },
    { parameter: "appearance", label: "Appearance", unit: "", specText: "White elliptical film-coated tablets" },
    { parameter: "impurities", label: "Related Substances", unit: "%", specMax: 1.5 },
  ],
  "Losartan 50mg": [
    { parameter: "assay", label: "Assay", unit: "%", specMin: 90.0, specMax: 110.0 },
    { parameter: "dissolution", label: "Dissolution", unit: "%", specMin: 75.0 },
    { parameter: "moisture", label: "Moisture Content", unit: "%", specMax: 4.5 },
    { parameter: "appearance", label: "Appearance", unit: "", specText: "White to off-white tablets" },
    { parameter: "pH", label: "pH", unit: "", specMin: 3.0, specMax: 6.5 },
    { parameter: "impurities", label: "Total Impurities", unit: "%", specMax: 1.0 },
  ],
};
