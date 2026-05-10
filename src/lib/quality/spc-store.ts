'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type {
  SPCChart,
  SPCDataPoint,
  SPCRuleId,
  ControlLimits,
  SpecificationLimits,
  ProcessCapability,
} from './spc-types';

export type { SPCChart } from './spc-types';

// ─── Statistical Helpers ───────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

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

// ─── Utility Functions (preserved for page imports) ────────────────────────

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

export function calculateCapability(
  values: number[],
  specLimits: SpecificationLimits,
): ProcessCapability {
  const m = mean(values);
  const s = stdDev(values);
  const { USL, LSL } = specLimits;
  const Cp = s > 0 ? round4((USL - LSL) / (6 * s)) : 0;
  const CpUpper = s > 0 ? round4((USL - m) / (3 * s)) : 0;
  const CpLower = s > 0 ? round4((m - LSL) / (3 * s)) : 0;
  const Cpk = round4(Math.min(CpUpper, CpLower));
  const Pp = Cp;
  const Ppk = Cpk;
  const zUpper = s > 0 ? (USL - m) / s : 6;
  const zLower = s > 0 ? (m - LSL) / s : 6;
  const ppmAboveUSL = Math.round(normalCDF(-zUpper) * 1000000);
  const ppmBelowLSL = Math.round(normalCDF(-zLower) * 1000000);
  return { Cp, Cpk, Pp, Ppk, sigma: round4(s), mean: round4(m), ppmAboveUSL, ppmBelowLSL, ppmTotal: ppmAboveUSL + ppmBelowLSL };
}

export function checkWesternElectricRules(
  dataPoints: SPCDataPoint[],
  limits: ControlLimits,
  enabledRules: SPCRuleId[],
): Map<number, SPCRuleId[]> {
  const violations = new Map<number, SPCRuleId[]>();
  const values = dataPoints.map((dp) => dp.value);
  const n = values.length;

  function addViolation(index: number, ruleId: SPCRuleId): void {
    if (!violations.has(index)) violations.set(index, []);
    violations.get(index)!.push(ruleId);
  }

  if (enabledRules.includes('rule1')) {
    for (let i = 0; i < n; i++) {
      if (values[i] > limits.UCL || values[i] < limits.LCL) addViolation(i, 'rule1');
    }
  }
  if (enabledRules.includes('rule2')) {
    for (let i = 2; i < n; i++) {
      const w = [values[i - 2], values[i - 1], values[i]];
      if (w.filter((v) => v > limits.UWL).length >= 2 || w.filter((v) => v < limits.LWL).length >= 2) addViolation(i, 'rule2');
    }
  }
  if (enabledRules.includes('rule3')) {
    for (let i = 4; i < n; i++) {
      const w = values.slice(i - 4, i + 1);
      if (w.filter((v) => v > limits.oneσUpper).length >= 4 || w.filter((v) => v < limits.oneσLower).length >= 4) addViolation(i, 'rule3');
    }
  }
  if (enabledRules.includes('rule4')) {
    for (let i = 7; i < n; i++) {
      const w = values.slice(i - 7, i + 1);
      if (w.every((v) => v > limits.CL) || w.every((v) => v < limits.CL)) addViolation(i, 'rule4');
    }
  }
  if (enabledRules.includes('rule5')) {
    for (let i = 5; i < n; i++) {
      const w = values.slice(i - 5, i + 1);
      let inc = true, dec = true;
      for (let j = 1; j < w.length; j++) {
        if (w[j] <= w[j - 1]) inc = false;
        if (w[j] >= w[j - 1]) dec = false;
      }
      if (inc || dec) addViolation(i, 'rule5');
    }
  }
  if (enabledRules.includes('rule6')) {
    for (let i = 13; i < n; i++) {
      const w = values.slice(i - 13, i + 1);
      let alt = true;
      for (let j = 2; j < w.length; j++) {
        if ((w[j - 1] - w[j - 2]) * (w[j] - w[j - 1]) >= 0) { alt = false; break; }
      }
      if (alt) addViolation(i, 'rule6');
    }
  }
  if (enabledRules.includes('rule7')) {
    for (let i = 14; i < n; i++) {
      const w = values.slice(i - 14, i + 1);
      if (w.every((v) => v <= limits.oneσUpper && v >= limits.oneσLower)) addViolation(i, 'rule7');
    }
  }
  if (enabledRules.includes('rule8')) {
    for (let i = 7; i < n; i++) {
      const w = values.slice(i - 7, i + 1);
      if (w.every((v) => v > limits.oneσUpper || v < limits.oneσLower)) addViolation(i, 'rule8');
    }
  }

  return violations;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const spcStatusTransitions: Record<string, string[]> = {
  active: ['inactive', 'archived'],
  inactive: ['active', 'archived'],
  archived: [],
};

export const useSPCStore = createQualityApiStore<SPCChart & { id: string; status: string }>({
  entityName: 'SPC Chart',
  apiBasePath: '/api/v1/qaqc/spc',
  statusTransitions: spcStatusTransitions,
});

/** @deprecated Use useSPCStore (zustand hook) instead */
export const spcStore = createStoreCompat<SPCChart & { id: string; status: string }>(useSPCStore);

/** @deprecated Use useSPCStore (zustand hook) instead */
export const SPCStore = spcStore;
