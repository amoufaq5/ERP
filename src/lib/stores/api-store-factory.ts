'use client';

import { create } from 'zustand';

export interface ApiStoreState<T extends { id: string }> {
  items: T[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;

  // Actions
  fetchAll: (params?: FetchParams) => Promise<void>;
  fetchById: (id: string) => Promise<T | null>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  reset: () => void;
}

export interface FetchParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean>;
  search?: string;
}

export interface ApiStoreConfig<T extends { id: string }> {
  entityName: string;
  apiBasePath: string;
  defaultPageSize?: number;
  // Optional transform functions for API response adaptation
  transformResponse?: (data: unknown) => T;
  transformRequest?: (data: Partial<T>) => unknown;
  // Enable localStorage fallback during migration
  enableLocalFallback?: boolean;
  localStorageKey?: string;
}

function buildQueryString(params: FetchParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.sort) query.set('sort', params.sort);
  if (params.direction) query.set('direction', params.direction);
  if (params.search) query.set('search', params.search);
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      query.set(`filter[${key}]`, String(value));
    });
  }
  return query.toString();
}

export function createApiStore<T extends { id: string }>(config: ApiStoreConfig<T>) {
  const {
    apiBasePath,
    defaultPageSize = 25,
    transformResponse,
    transformRequest,
    enableLocalFallback = false,
    localStorageKey,
  } = config;

  return create<ApiStoreState<T>>((set, get) => ({
    items: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    pageSize: defaultPageSize,

    fetchAll: async (params?: FetchParams) => {
      set({ loading: true, error: null });
      try {
        const queryString = buildQueryString({
          page: params?.page || get().page,
          pageSize: params?.pageSize || get().pageSize,
          ...params,
        });

        const response = await fetch(`${apiBasePath}?${queryString}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const result = await response.json();
        const items = transformResponse
          ? (result.data || result).map(transformResponse)
          : (result.data || result);

        set({
          items,
          total: result.total || items.length,
          page: result.page || get().page,
          loading: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });

        // Fallback to localStorage if enabled and API fails
        if (enableLocalFallback && localStorageKey) {
          try {
            const stored = localStorage.getItem(localStorageKey);
            if (stored) {
              const items = JSON.parse(stored) as T[];
              set({ items, total: items.length });
            }
          } catch {
            // Silent fallback failure
          }
        }
      }
    },

    fetchById: async (id: string) => {
      try {
        const response = await fetch(`${apiBasePath}/${id}`);
        if (!response.ok) return null;
        const data = await response.json();
        return transformResponse ? transformResponse(data) : data;
      } catch {
        return null;
      }
    },

    create: async (data) => {
      set({ loading: true, error: null });
      try {
        const body = transformRequest ? transformRequest(data as Partial<T>) : data;
        const response = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(error.message || 'Failed to create');
        }

        const created = await response.json();
        const item = transformResponse ? transformResponse(created) : created as T;

        set(state => ({
          items: [item, ...state.items],
          total: state.total + 1,
          loading: false,
        }));

        return item;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });
        throw error;
      }
    },

    update: async (id: string, data: Partial<T>) => {
      set({ loading: true, error: null });
      try {
        const body = transformRequest ? transformRequest(data) : data;
        const response = await fetch(`${apiBasePath}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(error.message || 'Failed to update');
        }

        const updated = await response.json();
        const item = transformResponse ? transformResponse(updated) : updated as T;

        set(state => ({
          items: state.items.map(i => i.id === id ? item : i),
          loading: false,
        }));

        return item;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });
        throw error;
      }
    },

    remove: async (id: string) => {
      set({ loading: true, error: null });
      try {
        const response = await fetch(`${apiBasePath}/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete: ${response.statusText}`);
        }

        set(state => ({
          items: state.items.filter(i => i.id !== id),
          total: state.total - 1,
          loading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });
        throw error;
      }
    },

    setPage: (page: number) => {
      set({ page });
      get().fetchAll({ page });
    },

    setPageSize: (pageSize: number) => {
      set({ pageSize, page: 1 });
      get().fetchAll({ page: 1, pageSize });
    },

    reset: () => {
      set({ items: [], loading: false, error: null, total: 0, page: 1 });
    },
  }));
}
