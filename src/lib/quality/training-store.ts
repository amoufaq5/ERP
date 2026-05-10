'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { TrainingRecord } from './training-types';

export type { TrainingRecord } from './training-types';

const statusTransitions: Record<string, string[]> = {
  scheduled: ['in-progress', 'overdue'],
  'in-progress': ['completed', 'overdue'],
  completed: ['expired'],
  overdue: ['in-progress', 'completed'],
  expired: ['scheduled'],
};

export const useTrainingStore = createQualityApiStore<TrainingRecord & { id: string; status: string }>({
  entityName: 'Training Record',
  apiBasePath: '/api/v1/qaqc/training',
  statusTransitions,
});

/** @deprecated Use useTrainingStore (zustand hook) instead */
export const trainingStore = createStoreCompat<TrainingRecord & { id: string; status: string }>(useTrainingStore);
