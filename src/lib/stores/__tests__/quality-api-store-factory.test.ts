import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQualityApiStore, type QualityEntity, type QualityStoreConfig } from '../quality-api-store-factory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetchResponse = (data: unknown, ok = true, statusText = 'OK') =>
  Promise.resolve({
    ok,
    statusText,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response);

interface TestEntity extends QualityEntity {
  name: string;
}

const testConfig: QualityStoreConfig<TestEntity> = {
  entityName: 'TestItem',
  apiBasePath: '/api/v1/test-items',
  defaultPageSize: 10,
  statusTransitions: {
    draft: ['submitted'],
    submitted: ['approved', 'rejected'],
    approved: ['closed'],
    rejected: ['draft'],
  },
  requiresSignature: ['approved'],
};

const sampleItems: TestEntity[] = [
  { id: '1', status: 'draft', name: 'Item A', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', status: 'submitted', name: 'Item B', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createQualityApiStore', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockReset();
  });

  // ── Store creation ─────────────────────────────────────────────────────

  describe('store creation', () => {
    it('creates a store with initial empty state', () => {
      const useStore = createQualityApiStore(testConfig);
      const state = useStore.getState();

      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.total).toBe(0);
      expect(state.page).toBe(1);
      expect(state.pageSize).toBe(10);
    });

    it('uses default page size of 25 when not configured', () => {
      const { defaultPageSize, ...configWithoutPageSize } = testConfig;
      const useStore = createQualityApiStore(configWithoutPageSize as QualityStoreConfig<TestEntity>);
      expect(useStore.getState().pageSize).toBe(25);
    });
  });

  // ── fetchAll ───────────────────────────────────────────────────────────

  describe('fetchAll', () => {
    it('populates items on success', async () => {
      fetchSpy.mockImplementation(() =>
        mockFetchResponse({ data: sampleItems, total: 2 }),
      );

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().fetchAll();

      const state = useStore.getState();
      expect(state.items).toEqual(sampleItems);
      expect(state.total).toBe(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('handles response without data wrapper', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(sampleItems));

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().fetchAll();

      expect(useStore.getState().items).toEqual(sampleItems);
    });

    it('builds query params from FetchParams', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [], total: 0 }));

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().fetchAll({
        page: 2,
        pageSize: 5,
        sort: 'name',
        direction: 'asc',
        search: 'test',
        filters: { status: 'draft' },
      });

      const url = (fetchSpy.mock.calls[0][0] as string);
      expect(url).toContain('page=2');
      expect(url).toContain('pageSize=5');
      expect(url).toContain('sort=name');
      expect(url).toContain('direction=asc');
      expect(url).toContain('search=test');
      expect(url).toContain('filter%5Bstatus%5D=draft');
    });

    it('sets error on fetch failure', async () => {
      fetchSpy.mockImplementation(() =>
        mockFetchResponse(null, false, 'Internal Server Error'),
      );

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().fetchAll();

      const state = useStore.getState();
      expect(state.error).toBe('Internal Server Error');
      expect(state.loading).toBe(false);
    });

    it('sets error on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().fetchAll();

      expect(useStore.getState().error).toBe('Network failure');
    });
  });

  // ── fetchById ──────────────────────────────────────────────────────────

  describe('fetchById', () => {
    it('returns item on success', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(sampleItems[0]));

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().fetchById('1');

      expect(result).toEqual(sampleItems[0]);
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1');
    });

    it('returns null on not found', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().fetchById('999');

      expect(result).toBeNull();
    });

    it('returns null on fetch error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().fetchById('1');

      expect(result).toBeNull();
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls POST and prepends item to list', async () => {
      const newItem = { id: 'new-1', status: 'draft', name: 'New Item' };
      fetchSpy.mockImplementation(() => mockFetchResponse(newItem));

      const useStore = createQualityApiStore(testConfig);
      // Pre-populate items
      useStore.setState({ items: [...sampleItems], total: 2 });

      const result = await useStore.getState().create({ status: 'draft', name: 'New Item' } as any);

      expect(result).toEqual(newItem);
      expect(useStore.getState().items[0]).toEqual(newItem);
      expect(useStore.getState().total).toBe(3);

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items', expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }));
    });

    it('throws and sets error on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      await expect(useStore.getState().create({ status: 'draft', name: 'Fail' } as any))
        .rejects.toThrow('Failed to create');
      expect(useStore.getState().error).toBe('Failed to create');
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('calls PATCH and updates item in list', async () => {
      const updated = { ...sampleItems[0], name: 'Updated' };
      fetchSpy.mockImplementation(() => mockFetchResponse(updated));

      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems] });

      const result = await useStore.getState().update('1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
      expect(useStore.getState().items.find(i => i.id === '1')?.name).toBe('Updated');
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1', expect.objectContaining({
        method: 'PATCH',
      }));
    });

    it('throws and sets error on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      await expect(useStore.getState().update('1', {} as any)).rejects.toThrow();
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('calls DELETE and removes item from list', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, true));

      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems], total: 2 });

      await useStore.getState().remove('1');

      expect(useStore.getState().items.find(i => i.id === '1')).toBeUndefined();
      expect(useStore.getState().total).toBe(1);
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('throws and sets error on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      await expect(useStore.getState().remove('1')).rejects.toThrow();
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('setPage updates page and triggers fetchAll', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [], total: 0 }));

      const useStore = createQualityApiStore(testConfig);
      useStore.getState().setPage(3);

      expect(useStore.getState().page).toBe(3);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('setPageSize updates pageSize, resets to page 1, and triggers fetchAll', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [], total: 0 }));

      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ page: 3 });
      useStore.getState().setPageSize(50);

      expect(useStore.getState().pageSize).toBe(50);
      expect(useStore.getState().page).toBe(1);
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all state to defaults', () => {
      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: sampleItems, loading: true, error: 'err', total: 5, page: 3 });

      useStore.getState().reset();

      const state = useStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.total).toBe(0);
      expect(state.page).toBe(1);
    });
  });

  // ── updateStatus (quality action) ──────────────────────────────────────

  describe('updateStatus', () => {
    it('transitions status when transition is allowed', async () => {
      const updated = { ...sampleItems[0], status: 'submitted' };
      fetchSpy.mockImplementation(() => mockFetchResponse(updated));

      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems] });

      const result = await useStore.getState().updateStatus('1', 'submitted', 'ready');

      expect(result.status).toBe('submitted');
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1/status', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'submitted', reason: 'ready' }),
      }));
    });

    it('throws when item not found', async () => {
      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems] });

      await expect(useStore.getState().updateStatus('999', 'submitted'))
        .rejects.toThrow('Item not found');
    });

    it('throws on invalid status transition', async () => {
      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems] });

      // draft -> approved is not allowed (must go through submitted)
      await expect(useStore.getState().updateStatus('1', 'approved'))
        .rejects.toThrow('Cannot transition from draft to approved');
    });

    it('throws on fetch failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      useStore.setState({ items: [...sampleItems] });

      await expect(useStore.getState().updateStatus('1', 'submitted'))
        .rejects.toThrow();
    });
  });

  // ── addComment ─────────────────────────────────────────────────────────

  describe('addComment', () => {
    it('sends POST to comments endpoint', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}));

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().addComment('1', 'Test comment');

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1/comments', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ comment: 'Test comment' }),
      }));
    });
  });

  // ── attachDocument ─────────────────────────────────────────────────────

  describe('attachDocument', () => {
    it('sends POST to documents endpoint', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}));

      const useStore = createQualityApiStore(testConfig);
      await useStore.getState().attachDocument('1', 'doc-123');

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1/documents', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-123' }),
      }));
    });
  });

  // ── getHistory ─────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns audit entries on success', async () => {
      const entries = [{ id: 'h1', action: 'created', userId: 'u1', userName: 'User', timestamp: '2024-01-01' }];
      fetchSpy.mockImplementation(() => mockFetchResponse(entries));

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().getHistory('1');

      expect(result).toEqual(entries);
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/1/history');
    });

    it('returns empty array on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().getHistory('1');

      expect(result).toEqual([]);
    });
  });

  // ── exportToCSV ────────────────────────────────────────────────────────

  describe('exportToCSV', () => {
    it('returns CSV text on success', async () => {
      const csvData = 'id,name\n1,Item A';
      fetchSpy.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(csvData),
        } as Response),
      );

      const useStore = createQualityApiStore(testConfig);
      const result = await useStore.getState().exportToCSV();

      expect(result).toBe(csvData);
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/test-items/export?format=csv');
    });

    it('throws on failure', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({ ok: false } as Response),
      );

      const useStore = createQualityApiStore(testConfig);
      await expect(useStore.getState().exportToCSV()).rejects.toThrow('Export failed');
    });
  });
});
