'use client';

import { useState, useEffect, useCallback } from 'react';

interface StatConfig {
  label: string;
  endpoint: string;
  type: 'count' | 'sum' | 'avg' | 'custom';
  field?: string;
  filters?: Record<string, string>;
  format?: 'number' | 'currency' | 'percentage';
}

interface StatResult {
  label: string;
  value: number | string;
  loading: boolean;
  error: string | null;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
}

export function useStats(configs: StatConfig[]): { stats: StatResult[]; refresh: () => void } {
  const [stats, setStats] = useState<StatResult[]>(
    configs.map(c => ({ label: c.label, value: 0, loading: true, error: null }))
  );

  const fetchStats = useCallback(async () => {
    const results = await Promise.all(
      configs.map(async (config, index) => {
        try {
          const query = new URLSearchParams();
          if (config.filters) {
            Object.entries(config.filters).forEach(([k, v]) => query.set(`filter[${k}]`, v));
          }

          const response = await fetch(`${config.endpoint}?${query}&pageSize=1`, {
            headers: { 'x-tenant-id': typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default' },
          });

          if (!response.ok) throw new Error('Failed to fetch');
          const data = await response.json();

          let value: number | string = 0;
          switch (config.type) {
            case 'count':
              value = data.total || 0;
              break;
            case 'sum':
            case 'avg':
              value = data.aggregate?.[config.field || ''] || data.total || 0;
              break;
            case 'custom':
              value = data.value || data.total || 0;
              break;
          }

          if (config.format === 'currency') {
            value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number);
          } else if (config.format === 'percentage') {
            value = `${(value as number).toFixed(1)}%`;
          }

          return { label: config.label, value, loading: false, error: null };
        } catch {
          return { label: config.label, value: stats[index]?.value || 0, loading: false, error: 'Failed to load' };
        }
      })
    );

    setStats(results);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, refresh: fetchStats };
}
