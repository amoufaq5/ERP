'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { VendorScore } from './vendor-scoring-types';

export type { VendorScore } from './vendor-scoring-types';

const statusTransitions: Record<string, string[]> = {
  new: ['qualified', 'disqualified'],
  qualified: ['preferred', 'probation', 'disqualified'],
  preferred: ['qualified', 'probation', 'disqualified'],
  probation: ['qualified', 'disqualified'],
  disqualified: ['new'],
};

export const useVendorScoringStore = createQualityApiStore<VendorScore & { id: string; status: string }>({
  entityName: 'Vendor Scorecard',
  apiBasePath: '/api/v1/qaqc/vendor-scoring',
  statusTransitions,
});

/** @deprecated Use useVendorScoringStore (zustand hook) instead */
export const vendorScoringStore = useVendorScoringStore;
