'use client';

import { useCallback, useState } from 'react';

export function useExport(endpoint: string) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = useCallback(async (filters?: Record<string, string>) => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('format', 'csv');
      query.set('pageSize', '10000');
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => query.set(`filter[${k}]`, v));
      }

      const response = await fetch(`${endpoint}?${query}`, {
        headers: { 'x-tenant-id': typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default' },
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      const items = data.data || data;

      if (!items.length) {
        throw new Error('No data to export');
      }

      // Generate CSV
      const headers = Object.keys(items[0]);
      const csvRows = [
        headers.join(','),
        ...items.map((item: Record<string, unknown>) =>
          headers.map(h => {
            const val = item[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        ),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [endpoint]);

  return { exportToCSV, exporting };
}
