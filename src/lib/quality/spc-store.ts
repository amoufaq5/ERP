"use client";

import type {
  SPCChart,
  SPCChartType,
  SPCChartStatus,
  SPCDataPoint,
  ControlLimits,
  SpecificationLimits,
  ProcessCapability,
  SPCViolation,
  SPCMetrics,
  SPCRuleId,
  ViolationSeverity,
} from "./spc-types";
import { DEFAULT_SPC_RULES } from "./spc-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.spc-charts";

function isoDate(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function uid(): string {
  return `spc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ─── Control Limit Calculator ──────────────────────────────────────────────

export function calculateControlLimits(values: number[]): ControlLimits {
  const m = mean(values);
  const s = stdDev(values);
  return {
    UCL: round4(m + 3 * s),
    LCL: round4(m - 3 * s),
    CL: round4(m),
    UWL: round4(m + 2 * s),
    LWL: round4(m - 2 * s),
    oneσUpper: round4(m + s),
    oneσLower: round4(m - s),
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ─── Process Capability Calculator ─────────────────────────────────────────

export function calculateCapability(
  values: number[],
  specLimits: SpecificationLimits
): ProcessCapability {
  const m = mean(values);
  const s = stdDev(values);
  const { USL, LSL } = specLimits;

  const Cp = s > 0 ? round4((USL - LSL) / (6 * s)) : 0;
  const CpUpper = s > 0 ? round4((USL - m) / (3 * s)) : 0;
  const CpLower = s > 0 ? round4((m - LSL) / (3 * s)) : 0;
  const Cpk = round4(Math.min(CpUpper, CpLower));

  // Pp/Ppk use overall std dev (same as s for single group)
  const Pp = Cp;
  const Ppk = Cpk;

  // PPM calculation using normal approximation
  const zUpper = s > 0 ? (USL - m) / s : 6;
  const zLower = s > 0 ? (m - LSL) / s : 6;
  const ppmAboveUSL = Math.round(normalCDF(-zUpper) * 1000000);
  const ppmBelowLSL = Math.round(normalCDF(-zLower) * 1000000);

  return {
    Cp,
    Cpk,
    Pp,
    Ppk,
    sigma: round4(s),
    mean: round4(m),
    ppmAboveUSL,
    ppmBelowLSL,
    ppmTotal: ppmAboveUSL + ppmBelowLSL,
  };
}

// Simple normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x: number): number {
  if (x > 6) return 1;
  if (x < -6) return 0;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

// ─── Western Electric Rule Checker ─────────────────────────────────────────

export function checkWesternElectricRules(
  dataPoints: SPCDataPoint[],
  limits: ControlLimits,
  enabledRules: SPCRuleId[]
): Map<number, SPCRuleId[]> {
  const violations = new Map<number, SPCRuleId[]>();
  const values = dataPoints.map((dp) => dp.value);
  const n = values.length;

  function addViolation(index: number, ruleId: SPCRuleId): void {
    if (!violations.has(index)) violations.set(index, []);
    violations.get(index)!.push(ruleId);
  }

  // Rule 1: 1 point beyond 3 sigma
  if (enabledRules.includes("rule1")) {
    for (let i = 0; i < n; i++) {
      if (values[i] > limits.UCL || values[i] < limits.LCL) {
        addViolation(i, "rule1");
      }
    }
  }

  // Rule 2: 2 of 3 consecutive beyond 2 sigma (same side)
  if (enabledRules.includes("rule2")) {
    for (let i = 2; i < n; i++) {
      const window = [values[i - 2], values[i - 1], values[i]];
      const aboveUWL = window.filter((v) => v > limits.UWL).length;
      const belowLWL = window.filter((v) => v < limits.LWL).length;
      if (aboveUWL >= 2 || belowLWL >= 2) {
        addViolation(i, "rule2");
      }
    }
  }

  // Rule 3: 4 of 5 consecutive beyond 1 sigma (same side)
  if (enabledRules.includes("rule3")) {
    for (let i = 4; i < n; i++) {
      const window = values.slice(i - 4, i + 1);
      const above1s = window.filter((v) => v > limits.oneσUpper).length;
      const below1s = window.filter((v) => v < limits.oneσLower).length;
      if (above1s >= 4 || below1s >= 4) {
        addViolation(i, "rule3");
      }
    }
  }

  // Rule 4: 8 consecutive on one side
  if (enabledRules.includes("rule4")) {
    for (let i = 7; i < n; i++) {
      const window = values.slice(i - 7, i + 1);
      const allAbove = window.every((v) => v > limits.CL);
      const allBelow = window.every((v) => v < limits.CL);
      if (allAbove || allBelow) {
        addViolation(i, "rule4");
      }
    }
  }

  // Rule 5: 6 consecutive trending
  if (enabledRules.includes("rule5")) {
    for (let i = 5; i < n; i++) {
      const window = values.slice(i - 5, i + 1);
      let allIncreasing = true;
      let allDecreasing = true;
      for (let j = 1; j < window.length; j++) {
        if (window[j] <= window[j - 1]) allIncreasing = false;
        if (window[j] >= window[j - 1]) allDecreasing = false;
      }
      if (allIncreasing || allDecreasing) {
        addViolation(i, "rule5");
      }
    }
  }

  // Rule 6: 14 alternating
  if (enabledRules.includes("rule6")) {
    for (let i = 13; i < n; i++) {
      const window = values.slice(i - 13, i + 1);
      let alternating = true;
      for (let j = 2; j < window.length; j++) {
        const prev = window[j - 1] - window[j - 2];
        const curr = window[j] - window[j - 1];
        if (prev * curr >= 0) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        addViolation(i, "rule6");
      }
    }
  }

  // Rule 7: 15 within 1 sigma (stratification)
  if (enabledRules.includes("rule7")) {
    for (let i = 14; i < n; i++) {
      const window = values.slice(i - 14, i + 1);
      const allWithin1s = window.every(
        (v) => v >= limits.oneσLower && v <= limits.oneσUpper
      );
      if (allWithin1s) {
        addViolation(i, "rule7");
      }
    }
  }

  // Rule 8: 8 consecutive beyond 1 sigma on either side
  if (enabledRules.includes("rule8")) {
    for (let i = 7; i < n; i++) {
      const window = values.slice(i - 7, i + 1);
      const allBeyond1s = window.every(
        (v) => v > limits.oneσUpper || v < limits.oneσLower
      );
      if (allBeyond1s) {
        addViolation(i, "rule8");
      }
    }
  }

  return violations;
}

// ─── Seed Data Generator ───────────────────────────────────────────────────

function generateDataPoints(
  count: number,
  baseMean: number,
  baseStdDev: number,
  options?: {
    shiftAt?: number;      // index where a shift occurs
    shiftAmount?: number;  // shift magnitude
    trendStart?: number;   // index where trending begins
    trendSlope?: number;   // trend per sample
    outliers?: number[];   // indices with outlier points
    outlierMagnitude?: number;
  }
): number[] {
  const rng = seedRandom(baseMean * 1000 + count);
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    let value = baseMean + gaussianRandom(rng) * baseStdDev;

    // Apply shift
    if (options?.shiftAt != null && i >= options.shiftAt) {
      value += options.shiftAmount ?? baseStdDev;
    }

    // Apply trend
    if (options?.trendStart != null && i >= options.trendStart) {
      value += (i - options.trendStart) * (options?.trendSlope ?? baseStdDev * 0.05);
    }

    // Apply outliers
    if (options?.outliers?.includes(i)) {
      value += (options.outlierMagnitude ?? 3.5) * baseStdDev * (rng() > 0.5 ? 1 : -1);
    }

    values.push(round4(value));
  }

  return values;
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

// Box-Muller transform for gaussian
function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
}

interface SeedChartConfig {
  name: string;
  product: string;
  process: string;
  parameter: string;
  unit: string;
  chartType: SPCChartType;
  baseMean: number;
  baseStdDev: number;
  USL: number;
  LSL: number;
  pointCount: number;
  subgroupSize: number;
  samplingFrequency: string;
  dataOptions?: Parameters<typeof generateDataPoints>[3];
}

const SEED_CONFIGS: SeedChartConfig[] = [
  {
    name: "Tablet Weight - Amoxicillin 500mg",
    product: "Amoxicillin 500mg Capsules",
    process: "Tablet Compression",
    parameter: "Tablet Weight",
    unit: "mg",
    chartType: "x-bar",
    baseMean: 500,
    baseStdDev: 2.5,
    USL: 510,
    LSL: 490,
    pointCount: 40,
    subgroupSize: 5,
    samplingFrequency: "Every 30 minutes",
    // Normal in-control process
  },
  {
    name: "Tablet Hardness - Metformin 850mg",
    product: "Metformin 850mg Tablets",
    process: "Tablet Compression",
    parameter: "Hardness",
    unit: "kP",
    chartType: "x-bar",
    baseMean: 12,
    baseStdDev: 0.8,
    USL: 16,
    LSL: 8,
    pointCount: 35,
    subgroupSize: 5,
    samplingFrequency: "Every batch",
    dataOptions: {
      shiftAt: 28,
      shiftAmount: 1.5,
    },
  },
  {
    name: "Dissolution - Omeprazole 20mg",
    product: "Omeprazole 20mg Capsules",
    process: "Dissolution Testing",
    parameter: "Dissolution at 45 min",
    unit: "%",
    chartType: "x-bar",
    baseMean: 85,
    baseStdDev: 3,
    USL: 100,
    LSL: 75,
    pointCount: 45,
    subgroupSize: 6,
    samplingFrequency: "Every batch",
    dataOptions: {
      trendStart: 30,
      trendSlope: -0.3,
    },
  },
  {
    name: "Content Uniformity - Losartan 50mg",
    product: "Losartan 50mg Tablets",
    process: "Blending",
    parameter: "Content Uniformity (RSD)",
    unit: "% RSD",
    chartType: "r-chart",
    baseMean: 2.5,
    baseStdDev: 0.4,
    USL: 5.0,
    LSL: 0,
    pointCount: 30,
    subgroupSize: 10,
    samplingFrequency: "Every batch",
    dataOptions: {
      outliers: [12, 25],
      outlierMagnitude: 3.5,
    },
  },
  {
    name: "Moisture Content - Paracetamol 500mg",
    product: "Paracetamol 500mg Tablets",
    process: "Drying / Granulation",
    parameter: "Moisture Content (LOD)",
    unit: "%",
    chartType: "x-bar",
    baseMean: 2.0,
    baseStdDev: 0.3,
    USL: 3.5,
    LSL: 0.5,
    pointCount: 38,
    subgroupSize: 3,
    samplingFrequency: "Every 2 hours",
  },
  {
    name: "Fill Volume - Insulin Glargine 100IU/mL",
    product: "Insulin Glargine 100IU/mL",
    process: "Aseptic Filling",
    parameter: "Fill Volume",
    unit: "mL",
    chartType: "x-bar",
    baseMean: 3.0,
    baseStdDev: 0.02,
    USL: 3.1,
    LSL: 2.9,
    pointCount: 50,
    subgroupSize: 5,
    samplingFrequency: "Every 15 minutes",
    dataOptions: {
      shiftAt: 38,
      shiftAmount: 0.03,
      outliers: [42],
      outlierMagnitude: 4,
    },
  },
  {
    name: "pH - Purified Water System",
    product: "Purified Water",
    process: "Water System",
    parameter: "pH",
    unit: "pH",
    chartType: "x-bar",
    baseMean: 6.8,
    baseStdDev: 0.15,
    USL: 7.5,
    LSL: 5.5,
    pointCount: 42,
    subgroupSize: 3,
    samplingFrequency: "Daily",
  },
  {
    name: "Particle Size D50 - Ciprofloxacin 500mg",
    product: "Ciprofloxacin 500mg Tablets",
    process: "Milling",
    parameter: "Particle Size D50",
    unit: "um",
    chartType: "x-bar",
    baseMean: 45,
    baseStdDev: 3,
    USL: 60,
    LSL: 30,
    pointCount: 32,
    subgroupSize: 3,
    samplingFrequency: "Every batch",
    dataOptions: {
      trendStart: 20,
      trendSlope: 0.4,
      outliers: [28],
      outlierMagnitude: 3.2,
    },
  },
];

function buildSeedCharts(): SPCChart[] {
  const charts: SPCChart[] = [];

  for (let ci = 0; ci < SEED_CONFIGS.length; ci++) {
    const config = SEED_CONFIGS[ci];
    const rawValues = generateDataPoints(
      config.pointCount,
      config.baseMean,
      config.baseStdDev,
      config.dataOptions
    );

    // Calculate control limits from first 20 points (phase 1) or all if < 20
    const phase1 = rawValues.slice(0, Math.min(20, rawValues.length));
    const controlLimits = calculateControlLimits(phase1);

    const specLimits: SpecificationLimits = {
      USL: config.USL,
      LSL: config.LSL,
      target: config.baseMean,
    };

    const enabledRules: SPCRuleId[] = ["rule1", "rule2", "rule3", "rule4", "rule5"];

    // Build data points
    const dataPoints: SPCDataPoint[] = rawValues.map((value, i) => ({
      id: `dp-${ci}-${i}`,
      timestamp: isoDate(config.pointCount - i),
      sampleNumber: i + 1,
      value,
      subgroupSize: config.subgroupSize,
      inControl: true, // Will be updated after rule checking
      violations: [],
    }));

    // Check rules
    const ruleViolations = checkWesternElectricRules(dataPoints, controlLimits, enabledRules);

    // Update data points with violations
    for (const [idx, ruleIds] of ruleViolations.entries()) {
      dataPoints[idx].inControl = false;
      dataPoints[idx].violations = ruleIds;
    }

    // Build violation objects
    const violations: SPCViolation[] = [];
    for (const [idx, ruleIds] of ruleViolations.entries()) {
      for (const ruleId of ruleIds) {
        const rule = DEFAULT_SPC_RULES.find((r) => r.id === ruleId);
        if (!rule) continue;
        violations.push({
          id: `viol-${ci}-${idx}-${ruleId}`,
          chartId: `chart-${ci}`,
          chartName: config.name,
          ruleId,
          ruleName: rule.name,
          severity: rule.severity,
          detectedAt: dataPoints[idx].timestamp,
          dataPointIds: [dataPoints[idx].id],
          sampleNumbers: [dataPoints[idx].sampleNumber],
          value: dataPoints[idx].value,
          acknowledged: idx < (config.pointCount - 5), // older ones acknowledged
          acknowledgedBy: idx < (config.pointCount - 5) ? "QA Analyst" : undefined,
          acknowledgedAt: idx < (config.pointCount - 5) ? dataPoints[idx].timestamp : undefined,
          product: config.product,
          process: config.process,
          parameter: config.parameter,
        });
      }
    }

    // Calculate capability
    const capability = calculateCapability(rawValues, specLimits);

    const chart: SPCChart = {
      id: `chart-${ci}`,
      name: config.name,
      chartType: config.chartType,
      product: config.product,
      process: config.process,
      parameter: config.parameter,
      unit: config.unit,
      status: "active",
      createdAt: isoDate(config.pointCount + 10),
      updatedAt: isoDate(0),
      controlLimits,
      specLimits,
      dataPoints,
      violations,
      capability,
      enabledRules,
      subgroupSize: config.subgroupSize,
      samplingFrequency: config.samplingFrequency,
    };

    charts.push(chart);
  }

  return charts;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class SPCStore {
  private charts: SPCChart[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.charts = JSON.parse(stored);
        return;
      } catch {
        // fallthrough to seed
      }
    }

    this.charts = buildSeedCharts();
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.charts));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  getAll(): SPCChart[] {
    this.load();
    return [...this.charts];
  }

  getById(id: string): SPCChart | undefined {
    this.load();
    return this.charts.find((c) => c.id === id);
  }

  create(data: {
    name: string;
    chartType: SPCChartType;
    product: string;
    process: string;
    parameter: string;
    unit: string;
    subgroupSize: number;
    samplingFrequency: string;
    specLimits?: SpecificationLimits;
    manualLimits?: ControlLimits;
  }): SPCChart {
    this.load();
    const now = new Date().toISOString().slice(0, 10);
    const controlLimits = data.manualLimits ?? {
      UCL: 0,
      LCL: 0,
      CL: 0,
      UWL: 0,
      LWL: 0,
      oneσUpper: 0,
      oneσLower: 0,
    };

    const chart: SPCChart = {
      id: uid(),
      name: data.name,
      chartType: data.chartType,
      product: data.product,
      process: data.process,
      parameter: data.parameter,
      unit: data.unit,
      status: "active",
      createdAt: now,
      updatedAt: now,
      controlLimits,
      specLimits: data.specLimits,
      dataPoints: [],
      violations: [],
      enabledRules: ["rule1", "rule2", "rule3", "rule4", "rule5"],
      subgroupSize: data.subgroupSize,
      samplingFrequency: data.samplingFrequency,
    };

    this.charts.unshift(chart);
    this.save();
    return chart;
  }

  update(id: string, updates: Partial<SPCChart>): SPCChart | undefined {
    this.load();
    const idx = this.charts.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.charts[idx] = {
      ...this.charts[idx],
      ...updates,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    this.save();
    return this.charts[idx];
  }

  delete(id: string): boolean {
    this.load();
    const idx = this.charts.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.charts.splice(idx, 1);
    this.save();
    return true;
  }

  // ── Data Point Management ────────────────────────────────────────────

  addDataPoint(
    chartId: string,
    value: number,
    subgroupValues?: number[]
  ): SPCChart | undefined {
    this.load();
    const chart = this.getById(chartId);
    if (!chart) return undefined;

    const dp: SPCDataPoint = {
      id: uid(),
      timestamp: new Date().toISOString().slice(0, 10),
      sampleNumber: chart.dataPoints.length + 1,
      value,
      subgroupSize: chart.subgroupSize,
      subgroupValues,
      inControl: true,
      violations: [],
    };

    chart.dataPoints.push(dp);

    // Recalculate rules
    this.recalculateViolations(chart);

    // Recalculate capability if spec limits exist
    if (chart.specLimits) {
      chart.capability = calculateCapability(
        chart.dataPoints.map((p) => p.value),
        chart.specLimits
      );
    }

    return this.update(chart.id, {
      dataPoints: chart.dataPoints,
      violations: chart.violations,
      capability: chart.capability,
    });
  }

  // ── Recalculate Violations ───────────────────────────────────────────

  recalculateViolations(chart: SPCChart): void {
    const ruleViolations = checkWesternElectricRules(
      chart.dataPoints,
      chart.controlLimits,
      chart.enabledRules
    );

    // Reset all data points
    for (const dp of chart.dataPoints) {
      dp.inControl = true;
      dp.violations = [];
    }

    // Build new violation list preserving acknowledgements
    const oldViols = new Map(chart.violations.map((v) => [`${v.ruleId}-${v.sampleNumbers.join(",")}`, v]));
    const newViolations: SPCViolation[] = [];

    for (const [idx, ruleIds] of ruleViolations.entries()) {
      chart.dataPoints[idx].inControl = false;
      chart.dataPoints[idx].violations = ruleIds;

      for (const ruleId of ruleIds) {
        const rule = DEFAULT_SPC_RULES.find((r) => r.id === ruleId);
        if (!rule) continue;
        const key = `${ruleId}-${chart.dataPoints[idx].sampleNumber}`;
        const existing = oldViols.get(key);

        newViolations.push({
          id: existing?.id ?? uid(),
          chartId: chart.id,
          chartName: chart.name,
          ruleId,
          ruleName: rule.name,
          severity: rule.severity,
          detectedAt: chart.dataPoints[idx].timestamp,
          dataPointIds: [chart.dataPoints[idx].id],
          sampleNumbers: [chart.dataPoints[idx].sampleNumber],
          value: chart.dataPoints[idx].value,
          acknowledged: existing?.acknowledged ?? false,
          acknowledgedBy: existing?.acknowledgedBy,
          acknowledgedAt: existing?.acknowledgedAt,
          notes: existing?.notes,
          product: chart.product,
          process: chart.process,
          parameter: chart.parameter,
        });
      }
    }

    chart.violations = newViolations;
  }

  // ── Recalculate control limits from data ─────────────────────────────

  recalculateLimits(chartId: string): SPCChart | undefined {
    this.load();
    const chart = this.getById(chartId);
    if (!chart || chart.dataPoints.length < 2) return undefined;

    const values = chart.dataPoints.map((dp) => dp.value);
    chart.controlLimits = calculateControlLimits(values);

    this.recalculateViolations(chart);

    if (chart.specLimits) {
      chart.capability = calculateCapability(values, chart.specLimits);
    }

    return this.update(chart.id, {
      controlLimits: chart.controlLimits,
      dataPoints: chart.dataPoints,
      violations: chart.violations,
      capability: chart.capability,
    });
  }

  // ── Acknowledge Violation ────────────────────────────────────────────

  acknowledgeViolation(
    chartId: string,
    violationId: string,
    user: string,
    notes?: string
  ): SPCViolation | undefined {
    this.load();
    const chart = this.getById(chartId);
    if (!chart) return undefined;
    const v = chart.violations.find((viol) => viol.id === violationId);
    if (!v) return undefined;
    v.acknowledged = true;
    v.acknowledgedBy = user;
    v.acknowledgedAt = new Date().toISOString().slice(0, 10);
    if (notes) v.notes = notes;
    this.save();
    return v;
  }

  // ── Queries ──────────────────────────────────────────────────────────

  getActive(): SPCChart[] {
    return this.getAll().filter((c) => c.status === "active");
  }

  getByStatus(status: SPCChartStatus): SPCChart[] {
    return this.getAll().filter((c) => c.status === status);
  }

  getByProduct(product: string): SPCChart[] {
    return this.getAll().filter((c) => c.product === product);
  }

  getInControlCharts(): SPCChart[] {
    return this.getActive().filter(
      (c) => c.dataPoints.length > 0 && c.dataPoints.every((dp) => dp.inControl)
    );
  }

  getOutOfControlCharts(): SPCChart[] {
    return this.getActive().filter(
      (c) => c.dataPoints.some((dp) => !dp.inControl)
    );
  }

  getAllViolations(): SPCViolation[] {
    return this.getAll().flatMap((c) => c.violations);
  }

  getUnacknowledgedViolations(): SPCViolation[] {
    return this.getAllViolations().filter((v) => !v.acknowledged);
  }

  // ── Metrics ──────────────────────────────────────────────────────────

  getMetrics(): SPCMetrics {
    const all = this.getAll();
    const active = all.filter((c) => c.status === "active");
    const inControl = active.filter(
      (c) => c.dataPoints.length > 0 && c.dataPoints.every((dp) => dp.inControl)
    );
    const outOfControl = active.filter(
      (c) => c.dataPoints.some((dp) => !dp.inControl)
    );

    const allViolations = all.flatMap((c) => c.violations);
    const unresolved = allViolations.filter((v) => !v.acknowledged);

    const cpkValues = active
      .map((c) => c.capability?.Cpk)
      .filter((v): v is number => v != null && v > 0);
    const avgCpk = cpkValues.length > 0 ? round4(mean(cpkValues)) : 0;

    return {
      totalCharts: all.length,
      activeCharts: active.length,
      inControlCharts: inControl.length,
      outOfControlCharts: outOfControl.length,
      totalViolations: allViolations.length,
      unresolvedViolations: unresolved.length,
      avgCpk,
      chartsAboveCpk133: active.filter((c) => (c.capability?.Cpk ?? 0) >= 1.33).length,
      chartsBelowCpk1: active.filter((c) => (c.capability?.Cpk ?? 0) < 1.0 && (c.capability?.Cpk ?? 0) > 0).length,
    };
  }

  // ── Unique Products ──────────────────────────────────────────────────

  getUniqueProducts(): string[] {
    return [...new Set(this.getAll().map((c) => c.product))];
  }

  getUniqueProcesses(): string[] {
    return [...new Set(this.getAll().map((c) => c.process))];
  }
}

export const spcStore = new SPCStore();
