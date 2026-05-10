'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { CAPARecord } from './capa-types';

export type { CAPARecord } from './capa-types';

const statusTransitions: Record<string, string[]> = {
  initiated: ['investigation'],
  investigation: ['action-plan', 'closed'],
  'action-plan': ['implementation'],
  implementation: ['verification'],
  verification: ['effectiveness-check', 'implementation'],
  'effectiveness-check': ['closed', 'implementation'],
  closed: [],
};

export const useCAPAStore = createQualityApiStore<CAPARecord & { id: string; status: string }>({
  entityName: 'CAPA',
  apiBasePath: '/api/v1/qaqc/capa',
  statusTransitions,
  requiresSignature: ['closed'],
});

/** @deprecated Use useCAPAStore (zustand hook) instead */
export const capaStore = useCAPAStore;
