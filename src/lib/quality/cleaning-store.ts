'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { CleaningProtocol, MACOParams } from './cleaning-types';

export type { CleaningProtocol } from './cleaning-types';

// ─── Utility Functions (preserved for page imports) ────────────────────────

/**
 * Calculate Maximum Allowable Carryover (MACO)
 * Per-area limit = MACO / sharedSurfaceArea (mg/cm²)
 */
export function calculateMACO(params: MACOParams): number {
  const { minTherapeuticDose, maxDailyDoseNext, minBatchSizeNext, safetyFactor } = params;
  if (maxDailyDoseNext === 0) return 0;
  const maco = (minTherapeuticDose * minBatchSizeNext * 1_000_000 * safetyFactor) / maxDailyDoseNext;
  return Math.round(maco * 100) / 100;
}

export function calculatePerAreaLimit(macoMg: number, surfaceAreaCm2: number): number {
  if (surfaceAreaCm2 === 0) return 0;
  return Math.round((macoMg / surfaceAreaCm2) * 1000) / 1000;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const statusTransitions: Record<string, string[]> = {
  draft: ['approved'],
  approved: ['in-progress'],
  'in-progress': ['sampling'],
  sampling: ['analysis'],
  analysis: ['passed', 'failed'],
  passed: ['revalidation-due'],
  failed: ['in-progress'],
  'revalidation-due': ['in-progress'],
};

export const useCleaningStore = createQualityApiStore<CleaningProtocol & { id: string; status: string }>({
  entityName: 'Cleaning Validation',
  apiBasePath: '/api/v1/qaqc/cleaning',
  statusTransitions,
  requiresSignature: ['approved', 'passed'],
});

/** @deprecated Use useCleaningStore (zustand hook) instead */
export const cleaningStore = createStoreCompat<CleaningProtocol & { id: string; status: string }>(useCleaningStore);
