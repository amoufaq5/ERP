'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { StabilityStudy } from './stability-types';

export type { StabilityStudy } from './stability-types';

const statusTransitions: Record<string, string[]> = {
  planned: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'failed', 'cancelled'],
  completed: [],
  cancelled: [],
  failed: [],
};

export const useStabilityStore = createQualityApiStore<StabilityStudy & { id: string; status: string }>({
  entityName: 'Stability Study',
  apiBasePath: '/api/v1/qaqc/stability',
  statusTransitions,
  requiresSignature: ['completed'],
});

/** @deprecated Use useStabilityStore (zustand hook) instead */
export const stabilityStore = createStoreCompat<StabilityStudy & { id: string; status: string }>(useStabilityStore);

/** @deprecated Use useStabilityStore (zustand hook) instead */
export const StabilityStore = stabilityStore;
