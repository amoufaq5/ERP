'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { ControlledDocument } from './document-control-types';

export type { ControlledDocument } from './document-control-types';

const statusTransitions: Record<string, string[]> = {
  draft: ['in-review'],
  'in-review': ['approved', 'draft'],
  approved: ['effective'],
  effective: ['superseded', 'obsolete', 'in-review'],
  superseded: [],
  obsolete: [],
};

export const useDocumentControlStore = createQualityApiStore<ControlledDocument & { id: string; status: string }>({
  entityName: 'Document Control',
  apiBasePath: '/api/v1/qaqc/document-control',
  statusTransitions,
  requiresSignature: ['approved', 'effective'],
});

/** @deprecated Use useDocumentControlStore (zustand hook) instead */
export const documentControlStore = useDocumentControlStore;
