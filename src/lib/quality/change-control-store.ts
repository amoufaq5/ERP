'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { ChangeRequest } from './change-control-types';

export type { ChangeRequest } from './change-control-types';

const statusTransitions: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['impact-assessment', 'rejected'],
  'impact-assessment': ['review'],
  review: ['approved', 'rejected'],
  approved: ['implementation'],
  implementation: ['verification'],
  verification: ['closed'],
  closed: [],
  rejected: [],
};

export const useChangeControlStore = createQualityApiStore<ChangeRequest & { id: string; status: string }>({
  entityName: 'Change Control',
  apiBasePath: '/api/v1/qaqc/change-control',
  statusTransitions,
  requiresSignature: ['approved', 'closed'],
});

/** @deprecated Use useChangeControlStore (zustand hook) instead */
export const changeControlStore = createStoreCompat<ChangeRequest & { id: string; status: string }>(useChangeControlStore);
