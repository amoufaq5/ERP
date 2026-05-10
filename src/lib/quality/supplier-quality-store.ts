'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { SupplierQualityAgreement } from './supplier-quality-types';

export type { SupplierQualityAgreement } from './supplier-quality-types';

const statusTransitions: Record<string, string[]> = {
  draft: ['under-review'],
  'under-review': ['active', 'draft'],
  active: ['expired', 'terminated'],
  expired: ['under-review'],
  terminated: [],
};

export const useSupplierQualityStore = createQualityApiStore<SupplierQualityAgreement & { id: string; status: string }>({
  entityName: 'Supplier Quality Agreement',
  apiBasePath: '/api/v1/qaqc/supplier-quality',
  statusTransitions,
  requiresSignature: ['active'],
});

/** @deprecated Use useSupplierQualityStore (zustand hook) instead */
export const supplierQualityStore = useSupplierQualityStore;
