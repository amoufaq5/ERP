'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { RiskAssessment, RiskLevel } from './risk-types';

export type { RiskAssessment } from './risk-types';

// ─── Utility Functions (preserved for page imports) ────────────────────────

export function calculateRPN(s: number, o: number, d: number): number {
  return s * o * d;
}

export function classifyRiskLevel(rpn: number): RiskLevel {
  if (rpn >= 200) return 'critical';
  if (rpn >= 100) return 'high';
  if (rpn >= 40) return 'medium';
  return 'low';
}

// ─── Store ──────────────────────────────────────────────────────────────────

const statusTransitions: Record<string, string[]> = {
  draft: ['in-progress'],
  'in-progress': ['review'],
  review: ['approved', 'in-progress'],
  approved: ['closed'],
  closed: [],
};

export const useRiskStore = createQualityApiStore<RiskAssessment & { id: string; status: string }>({
  entityName: 'Risk Assessment',
  apiBasePath: '/api/v1/qaqc/risk',
  statusTransitions,
  requiresSignature: ['approved'],
});

/** @deprecated Use useRiskStore (zustand hook) instead */
export const riskStore = useRiskStore;
