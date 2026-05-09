"use client";

import type {
  StabilityStudy,
  StabilityStudyType,
  StabilityStatus,
  StabilityTimepoint,
  StabilityTest,
  StabilityCondition,
  StabilityTestParameter,
  ShelfLifePrediction,
  StabilityMetrics,
  TimepointStatus,
  TrendDirection,
} from "./stability-types";
import { ICH_CONDITIONS, TIMEPOINT_SCHEDULES, DEFAULT_TEST_PARAMETERS } from "./stability-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.stability";

function isoDate(daysOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function isoDateFromMonths(startDate: string, months: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function uid(): string {
  return `stb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Simple seeded PRNG (mulberry32)
function seedRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for gaussian noise
function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
}

// ─── Shelf Life Prediction (Simplified Arrhenius) ──────────────────────────

function predictShelfLife(
  timepoints: StabilityTimepoint[],
  studyType: StabilityStudyType,
  conditionTemp: number
): ShelfLifePrediction | undefined {
  // Gather assay results over time
  const assayData: { month: number; value: number }[] = [];
  for (const tp of timepoints) {
    if (tp.status !== "completed") continue;
    const assayTest = tp.tests.find(
      (t) => t.parameter === "assay" && t.result != null
    );
    if (assayTest && assayTest.result != null) {
      assayData.push({ month: tp.month, value: assayTest.result });
    }
  }

  if (assayData.length < 2) return undefined;

  // Linear regression: value = a + b * month
  const n = assayData.length;
  const sumX = assayData.reduce((s, d) => s + d.month, 0);
  const sumY = assayData.reduce((s, d) => s + d.value, 0);
  const sumXY = assayData.reduce((s, d) => s + d.month * d.value, 0);
  const sumX2 = assayData.reduce((s, d) => s + d.month * d.month, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return undefined;

  const b = (n * sumXY - sumX * sumY) / denom; // slope (degradation rate per month)
  const a = (sumY - b * sumX) / n;             // intercept

  // R-squared
  const meanY = sumY / n;
  const ssRes = assayData.reduce((s, d) => s + (d.value - (a + b * d.month)) ** 2, 0);
  const ssTot = assayData.reduce((s, d) => s + (d.value - meanY) ** 2, 0);
  const r2 = ssTot > 0 ? round2(1 - ssRes / ssTot) : 0;

  // For accelerated studies, apply Arrhenius correction factor
  // Ea/R ~ 83.14 kJ/mol / 8.314 J/(mol*K) ≈ 10000 K (typical pharma)
  const EaOverR = 10000;
  const refTemp = 25 + 273.15;  // 25C in Kelvin
  const studyTemp = conditionTemp + 273.15;

  // Acceleration factor: k(T_study)/k(T_ref) = exp(Ea/R * (1/T_ref - 1/T_study))
  const accelerationFactor =
    studyType === "accelerated" || studyType === "intermediate"
      ? Math.exp(EaOverR * (1 / refTemp - 1 / studyTemp))
      : 1;

  // Degradation rate at reference temp (25C)
  const rateAtRef = b / accelerationFactor;

  // Shelf life = months until assay drops to 90% (lower spec limit)
  const lowerSpec = 90.0;
  const initialValue = a;

  if (rateAtRef >= 0) {
    // No degradation or increasing - assume very long shelf life
    return {
      estimatedShelfLifeMonths: 60,
      confidenceLevel: 85,
      method: "Linear regression (no degradation observed)",
      degradationRatePerMonth: round2(rateAtRef),
      predictedEndValue: round2(initialValue + rateAtRef * 36),
      r2,
    };
  }

  const shelfLifeMonths = Math.abs((initialValue - lowerSpec) / rateAtRef);
  const capped = Math.min(Math.round(shelfLifeMonths), 60);

  // Confidence level based on R2 and data points
  const confidence = Math.min(
    95,
    Math.round(r2 * 80 + Math.min(n, 6) * 2.5)
  );

  return {
    estimatedShelfLifeMonths: capped,
    confidenceLevel: confidence,
    method:
      studyType === "accelerated"
        ? "Arrhenius extrapolation from accelerated data"
        : "Linear regression extrapolation",
    degradationRatePerMonth: round2(rateAtRef),
    predictedEndValue: round2(initialValue + rateAtRef * capped),
    r2,
  };
}

// ─── Seed Data Generator ───────────────────────────────────────────────────

interface SeedStudyConfig {
  protocolNumber: string;
  product: string;
  productCode: string;
  batchNumber: string;
  batchSize: string;
  studyType: StabilityStudyType;
  conditionId: string;
  startDaysAgo: number;
  plannedDurationMonths: number;
  status: StabilityStatus;
  packagingType: string;
  initiatedBy: string;
  completedTimepointMonths: number[]; // which timepoints are completed
  seed: number;
}

const SEED_CONFIGS: SeedStudyConfig[] = [
  // 4 Long-term studies (25C/60%RH, 24-36 months)
  {
    protocolNumber: "STB-2024-001",
    product: "Amoxicillin 500mg",
    productCode: "AMX-500",
    batchNumber: "AMX-2024-B001",
    batchSize: "500,000 capsules",
    studyType: "long-term",
    conditionId: "cond-lt-25-60",
    startDaysAgo: 540,
    plannedDurationMonths: 36,
    status: "ongoing",
    packagingType: "HDPE bottle with CRC",
    initiatedBy: "Dr. Ahmed Hassan",
    completedTimepointMonths: [0, 3, 6, 9, 12],
    seed: 42,
  },
  {
    protocolNumber: "STB-2024-002",
    product: "Omeprazole 20mg",
    productCode: "OMP-020",
    batchNumber: "OMP-2024-B003",
    batchSize: "300,000 capsules",
    studyType: "long-term",
    conditionId: "cond-lt-25-60",
    startDaysAgo: 750,
    plannedDurationMonths: 24,
    status: "ongoing",
    packagingType: "Alu-Alu blister pack",
    initiatedBy: "Dr. Fatma Soliman",
    completedTimepointMonths: [0, 3, 6, 9, 12, 18],
    seed: 99,
  },
  {
    protocolNumber: "STB-2023-015",
    product: "Metformin 850mg",
    productCode: "MET-850",
    batchNumber: "MET-2023-B007",
    batchSize: "1,000,000 tablets",
    studyType: "long-term",
    conditionId: "cond-lt-25-60",
    startDaysAgo: 1100,
    plannedDurationMonths: 36,
    status: "completed",
    packagingType: "PVC/Alu blister pack",
    initiatedBy: "Dr. Youssef Kamal",
    completedTimepointMonths: [0, 3, 6, 9, 12, 18, 24, 36],
    seed: 157,
  },
  {
    protocolNumber: "STB-2025-003",
    product: "Atorvastatin 10mg",
    productCode: "ATV-010",
    batchNumber: "ATV-2025-B002",
    batchSize: "200,000 tablets",
    studyType: "long-term",
    conditionId: "cond-lt-25-60",
    startDaysAgo: 120,
    plannedDurationMonths: 24,
    status: "ongoing",
    packagingType: "Alu-Alu blister pack",
    initiatedBy: "Dr. Mona Abdel-Fattah",
    completedTimepointMonths: [0, 3],
    seed: 213,
  },
  // 3 Accelerated studies (40C/75%RH, 6 months)
  {
    protocolNumber: "STB-2024-004",
    product: "Amoxicillin 500mg",
    productCode: "AMX-500",
    batchNumber: "AMX-2024-B001",
    batchSize: "500,000 capsules",
    studyType: "accelerated",
    conditionId: "cond-acc-40-75",
    startDaysAgo: 540,
    plannedDurationMonths: 6,
    status: "completed",
    packagingType: "HDPE bottle with CRC",
    initiatedBy: "Dr. Ahmed Hassan",
    completedTimepointMonths: [0, 1, 2, 3, 6],
    seed: 77,
  },
  {
    protocolNumber: "STB-2024-005",
    product: "Omeprazole 20mg",
    productCode: "OMP-020",
    batchNumber: "OMP-2024-B003",
    batchSize: "300,000 capsules",
    studyType: "accelerated",
    conditionId: "cond-acc-40-75",
    startDaysAgo: 750,
    plannedDurationMonths: 6,
    status: "completed",
    packagingType: "Alu-Alu blister pack",
    initiatedBy: "Dr. Fatma Soliman",
    completedTimepointMonths: [0, 1, 2, 3, 6],
    seed: 133,
  },
  {
    protocolNumber: "STB-2025-006",
    product: "Losartan 50mg",
    productCode: "LOS-050",
    batchNumber: "LOS-2025-B001",
    batchSize: "400,000 tablets",
    studyType: "accelerated",
    conditionId: "cond-acc-40-75",
    startDaysAgo: 100,
    plannedDurationMonths: 6,
    status: "ongoing",
    packagingType: "HDPE bottle",
    initiatedBy: "Dr. Karim Naguib",
    completedTimepointMonths: [0, 1, 2, 3],
    seed: 201,
  },
  // 2 Intermediate studies (30C/65%RH)
  {
    protocolNumber: "STB-2024-007",
    product: "Metformin 850mg",
    productCode: "MET-850",
    batchNumber: "MET-2024-B012",
    batchSize: "750,000 tablets",
    studyType: "intermediate",
    conditionId: "cond-int-30-65",
    startDaysAgo: 400,
    plannedDurationMonths: 12,
    status: "ongoing",
    packagingType: "PVC/Alu blister pack",
    initiatedBy: "Dr. Youssef Kamal",
    completedTimepointMonths: [0, 3, 6, 9],
    seed: 311,
  },
  {
    protocolNumber: "STB-2025-008",
    product: "Atorvastatin 10mg",
    productCode: "ATV-010",
    batchNumber: "ATV-2025-B002",
    batchSize: "200,000 tablets",
    studyType: "intermediate",
    conditionId: "cond-int-30-65",
    startDaysAgo: 120,
    plannedDurationMonths: 12,
    status: "ongoing",
    packagingType: "Alu-Alu blister pack",
    initiatedBy: "Dr. Mona Abdel-Fattah",
    completedTimepointMonths: [0, 3],
    seed: 372,
  },
  // 1 Photostability study
  {
    protocolNumber: "STB-2025-009",
    product: "Losartan 50mg",
    productCode: "LOS-050",
    batchNumber: "LOS-2025-B001",
    batchSize: "400,000 tablets",
    studyType: "photostability",
    conditionId: "cond-photo",
    startDaysAgo: 60,
    plannedDurationMonths: 1,
    status: "completed",
    packagingType: "Amber glass bottle",
    initiatedBy: "Dr. Karim Naguib",
    completedTimepointMonths: [0],
    seed: 444,
  },
];

function generateTestResults(
  parameter: StabilityTestParameter,
  month: number,
  initialValue: number,
  specMin: number | undefined,
  specMax: number | undefined,
  rng: () => number,
  studyType: StabilityStudyType,
  conditionTemp: number
): { result: number; trend: TrendDirection; passesSpec: boolean } {
  // Temperature-dependent degradation factor
  const tempFactor =
    conditionTemp >= 40 ? 2.5 : conditionTemp >= 30 ? 1.5 : 1.0;

  let result: number;
  let trend: TrendDirection = "stable";

  switch (parameter) {
    case "assay": {
      // Assay decreases over time (degradation)
      const degradation = month * 0.15 * tempFactor + gaussianRandom(rng) * 0.3;
      result = round2(initialValue - degradation);
      trend = month > 0 ? "decreasing" : "stable";
      break;
    }
    case "dissolution": {
      // Dissolution can decrease over time
      const decrease = month * 0.1 * tempFactor + gaussianRandom(rng) * 0.5;
      result = round2(initialValue - decrease);
      trend = month > 3 ? "decreasing" : "stable";
      break;
    }
    case "moisture": {
      // Moisture tends to increase over time
      const increase = month * 0.05 * tempFactor + gaussianRandom(rng) * 0.1;
      result = round2(initialValue + Math.abs(increase));
      trend = month > 3 ? "increasing" : "stable";
      break;
    }
    case "pH": {
      // pH relatively stable with slight drift
      const drift = month * 0.01 * tempFactor + gaussianRandom(rng) * 0.05;
      result = round2(initialValue + drift);
      trend = "stable";
      break;
    }
    case "impurities": {
      // Impurities increase over time
      const increase = month * 0.03 * tempFactor + gaussianRandom(rng) * 0.02;
      result = round2(initialValue + Math.abs(increase));
      trend = month > 3 ? "increasing" : "stable";
      break;
    }
    case "hardness": {
      // Hardness relatively stable
      const change = gaussianRandom(rng) * 0.3;
      result = round2(initialValue + change);
      trend = "stable";
      break;
    }
    case "microbial": {
      result = round2(Math.max(0, gaussianRandom(rng) * 5 + 10));
      trend = "stable";
      break;
    }
    default: {
      result = round2(initialValue + gaussianRandom(rng) * 0.5);
      trend = "stable";
      break;
    }
  }

  // Check spec compliance
  let passesSpec = true;
  if (specMin != null && result < specMin) passesSpec = false;
  if (specMax != null && result > specMax) passesSpec = false;

  return { result, trend, passesSpec };
}

function buildSeedStudies(): StabilityStudy[] {
  const studies: StabilityStudy[] = [];

  for (const config of SEED_CONFIGS) {
    const rng = seedRandom(config.seed);
    const condition = ICH_CONDITIONS.find((c) => c.id === config.conditionId) ?? ICH_CONDITIONS[0];
    const startDate = isoDate(-config.startDaysAgo);
    const schedule = TIMEPOINT_SCHEDULES[config.studyType];
    const productParams = DEFAULT_TEST_PARAMETERS[config.product] ?? [];

    // Generate initial values for each parameter
    const initialValues: Record<string, number> = {};
    for (const p of productParams) {
      switch (p.parameter) {
        case "assay":
          initialValues[p.parameter] = round2(99.5 + gaussianRandom(rng) * 0.5);
          break;
        case "dissolution":
          initialValues[p.parameter] = round2(95 + gaussianRandom(rng) * 1.5);
          break;
        case "moisture":
          initialValues[p.parameter] = round2(1.5 + Math.abs(gaussianRandom(rng) * 0.3));
          break;
        case "pH":
          initialValues[p.parameter] = round2(
            ((p.specMin ?? 3) + (p.specMax ?? 7)) / 2 + gaussianRandom(rng) * 0.2
          );
          break;
        case "impurities":
          initialValues[p.parameter] = round2(0.15 + Math.abs(gaussianRandom(rng) * 0.05));
          break;
        case "hardness":
          initialValues[p.parameter] = round2(10 + gaussianRandom(rng) * 0.5);
          break;
        default:
          initialValues[p.parameter] = 0;
          break;
      }
    }

    // Build timepoints
    const timepoints: StabilityTimepoint[] = schedule.map((month) => {
      const scheduledDate = isoDateFromMonths(startDate, month);
      const isCompleted = config.completedTimepointMonths.includes(month);

      // Determine status
      let tpStatus: TimepointStatus;
      if (isCompleted) {
        tpStatus = "completed";
      } else {
        const scheduledD = new Date(scheduledDate);
        const now = new Date();
        if (scheduledD < now) {
          tpStatus = "overdue";
        } else {
          const diffDays = (scheduledD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          tpStatus = diffDays < 14 ? "in-progress" : "scheduled";
        }
      }

      // Generate test results
      const tests: StabilityTest[] = productParams
        .filter((p) => p.parameter !== "appearance")
        .map((p) => {
          const initial = initialValues[p.parameter] ?? 100;
          if (isCompleted) {
            const { result, trend, passesSpec } = generateTestResults(
              p.parameter,
              month,
              initial,
              p.specMin,
              p.specMax,
              rng,
              config.studyType,
              condition.temperature
            );
            return {
              id: `test-${config.seed}-${month}-${p.parameter}`,
              parameter: p.parameter,
              parameterLabel: p.label,
              unit: p.unit,
              specificationMin: p.specMin,
              specificationMax: p.specMax,
              specificationText: p.specText,
              result,
              trend,
              initialValue: initial,
              passesSpec,
            };
          }
          return {
            id: `test-${config.seed}-${month}-${p.parameter}`,
            parameter: p.parameter,
            parameterLabel: p.label,
            unit: p.unit,
            specificationMin: p.specMin,
            specificationMax: p.specMax,
            specificationText: p.specText,
            result: null,
            trend: "stable" as TrendDirection,
            initialValue: initial,
            passesSpec: true,
          };
        });

      // Add appearance test (qualitative)
      const appearanceParam = productParams.find((p) => p.parameter === "appearance");
      if (appearanceParam) {
        tests.push({
          id: `test-${config.seed}-${month}-appearance`,
          parameter: "appearance",
          parameterLabel: appearanceParam.label,
          unit: "",
          specificationText: appearanceParam.specText,
          result: null,
          resultText: isCompleted ? "Conforms" : undefined,
          trend: "stable",
          passesSpec: true,
        });
      }

      return {
        id: `tp-${config.seed}-${month}`,
        studyId: `study-${config.seed}`,
        month,
        scheduledDate,
        actualDate: isCompleted ? scheduledDate : undefined,
        status: tpStatus,
        tests,
        performedBy: isCompleted ? config.initiatedBy : undefined,
        reviewedBy: isCompleted ? "QA Manager" : undefined,
      };
    });

    // Predict shelf life
    const shelfLifePrediction = predictShelfLife(
      timepoints,
      config.studyType,
      condition.temperature
    );

    const endDate =
      config.status === "completed"
        ? isoDateFromMonths(startDate, config.plannedDurationMonths)
        : undefined;

    const study: StabilityStudy = {
      id: `study-${config.seed}`,
      protocolNumber: config.protocolNumber,
      product: config.product,
      productCode: config.productCode,
      batchNumber: config.batchNumber,
      batchSize: config.batchSize,
      studyType: config.studyType,
      condition,
      startDate,
      plannedDurationMonths: config.plannedDurationMonths,
      endDate,
      status: config.status,
      timepoints,
      testParameters: productParams.map((p) => p.parameter),
      shelfLifePrediction: shelfLifePrediction ?? undefined,
      packagingType: config.packagingType,
      initiatedBy: config.initiatedBy,
      approvedBy: config.status !== "planned" ? "QA Director" : undefined,
      createdAt: isoDate(-config.startDaysAgo - 7),
      updatedAt: isoDate(-1),
    };

    studies.push(study);
  }

  return studies;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class StabilityStore {
  private studies: StabilityStudy[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.studies = JSON.parse(stored);
        return;
      } catch {
        // fallthrough to seed
      }
    }

    this.studies = buildSeedStudies();
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.studies));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  getAll(): StabilityStudy[] {
    this.load();
    return [...this.studies];
  }

  getById(id: string): StabilityStudy | undefined {
    this.load();
    return this.studies.find((s) => s.id === id);
  }

  create(data: {
    product: string;
    productCode: string;
    batchNumber: string;
    batchSize: string;
    studyType: StabilityStudyType;
    condition: StabilityCondition;
    plannedDurationMonths: number;
    testParameters: StabilityTestParameter[];
    packagingType: string;
    initiatedBy: string;
    notes?: string;
  }): StabilityStudy {
    if (!data.product?.trim()) throw new Error("Stability study product is required");
    if (!data.productCode?.trim()) throw new Error("Stability study product code is required");
    if (!data.batchNumber?.trim()) throw new Error("Stability study batch number is required");
    if (!data.batchSize?.trim()) throw new Error("Stability study batch size is required");
    if (!data.packagingType?.trim()) throw new Error("Stability study packaging type is required");
    if (!data.initiatedBy?.trim()) throw new Error("Stability study initiatedBy is required");
    this.load();
    const now = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();
    const existingCount = this.studies.filter((s) =>
      s.protocolNumber.startsWith(`STB-${year}`)
    ).length;
    const protocolNumber = `STB-${year}-${String(existingCount + 1).padStart(3, "0")}`;

    const schedule = TIMEPOINT_SCHEDULES[data.studyType];
    const productParams = DEFAULT_TEST_PARAMETERS[data.product] ?? [];

    const timepoints: StabilityTimepoint[] = schedule.map((month) => {
      const scheduledDate = isoDateFromMonths(now, month);
      const tests: StabilityTest[] = productParams
        .filter((p) => data.testParameters.includes(p.parameter))
        .map((p) => ({
          id: uid(),
          parameter: p.parameter,
          parameterLabel: p.label,
          unit: p.unit,
          specificationMin: p.specMin,
          specificationMax: p.specMax,
          specificationText: p.specText,
          result: null,
          trend: "stable" as TrendDirection,
          passesSpec: true,
        }));

      return {
        id: uid(),
        studyId: "",
        month,
        scheduledDate,
        status: month === 0 ? "scheduled" : "scheduled" as TimepointStatus,
        tests,
      };
    });

    const study: StabilityStudy = {
      id: uid(),
      protocolNumber,
      product: data.product,
      productCode: data.productCode,
      batchNumber: data.batchNumber,
      batchSize: data.batchSize,
      studyType: data.studyType,
      condition: data.condition,
      startDate: now,
      plannedDurationMonths: data.plannedDurationMonths,
      status: "planned",
      timepoints: timepoints.map((tp) => ({ ...tp, studyId: "" })),
      testParameters: data.testParameters,
      packagingType: data.packagingType,
      initiatedBy: data.initiatedBy,
      createdAt: now,
      updatedAt: now,
      notes: data.notes,
    };

    // Fix studyId references
    study.timepoints = study.timepoints.map((tp) => ({
      ...tp,
      studyId: study.id,
    }));

    this.studies.unshift(study);
    this.save();
    return study;
  }

  update(id: string, updates: Partial<StabilityStudy>): StabilityStudy | undefined {
    this.load();
    const idx = this.studies.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.studies[idx] = {
      ...this.studies[idx],
      ...updates,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    this.save();
    return this.studies[idx];
  }

  delete(id: string): boolean {
    this.load();
    const idx = this.studies.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.studies.splice(idx, 1);
    this.save();
    return true;
  }

  // ── Timepoint Management ──────────────────────────────────────────────

  recordTimepointResults(
    studyId: string,
    timepointId: string,
    results: { parameter: StabilityTestParameter; result: number }[],
    performedBy: string
  ): StabilityStudy | undefined {
    this.load();
    const study = this.getById(studyId);
    if (!study) return undefined;

    const tp = study.timepoints.find((t) => t.id === timepointId);
    if (!tp) return undefined;

    tp.status = "completed";
    tp.actualDate = new Date().toISOString().slice(0, 10);
    tp.performedBy = performedBy;

    for (const r of results) {
      const test = tp.tests.find((t) => t.parameter === r.parameter);
      if (!test) continue;
      test.result = r.result;

      // Determine trend
      const earlier = study.timepoints
        .filter((t) => t.month < tp.month && t.status === "completed")
        .sort((a, b) => a.month - b.month);

      if (earlier.length > 0) {
        const prevTest = earlier[earlier.length - 1].tests.find(
          (t) => t.parameter === r.parameter
        );
        if (prevTest?.result != null) {
          if (r.result > prevTest.result + 0.5) test.trend = "increasing";
          else if (r.result < prevTest.result - 0.5) test.trend = "decreasing";
          else test.trend = "stable";
        }
      }

      // Check spec
      test.passesSpec = true;
      if (test.specificationMin != null && r.result < test.specificationMin) {
        test.passesSpec = false;
      }
      if (test.specificationMax != null && r.result > test.specificationMax) {
        test.passesSpec = false;
      }
    }

    // Re-predict shelf life
    study.shelfLifePrediction =
      predictShelfLife(study.timepoints, study.studyType, study.condition.temperature) ?? undefined;

    // Check if study should be marked complete
    const allComplete = study.timepoints.every(
      (t) => t.status === "completed" || t.status === "skipped"
    );
    if (allComplete) {
      study.status = "completed";
      study.endDate = new Date().toISOString().slice(0, 10);
    }

    // Check if any OOS
    const hasOOS = study.timepoints.some((t) =>
      t.tests.some((test) => !test.passesSpec && test.result != null)
    );
    if (hasOOS && study.status === "ongoing") {
      // Don't auto-fail, just flag
    }

    return this.update(study.id, study);
  }

  // ── Queries ──────────────────────────────────────────────────────────

  getByProduct(product: string): StabilityStudy[] {
    return this.getAll().filter((s) => s.product === product);
  }

  getByStatus(status: StabilityStatus): StabilityStudy[] {
    return this.getAll().filter((s) => s.status === status);
  }

  getByStudyType(studyType: StabilityStudyType): StabilityStudy[] {
    return this.getAll().filter((s) => s.studyType === studyType);
  }

  getUpcomingTimepoints(withinDays: number = 30): {
    study: StabilityStudy;
    timepoint: StabilityTimepoint;
    daysUntil: number;
  }[] {
    const now = new Date();
    const results: {
      study: StabilityStudy;
      timepoint: StabilityTimepoint;
      daysUntil: number;
    }[] = [];

    for (const study of this.getAll()) {
      if (study.status !== "ongoing" && study.status !== "planned") continue;
      for (const tp of study.timepoints) {
        if (tp.status !== "scheduled" && tp.status !== "in-progress") continue;
        const scheduled = new Date(tp.scheduledDate);
        const diff = Math.ceil(
          (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff >= 0 && diff <= withinDays) {
          results.push({ study, timepoint: tp, daysUntil: diff });
        }
      }
    }

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  getOverdueTimepoints(): {
    study: StabilityStudy;
    timepoint: StabilityTimepoint;
    daysOverdue: number;
  }[] {
    const now = new Date();
    const results: {
      study: StabilityStudy;
      timepoint: StabilityTimepoint;
      daysOverdue: number;
    }[] = [];

    for (const study of this.getAll()) {
      if (study.status !== "ongoing") continue;
      for (const tp of study.timepoints) {
        if (tp.status === "completed" || tp.status === "skipped") continue;
        const scheduled = new Date(tp.scheduledDate);
        const diff = Math.ceil(
          (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff > 0) {
          results.push({ study, timepoint: tp, daysOverdue: diff });
        }
      }
    }

    return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  getUniqueProducts(): string[] {
    return [...new Set(this.getAll().map((s) => s.product))];
  }

  // ── Metrics ──────────────────────────────────────────────────────────

  getMetrics(): StabilityMetrics {
    const all = this.getAll();
    const active = all.filter((s) => s.status === "ongoing");
    const completed = all.filter((s) => s.status === "completed");
    const planned = all.filter((s) => s.status === "planned");

    const upcoming = this.getUpcomingTimepoints(30);
    const overdue = this.getOverdueTimepoints();

    const products = new Set(all.map((s) => s.product));

    // Average shelf life from predictions
    const shelfLives = all
      .map((s) => s.shelfLifePrediction?.estimatedShelfLifeMonths)
      .filter((v): v is number => v != null && v > 0);
    const avgShelfLife =
      shelfLives.length > 0
        ? Math.round(shelfLives.reduce((s, v) => s + v, 0) / shelfLives.length)
        : 0;

    // Compliance rate: completed on time / total completed
    let totalCompletedTPs = 0;
    let onTimeTPs = 0;
    for (const study of all) {
      for (const tp of study.timepoints) {
        if (tp.status === "completed") {
          totalCompletedTPs++;
          if (
            tp.actualDate &&
            tp.scheduledDate &&
            new Date(tp.actualDate) <= new Date(new Date(tp.scheduledDate).getTime() + 7 * 24 * 60 * 60 * 1000)
          ) {
            onTimeTPs++;
          }
        }
      }
    }
    const complianceRate =
      totalCompletedTPs > 0 ? round2((onTimeTPs / totalCompletedTPs) * 100) : 100;

    const studiesByType: Record<StabilityStudyType, number> = {
      "long-term": 0,
      accelerated: 0,
      intermediate: 0,
      "in-use": 0,
      photostability: 0,
    };
    const studiesByStatus: Record<StabilityStatus, number> = {
      planned: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
    };

    for (const s of all) {
      studiesByType[s.studyType]++;
      studiesByStatus[s.status]++;
    }

    return {
      totalStudies: all.length,
      activeStudies: active.length,
      completedStudies: completed.length,
      plannedStudies: planned.length,
      upcomingTimepoints: upcoming.length,
      overdueTimepoints: overdue.length,
      productsOnStability: products.size,
      avgShelfLifeMonths: avgShelfLife,
      complianceRate,
      studiesByType,
      studiesByStatus,
    };
  }
}

export const stabilityStore = new StabilityStore();
