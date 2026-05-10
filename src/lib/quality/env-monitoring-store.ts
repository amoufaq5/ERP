'use client';

import { createQualityApiStore } from '@/lib/stores/quality-api-store-factory';
import type { MonitoringReading } from './env-monitoring-types';

export type { MonitoringReading } from './env-monitoring-types';

const statusTransitions: Record<string, string[]> = {
  pass: [],
  alert: ['investigating'],
  action: ['investigating'],
  fail: ['investigating'],
  investigating: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export const useEnvMonitoringStore = createQualityApiStore<MonitoringReading & { id: string; status: string }>({
  entityName: 'Environmental Monitoring',
  apiBasePath: '/api/v1/qaqc/env-monitoring',
  statusTransitions,
});

/** @deprecated Use useEnvMonitoringStore (zustand hook) instead */
export const envMonitoringStore = useEnvMonitoringStore;
