'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { Deviation } from './deviation-types';

export type { Deviation } from './deviation-types';

const statusTransitions: Record<string, string[]> = {
  open: ['investigation'],
  investigation: ['root-cause'],
  'root-cause': ['capa-required', 'closed'],
  'capa-required': ['capa-implementation'],
  'capa-implementation': ['effectiveness-check'],
  'effectiveness-check': ['closed', 'capa-implementation'],
  closed: [],
};

export const useDeviationStore = createQualityApiStore<Deviation & { id: string; status: string }>({
  entityName: 'Deviation',
  apiBasePath: '/api/v1/qaqc/deviations',
  statusTransitions,
  requiresSignature: ['closed'],
});

/** @deprecated Use useDeviationStore (zustand hook) instead */
export const deviationStore = createStoreCompat<Deviation & { id: string; status: string }>(useDeviationStore);
