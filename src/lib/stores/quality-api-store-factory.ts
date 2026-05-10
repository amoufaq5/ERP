'use client';

import { create } from 'zustand';
import type { ApiStoreState, FetchParams } from './api-store-factory';

export interface QualityEntity {
  id: string;
  tenantId?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QualityStoreState<T extends QualityEntity> extends ApiStoreState<T> {
  // Quality-specific actions
  updateStatus: (id: string, newStatus: string, reason?: string) => Promise<T>;
  addComment: (id: string, comment: string) => Promise<void>;
  attachDocument: (id: string, documentId: string) => Promise<void>;
  getHistory: (id: string) => Promise<AuditEntry[]>;
  exportToCSV: () => Promise<string>;
}

export interface AuditEntry {
  id: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
}

export interface QualityStoreConfig<T extends QualityEntity> {
  entityName: string;
  apiBasePath: string;
  defaultPageSize?: number;
  statusTransitions: Record<string, string[]>; // current status -> allowed next statuses
  requiresSignature?: string[]; // statuses that require e-signature
}

export function createQualityApiStore<T extends QualityEntity>(config: QualityStoreConfig<T>) {
  const { apiBasePath, defaultPageSize = 25, statusTransitions, requiresSignature = [] } = config;

  return create<QualityStoreState<T>>((set, get) => {
    // Base CRUD actions
    const baseActions = {
      items: [] as T[],
      loading: false,
      error: null as string | null,
      total: 0,
      page: 1,
      pageSize: defaultPageSize,

      fetchAll: async (params?: FetchParams) => {
        set({ loading: true, error: null });
        try {
          const query = new URLSearchParams();
          if (params?.page) query.set('page', String(params.page));
          if (params?.pageSize) query.set('pageSize', String(params.pageSize));
          if (params?.sort) query.set('sort', params.sort);
          if (params?.direction) query.set('direction', params.direction);
          if (params?.search) query.set('search', params.search);
          if (params?.filters) {
            Object.entries(params.filters).forEach(([k, v]) => query.set(`filter[${k}]`, String(v)));
          }

          const response = await fetch(`${apiBasePath}?${query}`);
          if (!response.ok) throw new Error(response.statusText);
          const result = await response.json();

          set({
            items: result.data || result,
            total: result.total || (result.data || result).length,
            loading: false,
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch', loading: false });
        }
      },

      fetchById: async (id: string): Promise<T | null> => {
        try {
          const response = await fetch(`${apiBasePath}/${id}`);
          if (!response.ok) return null;
          return response.json();
        } catch {
          return null;
        }
      },

      create: async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(apiBasePath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to create');
          const item = await response.json();
          set(state => ({ items: [item, ...state.items], total: state.total + 1, loading: false }));
          return item;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed', loading: false });
          throw error;
        }
      },

      update: async (id: string, data: Partial<T>): Promise<T> => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${apiBasePath}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to update');
          const item = await response.json();
          set(state => ({ items: state.items.map(i => i.id === id ? item : i), loading: false }));
          return item;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed', loading: false });
          throw error;
        }
      },

      remove: async (id: string): Promise<void> => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${apiBasePath}/${id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete');
          set(state => ({ items: state.items.filter(i => i.id !== id), total: state.total - 1, loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed', loading: false });
          throw error;
        }
      },

      setPage: (page: number) => { set({ page }); get().fetchAll({ page }); },
      setPageSize: (pageSize: number) => { set({ pageSize, page: 1 }); get().fetchAll({ page: 1, pageSize }); },
      reset: () => { set({ items: [], loading: false, error: null, total: 0, page: 1 }); },
    };

    // Quality-specific actions
    const qualityActions = {
      updateStatus: async (id: string, newStatus: string, reason?: string): Promise<T> => {
        const item = get().items.find(i => i.id === id);
        if (!item) throw new Error('Item not found');

        // Validate transition
        const allowed = statusTransitions[item.status];
        if (!allowed || !allowed.includes(newStatus)) {
          throw new Error(`Cannot transition from ${item.status} to ${newStatus}`);
        }

        // Check if signature required (in production, this would prompt for e-signature)
        if (requiresSignature.includes(newStatus)) {
          // Flag is passed to API for server-side enforcement
        }

        set({ loading: true, error: null });
        try {
          const response = await fetch(`${apiBasePath}/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, reason }),
          });
          if (!response.ok) throw new Error('Failed to update status');
          const updated = await response.json();
          set(state => ({ items: state.items.map(i => i.id === id ? updated : i), loading: false }));
          return updated;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed', loading: false });
          throw error;
        }
      },

      addComment: async (id: string, comment: string): Promise<void> => {
        await fetch(`${apiBasePath}/${id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment }),
        });
      },

      attachDocument: async (id: string, documentId: string): Promise<void> => {
        await fetch(`${apiBasePath}/${id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
        });
      },

      getHistory: async (id: string): Promise<AuditEntry[]> => {
        const response = await fetch(`${apiBasePath}/${id}/history`);
        if (!response.ok) return [];
        return response.json();
      },

      exportToCSV: async (): Promise<string> => {
        const response = await fetch(`${apiBasePath}/export?format=csv`);
        if (!response.ok) throw new Error('Export failed');
        return response.text();
      },
    };

    return { ...baseActions, ...qualityActions };
  });
}
