import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExpiryStore } from '../expiry-store';
import type { ExpiryItem, ExpiryAlert, ExpiryPolicy } from '../expiry-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

function makeFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function makePastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function makeItem(overrides?: Partial<ExpiryItem>): ExpiryItem {
  return {
    id: 'item-1',
    productId: 'prod-1',
    productName: 'Aspirin 500mg',
    batchNumber: 'BATCH-001',
    quantity: 100,
    unit: 'tablets',
    location: { warehouse: 'WH-1', zone: 'A', shelf: 'S1' },
    manufacturedDate: '2024-01-01',
    expiryDate: makeFutureDate(120),
    daysUntilExpiry: 120,
    status: 'active',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExpiryStore', () => {
  let store: ExpiryStore;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset singleton
    (ExpiryStore as any).instance = null;
    store = ExpiryStore.getInstance();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockReset();
  });

  afterEach(() => {
    (ExpiryStore as any).instance = null;
  });

  // ── Singleton ──────────────────────────────────────────────────────────

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = ExpiryStore.getInstance();
      const b = ExpiryStore.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── getItems ───────────────────────────────────────────────────────────

  describe('getItems', () => {
    it('fetches and enriches items', async () => {
      const rawItems = [
        makeItem({ expiryDate: makeFutureDate(120) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(result[0].daysUntilExpiry).toBeGreaterThan(90);
    });

    it('enriches expired items correctly', async () => {
      const rawItems = [
        makeItem({ expiryDate: makePastDate(5) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result[0].status).toBe('expired');
      expect(result[0].daysUntilExpiry).toBeLessThanOrEqual(0);
    });

    it('preserves quarantined status during enrichment', async () => {
      const rawItems = [
        makeItem({ expiryDate: makePastDate(5), status: 'quarantined' }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result[0].status).toBe('quarantined');
    });

    it('preserves destroyed status during enrichment', async () => {
      const rawItems = [
        makeItem({ expiryDate: makePastDate(5), status: 'destroyed' }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result[0].status).toBe('destroyed');
    });

    it('enriches near-expiry items (within 90 days)', async () => {
      const rawItems = [
        makeItem({ expiryDate: makeFutureDate(60) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result[0].status).toBe('expiring-soon');
    });

    it('enriches expiring-soon items (within 30 days)', async () => {
      const rawItems = [
        makeItem({ expiryDate: makeFutureDate(15) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: rawItems }));

      const result = await store.getItems();
      expect(result[0].status).toBe('expiring-soon');
    });

    it('returns empty array on fetch failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await store.getItems();
      expect(result).toEqual([]);
    });

    it('caches items after first fetch', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [makeItem()] }));

      await store.getItems();
      await store.getItems();

      // fetch should only be called once since cache is populated
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── getItemById ────────────────────────────────────────────────────────

  describe('getItemById', () => {
    it('finds an item by id', async () => {
      fetchSpy.mockImplementation(() =>
        mockFetchResponse({ data: [makeItem({ id: 'item-1' })] }),
      );

      const result = await store.getItemById('item-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('item-1');
    });

    it('returns undefined for non-existent item', async () => {
      fetchSpy.mockImplementation(() =>
        mockFetchResponse({ data: [makeItem({ id: 'item-1' })] }),
      );

      const result = await store.getItemById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  // ── addItem ────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('validates required fields', async () => {
      await expect(store.addItem({ productName: '', batchNumber: 'B1', expiryDate: '2025-01-01' } as any))
        .rejects.toThrow('product name is required');

      await expect(store.addItem({ productName: 'P1', batchNumber: '', expiryDate: '2025-01-01' } as any))
        .rejects.toThrow('batch number is required');

      await expect(store.addItem({ productName: 'P1', batchNumber: 'B1', expiryDate: '' } as any))
        .rejects.toThrow('expiry date is required');

      await expect(store.addItem({ productName: 'P1', batchNumber: 'B1', expiryDate: 'not-a-date' } as any))
        .rejects.toThrow('expiry date is invalid');
    });

    it('creates and enriches item on success', async () => {
      const created = makeItem({ id: 'new-1' });
      fetchSpy.mockImplementation(() => mockFetchResponse(created));

      const result = await store.addItem({
        productId: 'prod-1',
        productName: 'Test',
        batchNumber: 'B-001',
        quantity: 50,
        unit: 'pcs',
        location: { warehouse: 'W1', zone: 'Z1', shelf: 'S1' },
        manufacturedDate: '2024-01-01',
        expiryDate: makeFutureDate(180),
      } as any);

      expect(result.id).toBe('new-1');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/expiry/items',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on API failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      await expect(
        store.addItem({
          productName: 'Test',
          batchNumber: 'B1',
          expiryDate: makeFutureDate(30),
        } as any),
      ).rejects.toThrow('Failed to create expiry item');
    });
  });

  // ── updateItem ─────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('updates an item', async () => {
      const updated = makeItem({ id: 'item-1', quantity: 200 });
      fetchSpy.mockImplementation(() => mockFetchResponse(updated));

      const result = await store.updateItem('item-1', { quantity: 200 });
      expect(result).toBeDefined();
      expect(result!.quantity).toBe(200);
    });

    it('returns undefined on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await store.updateItem('item-1', { quantity: 200 });
      expect(result).toBeUndefined();
    });
  });

  // ── removeItem ─────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('deletes an item and returns true', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}, true));

      const result = await store.removeItem('item-1');
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/expiry/items/item-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('returns false on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}, false));

      const result = await store.removeItem('item-1');
      expect(result).toBe(false);
    });
  });

  // ── getAlerts ──────────────────────────────────────────────────────────

  describe('getAlerts', () => {
    it('fetches alerts', async () => {
      const alerts: ExpiryAlert[] = [
        {
          id: 'alert-1',
          itemId: 'item-1',
          batchNumber: 'B1',
          productName: 'Aspirin',
          alertType: '30-day',
          severity: 'critical',
          message: 'Expiring in 30 days',
          acknowledged: false,
          createdAt: '2024-01-01',
        },
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: alerts }));

      const result = await store.getAlerts();
      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('30-day');
    });

    it('returns empty on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await store.getAlerts();
      expect(result).toEqual([]);
    });
  });

  // ── acknowledgeAlert ───────────────────────────────────────────────────

  describe('acknowledgeAlert', () => {
    it('acknowledges an alert', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}, true));

      const result = await store.acknowledgeAlert('alert-1', 'Admin');
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/expiry/alerts/alert-1/acknowledge',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ acknowledgedBy: 'Admin' }),
        }),
      );
    });
  });

  // ── getExpiredItems ────────────────────────────────────────────────────

  describe('getExpiredItems', () => {
    it('returns only expired items', async () => {
      const items = [
        makeItem({ id: '1', expiryDate: makePastDate(5) }),
        makeItem({ id: '2', expiryDate: makeFutureDate(120) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.getExpiredItems();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  // ── getNearExpiryItems ─────────────────────────────────────────────────

  describe('getNearExpiryItems', () => {
    it('returns items expiring within daysAhead', async () => {
      const items = [
        makeItem({ id: '1', expiryDate: makeFutureDate(15) }),
        makeItem({ id: '2', expiryDate: makeFutureDate(120) }),
        makeItem({ id: '3', expiryDate: makePastDate(5) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.getNearExpiryItems(30);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('excludes quarantined and destroyed items', async () => {
      const items = [
        makeItem({ id: '1', expiryDate: makeFutureDate(15), status: 'quarantined' }),
        makeItem({ id: '2', expiryDate: makeFutureDate(15) }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.getNearExpiryItems(30);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  // ── calculateFEFO ──────────────────────────────────────────────────────

  describe('calculateFEFO', () => {
    it('picks items in first-expiry-first-out order', async () => {
      const items = [
        makeItem({
          id: '1',
          productId: 'p1',
          productName: 'Aspirin',
          batchNumber: 'B-003',
          expiryDate: makeFutureDate(180),
          quantity: 50,
        }),
        makeItem({
          id: '2',
          productId: 'p1',
          productName: 'Aspirin',
          batchNumber: 'B-001',
          expiryDate: makeFutureDate(30),
          quantity: 20,
        }),
        makeItem({
          id: '3',
          productId: 'p1',
          productName: 'Aspirin',
          batchNumber: 'B-002',
          expiryDate: makeFutureDate(90),
          quantity: 30,
        }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.calculateFEFO('p1', 40);

      expect(result.productId).toBe('p1');
      expect(result.requestedQty).toBe(40);
      expect(result.picks).toHaveLength(2);
      // First pick should be the earliest expiry
      expect(result.picks[0].batchNumber).toBe('B-001');
      expect(result.picks[0].quantity).toBe(20);
      expect(result.picks[1].batchNumber).toBe('B-002');
      expect(result.picks[1].quantity).toBe(20);
    });

    it('excludes expired, quarantined, and destroyed items', async () => {
      const items = [
        makeItem({
          id: '1',
          productId: 'p1',
          batchNumber: 'B-EXP',
          expiryDate: makePastDate(5),
          quantity: 100,
        }),
        makeItem({
          id: '2',
          productId: 'p1',
          batchNumber: 'B-OK',
          expiryDate: makeFutureDate(60),
          quantity: 50,
        }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.calculateFEFO('p1', 30);

      expect(result.picks).toHaveLength(1);
      expect(result.picks[0].batchNumber).toBe('B-OK');
    });

    it('handles insufficient stock', async () => {
      const items = [
        makeItem({
          id: '1',
          productId: 'p1',
          batchNumber: 'B-001',
          expiryDate: makeFutureDate(60),
          quantity: 10,
        }),
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: items }));

      const result = await store.calculateFEFO('p1', 100);

      expect(result.picks).toHaveLength(1);
      expect(result.picks[0].quantity).toBe(10);
    });
  });

  // ── quarantineExpired ──────────────────────────────────────────────────

  describe('quarantineExpired', () => {
    it('calls quarantine endpoint and returns count', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ count: 5 }));

      const result = await store.quarantineExpired();
      expect(result).toBe(5);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/expiry/items/quarantine-expired',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('returns 0 on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await store.quarantineExpired();
      expect(result).toBe(0);
    });
  });

  // ── getPolicies / updatePolicy ─────────────────────────────────────────

  describe('getPolicies', () => {
    it('fetches policies', async () => {
      const policies: ExpiryPolicy[] = [
        {
          productId: 'p1',
          category: 'Pharma',
          nearExpiryDays: 90,
          expiryWarningDays: 60,
          criticalExpiryDays: 30,
          autoQuarantineDays: 0,
          fefoEnabled: true,
        },
      ];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: policies }));

      const result = await store.getPolicies();
      expect(result).toHaveLength(1);
      expect(result[0].fefoEnabled).toBe(true);
    });
  });

  describe('updatePolicy', () => {
    it('updates a policy', async () => {
      const updated: ExpiryPolicy = {
        productId: 'p1',
        nearExpiryDays: 120,
        expiryWarningDays: 60,
        criticalExpiryDays: 30,
        autoQuarantineDays: 0,
        fefoEnabled: true,
      };
      fetchSpy.mockImplementation(() => mockFetchResponse(updated));

      const result = await store.updatePolicy('p1', { nearExpiryDays: 120 });
      expect(result).toBeDefined();
      expect(result!.nearExpiryDays).toBe(120);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/expiry/policies/p1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('returns undefined on failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await store.updatePolicy('p1', {});
      expect(result).toBeUndefined();
    });
  });

  // ── getExpiryReport ────────────────────────────────────────────────────

  describe('getExpiryReport', () => {
    it('generates a summary report', async () => {
      const items = [
        makeItem({ id: '1', expiryDate: makePastDate(5), quantity: 100 }),
        makeItem({ id: '2', expiryDate: makeFutureDate(45), quantity: 50 }),
        makeItem({ id: '3', expiryDate: makeFutureDate(200), quantity: 200 }),
      ];
      const policies: ExpiryPolicy[] = [
        {
          productId: 'prod-1',
          category: 'Pharma',
          nearExpiryDays: 90,
          expiryWarningDays: 60,
          criticalExpiryDays: 30,
          autoQuarantineDays: 0,
          fefoEnabled: true,
        },
      ];

      // First call returns items, second returns policies
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: items }))
        .mockImplementationOnce(() => mockFetchResponse({ data: policies }));

      const report = await store.getExpiryReport();

      expect(report.totalItems).toBe(3);
      expect(report.expiredCount).toBe(1);
      expect(report.nearExpiryCount).toBe(1);
      expect(report.valueAtRisk).toBeGreaterThan(0);
      expect(report.generatedAt).toBeTruthy();
      expect(report.itemsByCategory).toHaveLength(1);
      expect(report.itemsByCategory[0].category).toBe('Pharma');
    });
  });
});
