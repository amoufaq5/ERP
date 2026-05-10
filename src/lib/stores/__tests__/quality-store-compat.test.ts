import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStoreCompat } from '../quality-store-compat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHook(items: Array<{ id: string; status: string }> = []) {
  const state = {
    items,
    loading: false,
    error: null,
    total: items.length,
    create: vi.fn().mockResolvedValue({ id: 'new-1', status: 'draft' }),
    update: vi.fn().mockResolvedValue({ id: '1', status: 'updated' }),
    remove: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue({ id: '1', status: 'approved' }),
    fetchAll: vi.fn().mockResolvedValue(undefined),
  };

  return {
    getState: () => state,
    subscribe: vi.fn(),
    setState: vi.fn(),
    _state: state,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStoreCompat', () => {
  let hook: ReturnType<typeof createMockHook>;
  let compat: any;

  const sampleItems = [
    { id: '1', status: 'draft' },
    { id: '2', status: 'approved' },
    { id: '3', status: 'rejected' },
  ];

  beforeEach(() => {
    hook = createMockHook(sampleItems);
    compat = createStoreCompat(hook);
  });

  // ── Zustand pass-through ───────────────────────────────────────────────

  describe('zustand pass-through methods', () => {
    it('getState returns hook state', () => {
      const state = compat.getState();
      expect(state.items).toEqual(sampleItems);
    });

    it('subscribe delegates to hook.subscribe', () => {
      const fn = vi.fn();
      compat.subscribe(fn);
      expect(hook.subscribe).toHaveBeenCalledWith(fn);
    });

    it('setState delegates to hook.setState', () => {
      const patch = { loading: true };
      compat.setState(patch);
      expect(hook.setState).toHaveBeenCalledWith(patch);
    });
  });

  // ── getAll / items ─────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all items from state', () => {
      const result = compat.getAll();
      expect(result).toEqual(sampleItems);
    });

    it('returns empty array when no items', () => {
      const emptyHook = createMockHook([]);
      const emptyCompat = createStoreCompat(emptyHook);
      expect(emptyCompat.getAll()).toEqual([]);
    });
  });

  describe('items property', () => {
    it('returns items directly', () => {
      expect(compat.items).toEqual(sampleItems);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('finds item by id', () => {
      const result = compat.getById('2');
      expect(result).toEqual({ id: '2', status: 'approved' });
    });

    it('returns undefined for non-existent id', () => {
      expect(compat.getById('non-existent')).toBeUndefined();
    });
  });

  // ── CRUD delegation ────────────────────────────────────────────────────

  describe('create', () => {
    it('delegates to state.create', async () => {
      const data = { status: 'draft', name: 'Test' };
      await compat.create(data);
      expect(hook._state.create).toHaveBeenCalledWith(data);
    });
  });

  describe('update', () => {
    it('delegates to state.update', async () => {
      await compat.update('1', { status: 'approved' });
      expect(hook._state.update).toHaveBeenCalledWith('1', { status: 'approved' });
    });
  });

  describe('delete / remove', () => {
    it('delete delegates to state.remove', async () => {
      await compat.delete('1');
      expect(hook._state.remove).toHaveBeenCalledWith('1');
    });

    it('remove delegates to state.remove', async () => {
      await compat.remove('2');
      expect(hook._state.remove).toHaveBeenCalledWith('2');
    });
  });

  // ── Status management ──────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('delegates to state.updateStatus', async () => {
      await compat.updateStatus('1', 'approved', 'looks good');
      expect(hook._state.updateStatus).toHaveBeenCalledWith('1', 'approved', 'looks good');
    });
  });

  describe('advanceStatus', () => {
    it('returns the item (no-op)', () => {
      const result = compat.advanceStatus('1');
      expect(result).toEqual({ id: '1', status: 'draft' });
    });

    it('returns undefined for non-existent item', () => {
      expect(compat.advanceStatus('non-existent')).toBeUndefined();
    });
  });

  // ── Data loading ───────────────────────────────────────────────────────

  describe('fetchAll', () => {
    it('delegates to state.fetchAll', async () => {
      await compat.fetchAll({ page: 2 });
      expect(hook._state.fetchAll).toHaveBeenCalledWith({ page: 2 });
    });
  });

  describe('loading / error / total', () => {
    it('returns loading state', () => {
      expect(compat.loading).toBe(false);
    });

    it('returns error state', () => {
      expect(compat.error).toBeNull();
    });

    it('returns total', () => {
      expect(compat.total).toBe(3);
    });
  });

  // ── getMetrics ─────────────────────────────────────────────────────────

  describe('getMetrics', () => {
    it('returns null', () => {
      expect(compat.getMetrics()).toBeNull();
    });
  });

  // ── generateNumber ─────────────────────────────────────────────────────

  describe('generateNumber', () => {
    it('returns a string based on Date.now', () => {
      const result = compat.generateNumber();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── Unknown methods ────────────────────────────────────────────────────

  describe('unknown method handling', () => {
    it('returns empty array for unknown get* methods', () => {
      const result = compat.getSomethingUnknown('arg1', 'arg2');
      expect(result).toEqual([]);
    });

    it('returns empty array for getFiltered', () => {
      expect(compat.getFiltered()).toEqual([]);
    });

    it('returns undefined for unknown non-get methods', () => {
      expect(compat.doSomething()).toBeUndefined();
    });

    it('returns undefined for unknown action methods', () => {
      expect(compat.applyAction('x')).toBeUndefined();
    });
  });
});
