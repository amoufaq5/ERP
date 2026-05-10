'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
import type { Audit } from './audit-types';

export type { Audit } from './audit-types';

const statusTransitions: Record<string, string[]> = {
  planned: ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed: ['closed'],
  cancelled: [],
  closed: [],
};

export const useAuditStore = createQualityApiStore<Audit & { id: string; status: string }>({
  entityName: 'Audit',
  apiBasePath: '/api/v1/qaqc/audits',
  statusTransitions,
  requiresSignature: ['completed', 'closed'],
});

/** @deprecated Use useAuditStore (zustand hook) instead */
export const auditStore = createStoreCompat<Audit & { id: string; status: string }>(useAuditStore);
