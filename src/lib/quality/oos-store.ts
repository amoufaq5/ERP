'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import { createStoreCompat } from '@/lib/stores/quality-store-compat';
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
export const oosStore = createStoreCompat<OOSInvestigation & { id: string; status: string }>(useOOSStore);

/** @deprecated Use useOOSStore (zustand hook) instead */
export class OOSStore {
  private static _compat = createStoreCompat<OOSInvestigation & { id: string; status: string }>(useOOSStore);
  getAll() { return OOSStore._compat.getAll(); }
  getById(id: string) { return OOSStore._compat.getById(id); }
  create(data: any) { return OOSStore._compat.create(data); }
  update(id: string, data: any) { return OOSStore._compat.update(id, data); }
  getMetrics() { return OOSStore._compat.getMetrics(); }
  generateNumber() { return OOSStore._compat.generateNumber(); }
  closeInvestigation(id: string, conclusion: string, rootCause?: string, capaId?: string) {
    return this.update(id, { status: 'closed-confirmed', conclusion, rootCause, capaId, closedAt: new Date().toISOString() });
  }
  advancePhase(id: string, nextPhase: string) {
    return OOSStore._compat.updateStatus(id, nextPhase);
  }
}
