'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { OOSInvestigation } from './oos-types';

export type { OOSInvestigation } from './oos-types';

const statusTransitions: Record<string, string[]> = {
  initiated: ['phase1-lab'],
  'phase1-lab': ['phase1-review'],
  'phase1-review': ['phase2-production', 'closed-confirmed', 'closed-invalidated'],
  'phase2-production': ['phase2-review'],
  'phase2-review': ['extended', 'closed-confirmed', 'closed-invalidated'],
  extended: ['closed-confirmed', 'closed-invalidated'],
  'closed-confirmed': [],
  'closed-invalidated': [],
};

export const useOOSStore = createQualityApiStore<OOSInvestigation & { id: string; status: string }>({
  entityName: 'OOS Investigation',
  apiBasePath: '/api/v1/qaqc/oos',
  statusTransitions,
  requiresSignature: ['closed-confirmed', 'closed-invalidated'],
});

/** @deprecated Use useOOSStore (zustand hook) instead */
export const oosStore = useOOSStore;

/** @deprecated Use useOOSStore (zustand hook) instead */
export const OOSStore = useOOSStore;
