'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { Complaint } from './complaint-types';

export type { Complaint } from './complaint-types';

const statusTransitions: Record<string, string[]> = {
  received: ['acknowledged'],
  acknowledged: ['investigation'],
  investigation: ['root-cause'],
  'root-cause': ['capa-required', 'response-sent'],
  'capa-required': ['response-sent'],
  'response-sent': ['closed'],
  closed: [],
};

export const useComplaintStore = createQualityApiStore<Complaint & { id: string; status: string }>({
  entityName: 'Complaint',
  apiBasePath: '/api/v1/qaqc/complaints',
  statusTransitions,
  requiresSignature: ['closed'],
});

/** @deprecated Use useComplaintStore (zustand hook) instead */
export const complaintStore = createStoreCompat<Complaint & { id: string; status: string }>(useComplaintStore);
