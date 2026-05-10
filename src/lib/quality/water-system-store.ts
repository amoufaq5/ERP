'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { WaterReading } from './water-system-types';

export type { WaterReading } from './water-system-types';

const statusTransitions: Record<string, string[]> = {
  normal: ['alert', 'action', 'shutdown'],
  alert: ['normal', 'action', 'shutdown'],
  action: ['normal', 'shutdown'],
  shutdown: ['normal'],
};

export const useWaterSystemStore = createQualityApiStore<WaterReading & { id: string; status: string }>({
  entityName: 'Water System',
  apiBasePath: '/api/v1/qaqc/water-system',
  statusTransitions,
});

/** @deprecated Use useWaterSystemStore (zustand hook) instead */
export const waterSystemStore = useWaterSystemStore;
