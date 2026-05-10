'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseEntityOptions<T> {
  endpoint: string;
  defaultPageSize?: number;
  autoFetch?: boolean;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  defaultFilters?: Record<string, string>;
}

export interface UseEntityReturn<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  // Actions
  fetch: (params?: FetchParams) => Promise<void>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  updateStatus: (id: string, status: string, reason?: string) => Promise<T>;
  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  // Filters & Search
  setSearch: (query: string) => void;
  setFilters: (filters: Record<string, string>) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  // State
  search: string;
  filters: Record<string, string>;
  sort: { field: string; direction: 'asc' | 'desc' };
  // Refresh
  refresh: () => Promise<void>;
}

interface FetchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  direction?: string;
  filters?: Record<string, string>;
}

export function useEntity<T extends { id: string }>(options: UseEntityOptions<T>): UseEntityReturn<T> {
  const { endpoint, defaultPageSize = 25, autoFetch = true, defaultSort, defaultFilters } = options;

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters || {});
  const [sort, setSort] = useState(defaultSort || { field: 'createdAt', direction: 'desc' as const });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (params?: FetchParams) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set('page', String(params?.page || page));
      query.set('pageSize', String(params?.pageSize || pageSize));

      const searchValue = params?.search ?? search;
      if (searchValue) query.set('search', searchValue);

      query.set('sort', params?.sort || sort.field);
      query.set('direction', params?.direction || sort.direction);

      const activeFilters = params?.filters || filters;
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) query.set(`filter[${key}]`, value);
      });

      const response = await fetch(`${endpoint}?${query}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
      setTotal(result.total || (result.data || result).length);
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }, [endpoint, page, pageSize, search, filters, sort]);

  const create = useCallback(async (createData: Partial<T>): Promise<T> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': getTenantId(),
      },
      body: JSON.stringify(createData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to create');
    }

    const created = await response.json();
    setData(prev => [created, ...prev]);
    setTotal(prev => prev + 1);
    return created;
  }, [endpoint]);

  const update = useCallback(async (id: string, updateData: Partial<T>): Promise<T> => {
    const response = await fetch(`${endpoint}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': getTenantId(),
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to update');
    }

    const updated = await response.json();
    setData(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  }, [endpoint]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`${endpoint}/${id}`, {
      method: 'DELETE',
      headers: {
        'x-tenant-id': getTenantId(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to delete');
    }

    setData(prev => prev.filter(item => item.id !== id));
    setTotal(prev => prev - 1);
  }, [endpoint]);

  const updateStatus = useCallback(async (id: string, status: string, reason?: string): Promise<T> => {
    const response = await fetch(`${endpoint}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': getTenantId(),
      },
      body: JSON.stringify({ status, reason }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to update status');
    }

    const updated = await response.json();
    setData(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  }, [endpoint]);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
    fetchData({ page: newPage });
  }, [fetchData]);

  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    fetchData({ page: 1, pageSize: newSize });
  }, [fetchData]);

  const handleSetSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
    fetchData({ search: query, page: 1 });
  }, [fetchData]);

  const handleSetFilters = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1);
    fetchData({ filters: newFilters, page: 1 });
  }, [fetchData]);

  const handleSetSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSort({ field, direction });
    fetchData({ sort: field, direction });
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    loading, error,
    fetch: fetchData, create, update, remove, updateStatus,
    setPage: handleSetPage, setPageSize: handleSetPageSize,
    setSearch: handleSetSearch, setFilters: handleSetFilters,
    setSort: handleSetSort,
    search, filters, sort,
    refresh,
  };
}

function getTenantId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tenantId') || 'default';
  }
  return 'default';
}
