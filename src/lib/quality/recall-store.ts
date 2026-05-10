'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { RecallRecord } from './recall-types';

export type { RecallRecord } from './recall-types';

const statusTransitions: Record<string, string[]> = {
  initiated: ['risk-assessment'],
  'risk-assessment': ['notification'],
  notification: ['retrieval'],
  retrieval: ['reconciliation'],
  reconciliation: ['effectiveness-check'],
  'effectiveness-check': ['closed'],
  closed: [],
};

export const useRecallStore = createQualityApiStore<RecallRecord & { id: string; status: string }>({
  entityName: 'Recall',
  apiBasePath: '/api/v1/qaqc/recalls',
  statusTransitions,
  requiresSignature: ['closed'],
});

/** @deprecated Use useRecallStore (zustand hook) instead */
export const recallStore = createStoreCompat<RecallRecord & { id: string; status: string }>(useRecallStore);
