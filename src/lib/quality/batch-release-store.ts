'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { BatchRelease } from './batch-release-types';

export type { BatchRelease } from './batch-release-types';

const statusTransitions: Record<string, string[]> = {
  'pending-review': ['under-review', 'on-hold'],
  'under-review': ['checklist-complete', 'on-hold', 'rejected'],
  'checklist-complete': ['qp-review', 'on-hold'],
  'qp-review': ['approved', 'rejected', 'on-hold'],
  approved: ['released-to-market'],
  rejected: [],
  'on-hold': ['under-review', 'qp-review'],
  'released-to-market': [],
};

export const useBatchReleaseStore = createQualityApiStore<BatchRelease & { id: string; status: string }>({
  entityName: 'Batch Release',
  apiBasePath: '/api/v1/qaqc/batch-release',
  statusTransitions,
  requiresSignature: ['approved', 'released-to-market'],
});

/** @deprecated Use useBatchReleaseStore (zustand hook) instead */
export const batchReleaseStore = useBatchReleaseStore;
